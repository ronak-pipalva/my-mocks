import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const supabase = createAdminClient();

  const { data: mocks } = await supabase
    .from("mocks")
    .select(
      `
      id, title, slug, negative_marking, max_attempts, is_active, created_at,
      exams ( name ),
      attempts ( id, total_score, submitted_at )
    `
    )
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Mocks</h1>
        <Link
          href="/admin/mocks/new"
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg"
        >
          + New Mock
        </Link>
      </div>

      {!mocks?.length ? (
        <div className="text-center py-20 text-gray-500">
          <p className="text-lg font-medium mb-2">No mocks yet</p>
          <p className="text-sm">Create your first mock to get started.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {mocks.map((mock) => {
            const attempts = (mock.attempts as { id: string; total_score: number | null; submitted_at: string | null }[]) ?? [];
            const completedAttempts = attempts.filter((a) => a.submitted_at);
            const lastAttempt = completedAttempts.sort(
              (a, b) =>
                new Date(b.submitted_at!).getTime() -
                new Date(a.submitted_at!).getTime()
            )[0];
            const attemptsUsed = completedAttempts.length;
            const exam = mock.exams as unknown as { name: string } | null;

            return (
              <div
                key={mock.id}
                className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="font-semibold text-gray-900 text-lg truncate">
                      {mock.title}
                    </h2>
                    {!mock.is_active && (
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                        Inactive
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mb-2">
                    {exam?.name} · slug:{" "}
                    <code className="bg-gray-100 px-1 rounded text-xs">
                      {mock.slug}
                    </code>
                  </p>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                    <span>
                      Attempts:{" "}
                      <strong>
                        {attemptsUsed}/{mock.max_attempts ?? "∞"}
                      </strong>
                    </span>
                    {lastAttempt && (
                      <span>
                        Last score:{" "}
                        <strong>{lastAttempt.total_score ?? "—"}</strong>
                      </span>
                    )}
                    <span>
                      Negative marking:{" "}
                      <strong>
                        {mock.negative_marking > 0
                          ? `-${mock.negative_marking}`
                          : "None"}
                      </strong>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <Link
                    href={`/test/${mock.slug}`}
                    target="_blank"
                    className="text-xs bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 px-3 py-1.5 rounded-lg font-medium"
                  >
                    Open Test
                  </Link>
                  <Link
                    href={`/admin/mocks/${mock.id}`}
                    className="text-xs bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 px-3 py-1.5 rounded-lg font-medium"
                  >
                    Manage
                  </Link>
                  <Link
                    href={`/admin/mocks/${mock.id}/upload`}
                    className="text-xs bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100 px-3 py-1.5 rounded-lg font-medium"
                  >
                    Upload Q
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
