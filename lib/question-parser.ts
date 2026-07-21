import * as XLSX from "xlsx";

export interface ParsedQuestion {
  section_name?: string;
  question_number: number;
  question_text_en?: string;
  question_text_hi?: string;
  option_a_en?: string;
  option_a_hi?: string;
  option_b_en?: string;
  option_b_hi?: string;
  option_c_en?: string;
  option_c_hi?: string;
  option_d_en?: string;
  option_d_hi?: string;
  correct_option: string;
}

export interface ParseError {
  row: number;
  message: string;
}

export interface ParseResult {
  questions: ParsedQuestion[];
  errors: ParseError[];
}

const IBPS_HEADERS = [
  "section_name",
  "question_number",
  "question_text",
  "option_a",
  "option_b",
  "option_c",
  "option_d",
  "correct_option",
];

const AIAPGET_BASE_HEADERS = ["question_number", "correct_option"];

const AIAPGET_ENGLISH_HEADERS = [
  "question_text_en",
  "option_a_en",
  "option_b_en",
  "option_c_en",
  "option_d_en",
];

const AIAPGET_HINDI_HEADERS = [
  "question_text_hi",
  "option_a_hi",
  "option_b_hi",
  "option_c_hi",
  "option_d_hi",
];

const AIAPGET_HEADERS = [
  "question_number",
  "question_text_en",
  "question_text_hi",
  "option_a_en",
  "option_a_hi",
  "option_b_en",
  "option_b_hi",
  "option_c_en",
  "option_c_hi",
  "option_d_en",
  "option_d_hi",
  "correct_option",
];

function normalizeHeader(h: unknown): string {
  return String(h ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

export function parseQuestionFile(
  buffer: ArrayBuffer,
  isBilingual: boolean
): ParseResult {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
  }) as unknown[][];

  if (rows.length < 2) {
    return {
      questions: [],
      errors: [{ row: 0, message: "File is empty or has no data rows." }],
    };
  }

  const headerRow = (rows[0] as unknown[]).map(normalizeHeader);
  const requiredHeaders = isBilingual ? AIAPGET_BASE_HEADERS : IBPS_HEADERS;
  const missingHeaders = requiredHeaders.filter((h) => !headerRow.includes(h));
  if (missingHeaders.length > 0) {
    return {
      questions: [],
      errors: [
        {
          row: 1,
          message: `Missing columns: ${missingHeaders.join(", ")}.`,
        },
      ],
    };
  }

  if (isBilingual) {
    const missingEnglishHeaders = AIAPGET_ENGLISH_HEADERS.filter(
      (header) => !headerRow.includes(header)
    );
    const missingHindiHeaders = AIAPGET_HINDI_HEADERS.filter(
      (header) => !headerRow.includes(header)
    );
    const hasEnglishHeaders = missingEnglishHeaders.length === 0;
    const hasHindiHeaders = missingHindiHeaders.length === 0;
    if (!hasEnglishHeaders && !hasHindiHeaders) {
      return {
        questions: [],
        errors: [
          {
            row: 1,
            message: "Include all English columns or all Hindi columns for each AIAPGET question.",
          },
        ],
      };
    }
  }

  const col = (row: unknown[], name: string): string =>
    String(row[headerRow.indexOf(name)] ?? "").trim();

  const questions: ParsedQuestion[] = [];
  const errors: ParseError[] = [];
  const seenNumbers = new Set<number>();

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] as unknown[];
    const rowNum = i + 1;

    if (row.every((cell) => String(cell ?? "").trim() === "")) continue;

    const qNumRaw = col(row, "question_number");
    const qNum = parseInt(qNumRaw);
    if (isNaN(qNum) || qNum <= 0) {
      errors.push({ row: rowNum, message: `Invalid question_number: "${qNumRaw}"` });
      continue;
    }
    if (seenNumbers.has(qNum)) {
      errors.push({ row: rowNum, message: `Duplicate question_number: ${qNum}` });
      continue;
    }
    seenNumbers.add(qNum);

    const correctOption = col(row, "correct_option").toUpperCase();
    if (!["A", "B", "C", "D"].includes(correctOption)) {
      errors.push({
        row: rowNum,
        message: `Invalid correct_option "${correctOption}" — must be A, B, C or D`,
      });
      continue;
    }

    if (isBilingual) {
      const english = {
        question_text: col(row, "question_text_en"),
        option_a: col(row, "option_a_en"),
        option_b: col(row, "option_b_en"),
        option_c: col(row, "option_c_en"),
        option_d: col(row, "option_d_en"),
      };
      const hindi = {
        question_text: col(row, "question_text_hi"),
        option_a: col(row, "option_a_hi"),
        option_b: col(row, "option_b_hi"),
        option_c: col(row, "option_c_hi"),
        option_d: col(row, "option_d_hi"),
      };
      const englishValues = Object.values(english);
      const hindiValues = Object.values(hindi);
      const hasCompleteEnglish = englishValues.every(Boolean);
      const hasCompleteHindi = hindiValues.every(Boolean);

      if (!hasCompleteEnglish && !hasCompleteHindi) {
        errors.push({ row: rowNum, message: "Provide a complete question and all four options in English or Hindi" });
        continue;
      }

      questions.push({
        question_number: qNum,
        question_text_en: hasCompleteEnglish ? english.question_text : undefined,
        question_text_hi: hasCompleteHindi ? hindi.question_text : undefined,
        option_a_en: hasCompleteEnglish ? english.option_a : undefined,
        option_a_hi: hasCompleteHindi ? hindi.option_a : undefined,
        option_b_en: hasCompleteEnglish ? english.option_b : undefined,
        option_b_hi: hasCompleteHindi ? hindi.option_b : undefined,
        option_c_en: hasCompleteEnglish ? english.option_c : undefined,
        option_c_hi: hasCompleteHindi ? hindi.option_c : undefined,
        option_d_en: hasCompleteEnglish ? english.option_d : undefined,
        option_d_hi: hasCompleteHindi ? hindi.option_d : undefined,
        correct_option: correctOption,
      });
    } else {
      const sectionName = col(row, "section_name");
      const qText = col(row, "question_text");
      const optA = col(row, "option_a");
      const optB = col(row, "option_b");
      const optC = col(row, "option_c");
      const optD = col(row, "option_d");
      if (!sectionName || !qText || !optA || !optB || !optC || !optD) {
        errors.push({ row: rowNum, message: "Missing required fields" });
        continue;
      }
      questions.push({
        section_name: sectionName,
        question_number: qNum,
        question_text_en: qText,
        option_a_en: optA,
        option_b_en: optB,
        option_c_en: optC,
        option_d_en: optD,
        correct_option: correctOption,
      });
    }
  }

  return { questions, errors };
}

export function generateTemplate(isBilingual: boolean): ArrayBuffer {
  const headers = isBilingual ? AIAPGET_HEADERS : IBPS_HEADERS;

  const exampleRow = isBilingual
    ? [
        1,
        "What is the Sanskrit term for digestion?",
        "पाचन का संस्कृत शब्द क्या है?",
        "Pachana",
        "पाचन",
        "Agni",
        "अग्नि",
        "Vata",
        "वात",
        "Kapha",
        "कफ",
        "B",
      ]
    : [
        "Reasoning",
        1,
        "If A is the brother of B, B is the sister of C. How is A related to C?",
        "Brother",
        "Sister",
        "Cannot be determined",
        "None of these",
        "A",
      ];

  const ws = XLSX.utils.aoa_to_sheet([headers, exampleRow]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Questions");
  return XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
}
