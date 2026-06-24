import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createAdminClient();

  const { data: exams, error: examsError } = await supabase
    .from("exams")
    .select("*")
    .order("created_at");

  if (examsError) {
    return NextResponse.json({ error: examsError.message }, { status: 500 });
  }

  const { data: sections, error: sectionsError } = await supabase
    .from("sections")
    .select("*")
    .order("display_order");

  if (sectionsError) {
    return NextResponse.json({ error: sectionsError.message }, { status: 500 });
  }

  return NextResponse.json({ exams, sections });
}
