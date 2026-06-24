import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createAdminClient();

  const { data: mocks, error } = await supabase
    .from("mocks")
    .select(
      `
      *,
      exams ( name, is_bilingual ),
      mock_section_config (
        id, duration_minutes, marks_per_question, display_order,
        sections ( id, name )
      ),
      attempts ( id, total_score, submitted_at )
    `
    )
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ mocks });
}

export async function POST(req: NextRequest) {
  const supabase = createAdminClient();
  const body = await req.json();

  const {
    exam_id,
    title,
    slug,
    negative_marking,
    max_attempts,
    section_configs,
  }: {
    exam_id: string;
    title: string;
    slug: string;
    negative_marking: number;
    max_attempts: number | null;
    section_configs: {
      section_id: string;
      duration_minutes: number;
      marks_per_question: number;
      display_order: number;
    }[];
  } = body;

  if (!exam_id || !title || !slug || !section_configs?.length) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const { data: mock, error: mockError } = await supabase
    .from("mocks")
    .insert({
      exam_id,
      title,
      slug: slug.toLowerCase().replace(/\s+/g, "-"),
      negative_marking: negative_marking ?? 0,
      max_attempts: max_attempts ?? null,
    })
    .select()
    .single();

  if (mockError) {
    return NextResponse.json({ error: mockError.message }, { status: 400 });
  }

  const sectionRows = section_configs.map((sc) => ({
    mock_id: mock.id,
    section_id: sc.section_id,
    duration_minutes: sc.duration_minutes,
    marks_per_question: sc.marks_per_question,
    display_order: sc.display_order,
  }));

  const { error: scError } = await supabase
    .from("mock_section_config")
    .insert(sectionRows);

  if (scError) {
    await supabase.from("mocks").delete().eq("id", mock.id);
    return NextResponse.json({ error: scError.message }, { status: 400 });
  }

  return NextResponse.json({ mock }, { status: 201 });
}
