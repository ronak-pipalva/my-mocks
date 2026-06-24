import { notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/server";
import DeleteQuestionButton from "./_components/DeleteQuestionButton";
import CopyLinkButton from "./_components/CopyLinkButton";

export const dynamic = "force-dynamic";

export default async function MockDetailPage({
  params,
}: {
  params: Promise<{ mockId: string }>;
}) {
  const { mockId } = await params;
  const supabase = createAdminClient();

  const { data: mock, error } = await supabase
    .from("mocks")
    .select(
      `
      *,
      exams ( name, is_bilingual ),
      mock_section_config (
        id, duration_minutes, marks_per_question, display_order,
        sections ( id, name )
      )
    `
    )
    .eq("id", mockId)
    .single();

  if (error || !mock) notFound();

  const { data: questions } = await supabase
    .from("questions")
    .select("id, question_number, question_text_en, correct_option, section_id, sections(name)")
    .eq("mock_id", mockId)
    .order("question_number");

  const { data: attempts } = await supabase
    .from("attempts")
    .select("id, attempt_number, started_at, submitted_at, ended_reason, total_score, correct_count, wrong_count, unattempted_count")
    .eq("mock_id", mockId)
    .order("started_at", { ascending: false });

  const exam = mock.exams as unknown as { name: string; is_bilingual: boolean } | null;
  const sectionConfigs = mock.mock_section_config as unknown as {
    id: string;
    duration_minutes: number;
    marks_per_question: number;
    display_order: number;
    sections: { id: string; name: string } | null;
  }[];

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const shareLink = `${baseUrl}/test/${mock.slug}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Link href="/admin" className="text-sm text-blue-600 hover:underline">
              ← Dashboard
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{mock.title}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {exam?.name} ·{" "}
            <code className="bg-gray-100 px-1 rounded text-xs">{mock.slug}</code>
            {exam?.is_bilingual && (
              <span className="ml-2 text-blue-600 text-xs">Bilingual</span>
            )}
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Link
            href={`/admin/mocks/${mockId}/upload`}
            className="text-sm px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium"
          >
            Upload Questions
          </Link>
          <Link
            href={`/test/${mock.slug}`}
            target="_blank"
            className="text-sm px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
          >
            Open Test ↗
          </Link>
        </div>
      </div>

      {/* Mock info */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Stat
          label="Attempts"
          value={`${(attempts ?? []).filter((a) => a.submitted_at).length} / ${mock.max_attempts ?? "∞"}`}
        />
        <Stat
          label="Negative Marking"
          value={mock.negative_marking > 0 ? `-${mock.negative_marking}` : "None"}
        />
        <Stat label="Questions" value={String(questions?.length ?? 0)} />
        <Stat
          label="Sections"
          value={String(sectionConfigs?.length ?? 0)}
        />
      </div>

      {/* Shareable link */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <p className="text-sm font-medium text-gray-700 mb-2">Shareable Link</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm break-all">
            {shareLink || `/test/${mock.slug}`}
          </code>
          <CopyLinkButton slug={mock.slug} />
        </div>
      </div>

      {/* Section config */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-200 bg-gray-50">
          <h2 className="font-semibold text-gray-800">Sections</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-2 font-medium text-gray-600">Section</th>
              <th className="text-left px-4 py-2 font-medium text-gray-600">Duration</th>
              <th className="text-left px-4 py-2 font-medium text-gray-600">Marks/Q</th>
            </tr>
          </thead>
          <tbody>
            {sectionConfigs
              ?.sort((a, b) => a.display_order - b.display_order)
              .map((sc) => (
                <tr key={sc.id} className="border-t border-gray-100">
                  <td className="px-4 py-2 text-gray-800">
                    {sc.sections?.name ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-gray-600">
                    {sc.duration_minutes} min
                  </td>
                  <td className="px-4 py-2 text-gray-600">
                    {sc.marks_per_question}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Questions */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">
            Questions ({questions?.length ?? 0})
          </h2>
          {(questions?.length ?? 0) > 0 && (
            <Link
              href={`/admin/mocks/${mockId}/upload`}
              className="text-xs text-blue-600 hover:underline"
            >
              Re-upload
            </Link>
          )}
        </div>
        {!questions?.length ? (
          <div className="px-5 py-8 text-center text-gray-400 text-sm">
            No questions yet.{" "}
            <Link
              href={`/admin/mocks/${mockId}/upload`}
              className="text-blue-600 hover:underline"
            >
              Upload now
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-gray-600 w-12">#</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Question</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600 w-20">Section</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600 w-16">Ans</th>
                <th className="px-4 py-2 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {questions.map((q) => {
                const sec = q.sections as unknown as { name: string } | null;
                return (
                  <tr key={q.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-500">{q.question_number}</td>
                    <td className="px-4 py-2 text-gray-800 max-w-xs">
                      <p className="line-clamp-2">{q.question_text_en}</p>
                    </td>
                    <td className="px-4 py-2 text-gray-500 text-xs">
                      {sec?.name ?? "—"}
                    </td>
                    <td className="px-4 py-2 font-mono font-bold text-blue-700">
                      {q.correct_option}
                    </td>
                    <td className="px-4 py-2">
                      <DeleteQuestionButton questionId={q.id} mockId={mockId} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Attempt history */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-200 bg-gray-50">
          <h2 className="font-semibold text-gray-800">Attempt History</h2>
        </div>
        {!attempts?.length ? (
          <p className="px-5 py-6 text-center text-gray-400 text-sm">
            No attempts yet.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Attempt</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Date</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Score</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600">C / W / U</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Reason</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {attempts.map((a) => (
                <tr key={a.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2 text-gray-700">#{a.attempt_number}</td>
                  <td className="px-4 py-2 text-gray-500 text-xs">
                    {a.submitted_at
                      ? new Date(a.submitted_at).toLocaleString()
                      : "In progress"}
                  </td>
                  <td className="px-4 py-2 font-semibold text-gray-800">
                    {a.total_score ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-gray-600">
                    <span className="text-green-600">{a.correct_count ?? "—"}</span>
                    {" / "}
                    <span className="text-red-500">{a.wrong_count ?? "—"}</span>
                    {" / "}
                    <span className="text-gray-400">{a.unattempted_count ?? "—"}</span>
                  </td>
                  <td className="px-4 py-2 text-xs text-gray-500">
                    {a.ended_reason ?? "—"}
                  </td>
                  <td className="px-4 py-2">
                    {a.submitted_at && (
                      <Link
                        href={`/test/${mock.slug}/result/${a.id}`}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        View
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
