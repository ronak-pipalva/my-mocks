"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import LoadingSpinner from "@/app/_components/LoadingSpinner";

type Option = "A" | "B" | "C" | "D";

export interface EditableQuestion {
  id: string;
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

type FormValues = {
  question_text_en: string;
  question_text_hi: string;
  option_a_en: string;
  option_a_hi: string;
  option_b_en: string;
  option_b_hi: string;
  option_c_en: string;
  option_c_hi: string;
  option_d_en: string;
  option_d_hi: string;
  correct_option: Option;
};

function getInitialValues(question: EditableQuestion): FormValues {
  return {
    question_text_en: question.question_text_en ?? "",
    question_text_hi: question.question_text_hi ?? "",
    option_a_en: question.option_a_en ?? "",
    option_a_hi: question.option_a_hi ?? "",
    option_b_en: question.option_b_en ?? "",
    option_b_hi: question.option_b_hi ?? "",
    option_c_en: question.option_c_en ?? "",
    option_c_hi: question.option_c_hi ?? "",
    option_d_en: question.option_d_en ?? "",
    option_d_hi: question.option_d_hi ?? "",
    correct_option: ["A", "B", "C", "D"].includes(question.correct_option)
      ? (question.correct_option as Option)
      : "A",
  };
}

export default function EditQuestionButton({
  question,
  isBilingual,
}: {
  question: EditableQuestion;
  isBilingual: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<FormValues>(() => getInitialValues(question));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function openEditor() {
    setValues(getInitialValues(question));
    setError("");
    setOpen(true);
  }

  function updateValue(field: keyof FormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const response = await fetch(`/api/admin/questions/${question.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Failed to save question.");
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError("Failed to save question.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        onClick={openEditor}
        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
      >
        Edit
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 overflow-y-auto p-4 sm:p-8">
          <div className="min-h-full flex items-center justify-center">
            <form
              onSubmit={handleSubmit}
              className="w-full max-w-3xl bg-white rounded-2xl shadow-xl"
            >
              <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-gray-200">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Edit Question {question.question_number}
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">
                    Press Enter in any field to add a new line.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={saving}
                  className="text-gray-400 hover:text-gray-700 text-xl leading-none"
                  aria-label="Close editor"
                >
                  ×
                </button>
              </div>

              <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
                <QuestionTextFields
                  values={values}
                  isBilingual={isBilingual}
                  onChange={updateValue}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  {(["A", "B", "C", "D"] as const).map((option) => (
                    <OptionFields
                      key={option}
                      option={option}
                      values={values}
                      isBilingual={isBilingual}
                      onChange={updateValue}
                    />
                  ))}
                </div>
                <label className="block text-sm font-medium text-gray-700">
                  Correct answer
                  <select
                    value={values.correct_option}
                    onChange={(event) => updateValue("correct_option", event.target.value)}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  >
                    {(["A", "B", "C", "D"] as const).map((option) => (
                      <option key={option} value={option}>
                        Option {option}
                      </option>
                    ))}
                  </select>
                </label>
                {error && <p className="text-sm text-red-600">{error}</p>}
              </div>

              <div className="flex justify-end gap-3 px-5 py-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="min-w-24 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {saving ? <LoadingSpinner size="sm" /> : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function QuestionTextFields({
  values,
  isBilingual,
  onChange,
}: {
  values: FormValues;
  isBilingual: boolean;
  onChange: (field: keyof FormValues, value: string) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <TextArea
        label="Question (English)"
        value={values.question_text_en}
        onChange={(value) => onChange("question_text_en", value)}
        required={!isBilingual}
      />
      {isBilingual && (
        <TextArea
          label="Question (Hindi)"
          value={values.question_text_hi}
          onChange={(value) => onChange("question_text_hi", value)}
        />
      )}
    </div>
  );
}

function OptionFields({
  option,
  values,
  isBilingual,
  onChange,
}: {
  option: Option;
  values: FormValues;
  isBilingual: boolean;
  onChange: (field: keyof FormValues, value: string) => void;
}) {
  const englishField = `option_${option.toLowerCase()}_en` as keyof FormValues;
  const hindiField = `option_${option.toLowerCase()}_hi` as keyof FormValues;

  return (
    <div className="space-y-3 rounded-xl border border-gray-200 p-3">
      <TextArea
        label={`Option ${option} (English)`}
        value={values[englishField] as string}
        onChange={(value) => onChange(englishField, value)}
        required={!isBilingual}
      />
      {isBilingual && (
        <TextArea
          label={`Option ${option} (Hindi)`}
          value={values[hindiField] as string}
          onChange={(value) => onChange(hindiField, value)}
        />
      )}
    </div>
  );
}

function TextArea({
  label,
  value,
  onChange,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <label className="block text-sm font-medium text-gray-700">
      {label}
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        rows={4}
        className="mt-1 block w-full resize-y rounded-lg border border-gray-300 px-3 py-2 text-sm leading-relaxed"
      />
    </label>
  );
}
