import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { parseQuestionFile } from "@/lib/question-parser";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ mockId: string }> }
) {
  const { mockId } = await params;
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("questions")
    .select("*, sections(name)")
    .eq("mock_id", mockId)
    .order("question_number");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ questions: data });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ mockId: string }> }
) {
  const { mockId } = await params;
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("questions")
    .delete()
    .eq("mock_id", mockId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ mockId: string }> }
) {
  const { mockId } = await params;
  const supabase = createAdminClient();

  const { data: mock, error: mockError } = await supabase
    .from("mocks")
    .select(
      "id, exam_id, exams(is_bilingual), mock_section_config(section_id, sections(name))"
    )
    .eq("id", mockId)
    .single();

  if (mockError || !mock) {
    return NextResponse.json({ error: "Mock not found" }, { status: 404 });
  }

  const isBilingual =
    (mock.exams as unknown as { is_bilingual: boolean } | null)?.is_bilingual ?? false;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const { questions, errors } = parseQuestionFile(arrayBuffer, isBilingual);

  if (errors.length > 0) {
    return NextResponse.json({ errors, questions: [] }, { status: 422 });
  }

  const sectionConfigs = mock.mock_section_config as unknown as {
    section_id: string;
    sections: { name: string } | null;
  }[];

  const sectionByName = new Map<string, string>();
  for (const sc of sectionConfigs) {
    if (sc.sections?.name) {
      sectionByName.set(sc.sections.name.toLowerCase(), sc.section_id);
    }
  }

  const insertRows = [];
  const insertErrors: { row: number; message: string }[] = [];

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    let sectionId: string | undefined;

    if (isBilingual) {
      sectionId = sectionConfigs[0]?.section_id;
    } else {
      sectionId = sectionByName.get(
        (q.section_name ?? "").toLowerCase()
      );
      if (!sectionId) {
        insertErrors.push({
          row: i + 2,
          message: `Unknown section_name "${q.section_name}". Valid: ${[...sectionByName.keys()].join(", ")}`,
        });
        continue;
      }
    }

    insertRows.push({
      mock_id: mockId,
      section_id: sectionId!,
      question_number: q.question_number,
      question_text_en: q.question_text_en ?? null,
      question_text_hi: q.question_text_hi ?? null,
      option_a_en: q.option_a_en ?? null,
      option_a_hi: q.option_a_hi ?? null,
      option_b_en: q.option_b_en ?? null,
      option_b_hi: q.option_b_hi ?? null,
      option_c_en: q.option_c_en ?? null,
      option_c_hi: q.option_c_hi ?? null,
      option_d_en: q.option_d_en ?? null,
      option_d_hi: q.option_d_hi ?? null,
      correct_option: q.correct_option,
    });
  }

  if (insertErrors.length > 0) {
    return NextResponse.json({ errors: insertErrors, questions: [] }, { status: 422 });
  }

  const action = formData.get("action");
  if (action === "preview") {
    return NextResponse.json({ questions: insertRows, errors: [] });
  }

  const { error: insertError } = await supabase
    .from("questions")
    .insert(insertRows);

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 400 });
  }

  return NextResponse.json({ inserted: insertRows.length }, { status: 201 });
}
