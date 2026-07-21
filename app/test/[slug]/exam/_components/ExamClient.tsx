"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import LoadingSpinner from "@/app/_components/LoadingSpinner";

interface Question {
  id: string;
  section_id: string;
  question_number: number;
  question_text_en: string | null;
  question_text_hi: string | null;
  option_a_en: string | null;
  option_a_hi: string | null;
  option_b_en: string | null;
  option_b_hi: string | null;
  option_c_en: string | null;
  option_c_hi: string | null;
  option_d_en: string | null;
  option_d_hi: string | null;
  correct_option: string;
}

interface SectionConfig {
  section_id: string;
  duration_minutes: number;
  marks_per_question: number;
  display_order: number;
  sections: { id: string; name: string } | null;
}

interface Props {
  attemptId: string;
  mockTitle: string;
  slug: string;
  examName: string;
  isBilingual: boolean;
  negativeMarking: number;
  sectionConfigs: SectionConfig[];
  questions: Question[];
  initialAnswers: Record<string, string>;
  startedAt: string;
}

const OPTIONS = ["A", "B", "C", "D"] as const;

export default function ExamClient({
  attemptId,
  mockTitle,
  slug,
  isBilingual,
  negativeMarking,
  sectionConfigs,
  questions,
  initialAnswers,
}: Props) {
  const router = useRouter();
  const isSectionWise = sectionConfigs.length > 1;

  const [currentSectionIdx, setCurrentSectionIdx] = useState(0);
  const [currentQuestionId, setCurrentQuestionId] = useState<string>(() => {
    const firstSection = sectionConfigs[0];
    const q = questions.find((q) => q.section_id === firstSection?.section_id);
    return q?.id ?? "";
  });

  const [answers, setAnswers] = useState<Record<string, string>>(initialAnswers);
  const [language, setLanguage] = useState<"en" | "hi">(() => {
    if (!isBilingual) return "en";
    return questions[0]?.question_text_en ? "en" : "hi";
  });
  const [lockedSections, setLockedSections] = useState<boolean[]>(
    sectionConfigs.map(() => false)
  );

  const [sectionSecondsLeft, setSectionSecondsLeft] = useState<number[]>(
    sectionConfigs.map((sc) => sc.duration_minutes * 60)
  );

  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [sectionTransition, setSectionTransition] = useState(false);
  const autosaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const questionPanelRef = useRef<HTMLDivElement>(null);

  const sectionQuestions = useCallback(
    (sectionId: string) =>
      questions.filter((q) => q.section_id === sectionId),
    [questions]
  );

  const currentSection = sectionConfigs[currentSectionIdx];
  const currentSectionQs = currentSection
    ? sectionQuestions(currentSection.section_id)
    : [];
  const currentQuestion = questions.find((q) => q.id === currentQuestionId);
  const currentQIdx = currentSectionQs.findIndex((q) => q.id === currentQuestionId);

  function qText(q: Question) {
    return language === "hi"
      ? q.question_text_hi ?? q.question_text_en ?? ""
      : q.question_text_en ?? q.question_text_hi ?? "";
  }

  function optText(q: Question, opt: "A" | "B" | "C" | "D") {
    const key = `option_${opt.toLowerCase()}_` as
      | "option_a_"
      | "option_b_"
      | "option_c_"
      | "option_d_";
    const english = q[`${key}en` as keyof Question] as string | null;
    const hindi = q[`${key}hi` as keyof Question] as string | null;
    return language === "hi"
      ? hindi ?? english ?? ""
      : english ?? hindi ?? "";
  }

  async function autosaveAnswer(questionId: string, selectedOption: string | null) {
    if (autosaveRef.current) clearTimeout(autosaveRef.current);
    setSaving(true);
    autosaveRef.current = setTimeout(async () => {
      try {
        await fetch(`/api/attempts/${attemptId}/answers`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question_id: questionId,
            selected_option: selectedOption,
          }),
        });
      } catch {
      } finally {
        setSaving(false);
      }
    }, 300);
  }

  function selectAnswer(option: string) {
    const qId = currentQuestionId;
    setAnswers((prev) => {
      const current = prev[qId];
      const newVal = current === option ? undefined : option;
      const updated = { ...prev };
      if (newVal === undefined) {
        delete updated[qId];
        autosaveAnswer(qId, null);
      } else {
        updated[qId] = newVal;
        autosaveAnswer(qId, newVal);
      }
      return updated;
    });
  }

  function clearResponse() {
    const qId = currentQuestionId;
    setAnswers((prev) => {
      const updated = { ...prev };
      delete updated[qId];
      return updated;
    });
    autosaveAnswer(qId, null);
  }

  function scrollToQuestion() {
    questionPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function goToPrev() {
    if (currentQIdx > 0) {
      setCurrentQuestionId(currentSectionQs[currentQIdx - 1].id);
    }
  }

  function goToNext() {
    if (currentQIdx < currentSectionQs.length - 1) {
      setCurrentQuestionId(currentSectionQs[currentQIdx + 1].id);
    } else if (isSectionWise && currentSectionIdx < sectionConfigs.length - 1) {
      advanceToNextSection();
    }
  }

  function advanceToNextSection() {
    if (currentSectionIdx >= sectionConfigs.length - 1) return;
    setSectionTransition(true);
    setTimeout(() => {
      setLockedSections((prev) => {
        const next = [...prev];
        next[currentSectionIdx] = true;
        return next;
      });
      const nextIdx = currentSectionIdx + 1;
      setCurrentSectionIdx(nextIdx);
      const nextSection = sectionConfigs[nextIdx];
      const firstQ = questions.find((q) => q.section_id === nextSection.section_id);
      if (firstQ) setCurrentQuestionId(firstQ.id);
      setSectionTransition(false);
    }, 400);
  }

  async function submitAttempt(reason: "submitted" | "time_up") {
    if (submitting) return;
    setSubmitting(true);
    try {
      await fetch(`/api/attempts/${attemptId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ended_reason: reason }),
      });
      router.push(`/test/${slug}/result/${attemptId}`);
    } catch {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    if (submitting) return;

    const interval = setInterval(() => {
      setSectionSecondsLeft((prev) => {
        const next = [...prev];
        if (isSectionWise) {
          if (next[currentSectionIdx] <= 0) return next;
          next[currentSectionIdx] = next[currentSectionIdx] - 1;
          if (next[currentSectionIdx] === 0) {
            if (currentSectionIdx < sectionConfigs.length - 1) {
              advanceToNextSection();
            } else {
              submitAttempt("time_up");
            }
          }
        } else {
          next[0] = Math.max(0, next[0] - 1);
          if (next[0] === 0) {
            submitAttempt("time_up");
          }
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSectionIdx, submitting, isSectionWise]);

  function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  const activeSeconds = isSectionWise
    ? sectionSecondsLeft[currentSectionIdx]
    : sectionSecondsLeft[0];
  const timerUrgent = activeSeconds <= 300;

  function jumpToQuestion(q: Question) {
    const sIdx = sectionConfigs.findIndex(
      (sc) => sc.section_id === q.section_id
    );
    if (sIdx === -1 || (isSectionWise && lockedSections[sIdx])) return;
    if (sIdx !== currentSectionIdx) {
      setCurrentSectionIdx(sIdx);
    }
    setCurrentQuestionId(q.id);
  }

  const answeredCount = Object.keys(answers).length;
  const totalQ = questions.length;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-screen-xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="font-bold text-gray-900 truncate text-sm sm:text-base">
              {mockTitle}
            </h1>
            {isBilingual && (
              <div className="flex rounded-lg border border-gray-300 overflow-hidden flex-shrink-0">
                <button
                  onClick={() => setLanguage("en")}
                  className={`px-2.5 py-1 text-xs font-semibold transition-colors ${
                    language === "en"
                      ? "bg-blue-600 text-white"
                      : "bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  EN
                </button>
                <button
                  onClick={() => setLanguage("hi")}
                  className={`px-2.5 py-1 text-xs font-semibold transition-colors ${
                    language === "hi"
                      ? "bg-blue-600 text-white"
                      : "bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  हि
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div
              className={`font-mono text-lg font-bold px-3 py-1 rounded-lg ${
                timerUrgent
                  ? "bg-red-50 text-red-600 border border-red-200"
                  : "bg-gray-50 text-gray-800 border border-gray-200"
              }`}
            >
              {formatTime(activeSeconds)}
            </div>
            <button
              onClick={() => setShowConfirmSubmit(true)}
              disabled={submitting}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5"
            >
              {submitting ? (
                <>
                  <LoadingSpinner size="sm" /> Submitting
                </>
              ) : (
                "End Test"
              )}
            </button>
          </div>
        </div>
      </header>

      <div className="flex max-w-screen-xl mx-auto w-full px-2 sm:px-4 py-4 gap-4">
        {/* Main question panel */}
        <main className="flex-1 min-w-0 flex flex-col">
          {/* Section tabs for IBPS */}
          {isSectionWise && (
            <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
              {sectionConfigs.map((sc, idx) => (
                <button
                  key={sc.section_id}
                  disabled={lockedSections[idx] && idx !== currentSectionIdx}
                  onClick={() => {
                    if (!lockedSections[idx]) {
                      setCurrentSectionIdx(idx);
                      const firstQ = questions.find(
                        (q) => q.section_id === sc.section_id
                      );
                      if (firstQ) setCurrentQuestionId(firstQ.id);
                    }
                  }}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors ${
                    idx === currentSectionIdx
                      ? "bg-blue-600 text-white"
                      : lockedSections[idx]
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {sc.sections?.name ?? `S${idx + 1}`}
                  {lockedSections[idx] && " 🔒"}
                  {!lockedSections[idx] && (
                    <span className="ml-1 text-xs opacity-70">
                      {formatTime(sectionSecondsLeft[idx])}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Question card */}
          {currentQuestion ? (
            <div
              ref={questionPanelRef}
              className={`bg-white rounded-xl border border-gray-200 p-5 flex-1 transition-opacity ${
                sectionTransition ? "opacity-0" : "opacity-100"
              }`}
            >
              <div className="flex items-start gap-3 mb-5">
                <span className="flex-shrink-0 bg-blue-600 text-white text-xs font-bold w-7 h-7 rounded-full flex items-center justify-center">
                  {currentQuestion.question_number}
                </span>
                <p
                  className={`text-gray-900 leading-relaxed whitespace-pre-wrap ${
                    language === "hi" ? "text-lg" : "text-base"
                  }`}
                >
                  {qText(currentQuestion)}
                </p>
              </div>

              <div className="space-y-2.5">
                {OPTIONS.map((opt) => {
                  const selected = answers[currentQuestion.id] === opt;
                  return (
                    <button
                      key={opt}
                      onClick={() => selectAnswer(opt)}
                      className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition-colors ${
                        selected
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      <span
                        className={`flex-shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-colors ${
                          selected
                            ? "border-blue-500 bg-blue-500 text-white"
                            : "border-gray-300 text-gray-500"
                        }`}
                      >
                        {opt}
                      </span>
                      <span
                        className={`${
                          language === "hi" ? "text-base" : "text-sm"
                        } text-gray-800 whitespace-pre-wrap`}
                      >
                        {optText(currentQuestion, opt)}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Navigation buttons — inside card so always visible */}
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
                <button
                  onClick={goToPrev}
                  disabled={currentQIdx === 0}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ← Previous
                </button>
                <div className="flex items-center gap-2">
                  {answers[currentQuestionId] && (
                    <button
                      onClick={clearResponse}
                      className="px-3 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-xs font-medium"
                    >
                      Clear
                    </button>
                  )}
                  <span className="text-xs text-gray-400">
                    {answeredCount}/{totalQ} answered
                  </span>
                  {saving && (
                    <span className="text-xs text-blue-600 flex items-center gap-1">
                      <LoadingSpinner size="sm" color="#2563eb" /> Saving…
                    </span>
                  )}
                </div>
                <button
                  onClick={goToNext}
                  disabled={
                    currentQIdx === currentSectionQs.length - 1 &&
                    (!isSectionWise ||
                      currentSectionIdx === sectionConfigs.length - 1)
                  }
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {currentQIdx === currentSectionQs.length - 1 &&
                  isSectionWise &&
                  currentSectionIdx < sectionConfigs.length - 1
                    ? "Next Section →"
                    : "Next →"}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400">
              No questions in this section.
            </div>
          )}

        </main>

        {/* Question palette sidebar */}
        <aside className="w-48 flex-shrink-0 hidden sm:block">
          <div className="bg-white rounded-xl border border-gray-200 p-3 sticky top-20">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Questions
            </p>

            {negativeMarking > 0 && (
              <div className="mb-3 text-xs text-gray-500 space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-green-500 inline-block" />
                  Answered
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-gray-200 inline-block" />
                  Not answered
                </div>
              </div>
            )}

            {sectionConfigs.map((sc) => {
              const sqs = sectionQuestions(sc.section_id);
              const sIdx = sectionConfigs.indexOf(sc);
              return (
                <div key={sc.section_id} className="mb-4">
                  <p className="text-xs text-gray-400 mb-2 truncate">
                    {sc.sections?.name ?? `S${sIdx + 1}`}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {sqs.map((q) => {
                      const isAnswered = !!answers[q.id];
                      const isCurrent = q.id === currentQuestionId;
                      const isLocked =
                        isSectionWise && lockedSections[sIdx] && !isCurrent;
                      return (
                        <button
                          key={q.id}
                          onClick={() => jumpToQuestion(q)}
                          disabled={isLocked}
                          title={`Q${q.question_number}`}
                          className={`w-7 h-7 rounded text-xs font-semibold transition-colors ${
                            isCurrent
                              ? "bg-blue-600 text-white"
                              : isAnswered
                              ? "bg-green-500 text-white"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          } ${isLocked ? "opacity-40 cursor-not-allowed" : ""}`}
                        >
                          {q.question_number}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </aside>
      </div>

      {/* Submission overlay */}
      {submitting && (
        <div className="fixed inset-0 z-[60] bg-white/70 flex flex-col items-center justify-center">
          <LoadingSpinner size="md" color="#2563eb" />
          <p className="mt-3 text-sm font-medium text-gray-700">
            Submitting your test…
          </p>
        </div>
      )}

      {/* Submit confirmation modal */}
      {showConfirmSubmit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-2">
              Submit Test?
            </h2>
            <div className="text-sm text-gray-600 mb-5 space-y-1">
              <p>
                Answered: <strong>{answeredCount}</strong> / {totalQ}
              </p>
              <p>
                Unanswered: <strong>{totalQ - answeredCount}</strong>
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmSubmit(false)}
                className="flex-1 border border-gray-300 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50"
              >
                Continue
              </button>
              <button
                onClick={() => {
                  setShowConfirmSubmit(false);
                  submitAttempt("submitted");
                }}
                disabled={submitting}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <LoadingSpinner size="sm" /> Submitting…
                  </>
                ) : (
                  "Submit"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
