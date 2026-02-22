// ── 漢字ドリル 型定義 ──

export type QuestionType = "reading" | "fill" | "choice";

export interface KanjiQuestion {
  id: number;
  kanji: string;
  reading: string;
  type: QuestionType;
  question: string;
  choices: string[];
  answer: string;
  hint?: string;
}

// ── Progress / State ──

export interface QuestionProgress {
  questionId: number;
  isCorrect: boolean;
  attempts: number;
}

export interface DrillProgress {
  date: string; // YYYY-MM-DD
  progress: QuestionProgress[];
}

export const TOTAL_QUESTIONS = 80;
export const QUESTIONS_PER_SESSION = 10;
