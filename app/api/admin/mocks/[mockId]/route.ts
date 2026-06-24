import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ mockId: string }> }
) {
  const { mockId } = await params;
  const supabase = createAdminClient();

  const { error } = await supabase.from("mocks").delete().eq("id", mockId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
