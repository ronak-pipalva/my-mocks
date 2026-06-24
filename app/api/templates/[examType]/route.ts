import { NextRequest, NextResponse } from "next/server";
import { generateTemplate } from "@/lib/question-parser";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ examType: string }> }
) {
  const { examType } = await params;
  const isBilingual = examType === "bilingual";
  const buffer = generateTemplate(isBilingual);

  const filename = isBilingual
    ? "aiapget-template.xlsx"
    : "ibps-so-template.xlsx";

  return new NextResponse(Buffer.from(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
