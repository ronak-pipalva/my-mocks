"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import LoadingSpinner from "@/app/_components/LoadingSpinner";

export default function DeleteQuestionButton({
  questionId,
  mockId,
}: {
  questionId: string;
  mockId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm("Delete this question?")) return;
    setLoading(true);
    await fetch(`/api/admin/questions/${questionId}`, { method: "DELETE" });
    router.refresh();
    setLoading(false);
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
      title="Delete question"
    >
      {loading ? <LoadingSpinner size="sm" color="#ef4444" /> : "✕"}
    </button>
  );
}
