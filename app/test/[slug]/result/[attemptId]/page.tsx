import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ResultSummary from "./_components/ResultSummary";

export const dynamic = "force-dynamic";

export default async function ResultPage({
  params,
}: {
  params: Promise<{ slug: string; attemptId: string }>;
}) {
  const { slug, attemptId } = await params;
  const supabase = createClient();

  const { data: attempt, error: aErr } = await supabase
    .from("attempts")
    .select(
      "id, mock_id, attempt_number, started_at, submitted_at, ended_reason, total_score, correct_count, wrong_count, unattempted_count"
    )
    .eq("id", attemptId)
    .single();

  if (aErr || !attempt || !attempt.submitted_at) notFound();

  const { data: mock } = await supabase
    .from("mocks")
    .select(
      `
      id, title, slug, negative_marking,
      exams ( name ),
      mock_section_config (
        section_id, marks_per_question, display_order,
        sections ( id, name )
      )
    `
    )
    .eq("id", attempt.mock_id)
    .single();

  if (!mock) notFound();

  const { data: questions } = await supabase
    .from("questions")
    .select("id, section_id, question_number, question_text_en, question_text_hi, correct_option")
    .eq("mock_id", mock.id)
    .order("question_number");

  const { data: savedAnswers } = await supabase
    .from("attempt_answers")
    .select("question_id, selected_option, is_correct")
    .eq("attempt_id", attemptId);

  const sectionConfigs = (
    mock.mock_section_config as unknown as {
      section_id: string;
      marks_per_question: number;
      display_order: number;
      sections: { id: string; name: string } | null;
    }[]
  ).sort((a, b) => a.display_order - b.display_order);

  const isSectionWise = sectionConfigs.length > 1;
  const exam = mock.exams as unknown as { name: string } | null;

  const durationMs =
    new Date(attempt.submitted_at).getTime() -
    new Date(attempt.started_at).getTime();
  const durationMin = Math.floor(durationMs / 60000);
  const durationSec = Math.floor((durationMs % 60000) / 1000);

  const maxScore = sectionConfigs.reduce((sum, sc) => {
    const qCount = (questions ?? []).filter(
      (q) => q.section_id === sc.section_id
    ).length;
    return sum + qCount * sc.marks_per_question;
  }, 0);

  interface SectionBreakdown {
    name: string;
    correct: number;
    wrong: number;
    unattempted: number;
    score: number;
    total: number;
  }

  const sectionBreakdown: SectionBreakdown[] = sectionConfigs.map((sc) => {
    const sqs = (questions ?? []).filter((q) => q.section_id === sc.section_id);
    const sqIds = new Set(sqs.map((q) => q.id));
    const sAnswers = (savedAnswers ?? []).filter((a) =>
      sqIds.has(a.question_id)
    );
    const correct = sAnswers.filter((a) => a.is_correct === true).length;
    const wrong = sAnswers.filter(
      (a) => a.is_correct === false && a.selected_option !== null
    ).length;
    const unattempted =
      sqs.length -
      sAnswers.filter((a) => a.selected_option !== null).length;

    return {
      name: sc.sections?.name ?? "Section",
      correct,
      wrong,
      unattempted,
      score: correct * sc.marks_per_question - wrong * mock.negative_marking,
      total: sqs.length * sc.marks_per_question,
    };
  });

  const scorePercent =
    maxScore > 0 ? ((attempt.total_score ?? 0) / maxScore) * 100 : 0;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-blue-600 rounded-2xl p-6 text-white">
          <p className="text-blue-200 text-sm">{exam?.name}</p>
          <h1 className="text-xl font-bold mt-1">{mock.title}</h1>
          <p className="text-blue-200 text-sm mt-1">
            Attempt #{attempt.attempt_number} ·{" "}
            {attempt.ended_reason === "time_up" ? "Time Up" : "Submitted"} ·
            Duration: {durationMin}m {durationSec}s
          </p>
        </div>

        {/* Score card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Your Score</h2>
            <span className="text-2xl font-bold text-blue-600">
              {attempt.total_score !== null
                ? Number(attempt.total_score).toFixed(2)
                : "—"}
              <span className="text-base text-gray-400 font-normal">
                {" "}
                / {maxScore}
              </span>
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-gray-100 rounded-full h-3 mb-5">
            <div
              className="h-3 rounded-full bg-blue-500 transition-all"
              style={{ width: `${Math.min(100, Math.max(0, scorePercent))}%` }}
            />
          </div>

          {/* C/W/U */}
          <div className="grid grid-cols-3 gap-4">
            <StatBox
              label="Correct"
              value={attempt.correct_count ?? 0}
              color="text-green-600"
              bg="bg-green-50"
            />
            <StatBox
              label="Wrong"
              value={attempt.wrong_count ?? 0}
              color="text-red-600"
              bg="bg-red-50"
            />
            <StatBox
              label="Skipped"
              value={attempt.unattempted_count ?? 0}
              color="text-gray-500"
              bg="bg-gray-50"
            />
          </div>
        </div>

        {/* Section breakdown — only for multi-section exams */}
        {isSectionWise && (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-200 bg-gray-50">
              <h2 className="font-semibold text-gray-800">Section Breakdown</h2>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">
                    Section
                  </th>
                  <th className="text-right px-4 py-2 font-medium text-green-600">
                    Correct
                  </th>
                  <th className="text-right px-4 py-2 font-medium text-red-500">
                    Wrong
                  </th>
                  <th className="text-right px-4 py-2 font-medium text-gray-400">
                    Skipped
                  </th>
                  <th className="text-right px-4 py-2 font-medium text-gray-600">
                    Score
                  </th>
                </tr>
              </thead>
              <tbody>
                {sectionBreakdown.map((sb) => (
                  <tr
                    key={sb.name}
                    className="border-t border-gray-100 hover:bg-gray-50"
                  >
                    <td className="px-4 py-3 text-gray-800 font-medium">
                      {sb.name}
                    </td>
                    <td className="px-4 py-3 text-right text-green-600 font-semibold">
                      {sb.correct}
                    </td>
                    <td className="px-4 py-3 text-right text-red-500 font-semibold">
                      {sb.wrong}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400">
                      {sb.unattempted}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-gray-800">
                      {sb.score.toFixed(2)}
                      <span className="text-xs font-normal text-gray-400">
                        /{sb.total}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          <Link
            href={`/test/${slug}`}
            className="block text-center bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl text-sm"
          >
            Try Again
          </Link>
          <ResultSummary
            questions={questions ?? []}
            answers={savedAnswers ?? []}
          />
        </div>
      </div>
    </div>
  );
}

function StatBox({
  label,
  value,
  color,
  bg,
}: {
  label: string;
  value: number;
  color: string;
  bg: string;
}) {
  return (
    <div className={`${bg} rounded-xl p-4 text-center`}>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}
