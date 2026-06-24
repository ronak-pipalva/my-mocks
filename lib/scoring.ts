export interface SectionScore {
  sectionId: string;
  sectionName: string;
  correct: number;
  wrong: number;
  unattempted: number;
  score: number;
  maxScore: number;
}

export interface ScoreResult {
  totalScore: number;
  correctCount: number;
  wrongCount: number;
  unattemptedCount: number;
  sectionBreakdown: SectionScore[];
}

export interface AnswerRecord {
  questionId: string;
  sectionId: string;
  correctOption: string;
  selectedOption: string | null;
}

export interface SectionConfig {
  sectionId: string;
  sectionName: string;
  marksPerQuestion: number;
  totalQuestions: number;
}

/**
 * Compute score from answers.
 * negativeMarking: absolute deduction per wrong answer (e.g. 0.25 for IBPS, 1 for AIAPGET)
 */
export function computeScore(
  answers: AnswerRecord[],
  sectionConfigs: SectionConfig[],
  negativeMarking: number
): ScoreResult {
  const sectionMap = new Map<string, SectionConfig>();
  for (const sc of sectionConfigs) {
    sectionMap.set(sc.sectionId, sc);
  }

  const breakdown = new Map<
    string,
    { correct: number; wrong: number; unattempted: number }
  >();
  for (const sc of sectionConfigs) {
    breakdown.set(sc.sectionId, { correct: 0, wrong: 0, unattempted: 0 });
  }

  for (const a of answers) {
    const b = breakdown.get(a.sectionId);
    if (!b) continue;
    if (a.selectedOption === null || a.selectedOption === "") {
      b.unattempted++;
    } else if (a.selectedOption === a.correctOption) {
      b.correct++;
    } else {
      b.wrong++;
    }
  }

  let totalScore = 0;
  let totalCorrect = 0;
  let totalWrong = 0;
  let totalUnattempted = 0;
  const sectionBreakdown: SectionScore[] = [];

  for (const sc of sectionConfigs) {
    const b = breakdown.get(sc.sectionId) ?? {
      correct: 0,
      wrong: 0,
      unattempted: 0,
    };
    const score =
      b.correct * sc.marksPerQuestion - b.wrong * negativeMarking;
    const maxScore = sc.totalQuestions * sc.marksPerQuestion;

    totalScore += score;
    totalCorrect += b.correct;
    totalWrong += b.wrong;
    totalUnattempted += b.unattempted;

    sectionBreakdown.push({
      sectionId: sc.sectionId,
      sectionName: sc.sectionName,
      correct: b.correct,
      wrong: b.wrong,
      unattempted: b.unattempted,
      score,
      maxScore,
    });
  }

  return {
    totalScore,
    correctCount: totalCorrect,
    wrongCount: totalWrong,
    unattemptedCount: totalUnattempted,
    sectionBreakdown,
  };
}
