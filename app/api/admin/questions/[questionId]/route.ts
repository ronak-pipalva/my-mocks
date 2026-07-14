import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

const OPTION_KEYS = ["A", "B", "C", "D"] as const;

function optionalText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ questionId: string }> }
) {
  const { questionId } = await params;
  const body = await req.json();
  const requiredFields = [
    "question_text_en",
    "option_a_en",
    "option_b_en",
    "option_c_en",
    "option_d_en",
  ] as const;

  if (
    requiredFields.some(
      (field) => typeof body[field] !== "string" || !body[field].trim()
    )
  ) {
    return NextResponse.json(
      { error: "Question text and all English options are required." },
      { status: 400 }
    );
  }

  if (!OPTION_KEYS.includes(body.correct_option)) {
    return NextResponse.json(
      { error: "Correct answer must be A, B, C, or D." },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("questions")
    .update({
      question_text_en: body.question_text_en,
      question_text_hi: optionalText(body.question_text_hi),
      option_a_en: body.option_a_en,
      option_a_hi: optionalText(body.option_a_hi),
      option_b_en: body.option_b_en,
      option_b_hi: optionalText(body.option_b_hi),
      option_c_en: body.option_c_en,
      option_c_hi: optionalText(body.option_c_hi),
      option_d_en: body.option_d_en,
      option_d_hi: optionalText(body.option_d_hi),
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
