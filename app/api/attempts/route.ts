import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const { mock_id } = await req.json();
  if (!mock_id) {
    return NextResponse.json({ error: "mock_id is required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: mock, error: mockError } = await supabase
    .from("mocks")
    .select("id, max_attempts, is_active")
    .eq("id", mock_id)
    .single();

  if (mockError || !mock) {
    return NextResponse.json({ error: "Mock not found" }, { status: 404 });
  }

  if (!mock.is_active) {
    return NextResponse.json({ error: "This mock is not active" }, { status: 403 });
  }

  const { count: attemptCount } = await supabase
    .from("attempts")
    .select("id", { count: "exact", head: true })
    .eq("mock_id", mock_id)
    .not("submitted_at", "is", null);

  if (
    mock.max_attempts !== null &&
    mock.max_attempts !== undefined &&
    (attemptCount ?? 0) >= mock.max_attempts
  ) {
    return NextResponse.json(
      { error: `Maximum attempts (${mock.max_attempts}) reached` },
      { status: 403 }
    );
  }

  const nextAttemptNumber = (attemptCount ?? 0) + 1;

  const { data: attempt, error: attemptError } = await supabase
    .from("attempts")
    .insert({
      mock_id,
      attempt_number: nextAttemptNumber,
    })
    .select()
    .single();

  if (attemptError) {
    return NextResponse.json({ error: attemptError.message }, { status: 400 });
  }

  return NextResponse.json({ attempt }, { status: 201 });
}
