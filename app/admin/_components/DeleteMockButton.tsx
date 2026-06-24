"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import LoadingSpinner from "@/app/_components/LoadingSpinner";

export default function DeleteMockButton({ mockId }: { mockId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm("Delete this mock and all its questions, attempts, and section config? This cannot be undone.")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/mocks/${mockId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "Failed to delete mock");
      } else {
        router.refresh();
      }
    } catch {
      alert("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="text-xs bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 px-3 py-1.5 rounded-lg font-medium disabled:opacity-60 flex items-center gap-1"
    >
      {loading ? <LoadingSpinner size="sm" color="#ef4444" /> : "Delete"}
    </button>
  );
}
