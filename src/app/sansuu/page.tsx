"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { generateMathQuestions, generateSingleQuestion } from "@/data/math-questions";
import { MathQuestion } from "@/types/math-question";

// ── localStorage (デイリー統計) ──

interface DailyStats {
  totalAttempted: number;
  totalCorrect: number;
}

function todayKey(): string {
  const d = new Date();
  return `math-drill-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function loadDailyStats(): DailyStats {
  if (typeof window === "undefined") return { totalAttempted: 0, totalCorrect: 0 };
  try {
    const raw = localStorage.getItem(todayKey());
    if (raw) return JSON.parse(raw) as DailyStats;
  } catch { /* reset on corrupt */ }
  return { totalAttempted: 0, totalCorrect: 0 };
}

function saveDailyStats(stats: DailyStats): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(todayKey(), JSON.stringify(stats));
}

// ── Labels ──

const typeLabels: Record<string, string> = {
  addition: "たしざん",
  subtraction: "ひきざん",
};

// ══════════════════════════════════════════
// Components
// ══════════════════════════════════════════

// ── ProgressBar ──

interface ProgressBarProps {
  current: number;
  total: number;
  correctCount?: number;
  size?: "sm" | "md" | "lg";
}

function ProgressBar({ current, total, correctCount = 0, size = "md" }: ProgressBarProps) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
  const correctPercentage = total > 0 ? Math.round((correctCount / total) * 100) : 0;
  const heights = { sm: "h-2", md: "h-4", lg: "h-6" };

  return (
    <div className="w-full" role="progressbar" aria-valuenow={current} aria-valuemin={0} aria-valuemax={total} aria-label={`進捗: ${current}/${total}問`}>
      <div className="flex justify-between items-center mb-2 text-sm">
        <span className="font-bold text-orange-700">
          <span className="text-lg text-pink-600">{current}</span>
          <span className="text-orange-500"> / {total} もん</span>
        </span>
        {correctCount > 0 && (
          <span className="text-emerald-600 font-bold flex items-center gap-1">
            <span>⭐</span>{correctCount} せいかい
          </span>
        )}
      </div>
      <div className={`relative w-full bg-orange-100 rounded-full overflow-hidden shadow-inner ${heights[size]}`}>
        {correctCount > 0 && (
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${correctPercentage}%` }}
          />
        )}
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-orange-400 to-pink-500 rounded-full transition-all duration-500"
          style={{ width: `${percentage}%`, opacity: correctCount > 0 ? 0.7 : 1 }}
        />
      </div>
    </div>
  );
}

// ── ChoiceButton ──

type ButtonState = "default" | "selected" | "correct" | "incorrect" | "disabled";

interface ChoiceButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  state?: ButtonState;
  disabled?: boolean;
}

function ChoiceButton({ children, onClick, state = "default", disabled = false }: ChoiceButtonProps) {
  const stateStyles: Record<ButtonState, string> = {
    default: "bg-white text-orange-700 border-orange-300 hover:bg-orange-50 hover:border-orange-400",
    selected: "bg-pink-100 text-pink-700 border-pink-400",
    correct: "bg-emerald-100 text-emerald-700 border-emerald-400 animate-bounce-in",
    incorrect: "bg-rose-100 text-rose-700 border-rose-400 animate-shake",
    disabled: "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-60",
  };
  const currentState = disabled ? "disabled" : state;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || state === "correct" || state === "incorrect"}
      aria-label={String(children)}
      className={`relative w-full py-4 px-6 text-2xl font-bold rounded-2xl transition-all duration-200 active:scale-95 shadow-md hover:shadow-lg ${stateStyles[currentState]}`}
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

// ── QuestionCard ──

interface QuestionCardProps {
  question: MathQuestion;
  onAnswer: (isCorrect: boolean) => void;
  onNext: () => void;
  questionNumber: number;
  totalQuestions?: number;
}

