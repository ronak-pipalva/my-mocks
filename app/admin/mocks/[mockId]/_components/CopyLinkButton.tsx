"use client";

import { useState } from "react";

export default function CopyLinkButton({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    const url = `${window.location.origin}/test/${slug}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button
      onClick={handleCopy}
      className="flex-shrink-0 text-sm px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-medium border border-blue-200 transition-colors"
    >
      {copied ? "✓ Copied!" : "Copy"}
    </button>
  );
}
