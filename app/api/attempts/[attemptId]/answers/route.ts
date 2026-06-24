import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  const { attemptId } = await params;
  const { question_id, selected_option, time_spent_seconds } = await req.json();

  if (!question_id) {
    return NextResponse.json({ error: "question_id is required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: question, error: qError } = await supabase
    .from("questions")
    .select("correct_option")
    .eq("id", question_id)
    .single();

  if (qError || !question) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  const is_correct =
    selected_option
      ? selected_option === question.correct_option
      : null;

  const { data, error } = await supabase
    .from("attempt_answers")
    .upsert(
      {
        attempt_id: attemptId,
        question_id,
        selected_option: selected_option ?? null,
        is_correct,
        time_spent_seconds: time_spent_seconds ?? null,
      },
      { onConflict: "attempt_id,question_id" }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ answer: data });
}
