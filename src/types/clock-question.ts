// ── 時計ドリル 型定義 ──

export type ClockQuestionType = "read-clock" | "add-time" | "subtract-time";

export interface ClockQuestion {
  id: number;
  type: ClockQuestionType;
  // 表示する時計の時刻
  displayHour: number;   // 0–11 (12時間制)
  displayMinute: number; // 0, 5, 10, ... 55
  // add-time / subtract-time の場合の増減量
  deltaHour?: number;
  deltaMinute?: number;
  // 問題文
  question: string;
  // 選択肢（例: "3じ40ぷん"）
  choices: string[];
  // 正解
  answer: string;
}

export interface ClockProgress {
  questionId: number;
  isCorrect: boolean;
  attempts: number;
}

export const CLOCK_QUESTIONS_PER_SESSION = 10;
