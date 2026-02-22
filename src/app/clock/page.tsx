"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ClockQuestion, CLOCK_QUESTIONS_PER_SESSION } from "@/types/clock-question";

// ══════════════════════════════════════════
// 問題生成ロジック
// ══════════════════════════════════════════

/** 0–11 と 0,5,10,...,55 のランダム時刻を返す */
function randomTime(): { hour: number; minute: number } {
  const hour = Math.floor(Math.random() * 12); // 0–11
  const minute = Math.floor(Math.random() * 12) * 5; // 0,5,...,55
  return { hour, minute };
}

/** 時刻を日本語表記に変換 "3じ40ぷん" / "12じ" */
function formatTime(hour: number, minute: number): string {
  const h = hour === 0 ? 12 : hour;
  if (minute === 0) return `${h}じ`;
  return `${h}じ${minute}ぷん`;
}

/** 時刻に分を加減算し (hour 0–11, minute 0–55) を返す */
function addMinutes(hour: number, minute: number, deltaH: number, deltaM: number): { hour: number; minute: number } {
  const totalMinutes = hour * 60 + minute + deltaH * 60 + deltaM;
  const normalised = ((totalMinutes % 720) + 720) % 720; // 12時間でループ
  return { hour: Math.floor(normalised / 60) % 12, minute: normalised % 60 };
}

/** 不正解の選択肢を 3 つ生成する（正解と重複しない） */
function generateWrongChoices(correctH: number, correctM: number): string[] {
  const wrong = new Set<string>();
  wrong.add(formatTime(correctH, correctM)); // 正解を除外マーク用
  while (wrong.size < 4) {
    const offset = (Math.floor(Math.random() * 11) + 1) * 5 * (Math.random() < 0.5 ? 1 : -1);
    const t = addMinutes(correctH, correctM, 0, offset);
    wrong.add(formatTime(t.hour, t.minute));
  }
  wrong.delete(formatTime(correctH, correctM));
  return Array.from(wrong).slice(0, 3);
}

/** shuffle */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** ランダムに1問生成する */
function generateQuestion(id: number): ClockQuestion {
  const type = id % 3 === 0 ? "read-clock" : id % 3 === 1 ? "add-time" : "subtract-time";

  const { hour: dH, minute: dM } = randomTime();

  if (type === "read-clock") {
    const wrongChoices = generateWrongChoices(dH, dM);
    const answer = formatTime(dH, dM);
    const choices = shuffle([answer, ...wrongChoices]);
    return {
      id,
      type,
      displayHour: dH,
      displayMinute: dM,
      question: "とけいをみて、なんじなんぷん？",
      choices,
      answer,
    };
  }

  if (type === "add-time") {
    const deltaHours = Math.random() < 0.4 ? Math.floor(Math.random() * 3) + 1 : 0;
    const deltaMinutes = deltaHours > 0 ? 0 : (Math.floor(Math.random() * 6) + 1) * 5;
    const result = addMinutes(dH, dM, deltaHours, deltaMinutes);
    const answer = formatTime(result.hour, result.minute);
    const wrongChoices = generateWrongChoices(result.hour, result.minute);
    const choices = shuffle([answer, ...wrongChoices]);
    const deltaStr =
      deltaHours > 0
        ? `${deltaHours}じかんご`
        : `${deltaMinutes}ぷんご`;
    return {
      id,
      type,
      displayHour: dH,
      displayMinute: dM,
      deltaHour: deltaHours,
      deltaMinute: deltaMinutes,
      question: `とけいの${deltaStr}は なんじなんぷん？`,
      choices,
      answer,
    };
  }

  // subtract-time
  const deltaHours = Math.random() < 0.4 ? Math.floor(Math.random() * 3) + 1 : 0;
  const deltaMinutes = deltaHours > 0 ? 0 : (Math.floor(Math.random() * 6) + 1) * 5;
  const result = addMinutes(dH, dM, -deltaHours, -deltaMinutes);
  const answer = formatTime(result.hour, result.minute);
  const wrongChoices = generateWrongChoices(result.hour, result.minute);
  const choices = shuffle([answer, ...wrongChoices]);
  const deltaStr =
    deltaHours > 0
      ? `${deltaHours}じかんまえ`
      : `${deltaMinutes}ぷんまえ`;
  return {
    id,
    type,
    displayHour: dH,
    displayMinute: dM,
    deltaHour: deltaHours,
    deltaMinute: deltaMinutes,
    question: `とけいの${deltaStr}は なんじなんぷん？`,
    choices,
    answer,
  };
}

