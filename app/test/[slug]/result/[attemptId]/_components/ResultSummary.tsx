"use client";

import { useState } from "react";
import LoadingSpinner from "@/app/_components/LoadingSpinner";

interface Question {
  id: string;
  question_number: number;
  question_text_en: string;
  question_text_hi: string | null;
  correct_option: string;
}

interface Answer {
  question_id: string;
  selected_option: string | null;
  is_correct: boolean | null;
}

export default function ResultSummary({
  questions,
  answers,
}: {
  questions: Question[];
  answers: Answer[];
}) {
  const [open, setOpen] = useState(false);

  const answerMap = new Map<string, Answer>();
  for (const a of answers) {
    answerMap.set(a.question_id, a);
  }

  const sorted = [...questions].sort((a, b) => a.question_number - b.question_number);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold py-3 rounded-xl text-sm transition-colors"
      >
        View Answer Summary
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col">
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Answer Summary</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ✕
              </button>
            </div>

            <div className="overflow-auto p-5">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">#</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Question</th>
                    <th className="text-center px-3 py-2 font-medium text-gray-600">Your</th>
                    <th className="text-center px-3 py-2 font-medium text-gray-600">Correct</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((q) => {
                    const a = answerMap.get(q.id);
                    const selected = a?.selected_option ?? null;
                    const correct = q.correct_option;
                    const status = selected
                      ? a?.is_correct === true
                        ? "correct"
                        : "wrong"
                      : "skipped";

                    return (
                      <tr
                        key={q.id}
                        className="border-t border-gray-100 hover:bg-gray-50"
                      >
                        <td className="px-3 py-2.5 text-gray-500">
                          {q.question_number}
                        </td>
                        <td className="px-3 py-2.5 text-gray-800 max-w-xs">
                          <p className="line-clamp-2">{q.question_text_en}</p>
                        </td>
                        <td className="px-3 py-2.5 text-center font-mono font-semibold">
                          {selected ? (
                            <span
                              className={
                                status === "correct"
                                  ? "text-green-600"
                                  : status === "wrong"
                                  ? "text-red-600"
                                  : "text-gray-600"
                              }
                            >
                              {selected}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-center font-mono font-semibold text-green-600">
                          {correct}
                        </td>
                        <td className="px-3 py-2.5">
                          {status === "correct" && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                              Correct
                            </span>
                          )}
                          {status === "wrong" && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                              Wrong
                            </span>
                          )}
                          {status === "skipped" && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                              Skipped
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="px-5 py-4 border-t border-gray-200 bg-gray-50 flex justify-end">
              <button
                onClick={() => setOpen(false)}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
