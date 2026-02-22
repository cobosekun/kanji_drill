// ── 算数ドリル 型定義 ──

export type MathOperationType = "addition" | "subtraction";

export interface MathQuestion {
  id: number;
  type: MathOperationType;
  operand1: number;
  operand2: number;
  question: string;    // "3 + 5 = ?"
  choices: number[];
  answer: number;
}

// ── Progress / State ──

export interface MathQuestionProgress {
  questionId: number;
  isCorrect: boolean;
  attempts: number;
}

export const MATH_QUESTIONS_PER_SESSION = 25;
export const MATH_SESSION_OPTIONS = [25, 50, 75, 100] as const;
