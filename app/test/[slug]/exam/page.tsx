import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ExamClient from "./_components/ExamClient";

export const dynamic = "force-dynamic";

export default async function ExamPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ attempt?: string }>;
}) {
  const { slug } = await params;
  const { attempt: attemptId } = await searchParams;

  if (!attemptId) redirect(`/test/${slug}`);

  const supabase = createClient();

  const { data: attempt, error: aErr } = await supabase
    .from("attempts")
    .select("id, mock_id, submitted_at, started_at")
    .eq("id", attemptId)
    .single();

  if (aErr || !attempt) notFound();
  if (attempt.submitted_at) redirect(`/test/${slug}/result/${attemptId}`);

  const { data: mock, error: mErr } = await supabase
    .from("mocks")
    .select(
      `
      id, title, slug, negative_marking,
      exams ( name, is_bilingual ),
      mock_section_config (
        section_id, duration_minutes, marks_per_question, display_order,
        sections ( id, name )
      )
    `
    )
    .eq("id", attempt.mock_id)
    .single();

  if (mErr || !mock) notFound();

  const { data: questions } = await supabase
    .from("questions")
    .select(
      "id, section_id, question_number, question_text_en, question_text_hi, option_a_en, option_a_hi, option_b_en, option_b_hi, option_c_en, option_c_hi, option_d_en, option_d_hi, correct_option"
    )
    .eq("mock_id", mock.id)
    .order("question_number");

  const { data: savedAnswers } = await supabase
    .from("attempt_answers")
    .select("question_id, selected_option")
    .eq("attempt_id", attemptId);

  const exam = mock.exams as unknown as { name: string; is_bilingual: boolean } | null;

  const sectionConfigs = (
    mock.mock_section_config as unknown as {
      section_id: string;
      duration_minutes: number;
      marks_per_question: number;
      display_order: number;
      sections: { id: string; name: string } | null;
    }[]
  ).sort((a, b) => a.display_order - b.display_order);

  const initialAnswers: Record<string, string> = {};
  for (const a of savedAnswers ?? []) {
    if (a.selected_option) {
      initialAnswers[a.question_id] = a.selected_option;
    }
  }

  return (
    <ExamClient
      attemptId={attemptId}
      mockTitle={mock.title}
      slug={slug}
      examName={exam?.name ?? ""}
      isBilingual={exam?.is_bilingual ?? false}
      negativeMarking={mock.negative_marking}
      sectionConfigs={sectionConfigs}
      questions={questions ?? []}
      initialAnswers={initialAnswers}
      startedAt={attempt.started_at}
    />
  );
}
