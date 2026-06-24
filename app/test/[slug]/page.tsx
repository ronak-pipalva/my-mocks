import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import StartTestButton from "./_components/StartTestButton";

export const dynamic = "force-dynamic";

export default async function PreStartPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = createClient();

  const { data: mock, error } = await supabase
    .from("mocks")
    .select(
      `
      id, title, slug, negative_marking, max_attempts, is_active,
      exams ( name, is_bilingual ),
      mock_section_config (
        duration_minutes, marks_per_question, display_order,
        sections ( name )
      ),
      questions ( id )
    `
    )
    .eq("slug", slug)
    .single();

  if (error || !mock || !mock.is_active) notFound();

  const { count: completedAttempts } = await supabase
    .from("attempts")
    .select("id", { count: "exact", head: true })
    .eq("mock_id", mock.id)
    .not("submitted_at", "is", null);

  const attemptsUsed = completedAttempts ?? 0;
  const maxAttempts = mock.max_attempts;
  const exhausted = maxAttempts !== null && attemptsUsed >= maxAttempts;

  const exam = mock.exams as unknown as { name: string; is_bilingual: boolean } | null;
  const sectionConfigs = (
    mock.mock_section_config as unknown as {
      duration_minutes: number;
      marks_per_question: number;
      display_order: number;
      sections: { name: string } | null;
    }[]
  ).sort((a, b) => a.display_order - b.display_order);

  const totalDuration = sectionConfigs.reduce(
    (sum, s) => sum + s.duration_minutes,
    0
  );
  const totalQuestions = (mock.questions as { id: string }[]).length;

  const isSectionWise = sectionConfigs.length > 1;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 px-6 py-5">
          <p className="text-blue-200 text-sm font-medium">{exam?.name}</p>
          <h1 className="text-white text-xl font-bold mt-1">{mock.title}</h1>
        </div>

        <div className="p-6">
          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <InfoCard label="Total Questions" value={String(totalQuestions)} />
            <InfoCard
              label="Total Duration"
              value={`${totalDuration} min`}
            />
            <InfoCard
              label="Marking Scheme"
              value={
                mock.negative_marking > 0
                  ? `+${sectionConfigs[0]?.marks_per_question ?? 1} / -${mock.negative_marking}`
                  : `+${sectionConfigs[0]?.marks_per_question ?? 1} / 0`
              }
            />
            <InfoCard
              label="Attempts"
              value={`${attemptsUsed} / ${maxAttempts ?? "∞"}`}
            />
          </div>

          {/* Section breakdown */}
          {isSectionWise && (
            <div className="mb-6 rounded-xl border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Sections
                </p>
              </div>
              <table className="w-full text-sm">
                <tbody>
                  {sectionConfigs.map((sc, i) => (
                    <tr
                      key={i}
                      className={i > 0 ? "border-t border-gray-100" : ""}
                    >
                      <td className="px-4 py-2.5 text-gray-800">
                        {sc.sections?.name ?? `Section ${i + 1}`}
                      </td>
                      <td className="px-4 py-2.5 text-gray-500 text-right">
                        {sc.duration_minutes} min
                      </td>
                      <td className="px-4 py-2.5 text-gray-500 text-right">
                        {sc.marks_per_question} mark/Q
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Note about section locking */}
          {isSectionWise && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6 text-sm text-amber-800">
              <strong>Note:</strong> Each section has its own timer. Once a
              section&apos;s time expires, it is locked and you cannot go back.
            </div>
          )}

          {exam?.is_bilingual && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-6 text-sm text-blue-800">
              This test is bilingual (English + Hindi). You can switch language
              at any time during the test.
            </div>
          )}

          {exhausted ? (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-4 text-center">
              <p className="text-red-700 font-semibold">
                Maximum attempts reached
              </p>
              <p className="text-red-600 text-sm mt-1">
                You have used all {maxAttempts} allowed attempt
                {maxAttempts !== 1 ? "s" : ""} for this mock.
              </p>
            </div>
          ) : (
            <StartTestButton mockId={mock.id} slug={mock.slug} />
          )}
        </div>
      </div>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3">
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className="font-bold text-gray-900">{value}</p>
    </div>
  );
}
