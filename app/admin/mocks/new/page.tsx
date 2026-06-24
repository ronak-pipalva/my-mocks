"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Exam {
  id: string;
  name: string;
  is_bilingual: boolean;
}

interface Section {
  id: string;
  exam_id: string;
  name: string;
  display_order: number;
}

interface SectionConfig {
  section_id: string;
  name: string;
  duration_minutes: number;
  marks_per_question: number;
  display_order: number;
}

const IBPS_DEFAULTS: Record<string, { duration: number; mpq: number }> = {
  "English Language": { duration: 40, mpq: 0.5 },
  Reasoning: { duration: 40, mpq: 1 },
  "Quantitative Aptitude": { duration: 40, mpq: 1 },
};

export default function NewMockPage() {
  const router = useRouter();
  const [exams, setExams] = useState<Exam[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedExamId, setSelectedExamId] = useState("");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [negativeMarking, setNegativeMarking] = useState(0);
  const [maxAttempts, setMaxAttempts] = useState<number | "">("");
  const [sectionConfigs, setSectionConfigs] = useState<SectionConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/exams")
      .then((r) => r.json())
      .then(({ exams, sections }) => {
        setExams(exams ?? []);
        setSections(sections ?? []);
      });
  }, []);

  useEffect(() => {
    if (!slugEdited) {
      setSlug(
        title
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, "")
          .replace(/\s+/g, "-")
          .replace(/-+/g, "-")
          .slice(0, 60)
      );
    }
  }, [title, slugEdited]);

  useEffect(() => {
    if (!selectedExamId) {
      setSectionConfigs([]);
      return;
    }
    const exam = exams.find((e) => e.id === selectedExamId);
    const examSections = sections
      .filter((s) => s.exam_id === selectedExamId)
      .sort((a, b) => a.display_order - b.display_order);

    const isAIAPGET = exam?.name === "AIAPGET";

    setSectionConfigs(
      examSections.map((s) => {
        const def = IBPS_DEFAULTS[s.name];
        return {
          section_id: s.id,
          name: s.name,
          duration_minutes: isAIAPGET ? 120 : (def?.duration ?? 40),
          marks_per_question: isAIAPGET ? 4 : (def?.mpq ?? 1),
          display_order: s.display_order,
        };
      })
    );

    if (!isAIAPGET && exam?.name.includes("IBPS")) {
      setNegativeMarking(0.25);
    } else if (isAIAPGET) {
      setNegativeMarking(1);
    }
  }, [selectedExamId, exams, sections]);

  function updateSectionConfig(
    idx: number,
    field: "duration_minutes" | "marks_per_question",
    value: number
  ) {
    setSectionConfigs((prev) =>
      prev.map((sc, i) => (i === idx ? { ...sc, [field]: value } : sc))
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!selectedExamId) {
      setError("Please select an exam.");
      return;
    }
    if (!slug) {
      setError("Slug is required.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/mocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exam_id: selectedExamId,
          title,
          slug,
          negative_marking: negativeMarking,
          max_attempts: maxAttempts === "" ? null : Number(maxAttempts),
          section_configs: sectionConfigs,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create mock");
      } else {
        router.push(`/admin/mocks/${data.mock.id}`);
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  const selectedExam = exams.find((e) => e.id === selectedExamId);

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Create New Mock</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Exam selection */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="font-semibold text-gray-800 mb-4">1. Select Exam</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {exams.map((exam) => (
              <button
                key={exam.id}
                type="button"
                onClick={() => setSelectedExamId(exam.id)}
                className={`border-2 rounded-xl p-4 text-left transition-colors ${
                  selectedExamId === exam.id
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <p className="font-semibold text-gray-900 text-sm">
                  {exam.name}
                </p>
                {exam.is_bilingual && (
                  <p className="text-xs text-blue-600 mt-1">Bilingual</p>
                )}
              </button>
            ))}
          </div>
        </div>

        {selectedExamId && (
          <>
            {/* Basic details */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
              <h2 className="font-semibold text-gray-800 mb-1">
                2. Mock Details
              </h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <input
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={`${selectedExam?.name} Mock 1`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Slug{" "}
                  <span className="text-gray-400 font-normal">
                    (used in shareable link: /test/
                    <em>slug</em>)
                  </span>
                </label>
                <input
                  required
                  value={slug}
                  onChange={(e) => {
                    setSlug(e.target.value);
                    setSlugEdited(true);
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="ibps-so-mock-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Negative Marking
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={negativeMarking}
                    onChange={(e) =>
                      setNegativeMarking(parseFloat(e.target.value) || 0)
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    0 = no penalty
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Attempts
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={maxAttempts}
                    onChange={(e) =>
                      setMaxAttempts(
                        e.target.value === "" ? "" : parseInt(e.target.value)
                      )
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Unlimited"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Leave blank = unlimited
                  </p>
                </div>
              </div>
            </div>

            {/* Section config */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h2 className="font-semibold text-gray-800 mb-4">
                3. Section Configuration
              </h2>
              <div className="space-y-3">
                {sectionConfigs.map((sc, idx) => (
                  <div
                    key={sc.section_id}
                    className="grid grid-cols-3 gap-3 items-center"
                  >
                    <p className="text-sm font-medium text-gray-800">
                      {sc.name}
                    </p>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        Duration (min)
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={sc.duration_minutes}
                        onChange={(e) =>
                          updateSectionConfig(
                            idx,
                            "duration_minutes",
                            parseInt(e.target.value) || 1
                          )
                        }
                        className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        Marks / Q
                      </label>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        required
                        value={sc.marks_per_question}
                        onChange={(e) =>
                          updateSectionConfig(
                            idx,
                            "marks_per_question",
                            parseFloat(e.target.value) || 1
                          )
                        }
                        className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
            >
              {loading ? "Creating…" : "Create Mock"}
            </button>
          </>
        )}
      </form>
    </div>
  );
}
