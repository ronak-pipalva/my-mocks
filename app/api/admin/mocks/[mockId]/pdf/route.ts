import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

type Lang = "en" | "hi" | "both";

interface QuestionRow {
  question_number: number | null;
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
  correct_option: string | null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ mockId: string }> }
) {
  const { mockId } = await params;
  const lang = (req.nextUrl.searchParams.get("lang") ?? "both") as Lang;

  const supabase = createAdminClient();

  const { data: mock, error: mockError } = await supabase
    .from("mocks")
    .select("title, exams(name, is_bilingual)")
    .eq("id", mockId)
    .single();

  if (mockError || !mock) {
    return NextResponse.json({ error: "Mock not found" }, { status: 404 });
  }

  const { data: questionsRaw, error: qError } = await supabase
    .from("questions")
    .select(
      "question_number, question_text_en, question_text_hi, option_a_en, option_a_hi, option_b_en, option_b_hi, option_c_en, option_c_hi, option_d_en, option_d_hi, correct_option"
    )
    .eq("mock_id", mockId)
    .order("question_number");

  const questions = questionsRaw as QuestionRow[] | null;

  if (qError || !questions) {
    return NextResponse.json({ error: "Failed to fetch questions" }, { status: 500 });
  }

  const exam = mock.exams as unknown as { name: string; is_bilingual: boolean } | null;
  const title = mock.title;
  const examName = exam?.name ?? "";

  const optionKeys = ["A", "B", "C", "D"] as const;

  function optEn(q: QuestionRow, opt: typeof optionKeys[number]) {
    const map = { A: q.option_a_en, B: q.option_b_en, C: q.option_c_en, D: q.option_d_en };
    return map[opt] ?? "";
  }
  function optHi(q: QuestionRow, opt: typeof optionKeys[number]) {
    const map = { A: q.option_a_hi, B: q.option_b_hi, C: q.option_c_hi, D: q.option_d_hi };
    return map[opt] ?? "";
  }

  function renderQuestion(q: QuestionRow, idx: number): string {
    const num = q.question_number ?? idx + 1;
    const correct = (q.correct_option ?? "").toUpperCase() as typeof optionKeys[number];

    const showEn = lang === "en" || lang === "both";
    const showHi = lang === "hi" || lang === "both";

    const questionLines: string[] = [];
    if (showEn && q.question_text_en) {
      questionLines.push(`<span class="en">${escHtmlWithBreaks(q.question_text_en)}</span>`);
    }
    if (showHi && q.question_text_hi) {
      questionLines.push(`<span class="hi">${escHtmlWithBreaks(q.question_text_hi)}</span>`);
    }

    const optionsHtml = optionKeys.map((opt) => {
      const isCorrect = opt === correct;
      const textParts: string[] = [];
      if (showEn) {
        const t = optEn(q, opt);
        if (t) textParts.push(`<span class="en">${escHtmlWithBreaks(t)}</span>`);
      }
      if (showHi) {
        const t = optHi(q, opt);
        if (t) textParts.push(`<span class="hi">${escHtmlWithBreaks(t)}</span>`);
      }
      const label = isCorrect
        ? `<span class="opt-label correct">${opt} ✓</span>`
        : `<span class="opt-label">${opt}</span>`;
      return `<div class="option${isCorrect ? " option-correct" : ""}">${label}<span class="opt-text">${textParts.join("<br>")}</span></div>`;
    }).join("");

    return `
    <div class="question">
      <div class="question-header">
        <span class="q-num">${num}</span>
        <div class="q-text">${questionLines.join("<br>")}</div>
      </div>
      <div class="options">${optionsHtml}</div>
    </div>`;
  }

  function escHtml(str: string) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function escHtmlWithBreaks(str: string) {
    return escHtml(str).replace(/\r?\n/g, "<br>");
  }

  const questionsHtml = questions.map((q, i) => renderQuestion(q, i)).join("\n");

  const langLabel = lang === "en" ? "English" : lang === "hi" ? "Hindi" : "English + Hindi";
  const now = new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" });

  const html = `<!DOCTYPE html>
<html lang="hi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escHtml(title)} — Questions</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;600;700&family=Noto+Sans:wght@400;600;700&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Noto Sans', 'Noto Sans Devanagari', Arial, sans-serif;
      font-size: 13px;
      color: #111;
      background: #fff;
      padding: 20px 28px;
      line-height: 1.55;
    }

    .cover {
      text-align: center;
      padding: 40px 0 30px;
      border-bottom: 2px solid #1d4ed8;
      margin-bottom: 32px;
    }
    .cover h1 { font-size: 22px; font-weight: 700; color: #1d4ed8; margin-bottom: 6px; }
    .cover h2 { font-size: 15px; font-weight: 600; color: #374151; margin-bottom: 4px; }
    .cover p  { font-size: 12px; color: #6b7280; }

    .question {
      margin-bottom: 22px;
      padding-bottom: 18px;
      border-bottom: 1px solid #e5e7eb;
      page-break-inside: avoid;
    }

    .question-header {
      display: flex;
      gap: 10px;
      align-items: flex-start;
      margin-bottom: 10px;
    }

    .q-num {
      flex-shrink: 0;
      width: 26px;
      height: 26px;
      background: #1d4ed8;
      color: #fff;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 700;
      margin-top: 1px;
    }

    .q-text {
      flex: 1;
      font-size: 13.5px;
      color: #111827;
      font-weight: 500;
    }

    .options {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px 12px;
      padding-left: 36px;
    }

    .option {
      display: flex;
      align-items: flex-start;
      gap: 6px;
      padding: 5px 8px;
      border-radius: 6px;
      border: 1px solid #e5e7eb;
      background: #f9fafb;
      font-size: 12.5px;
    }

    .option-correct {
      background: #f0fdf4;
      border-color: #16a34a;
    }

    .opt-label {
      flex-shrink: 0;
      font-weight: 700;
      color: #374151;
      min-width: 18px;
    }

    .opt-label.correct {
      color: #16a34a;
    }

    .opt-text {
      color: #1f2937;
      line-height: 1.5;
    }

    .en { font-family: 'Noto Sans', Arial, sans-serif; }
    .hi { font-family: 'Noto Sans Devanagari', Arial, sans-serif; }

    .footer {
      margin-top: 32px;
      padding-top: 12px;
      border-top: 1px solid #e5e7eb;
      font-size: 11px;
      color: #9ca3af;
      text-align: center;
    }

    @media print {
      body { padding: 12px 18px; }
      .cover { padding: 20px 0 16px; margin-bottom: 20px; }
      .question { margin-bottom: 14px; padding-bottom: 12px; }
      .no-print { display: none !important; }
      @page { size: A4; margin: 16mm 14mm; }
    }
  </style>
</head>
<body>

  <div class="no-print" style="position:fixed;top:12px;right:16px;z-index:999;display:flex;gap:8px;">
    <button onclick="window.print()" style="background:#1d4ed8;color:#fff;border:none;padding:8px 18px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;">
      🖨 Print / Save as PDF
    </button>
    <button onclick="window.close()" style="background:#f3f4f6;color:#374151;border:1px solid #d1d5db;padding:8px 14px;border-radius:8px;font-size:13px;cursor:pointer;">
      ✕ Close
    </button>
  </div>

  <div class="cover">
    <h1>${escHtml(title)}</h1>
    <h2>${escHtml(examName)}</h2>
    <p>${escHtml(langLabel)} · ${questions.length} Questions · Generated ${now}</p>
  </div>

  ${questionsHtml}

  <div class="footer">
    ${escHtml(title)} · ${questions.length} Questions · ${escHtml(langLabel)}
  </div>

</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
