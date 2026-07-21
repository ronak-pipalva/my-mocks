import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

const OPTION_KEYS = ["A", "B", "C", "D"] as const;

function optionalText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function hasCompleteLanguage(values: Array<string | null>): boolean {
  return values.every(Boolean);
}

function hasAnyLanguageValue(values: Array<string | null>): boolean {
  return values.some(Boolean);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ questionId: string }> }
) {
  const { questionId } = await params;
  const body = await req.json();
  const supabase = createAdminClient();
  const { data: question, error: questionError } = await supabase
    .from("questions")
    .select("mocks(exams(is_bilingual))")
    .eq("id", questionId)
    .single();

  if (questionError || !question) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  const isBilingual =
    (question.mocks as unknown as {
      exams: { is_bilingual: boolean } | null;
    } | null)?.exams?.is_bilingual ?? false;
  const englishValues = [
    optionalText(body.question_text_en),
    optionalText(body.option_a_en),
    optionalText(body.option_b_en),
    optionalText(body.option_c_en),
    optionalText(body.option_d_en),
  ];
  const hindiValues = [
    optionalText(body.question_text_hi),
    optionalText(body.option_a_hi),
    optionalText(body.option_b_hi),
    optionalText(body.option_c_hi),
    optionalText(body.option_d_hi),
  ];
  const hasCompleteEnglish = hasCompleteLanguage(englishValues);
  const hasCompleteHindi = hasCompleteLanguage(hindiValues);

  if (!isBilingual && !hasCompleteEnglish) {
    return NextResponse.json(
      { error: "Question text and all English options are required." },
      { status: 400 }
    );
  }
  if (isBilingual && !hasCompleteEnglish && hasAnyLanguageValue(englishValues)) {
    return NextResponse.json(
      { error: "English question text and all four English options are required when English is provided." },
      { status: 400 }
    );
  }
  if (isBilingual && !hasCompleteHindi && hasAnyLanguageValue(hindiValues)) {
    return NextResponse.json(
      { error: "Hindi question text and all four Hindi options are required when Hindi is provided." },
      { status: 400 }
    );
  }
  if (isBilingual && !hasCompleteEnglish && !hasCompleteHindi) {
    return NextResponse.json(
      { error: "Provide a complete question and all four options in English or Hindi." },
      { status: 400 }
    );
  }

  if (!OPTION_KEYS.includes(body.correct_option)) {
    return NextResponse.json(
      { error: "Correct answer must be A, B, C, or D." },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("questions")
    .update({
      question_text_en: englishValues[0],
      question_text_hi: hindiValues[0],
      option_a_en: englishValues[1],
      option_a_hi: hindiValues[1],
      option_b_en: englishValues[2],
      option_b_hi: hindiValues[2],
      option_c_en: englishValues[3],
      option_c_hi: hindiValues[3],
      option_d_en: englishValues[4],
      option_d_hi: hindiValues[4],
      correct_option: body.correct_option,
    })
    .eq("id", questionId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ questionId: string }> }
) {
  const { questionId } = await params;
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("questions")
    .delete()
    .eq("id", questionId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