/** セッション分の問題を生成する */
function generateSession(): ClockQuestion[] {
  return Array.from({ length: CLOCK_QUESTIONS_PER_SESSION }, (_, i) => generateQuestion(i + 1));
}

// ══════════════════════════════════════════
// 時計 SVG コンポーネント
// ══════════════════════════════════════════

interface ClockFaceProps {
  hour: number;   // 0–11
  minute: number; // 0–55 (5刻み)
  size?: number;
}

function ClockFace({ hour, minute, size = 200 }: ClockFaceProps) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 6;

  // 針の角度 (12時を0°として時計回り)
  const minuteAngle = (minute / 60) * 360 - 90; // SVG の -90° から
  const hourAngle = ((hour % 12) + minute / 60) / 12 * 360 - 90;

  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const minuteHandLen = r * 0.78;
  const hourHandLen = r * 0.54;

  const minuteTip = {
    x: cx + minuteHandLen * Math.cos(toRad(minuteAngle)),
    y: cy + minuteHandLen * Math.sin(toRad(minuteAngle)),
  };
  const hourTip = {
    x: cx + hourHandLen * Math.cos(toRad(hourAngle)),
    y: cy + hourHandLen * Math.sin(toRad(hourAngle)),
  };

  // 数字の位置
  const numbers = Array.from({ length: 12 }, (_, i) => {
    const n = i + 1;
    const angle = toRad((n / 12) * 360 - 90);
    const nr = r * 0.80;
    return { n, x: cx + nr * Math.cos(angle), y: cy + nr * Math.sin(angle) };
  });

  // 目盛り
  const ticks = Array.from({ length: 60 }, (_, i) => {
    const angle = toRad((i / 60) * 360 - 90);
    const isHour = i % 5 === 0;
    const outer = r * 0.97;
    const inner = isHour ? r * 0.88 : r * 0.92;
    return {
      x1: cx + inner * Math.cos(angle),
      y1: cy + inner * Math.sin(angle),
      x2: cx + outer * Math.cos(angle),
      y2: cy + outer * Math.sin(angle),
      isHour,
    };
  });

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-label={`${formatTime(hour, minute)}を示す時計`}
      role="img"
    >
      {/* 外枠 */}
      <circle cx={cx} cy={cy} r={r + 4} fill="#fef9c3" stroke="#fbbf24" strokeWidth="4" />
      <circle cx={cx} cy={cy} r={r} fill="white" stroke="#94a3b8" strokeWidth="2" />

      {/* 目盛り */}
      {ticks.map((t, i) => (
        <line
          key={i}
          x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
          stroke={t.isHour ? "#475569" : "#cbd5e1"}
          strokeWidth={t.isHour ? 2.5 : 1}
          strokeLinecap="round"
        />
      ))}

      {/* 数字 */}
      {numbers.map(({ n, x, y }) => (
        <text
          key={n}
          x={x} y={y}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={size * 0.1}
          fontWeight="bold"
          fill="#334155"
          fontFamily="'M PLUS Rounded 1c', sans-serif"
        >
          {n}
        </text>
      ))}

      {/* 長針（分） */}
      <line
        x1={cx} y1={cy}
        x2={minuteTip.x} y2={minuteTip.y}
        stroke="#0ea5e9"
        strokeWidth={size * 0.028}
        strokeLinecap="round"
      />

      {/* 短針（時） */}
      <line
        x1={cx} y1={cy}
        x2={hourTip.x} y2={hourTip.y}
        stroke="#7c3aed"
        strokeWidth={size * 0.04}
        strokeLinecap="round"
      />

      {/* 中心 */}
      <circle cx={cx} cy={cy} r={size * 0.035} fill="#1e293b" />
    </svg>
  );
}

