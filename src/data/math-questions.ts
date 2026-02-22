import { MathQuestion, MathOperationType } from "@/types/math-question";

// 小学1年生レベルの足し算・引き算をランダム生成
// - 足し算: 1〜9 + 1〜9、答え ≤ 18
// - 引き算: 答え ≥ 0、引く数 1〜9

/** 正解の近くから不正解の選択肢を生成 */
function generateChoices(answer: number): number[] {
  const choices = new Set<number>([answer]);
  // ±1〜4 の範囲でダミー選択肢を作る
  const offsets = [-3, -2, -1, 1, 2, 3, 4].sort(() => Math.random() - 0.5);
  for (const offset of offsets) {
    if (choices.size >= 4) break;
    const wrong = answer + offset;
    if (wrong >= 0 && wrong <= 20 && !choices.has(wrong)) {
      choices.add(wrong);
    }
  }
  // 万一足りなければ埋める
  let fill = 0;
  while (choices.size < 4) {
    if (!choices.has(fill)) choices.add(fill);
    fill++;
  }
  // シャッフルして返す
  return [...choices].sort(() => Math.random() - 0.5);
}

/** 1問ランダム生成 */
function generateOneQuestion(id: number, type: MathOperationType): MathQuestion {
  let operand1: number, operand2: number, answer: number;

  if (type === "addition") {
    operand1 = Math.floor(Math.random() * 9) + 1; // 1〜9
    const maxOp2 = Math.min(9, 18 - operand1);
    operand2 = Math.floor(Math.random() * maxOp2) + 1; // 1〜min(9, 18-op1)
    answer = operand1 + operand2;
  } else {
    // 引き算: operand1 は 2〜18、operand2 は 1〜min(9, operand1-0)
    operand1 = Math.floor(Math.random() * 17) + 2; // 2〜18
    const maxOp2 = Math.min(9, operand1);
    operand2 = Math.floor(Math.random() * maxOp2) + 1; // 1〜min(9, op1)
    answer = operand1 - operand2;
  }

  const opSymbol = type === "addition" ? "+" : "−";
  return {
    id,
    type,
    operand1,
    operand2,
    question: `${operand1} ${opSymbol} ${operand2} = ?`,
    choices: generateChoices(answer),
    answer,
  };
}

/** 1問ランダム生成（足し算 or 引き算をランダム選択） */
export function generateSingleQuestion(id: number): MathQuestion {
  const type: MathOperationType = Math.random() < 0.5 ? "addition" : "subtraction";
  return generateOneQuestion(id, type);
}

/** count 問をランダム生成（足し算・引き算を半々） */
export function generateMathQuestions(count: number): MathQuestion[] {
  const questions: MathQuestion[] = [];
  for (let i = 0; i < count; i++) {
    // 前半を足し算、後半を引き算 (ただし混ぜてもOK)
    const type: MathOperationType = i < count / 2 ? "addition" : "subtraction";
    questions.push(generateOneQuestion(i + 1, type));
  }
  return questions;
}
