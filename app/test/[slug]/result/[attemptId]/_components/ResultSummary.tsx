"use client";

import { useState } from "react";

interface Question {
  id: string;
  question_number: number;
  question_text_en: string;
  question_text_hi: string | null;
  option_a_hi: string | null;
  option_b_hi: string | null;
  option_c_hi: string | null;
  option_d_hi: string | null;
  correct_option: string;
}

interface Answer {
  question_id: string;
  selected_option: string | null;
  is_correct: boolean | null;
}

const OPTIONS = ["A", "B", "C", "D"] as const;

function optionText(question: Question, option: (typeof OPTIONS)[number]) {
  const fields = {
    A: question.option_a_hi,
    B: question.option_b_hi,
    C: question.option_c_hi,
    D: question.option_d_hi,
  };
  return fields[option] ?? "हिंदी विकल्प उपलब्ध नहीं है";
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
        उत्तरों की समीक्षा देखें
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col">
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">उत्तर समीक्षा</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ✕
              </button>
            </div>

            <div className="overflow-auto p-5 space-y-5">
              {sorted.map((question) => {
                const answer = answerMap.get(question.id);
                const selected = answer?.selected_option ?? null;
                const correct = question.correct_option;

                return (
                  <section
                    key={question.id}
                    className="rounded-xl border border-gray-200 p-4"
                  >
                    <div className="flex items-start gap-3 mb-4">
                      <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                        {question.question_number}
                      </span>
                      <p className="text-base text-gray-900 leading-relaxed whitespace-pre-wrap">
                        {question.question_text_hi ?? "हिंदी प्रश्न उपलब्ध नहीं है"}
                      </p>
                    </div>

                    <div className="space-y-2">
                      {OPTIONS.map((option) => {
                        const isCorrect = option === correct;
                        const isSelected = option === selected;
                        const isSelectedWrong = isSelected && !isCorrect;

                        return (
                          <div
                            key={option}
                            className={`flex items-start gap-3 rounded-lg border-2 p-3 ${
                              isCorrect
                                ? "border-green-500 bg-green-50"
                                : isSelectedWrong
                                ? "border-red-500 bg-red-50"
                                : "border-gray-200 bg-white"
                            }`}
                          >
                            <span
                              className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                                isCorrect
                                  ? "bg-green-600 text-white"
                                  : isSelectedWrong
                                  ? "bg-red-600 text-white"
                                  : "border border-gray-300 text-gray-600"
                              }`}
                            >
                              {option}
                            </span>
                            <p className="flex-1 text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                              {optionText(question, option)}
                            </p>
                            <div className="flex flex-col items-end gap-1">
                              {isCorrect && (
                                <span className="text-xs font-semibold text-green-700">
                                  सही उत्तर
                                </span>
                              )}
                              {isSelected && (
                                <span
                                  className={`text-xs font-semibold ${
                                    isCorrect ? "text-green-700" : "text-red-700"
                                  }`}
                                >
                                  आपका उत्तर
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {!selected && (
                      <p className="mt-3 text-xs font-medium text-gray-500">
                        उत्तर नहीं दिया गया
                      </p>
                    )}
                  </section>
                );
              })}
            </div>

            <div className="px-5 py-4 border-t border-gray-200 bg-gray-50 flex justify-end">
              <button
                onClick={() => setOpen(false)}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold"
              >
                बंद करें
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
