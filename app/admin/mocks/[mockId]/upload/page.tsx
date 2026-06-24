"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface PreviewQuestion {
  question_number: number;
  question_text_en: string;
  section_id: string;
  correct_option: string;
}

interface ParseError {
  row: number;
  message: string;
}

interface MockInfo {
  title: string;
  isBilingual: boolean;
}

export default function UploadQuestionsPage() {
  const { mockId } = useParams<{ mockId: string }>();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [mockInfo, setMockInfo] = useState<MockInfo | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewQuestion[] | null>(null);
  const [errors, setErrors] = useState<ParseError[]>([]);
  const [status, setStatus] = useState<"idle" | "parsing" | "confirming" | "done">("idle");
  const [submitError, setSubmitError] = useState("");
  const [insertedCount, setInsertedCount] = useState(0);

  useEffect(() => {
    fetch(`/api/admin/mocks`)
      .then((r) => r.json())
      .then(({ mocks }) => {
        const m = mocks?.find((x: { id: string }) => x.id === mockId);
        if (m) {
          setMockInfo({
            title: m.title,
            isBilingual: m.exams?.is_bilingual ?? false,
          });
        }
      });
  }, [mockId]);

  async function handlePreview() {
    if (!file) return;
    setStatus("parsing");
    setErrors([]);
    setPreview(null);

    const fd = new FormData();
    fd.append("file", file);
    fd.append("action", "preview");

    const res = await fetch(`/api/admin/mocks/${mockId}/questions`, {
      method: "POST",
      body: fd,
    });
    const data = await res.json();

    if (data.errors?.length) {
      setErrors(data.errors);
      setStatus("idle");
    } else {
      setPreview(data.questions ?? []);
      setStatus("confirming");
    }
  }

  async function handleCommit() {
    if (!file) return;
    setSubmitError("");
    const fd = new FormData();
    fd.append("file", file);
    fd.append("action", "commit");

    const res = await fetch(`/api/admin/mocks/${mockId}/questions`, {
      method: "POST",
      body: fd,
    });
    const data = await res.json();

    if (!res.ok) {
      setSubmitError(data.error ?? "Failed to insert questions");
    } else {
      setInsertedCount(data.inserted ?? 0);
      setStatus("done");
    }
  }

  const templateType = mockInfo?.isBilingual ? "bilingual" : "ibps";

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-2 mb-6">
        <Link
          href={`/admin/mocks/${mockId}`}
          className="text-sm text-blue-600 hover:underline"
        >
          ← Back
        </Link>
        <span className="text-gray-400">/</span>
        <h1 className="text-xl font-bold text-gray-900">
          Upload Questions {mockInfo ? `— ${mockInfo.title}` : ""}
        </h1>
      </div>

      {status === "done" ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
          <p className="text-xl font-bold text-green-700 mb-2">
            ✓ {insertedCount} questions uploaded successfully
          </p>
          <div className="flex justify-center gap-3 mt-4">
            <button
              onClick={() => {
                setStatus("idle");
                setFile(null);
                setPreview(null);
                if (fileRef.current) fileRef.current.value = "";
              }}
              className="text-sm px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Upload More
            </button>
            <Link
              href={`/admin/mocks/${mockId}`}
              className="text-sm px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              View Mock
            </Link>
          </div>
        </div>
      ) : status === "confirming" && preview ? (
        <div>
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
            <p className="text-green-800 font-semibold">
              Preview: {preview.length} questions parsed successfully
            </p>
            <p className="text-sm text-green-700 mt-1">
              Review the first few rows below, then click Confirm to upload.
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-4">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">
                    #
                  </th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">
                    Question (preview)
                  </th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">
                    Answer
                  </th>
                </tr>
              </thead>
              <tbody>
                {preview.slice(0, 10).map((q) => (
                  <tr key={q.question_number} className="border-b border-gray-100">
                    <td className="px-4 py-2 text-gray-500">
                      {q.question_number}
                    </td>
                    <td className="px-4 py-2 text-gray-800 max-w-xs truncate">
                      {q.question_text_en}
                    </td>
                    <td className="px-4 py-2 font-mono font-bold text-blue-700">
                      {q.correct_option}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {preview.length > 10 && (
              <p className="px-4 py-2 text-xs text-gray-400 bg-gray-50">
                …and {preview.length - 10} more questions
              </p>
            )}
          </div>

          {submitError && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3">
              {submitError}
            </p>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => {
                setStatus("idle");
                setPreview(null);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleCommit}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700"
            >
              Confirm & Upload {preview.length} Questions
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-800">
                Download Template
              </h2>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Use this Excel template to format your questions correctly.
              {mockInfo?.isBilingual
                ? " AIAPGET format includes English + Hindi columns."
                : " IBPS format includes section_name column."}
            </p>
            <a
              href={`/api/templates/${templateType}`}
              className="inline-flex items-center gap-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium"
            >
              ↓ Download Template (.xlsx)
            </a>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="font-semibold text-gray-800 mb-3">Upload File</h2>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setErrors([]);
              }}
              className="block w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />

            {errors.length > 0 && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="font-semibold text-red-700 mb-2">
                  {errors.length} validation error{errors.length > 1 ? "s" : ""}
                </p>
                <ul className="space-y-1">
                  {errors.map((e, i) => (
                    <li key={i} className="text-sm text-red-600">
                      Row {e.row}: {e.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button
              disabled={!file || status === "parsing"}
              onClick={handlePreview}
              className="mt-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold px-5 py-2 rounded-lg text-sm"
            >
              {status === "parsing" ? "Parsing…" : "Parse & Preview"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
