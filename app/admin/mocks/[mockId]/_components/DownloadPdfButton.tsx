"use client";

import { useState } from "react";

type Lang = "en" | "hi" | "both";

export default function DownloadPdfButton({ mockId }: { mockId: string }) {
  const [open, setOpen] = useState(false);

  function openPdf(lang: Lang) {
    window.open(`/api/admin/mocks/${mockId}/pdf?lang=${lang}`, "_blank");
    setOpen(false);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-sm px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium"
      >
        ↓ Download PDF
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-xs">
            <h2 className="text-base font-bold text-gray-900 mb-1">
              Select Language
            </h2>
            <p className="text-xs text-gray-500 mb-5">
              Choose which language to include in the question paper PDF.
            </p>

            <div className="space-y-2">
              <button
                onClick={() => openPdf("hi")}
                className="w-full flex items-center gap-3 px-4 py-3 border-2 border-gray-200 hover:border-purple-400 hover:bg-purple-50 rounded-xl text-left transition-colors"
              >
                <span className="text-2xl">🇮🇳</span>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">Hindi</p>
                  <p className="text-xs text-gray-500">हिन्दी में प्रश्न</p>
                </div>
              </button>

              <button
                onClick={() => openPdf("en")}
                className="w-full flex items-center gap-3 px-4 py-3 border-2 border-gray-200 hover:border-purple-400 hover:bg-purple-50 rounded-xl text-left transition-colors"
              >
                <span className="text-2xl">🇬🇧</span>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">English</p>
                  <p className="text-xs text-gray-500">Questions in English</p>
                </div>
              </button>

              <button
                onClick={() => openPdf("both")}
                className="w-full flex items-center gap-3 px-4 py-3 border-2 border-gray-200 hover:border-purple-400 hover:bg-purple-50 rounded-xl text-left transition-colors"
              >
                <span className="text-2xl">🌐</span>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">Both (Bilingual)</p>
                  <p className="text-xs text-gray-500">English + Hindi side by side</p>
                </div>
              </button>
            </div>

            <button
              onClick={() => setOpen(false)}
              className="mt-4 w-full py-2 text-sm text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}