function QuestionCard({ question, onAnswer, onNext, questionNumber, totalQuestions }: QuestionCardProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answerState, setAnswerState] = useState<"unanswered" | "correct" | "incorrect">("unanswered");

  useEffect(() => {
    setSelectedAnswer(null);
    setAnswerState("unanswered");
  }, [question.id]);

  const handleSelectAnswer = (choice: number) => {
    if (answerState !== "unanswered") return;
    setSelectedAnswer(choice);
    const isCorrect = choice === question.answer;
    setAnswerState(isCorrect ? "correct" : "incorrect");
    onAnswer(isCorrect);
  };

  const getButtonState = (choice: number): ButtonState => {
    if (answerState === "unanswered") return selectedAnswer === choice ? "selected" : "default";
    if (choice === question.answer) return "correct";
    if (choice === selectedAnswer && answerState === "incorrect") return "incorrect";
    return "disabled";
  };

  const operatorSymbol = question.type === "addition" ? "＋" : "−";

  return (
    <div className="bg-white rounded-3xl shadow-lg p-6 max-w-lg mx-auto">
      <div className="flex justify-between items-center mb-4">
        <span className="bg-pink-100 text-pink-700 text-sm font-bold px-3 py-1 rounded-full">
          {typeLabels[question.type] ?? question.type}
        </span>
        <span className="text-orange-500 font-bold text-sm">{totalQuestions ? `${questionNumber} / ${totalQuestions}` : `${questionNumber} もんめ`}</span>
      </div>

      <div className="text-center mb-6">
        <div className="bg-gradient-to-br from-orange-50 to-pink-50 rounded-2xl py-8 px-4 shadow-inner border-4 border-dashed border-orange-200">
          <span className="text-5xl sm:text-6xl font-bold text-orange-800">
            {question.operand1} {operatorSymbol} {question.operand2} ＝ <span className="text-pink-500">？</span>
          </span>
        </div>
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
        <div className={`text-center p-4 rounded-2xl mb-4 animate-bounce-in ${
          answerState === "correct" ? "bg-emerald-50 border-2 border-emerald-200" : "bg-rose-50 border-2 border-rose-200"
        }`}>
          {answerState === "correct" ? (
            <div>
              <p className="text-2xl font-bold text-emerald-600">🎉 せいかい！ 🎉</p>
              <p className="text-emerald-600">{question.operand1} {operatorSymbol} {question.operand2} ＝ {question.answer} だよ！</p>
            </div>
          ) : (
            <div>
              <p className="text-2xl font-bold text-rose-600">おしい！</p>
              <p className="text-rose-600">こたえは {question.answer} だよ 📚</p>
            </div>
          )}
        </div>
      )}

      {answerState !== "unanswered" && (
        <button
          type="button"
          onClick={onNext}
          aria-label="つぎのもんだいへ"
          className="w-full py-4 px-6 bg-gradient-to-r from-orange-500 to-pink-500 text-white text-xl font-bold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-95 transition-all animate-bounce-in"
        >
          <span className="flex items-center justify-center gap-2">つぎのもんだい →</span>
        </button>
      )}
    </div>
  );
}

// ── ResultModal ──

interface ResultModalProps {
  isOpen: boolean;
  correctCount: number;
  totalCount: number;
  onRetry: () => void;
  onClose: () => void;
}

