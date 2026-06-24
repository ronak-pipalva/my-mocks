import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { computeScore, AnswerRecord, SectionConfig } from "@/lib/scoring";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  const { attemptId } = await params;
  const { ended_reason } = await req.json();

  const supabase = createAdminClient();

  const { data: attempt, error: attemptError } = await supabase
    .from("attempts")
    .select("id, mock_id, submitted_at")
    .eq("id", attemptId)
    .single();

  if (attemptError || !attempt) {
    return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
  }

  if (attempt.submitted_at) {
    return NextResponse.json({ error: "Attempt already submitted" }, { status: 409 });
  }

  const { data: mock, error: mockError } = await supabase
    .from("mocks")
    .select(
      `
      id, negative_marking,
      mock_section_config (
        section_id, marks_per_question,
        sections ( id, name )
      )
    `
    )
    .eq("id", attempt.mock_id)
    .single();

  if (mockError || !mock) {
    return NextResponse.json({ error: "Mock not found" }, { status: 404 });
  }

  const { data: questions } = await supabase
    .from("questions")
    .select("id, section_id, correct_option")
    .eq("mock_id", attempt.mock_id);

  const { data: savedAnswers } = await supabase
    .from("attempt_answers")
    .select("question_id, selected_option")
    .eq("attempt_id", attemptId);

  const answerMap = new Map<string, string | null>();
  for (const a of savedAnswers ?? []) {
    answerMap.set(a.question_id, a.selected_option);
  }

  const answerRecords: AnswerRecord[] = (questions ?? []).map((q) => ({
    questionId: q.id,
    sectionId: q.section_id,
    correctOption: q.correct_option,
    selectedOption: answerMap.get(q.id) ?? null,
  }));

  const sectionConfigs: SectionConfig[] = (
    mock.mock_section_config as unknown as {
      section_id: string;
      marks_per_question: number;
      sections: { id: string; name: string } | null;
    }[]
  ).map((sc) => ({
    sectionId: sc.section_id,
    sectionName: sc.sections?.name ?? "",
    marksPerQuestion: sc.marks_per_question,
    totalQuestions: (questions ?? []).filter((q) => q.section_id === sc.section_id).length,
  }));

  const result = computeScore(answerRecords, sectionConfigs, mock.negative_marking);

  const { error: updateError } = await supabase
    .from("attempts")
    .update({
      submitted_at: new Date().toISOString(),
      ended_reason: ended_reason ?? "submitted",
      total_score: result.totalScore,
      correct_count: result.correctCount,
      wrong_count: result.wrongCount,
      unattempted_count: result.unattemptedCount,
    })
    .eq("id", attemptId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  return NextResponse.json({ result });
}