// ══════════════════════════════════════════
// ProgressBar
// ══════════════════════════════════════════

function ProgressBar({ current, total, correctCount = 0 }: { current: number; total: number; correctCount?: number }) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  const cPct = total > 0 ? Math.round((correctCount / total) * 100) : 0;
  return (
    <div className="w-full" role="progressbar" aria-valuenow={current} aria-valuemin={0} aria-valuemax={total}>
      <div className="flex justify-between items-center mb-2 text-sm">
        <span className="font-bold text-sky-700">
          <span className="text-lg text-violet-600">{current}</span>
          <span className="text-sky-500"> / {total} もん</span>
        </span>
        {correctCount > 0 && (
          <span className="text-emerald-600 font-bold flex items-center gap-1">
            ⭐{correctCount} せいかい
          </span>
        )}
      </div>
      <div className="relative w-full bg-sky-100 rounded-full overflow-hidden shadow-inner h-4">
        {correctCount > 0 && (
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${cPct}%` }}
          />
        )}
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-sky-400 to-violet-500 rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, opacity: correctCount > 0 ? 0.7 : 1 }}
        />
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// ChoiceButton
// ══════════════════════════════════════════

type ButtonState = "default" | "selected" | "correct" | "incorrect" | "disabled";

function ChoiceButton({
  children,
  onClick,
  state = "default",
  disabled = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  state?: ButtonState;
  disabled?: boolean;
}) {
  const stateStyles: Record<ButtonState, string> = {
    default: "bg-white text-sky-700 border-sky-300 hover:bg-sky-50 hover:border-sky-400",
    selected: "bg-violet-100 text-violet-700 border-violet-400",
    correct: "bg-emerald-100 text-emerald-700 border-emerald-400 animate-bounce-in",
    incorrect: "bg-rose-100 text-rose-700 border-rose-400 animate-shake",
    disabled: "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-60",
  };
  const cur = disabled ? "disabled" : state;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || state === "correct" || state === "incorrect"}
      aria-label={String(children)}
      className={`relative w-full py-4 px-6 text-xl font-bold rounded-2xl transition-all duration-200 active:scale-95 shadow-md hover:shadow-lg ${stateStyles[cur]}`}
      style={{ borderWidth: "3px", borderStyle: "solid" }}
    >
      <span className="flex items-center justify-center gap-2">
        {state === "correct" && <span className="text-2xl">⭕</span>}
        {state === "incorrect" && <span className="text-2xl">❌</span>}
        {children}
      </span>
      {state === "correct" && (
        <>
          <span className="absolute top-1 left-2 text-lg animate-sparkle">✨</span>
          <span className="absolute top-2 right-3 text-sm animate-sparkle" style={{ animationDelay: "0.2s" }}>⭐</span>
          <span className="absolute bottom-2 left-4 text-sm animate-sparkle" style={{ animationDelay: "0.4s" }}>✨</span>
          <span className="absolute bottom-1 right-2 text-lg animate-sparkle" style={{ animationDelay: "0.3s" }}>🌟</span>
        </>
      )}
    </button>
  );
}

// ══════════════════════════════════════════
// QuestionCard
// ══════════════════════════════════════════

interface QuestionCardProps {
  question: ClockQuestion;
  onAnswer: (isCorrect: boolean) => void;
  onNext: () => void;
  questionNumber: number;
  totalQuestions: number;
}

function QuestionCard({ question, onAnswer, onNext, questionNumber, totalQuestions }: QuestionCardProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answerState, setAnswerState] = useState<"unanswered" | "correct" | "incorrect">("unanswered");

  useEffect(() => {
    setSelectedAnswer(null);
    setAnswerState("unanswered");
  }, [question.id]);

  const handleSelectAnswer = (choice: string) => {
    if (answerState !== "unanswered") return;
    setSelectedAnswer(choice);
    const isCorrect = choice === question.answer;
    setAnswerState(isCorrect ? "correct" : "incorrect");
    onAnswer(isCorrect);
  };

  const getButtonState = (choice: string): ButtonState => {
    if (answerState === "unanswered") return selectedAnswer === choice ? "selected" : "default";
    if (choice === question.answer) return "correct";
    if (choice === selectedAnswer && answerState === "incorrect") return "incorrect";
    return "disabled";
  };

  const typeLabel: Record<string, string> = {
    "read-clock": "なんじなんぷん？",
    "add-time": "なんじかんご？",
    "subtract-time": "なんじかんまえ？",
  };

  return (
    <div className="bg-white rounded-3xl shadow-lg p-6 max-w-lg mx-auto">
      <div className="flex justify-between items-center mb-4">
        <span className="bg-amber-100 text-amber-700 text-sm font-bold px-3 py-1 rounded-full">
          🕐 {typeLabel[question.type] ?? "とけい"}
        </span>
        <span className="text-sky-500 font-bold text-sm">{questionNumber} / {totalQuestions}</span>
      </div>

      {/* 時計表示 */}
      <div className="flex justify-center mb-4">
        <ClockFace hour={question.displayHour} minute={question.displayMinute} size={200} />
      </div>

      {/* 加減算の場合に現在時刻テキストも補足表示 */}
      {question.type !== "read-clock" && (
        <p className="text-center text-sky-600 font-bold mb-1 text-base">
          いま {formatTime(question.displayHour, question.displayMinute)} です
        </p>
      )}

      <div className="text-center mb-6">
        <p className="text-xl font-bold text-sky-800 leading-relaxed">{question.question}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        {question.choices.map((choice, index) => (
          <ChoiceButton
            key={`${question.id}-${index}`}
            onClick={() => handleSelectAnswer(choice)}
            state={getButtonState(choice)}
            disabled={answerState !== "unanswered"}
          >
            {choice}
          </ChoiceButton>
        ))}
      </div>

      {answerState !== "unanswered" && (
        <div
          className={`text-center p-4 rounded-2xl mb-4 animate-bounce-in ${
            answerState === "correct"
              ? "bg-emerald-50 border-2 border-emerald-200"
              : "bg-rose-50 border-2 border-rose-200"
          }`}
        >
          {answerState === "correct" ? (
            <div>
              <p className="text-2xl font-bold text-emerald-600">🎉 せいかい！ 🎉</p>
              <p className="text-emerald-600">こたえは「{question.answer}」だよ！</p>
            </div>
          ) : (
            <div>
              <p className="text-2xl font-bold text-rose-600">おしい！</p>
              <p className="text-rose-600">こたえは「{question.answer}」だよ 🕐</p>
            </div>
          )}
        </div>
      )}

      {answerState !== "unanswered" && (
        <button
          type="button"
          onClick={onNext}
          aria-label={questionNumber < totalQuestions ? "つぎのもんだいへ" : "けっかをみる"}
          className="w-full py-4 px-6 bg-gradient-to-r from-sky-500 to-violet-500 text-white text-xl font-bold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-95 transition-all animate-bounce-in"
        >
          {questionNumber < totalQuestions ? (
            <span className="flex items-center justify-center gap-2">つぎのもんだい →</span>
          ) : (
            <span className="flex items-center justify-center gap-2">けっかをみる 🏆</span>
          )}
        </button>
      )}
    </div>
  );
}

// ══════════════════════════════════════════
// ResultModal
// ══════════════════════════════════════════

interface ResultModalProps {
  isOpen: boolean;
  correctCount: number;
  totalCount: number;
  onRetry: () => void;
  onHome: () => void;
}

function ResultModal({ isOpen, correctCount, totalCount, onRetry, onHome }: ResultModalProps) {
  if (!isOpen) return null;
  const percentage = Math.round((correctCount / totalCount) * 100);

  const getResult = () => {
    if (percentage === 100) return { emoji: "👑", message: "パーフェクト！すごい！", color: "text-yellow-500" };
    if (percentage >= 80) return { emoji: "🌟", message: "とてもよくできました！", color: "text-emerald-500" };
    if (percentage >= 60) return { emoji: "😊", message: "よくがんばりました！", color: "text-sky-500" };
    if (percentage >= 40) return { emoji: "📚", message: "もうすこしがんばろう！", color: "text-violet-500" };
    return { emoji: "💪", message: "またちょうせんしよう！", color: "text-rose-500" };
  };

  const result = getResult();
  const starCount = Math.ceil(percentage / 20);
  const stars = Array.from({ length: 5 }, (_, i) => i < starCount);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onHome}
      role="dialog"
      aria-label="ドリルのけっか"
    >
      <div
        className="bg-white rounded-3xl shadow-2xl p-6 max-w-md w-full animate-bounce-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center mb-4">
          <span className="text-6xl block animate-float">{result.emoji}</span>
        </div>
        <h2 className={`text-2xl font-bold text-center mb-4 ${result.color}`}>{result.message}</h2>

        <div className="bg-gradient-to-br from-sky-50 to-violet-50 rounded-2xl p-6 mb-6">
          <div className="text-center">
            <p className="text-sky-600 font-bold mb-2">けっか</p>
            <p className="text-5xl font-bold">
              <span className="text-emerald-500">{correctCount}</span>
              <span className="text-sky-400 text-3xl"> / </span>
              <span className="text-sky-600">{totalCount}</span>
            </p>
            <p className="text-lg text-sky-500 mt-2">{percentage}% せいかい</p>
          </div>
          <div className="flex justify-center gap-2 mt-4">
            {stars.map((filled, i) => (
              <span
                key={i}
                className={`text-3xl ${filled ? "text-yellow-400 animate-sparkle" : "text-gray-200"}`}
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                ★
              </span>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <button
            type="button"
            onClick={onRetry}
            aria-label="もういちどチャレンジ"
            className="w-full py-4 px-6 bg-gradient-to-r from-violet-500 to-violet-600 text-white text-lg font-bold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-95 transition-all"
          >
            🔄 もういちどチャレンジ
          </button>
          <button
            type="button"
            onClick={onHome}
            aria-label="トップへもどる"
            className="w-full py-3 px-6 bg-gray-100 text-gray-600 text-lg font-bold rounded-2xl hover:bg-gray-200 transform hover:scale-[1.02] active:scale-95 transition-all"
          >
            🏠 トップへもどる
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// HomePage
// ══════════════════════════════════════════

function HomePage({ onStart, onPrint }: { onStart: () => void; onPrint: () => void }) {
  // プレビュー用のデモ時計 (3時15分)
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-sky-100 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* ヘッダー */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-1 text-amber-500 hover:text-amber-600 font-bold text-sm mb-4 transition-all">
            ← きょうかえらび
          </Link>
          <div className="text-5xl mb-3">🕐</div>
          <h1 className="text-4xl font-bold text-amber-600 mb-1">とけいドリル</h1>
          <p className="text-sky-600 font-bold text-lg">なんじなんぷん？</p>
        </div>

        {/* デモ時計 */}
        <div className="bg-white rounded-3xl shadow-lg p-6 mb-6 flex flex-col items-center gap-3">
          <ClockFace hour={3} minute={15} size={180} />
          <p className="text-sky-700 font-bold text-lg">3じ15ふん</p>
          <p className="text-gray-500 text-sm text-center">
            とけいをよんだり、<br />なんじかんご・まえの じかんを こたえよう！
          </p>
        </div>

        {/* 問題タイプ説明 */}
        <div className="bg-white rounded-2xl shadow p-4 mb-6 space-y-2">
          <div className="flex items-center gap-3">
            <span className="bg-amber-100 text-amber-700 text-sm font-bold px-2 py-1 rounded-full">なんじなんぷん？</span>
            <span className="text-sky-700 text-sm">とけいをみて じかんをよむ</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="bg-sky-100 text-sky-700 text-sm font-bold px-2 py-1 rounded-full">なんじかんご？</span>
            <span className="text-sky-700 text-sm">〇じかん / 〇ぷんご の じかん</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="bg-violet-100 text-violet-700 text-sm font-bold px-2 py-1 rounded-full">なんじかんまえ？</span>
            <span className="text-sky-700 text-sm">〇じかん / 〇ぷんまえ の じかん</span>
          </div>
        </div>

        <button
          type="button"
          onClick={onStart}
          aria-label="ドリルをはじめる"
          className="w-full py-5 bg-gradient-to-r from-amber-400 to-sky-400 text-white text-2xl font-bold rounded-3xl shadow-xl hover:shadow-2xl transform hover:scale-[1.02] active:scale-95 transition-all mb-4"
        >
          🕐 はじめる！
        </button>

        <button
          type="button"
          onClick={onPrint}
          aria-label="いんさつ"
          className="w-full py-3 px-4 bg-amber-100 text-amber-700 text-lg font-bold rounded-xl hover:bg-amber-200 transform hover:scale-[1.02] active:scale-95 transition-all"
        >
          🖨️ いんさつ
        </button>

        <p className="text-center text-sky-400 text-sm mt-4">
          {CLOCK_QUESTIONS_PER_SESSION}もんずつ ちょうせん！
        </p>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// PrintContent
// ══════════════════════════════════════════

interface PrintContentProps {
  pages: ClockQuestion[][];
  showAnswers: boolean;
  questionsPerPage: number;
  isPreview: boolean;
}

const printTypeLabel: Record<string, string> = {
  "read-clock": "よむ",
  "add-time": "あと",
  "subtract-time": "まえ",
};

function PrintContent({ pages, showAnswers, questionsPerPage, isPreview }: PrintContentProps) {
  return (
    <div>
      {pages.map((pageQuestions, pageIndex) => (
        <div key={pageIndex} className={`print-page bg-white ${isPreview ? "mb-4" : "p-8"}`}>
          <div className="shrink-0 flex items-center justify-between mb-1 border-b border-amber-200 pb-1">
            <h1 className="text-base font-bold text-amber-700">
              小1とけいドリル
            </h1>
            <p className="text-amber-500 text-xs">({pageIndex + 1}/{pages.length})</p>
          </div>

          {pageIndex === 0 && (
            <div className="shrink-0 mb-1 flex items-center gap-1 text-xs">
              <span className="font-bold text-amber-700">なまえ：</span>
              <div className="flex-1 border-b border-amber-300 h-5" />
              <span className="font-bold text-amber-700 ml-2">ひづけ：</span>
              <div className="w-20 border-b border-amber-300 h-5" />
              <span className="font-bold text-amber-700 ml-2">てんすう：</span>
              <div className="w-12 border-b border-amber-300 h-5" />
              <span className="text-amber-500">/ {pages.flat().length}</span>
            </div>
          )}

          <div className="print-questions space-y-0 flex-1">
            {pageQuestions.map((question, index) => (
              <div key={question.id} className="print-card border border-amber-200 rounded-lg px-2 py-1">
                <div className="flex items-center gap-3">
                  <div className="shrink-0 w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center text-amber-700 font-bold text-xs">
                    {pageIndex * questionsPerPage + index + 1}
                  </div>
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                    question.type === "read-clock" ? "bg-amber-100 text-amber-700" :
                    question.type === "add-time" ? "bg-sky-100 text-sky-700" :
                    "bg-violet-100 text-violet-700"
                  }`} style={{ fontSize: '10px' }}>
                    {printTypeLabel[question.type]}
                  </span>
                  <div className="shrink-0">
                    <ClockFace hour={question.displayHour} minute={question.displayMinute} size={60} />
                  </div>
                  <span className="text-sm font-bold text-amber-800 flex-1">
                    {question.question}
                  </span>
                  {showAnswers ? (
                    <span className="text-sm font-bold text-gray-300 pointer-events-none" style={{ fontFamily: 'var(--font-mincho)' }}>
                      {question.answer}
                    </span>
                  ) : (
                    <div className="w-20 border-b border-dashed border-amber-300 h-6" />
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="shrink-0 mt-auto pt-1 border-t border-amber-100 text-center text-amber-400" style={{ fontSize: '9px' }}>
            小1とけいドリル - {showAnswers ? "こたえつき" : "れんしゅうよう"}
          </div>
        </div>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════
// PrintPage
// ══════════════════════════════════════════

function PrintPage({ onBack }: { onBack: () => void }) {
  const [showAnswers, setShowAnswers] = useState(false);
  const [printCount, setPrintCount] = useState(20);
  const [printQuestions, setPrintQuestions] = useState<ClockQuestion[]>(() =>
    Array.from({ length: 20 }, (_, i) => generateQuestion(i + 1))
  );
  const questionsPerPage = 6;

  const handleRegenerate = () => {
    setPrintQuestions(Array.from({ length: printCount }, (_, i) => generateQuestion(i + 1)));
  };

  useEffect(() => {
    setPrintQuestions(Array.from({ length: printCount }, (_, i) => generateQuestion(i + 1)));
  }, [printCount]);

  const pages: ClockQuestion[][] = [];
  for (let i = 0; i < printQuestions.length; i += questionsPerPage) {
    pages.push(printQuestions.slice(i, i + questionsPerPage));
  }

  const handlePrint = () => window.print();

  return (
    <>
      <div className="no-print min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-sky-100 p-4">
        <div className="max-w-2xl mx-auto">
          <button type="button" onClick={onBack} aria-label="もどる" className="flex items-center gap-1 text-amber-600 hover:text-amber-700 font-bold py-2 px-3 rounded-xl hover:bg-white/50 transition-all mb-4">
            ← もどる
          </button>

          <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold text-amber-700 mb-4 text-center flex items-center justify-center gap-2">
              🖨️ いんさつせってい
            </h2>

            <div className="mb-4">
              <label className="flex items-center gap-3 cursor-pointer bg-gray-50 p-3 rounded-xl">
                <input type="checkbox" checked={showAnswers} onChange={(e) => setShowAnswers(e.target.checked)} className="w-5 h-5 rounded border-amber-300 text-amber-500 focus:ring-amber-400" />
                <span className="text-amber-700 font-bold">こたえをひょうじする</span>
              </label>
            </div>

            <div className="mb-4">
              <p className="text-sm font-bold text-amber-700 mb-2">📝 もんだいすう</p>
              <div className="grid grid-cols-4 gap-2">
                {[12, 18, 24, 30].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setPrintCount(num)}
                    className={`py-2 px-2 rounded-xl font-bold text-base transition-all ${
                      printCount === num
                        ? "bg-gradient-to-r from-amber-400 to-sky-400 text-white shadow-md"
                        : "bg-white text-amber-600 hover:bg-amber-100 border border-amber-200"
                    }`}
                  >
                    {num}もん
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <button type="button" onClick={handleRegenerate} aria-label="もんだいをつくりなおす" className="w-full py-3 px-4 bg-amber-100 text-amber-700 text-base font-bold rounded-xl hover:bg-amber-200 active:scale-95 transition-all flex items-center justify-center gap-2">
                🔀 もんだいをつくりなおす
              </button>
            </div>

            <button type="button" onClick={handlePrint} aria-label="いんさつする" className="w-full py-4 px-6 bg-gradient-to-r from-amber-400 to-sky-400 text-white text-xl font-bold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-95 transition-all">
              <span className="flex items-center justify-center gap-2">🖨️ いんさつする</span>
            </button>

            <p className="text-center text-amber-500 mt-4 text-sm">
              {printQuestions.length}もん / {pages.length}ページ
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-md p-4">
            <h3 className="text-lg font-bold text-amber-700 mb-4 text-center">📄 プレビュー</h3>
            <div className="border-2 border-dashed border-amber-200 rounded-xl p-4 bg-amber-50/50 overflow-auto max-h-96">
              <PrintContent pages={[pages[0] || []]} showAnswers={showAnswers} questionsPerPage={questionsPerPage} isPreview={true} />
            </div>
          </div>
        </div>
      </div>

      <div className="print-only">
        <PrintContent pages={pages} showAnswers={showAnswers} questionsPerPage={questionsPerPage} isPreview={false} />
      </div>
    </>
  );
}

// ══════════════════════════════════════════
// メインアプリ
// ══════════════════════════════════════════

type Page = "home" | "quiz" | "print";

export default function ClockDrillPage() {
  const searchParams = useSearchParams();
  const initialPage = searchParams.get("mode") === "print" ? "print" : "home";
  const [page, setPage] = useState<Page>(initialPage);
  const [questions, setQuestions] = useState<ClockQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [showResult, setShowResult] = useState(false);

  const startQuiz = useCallback(() => {
    setQuestions(generateSession());
    setCurrentIndex(0);
    setCorrectCount(0);
    setShowResult(false);
    setPage("quiz");
  }, []);

  const handleAnswer = useCallback((isCorrect: boolean) => {
    if (isCorrect) setCorrectCount((c) => c + 1);
  }, []);

  const handleNext = useCallback(() => {
    if (currentIndex + 1 >= CLOCK_QUESTIONS_PER_SESSION) {
      setShowResult(true);
    } else {
      setCurrentIndex((i) => i + 1);
    }
  }, [currentIndex]);

  const handleRetry = useCallback(() => {
    startQuiz();
  }, [startQuiz]);

  const handleHome = useCallback(() => {
    setShowResult(false);
    setPage("home");
  }, []);

  if (page === "print") {
    return <PrintPage onBack={() => setPage("home")} />;
  }

  if (page === "home") {
    return <HomePage onStart={startQuiz} onPrint={() => setPage("print")} />;
  }

  const currentQuestion = questions[currentIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-sky-100 p-4">
      <div className="max-w-lg mx-auto">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={handleHome}
            aria-label="トップへもどる"
            className="flex items-center gap-1 text-sky-600 hover:text-sky-700 font-bold py-2 px-3 rounded-xl hover:bg-white/50 transition-all"
          >
            ← もどる
          </button>
          <h1 className="text-xl font-bold text-amber-600">🕐 とけいドリル</h1>
          <div className="w-20" />
        </div>

        {/* プログレスバー */}
        <div className="bg-white/80 rounded-2xl p-4 mb-4 shadow">
          <ProgressBar
            current={currentIndex}
            total={CLOCK_QUESTIONS_PER_SESSION}
            correctCount={correctCount}
          />
        </div>

        {/* 問題カード */}
        {currentQuestion && (
          <QuestionCard
            question={currentQuestion}
            onAnswer={handleAnswer}
            onNext={handleNext}
            questionNumber={currentIndex + 1}
            totalQuestions={CLOCK_QUESTIONS_PER_SESSION}
          />
        )}

        {/* 結果モーダル */}
        <ResultModal
          isOpen={showResult}
          correctCount={correctCount}
          totalCount={CLOCK_QUESTIONS_PER_SESSION}
          onRetry={handleRetry}
          onHome={handleHome}
        />
      </div>
    </div>
  );
}