function ResultModal({ isOpen, correctCount, totalCount, onRetry, onClose }: ResultModalProps) {
  if (!isOpen) return null;
  const percentage = Math.round((correctCount / totalCount) * 100);

  const getResult = () => {
    if (percentage === 100) return { emoji: "👑", message: "パーフェクト！すごい！", color: "text-yellow-500" };
    if (percentage >= 80) return { emoji: "🌟", message: "とてもよくできました！", color: "text-emerald-500" };
    if (percentage >= 60) return { emoji: "😊", message: "よくがんばりました！", color: "text-orange-500" };
    if (percentage >= 40) return { emoji: "📚", message: "もうすこしがんばろう！", color: "text-pink-500" };
    return { emoji: "💪", message: "またちょうせんしよう！", color: "text-rose-500" };
  };

  const result = getResult();
  const starCount = Math.ceil(percentage / 20);
  const stars = Array.from({ length: 5 }, (_, i) => i < starCount);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose} role="dialog" aria-label="ドリルのけっか">
      <div className="bg-white rounded-3xl shadow-2xl p-6 max-w-md w-full animate-bounce-in" onClick={(e) => e.stopPropagation()}>
        <div className="text-center mb-4">
          <span className="text-6xl block animate-float">{result.emoji}</span>
        </div>
        <h2 className={`text-2xl font-bold text-center mb-4 ${result.color}`}>{result.message}</h2>

        <div className="bg-gradient-to-br from-orange-50 to-pink-50 rounded-2xl p-6 mb-6">
          <div className="text-center">
            <p className="text-orange-600 font-bold mb-2">けっか</p>
            <p className="text-5xl font-bold">
              <span className="text-emerald-500">{correctCount}</span>
              <span className="text-orange-400 text-3xl"> / </span>
              <span className="text-orange-600">{totalCount}</span>
            </p>
            <p className="text-lg text-orange-500 mt-2">{percentage}% せいかい</p>
          </div>
          <div className="flex justify-center gap-2 mt-4">
            {stars.map((filled, i) => (
              <span key={i} className={`text-3xl ${filled ? "text-yellow-400 animate-sparkle" : "text-gray-200"}`} style={{ animationDelay: `${i * 0.1}s` }}>★</span>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <button type="button" onClick={onRetry} aria-label="もういちどチャレンジ" className="w-full py-4 px-6 bg-gradient-to-r from-pink-500 to-pink-600 text-white text-lg font-bold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-95 transition-all">
            🔄 もういちどチャレンジ
          </button>
          <button type="button" onClick={onClose} aria-label="トップへもどる" className="w-full py-3 px-6 bg-gray-100 text-gray-600 text-lg font-bold rounded-2xl hover:bg-gray-200 transform hover:scale-[1.02] active:scale-95 transition-all">
            🏠 トップへもどる
          </button>
        </div>
      </div>
    </div>
  );
}

// ── QuestionGrid (一覧) ──

interface QuestionGridProps {
  questions: MathQuestion[];
  onSelectQuestion: (index: number) => void;
}

function QuestionGrid({ questions, onSelectQuestion }: QuestionGridProps) {
  return (
    <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
      {questions.map((q, idx) => {
        const opSymbol = q.type === "addition" ? "+" : "−";
        return (
          <button
            key={idx}
            type="button"
            onClick={() => onSelectQuestion(idx)}
            aria-label={`${q.operand1} ${opSymbol} ${q.operand2}`}
            className="relative rounded-xl border-2 py-2 px-1 flex flex-col items-center justify-center transition-all hover:scale-105 hover:shadow-md active:scale-95 bg-gray-100 border-gray-200 text-gray-600 hover:bg-orange-50 hover:border-orange-300"
          >
            <span className="text-sm font-bold">{q.operand1}{opSymbol}{q.operand2}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── PrintContent ──

interface PrintContentProps {
  pages: MathQuestion[][];
  showAnswers: boolean;
  questionsPerPage: number;
  isPreview: boolean;
}

function PrintContent({ pages, showAnswers, questionsPerPage, isPreview }: PrintContentProps) {
  return (
    <div>
      {pages.map((pageQuestions, pageIndex) => (
        <div key={pageIndex} className={`print-page bg-white ${isPreview ? "mb-4" : "p-8"}`}>
          <div className="shrink-0 flex items-center justify-between mb-1 border-b border-orange-200 pb-1">
            <h1 className="text-base font-bold text-orange-700">
              小1さんすうドリル - たしざん＆ひきざん
            </h1>
            <p className="text-orange-500 text-xs">({pageIndex + 1}/{pages.length})</p>
          </div>

          {pageIndex === 0 && (
            <div className="shrink-0 mb-1 flex items-center gap-1 text-xs">
              <span className="font-bold text-orange-700">なまえ：</span>
              <div className="flex-1 border-b border-orange-300 h-5" />
              <span className="font-bold text-orange-700 ml-2">ひづけ：</span>
              <div className="w-20 border-b border-orange-300 h-5" />
              <span className="font-bold text-orange-700 ml-2">てんすう：</span>
              <div className="w-12 border-b border-orange-300 h-5" />
              <span className="text-orange-500">/ {pages.flat().length}</span>
            </div>
          )}

          <div className="print-questions space-y-0 flex-1">
            {pageQuestions.map((question, index) => {
              const opSymbol = question.type === "addition" ? "＋" : "−";
              return (
                <div key={question.id} className="print-card border border-orange-200 rounded-lg px-2 py-1">
                  <div className="flex items-center gap-3">
                    <div className="shrink-0 w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center text-orange-700 font-bold text-xs">
                      {pageIndex * questionsPerPage + index + 1}
                    </div>
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${question.type === "addition" ? "bg-orange-100 text-orange-700" : "bg-pink-100 text-pink-700"}`} style={{ fontSize: '10px' }}>
                      {typeLabels[question.type]}
                    </span>
                    <span className="text-lg font-bold text-orange-800">
                      {question.operand1} {opSymbol} {question.operand2} ＝
                    </span>
                    {showAnswers ? (
                      <span className="text-lg font-bold text-gray-300 pointer-events-none" style={{ fontFamily: 'var(--font-mincho)' }}>
                        {question.answer}
                      </span>
                    ) : (
                      <div className="w-12 border-b border-dashed border-orange-300 h-6" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="shrink-0 mt-auto pt-1 border-t border-orange-100 text-center text-orange-400" style={{ fontSize: '9px' }}>
            小1さんすうドリル - {showAnswers ? "なぞりがき" : "れんしゅうよう"}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── PrintPage ──

interface PrintPageProps {
  onBack: () => void;
}

function PrintPage({ onBack }: PrintPageProps) {
  const [showAnswers, setShowAnswers] = useState(false);
  const [printCount, setPrintCount] = useState(40);
  const [printQuestions, setPrintQuestions] = useState<MathQuestion[]>(() => generateMathQuestions(40));
  const questionsPerPage = 8;

  const handleRegenerate = () => {
    setPrintQuestions(generateMathQuestions(printCount));
  };

  // printCount が変わったら再生成
  useEffect(() => {
    setPrintQuestions(generateMathQuestions(printCount));
  }, [printCount]);

  const pages: MathQuestion[][] = [];
  for (let i = 0; i < printQuestions.length; i += questionsPerPage) {
    pages.push(printQuestions.slice(i, i + questionsPerPage));
  }

  const handlePrint = () => window.print();

  return (
    <>
      <div className="no-print min-h-screen bg-gradient-to-br from-orange-100 via-orange-50 to-pink-100 p-4">
        <div className="max-w-2xl mx-auto">
          <button type="button" onClick={onBack} aria-label="もどる" className="flex items-center gap-1 text-orange-600 hover:text-orange-700 font-bold py-2 px-3 rounded-xl hover:bg-white/50 transition-all mb-4">
            ← もどる
          </button>

          <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold text-orange-700 mb-4 text-center flex items-center justify-center gap-2">
              🖨️ いんさつせってい
            </h2>

            <div className="mb-4">
              <label className="flex items-center gap-3 cursor-pointer bg-gray-50 p-3 rounded-xl">
                <input type="checkbox" checked={showAnswers} onChange={(e) => setShowAnswers(e.target.checked)} className="w-5 h-5 rounded border-orange-300 text-orange-500 focus:ring-orange-400" />
                <span className="text-orange-700 font-bold">こたえをひょうじする</span>
              </label>
            </div>

            <div className="mb-4">
              <p className="text-sm font-bold text-orange-700 mb-2">📝 もんだいすう</p>
              <div className="grid grid-cols-4 gap-2">
                {[20, 40, 60, 80].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setPrintCount(num)}
                    className={`py-2 px-2 rounded-xl font-bold text-base transition-all ${
                      printCount === num
                        ? "bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-md"
                        : "bg-white text-orange-600 hover:bg-orange-100 border border-orange-200"
                    }`}
                  >
                    {num}もん
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <button type="button" onClick={handleRegenerate} aria-label="もんだいをつくりなおす" className="w-full py-3 px-4 bg-orange-100 text-orange-700 text-base font-bold rounded-xl hover:bg-orange-200 active:scale-95 transition-all flex items-center justify-center gap-2">
                🔀 もんだいをつくりなおす
              </button>
            </div>

            <button type="button" onClick={handlePrint} aria-label="いんさつする" className="w-full py-4 px-6 bg-gradient-to-r from-orange-500 to-pink-500 text-white text-xl font-bold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-95 transition-all">
              <span className="flex items-center justify-center gap-2">🖨️ いんさつする</span>
            </button>

            <p className="text-center text-orange-500 mt-4 text-sm">
              {printQuestions.length}もん / {pages.length}ページ
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-md p-4">
            <h3 className="text-lg font-bold text-orange-700 mb-4 text-center">📄 プレビュー</h3>
            <div className="border-2 border-dashed border-orange-200 rounded-xl p-4 bg-orange-50/50 overflow-auto max-h-96">
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
// Main App
// ══════════════════════════════════════════

type PageType = "home" | "quiz" | "list" | "print";

export default function MathDrillApp() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-orange-100 via-orange-50 to-pink-100 flex items-center justify-center"><p className="text-orange-600 font-bold text-lg">よみこみちゅう...</p></div>}>
      <MathDrillContent />
    </Suspense>
  );
}

function MathDrillContent() {
  const searchParams = useSearchParams();
  const initialPage = searchParams.get("mode") === "print" ? "print" : "home";
  const [page, setPage] = useState<PageType>(initialPage);
  const [currentQuestion, setCurrentQuestion] = useState<MathQuestion | null>(null);
  const [questionIdCounter, setQuestionIdCounter] = useState(1);
  const [sessionTotal, setSessionTotal] = useState(0);
  const [sessionCorrectCount, setSessionCorrectCount] = useState(0);
  const [showSessionResult, setShowSessionResult] = useState(false);
  const [listQuestions, setListQuestions] = useState<MathQuestion[]>([]);
  const [selectedListIndex, setSelectedListIndex] = useState<number | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [dailyStats, setDailyStats] = useState<DailyStats>({ totalAttempted: 0, totalCorrect: 0 });

  useEffect(() => {
    setDailyStats(loadDailyStats());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) saveDailyStats(dailyStats);
  }, [dailyStats, hydrated]);

  const handleAnswer = (isCorrect: boolean) => {
    setSessionTotal((prev) => prev + 1);
    if (isCorrect) setSessionCorrectCount((prev) => prev + 1);
  };

  const handleNext = () => {
    if (page === "list") { setSelectedListIndex(null); return; }
    // 次の問題を生成
    const nextId = questionIdCounter + 1;
    setQuestionIdCounter(nextId);
    setCurrentQuestion(generateSingleQuestion(nextId));
  };

  const handleStartQuiz = () => {
    setSessionTotal(0);
    setSessionCorrectCount(0);
    setQuestionIdCounter(1);
    setCurrentQuestion(generateSingleQuestion(1));
    setShowSessionResult(false);
    setPage("quiz");
  };

  const handleFinishQuiz = () => {
    if (sessionTotal > 0) {
      setDailyStats((prev) => ({
        totalAttempted: prev.totalAttempted + sessionTotal,
        totalCorrect: prev.totalCorrect + sessionCorrectCount,
      }));
      setShowSessionResult(true);
    } else {
      setPage("home");
    }
  };

  const handleRetryFromResult = () => {
    setSessionTotal(0);
    setSessionCorrectCount(0);
    setQuestionIdCounter(1);
    setCurrentQuestion(generateSingleQuestion(1));
    setShowSessionResult(false);
  };

  const handleCloseResult = () => {
    setShowSessionResult(false);
    setPage("home");
  };

  // ── Print ──
  if (page === "print") {
    return <PrintPage onBack={() => setPage("home")} />;
  }

  // ── Home ──
  if (page === "home") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-100 via-orange-50 to-pink-100 flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-lg w-full text-center">
          <Link href="/" className="inline-flex items-center gap-1 text-orange-500 hover:text-orange-600 font-bold text-sm mb-4 transition-all">
            ← きょうかえらび
          </Link>

          <div className="mb-8">
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-pink-500 mb-2">小1さんすう</h1>
            <h2 className="text-2xl font-bold text-orange-600">ドリル</h2>
            <p className="text-orange-400 mt-2 text-lg">たしざん＆ひきざん</p>
          </div>

          <div className="text-7xl mb-6 animate-float">🔢</div>

          <div className="bg-gradient-to-br from-orange-50 to-pink-50 rounded-2xl p-6 mb-8">
            <h3 className="text-lg font-bold text-orange-700 mb-4">きょうのきろく</h3>
            {dailyStats.totalAttempted > 0 ? (
              <>
                <ProgressBar current={dailyStats.totalCorrect} total={dailyStats.totalAttempted} correctCount={dailyStats.totalCorrect} size="lg" />
                <div className="grid grid-cols-2 gap-2 mt-4 text-center">
                  <div className="bg-white/80 rounded-xl p-2">
                    <p className="text-2xl font-bold text-pink-600">{dailyStats.totalAttempted}</p>
                    <p className="text-xs text-pink-400">ちょうせん</p>
                  </div>
                  <div className="bg-white/80 rounded-xl p-2">
                    <p className="text-2xl font-bold text-emerald-600">{dailyStats.totalCorrect}</p>
                    <p className="text-xs text-emerald-400">せいかい</p>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-orange-400 text-sm">まだきろくがないよ。チャレンジしよう！</p>
            )}
          </div>

          <button type="button" onClick={handleStartQuiz} aria-label="はじめる" className="w-full py-5 px-8 bg-gradient-to-r from-orange-500 to-pink-500 text-white text-2xl font-bold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-[1.03] active:scale-95 transition-all mb-4">
            <span className="flex items-center justify-center gap-3">🚀 はじめる</span>
          </button>

          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => { setListQuestions(generateMathQuestions(100)); setPage("list"); }} aria-label="れんしゅう" className="py-3 px-4 bg-orange-100 text-orange-700 text-lg font-bold rounded-xl hover:bg-orange-200 transform hover:scale-[1.02] active:scale-95 transition-all">
              📋 れんしゅう
            </button>
            <button type="button" onClick={() => setPage("print")} aria-label="いんさつ" className="py-3 px-4 bg-pink-100 text-pink-700 text-lg font-bold rounded-xl hover:bg-pink-200 transform hover:scale-[1.02] active:scale-95 transition-all">
              🖨️ いんさつ
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Quiz ──
  if (page === "quiz") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-100 via-orange-50 to-pink-100 p-4">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-4">
            <button type="button" onClick={handleFinishQuiz} aria-label="おわる" className="flex items-center gap-1 text-orange-600 hover:text-orange-700 font-bold py-2 px-3 rounded-xl hover:bg-white/50 transition-all">
              ← おわる
            </button>
            <div className="flex items-center gap-2 text-sm font-bold">
              <span className="bg-pink-100 text-pink-700 px-3 py-1.5 rounded-full">
                {questionIdCounter} もんめ
              </span>
              {sessionCorrectCount > 0 && (
                <span className="bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full flex items-center gap-1">
                  ⭐ {sessionCorrectCount}/{sessionTotal}
                </span>
              )}
            </div>
          </div>

          {currentQuestion && (
            <QuestionCard
              question={currentQuestion}
              onAnswer={handleAnswer}
              onNext={handleNext}
              questionNumber={questionIdCounter}
            />
          )}

          <ResultModal
            isOpen={showSessionResult}
            correctCount={sessionCorrectCount}
            totalCount={sessionTotal}
            onRetry={handleRetryFromResult}
            onClose={handleCloseResult}
          />
        </div>
      </div>
    );
  }

  // ── List ──
  if (page === "list") {
    if (selectedListIndex !== null) {
      const selectedQuestion = listQuestions[selectedListIndex];

      return (
        <div className="min-h-screen bg-gradient-to-br from-orange-100 via-orange-50 to-pink-100 p-4">
          <div className="max-w-lg mx-auto">
            <button type="button" onClick={() => setSelectedListIndex(null)} aria-label="いちらんにもどる" className="flex items-center gap-1 text-orange-600 hover:text-orange-700 font-bold py-2 px-3 rounded-xl hover:bg-white/50 transition-all mb-4">
              ← いちらんにもどる
            </button>
            {selectedQuestion && (
              <QuestionCard
                question={selectedQuestion}
                onAnswer={handleAnswer}
                onNext={handleNext}
                questionNumber={selectedListIndex + 1}
                totalQuestions={listQuestions.length}
              />
            )}
          </div>
        </div>
      );
    }

    const additionQuestions = listQuestions.filter((q) => q.type === "addition");
    const subtractionQuestions = listQuestions.filter((q) => q.type === "subtraction");

    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-100 via-orange-50 to-pink-100 p-4">
        <div className="max-w-2xl mx-auto">
          <button type="button" onClick={() => setPage("home")} aria-label="もどる" className="flex items-center gap-1 text-orange-600 hover:text-orange-700 font-bold py-2 px-3 rounded-xl hover:bg-white/50 transition-all mb-4">
            ← もどる
          </button>

          <h1 className="text-2xl font-bold text-orange-700 text-center mb-6">れんしゅうもんだい</h1>

          <div className="bg-white rounded-2xl shadow-md p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-orange-600">たしざん（{additionQuestions.length}もん）</h3>
            </div>
            <QuestionGrid questions={additionQuestions} onSelectQuestion={(idx) => {
              setSelectedListIndex(listQuestions.indexOf(additionQuestions[idx]));
            }} />
          </div>

          <div className="bg-white rounded-2xl shadow-md p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-pink-600">ひきざん（{subtractionQuestions.length}もん）</h3>
            </div>
            <QuestionGrid questions={subtractionQuestions} onSelectQuestion={(idx) => {
              setSelectedListIndex(listQuestions.indexOf(subtractionQuestions[idx]));
            }} />
          </div>

          <button type="button" onClick={() => setListQuestions(generateMathQuestions(100))} aria-label="もんだいをつくりなおす" className="w-full py-4 px-8 bg-orange-100 text-orange-700 text-lg font-bold rounded-2xl hover:bg-orange-200 transform hover:scale-[1.02] active:scale-95 transition-all mb-4 flex items-center justify-center gap-2">
            🔀 もんだいをつくりなおす
          </button>

          <button type="button" onClick={handleStartQuiz} aria-label="ランダムにチャレンジ" className="w-full py-4 px-8 bg-gradient-to-r from-pink-500 to-pink-600 text-white text-lg font-bold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-95 transition-all">
            🚀 ランダムにチャレンジ
          </button>
        </div>
      </div>
    );
  }

  return null;
}
