"use client";

import Link from "next/link";

const printSubjects = [
  {
    href: "/kokugo?mode=print",
    emoji: "📖",
    title: "こくご",
    subtitle: "かんじドリル",
    description: "かんじのよみ・かきをいんさつ！",
    gradient: "from-sky-400 to-indigo-500",
    bgLight: "from-sky-50 to-indigo-50",
    borderColor: "border-sky-200",
    hoverBorder: "hover:border-sky-400",
    textColor: "text-sky-700",
  },
  {
    href: "/sansuu?mode=print",
    emoji: "🔢",
    title: "さんすう",
    subtitle: "たしざん＆ひきざん",
    description: "けいさんもんだいをいんさつ！",
    gradient: "from-orange-400 to-pink-500",
    bgLight: "from-orange-50 to-pink-50",
    borderColor: "border-orange-200",
    hoverBorder: "hover:border-orange-400",
    textColor: "text-orange-700",
  },
  {
    href: "/clock?mode=print",
    emoji: "🕐",
    title: "とけい",
    subtitle: "とけいドリル",
    description: "とけいのもんだいをいんさつ！",
    gradient: "from-amber-400 to-yellow-400",
    bgLight: "from-amber-50 to-yellow-50",
    borderColor: "border-amber-200",
    hoverBorder: "hover:border-amber-400",
    textColor: "text-amber-700",
  },
];

export default function PrintSelectPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-pink-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-lg w-full text-center">
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-orange-500 hover:text-orange-600 font-bold text-sm mb-4 transition-all"
          >
            ← トップへもどる
          </Link>
          <div className="text-6xl mb-4 animate-float">🖨️</div>
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-pink-500 mb-2">
            プリント
          </h1>
          <p className="text-orange-400 text-lg">
            きょうかをえらんでいんさつしよう！
          </p>
        </div>

        <div className="space-y-4">
          {printSubjects.map((subject) => (
            <Link
              key={subject.href}
              href={subject.href}
              className={`block bg-white rounded-3xl shadow-lg border-3 ${subject.borderColor} ${subject.hoverBorder} hover:shadow-xl transform hover:scale-[1.02] active:scale-95 transition-all overflow-hidden`}
            >
              <div
                className={`bg-gradient-to-r ${subject.gradient} px-6 py-3 flex items-center gap-3`}
              >
                <span className="text-4xl">{subject.emoji}</span>
                <div className="text-left">
                  <h2 className="text-2xl font-bold text-white">
                    {subject.title}
                  </h2>
                  <p className="text-white/80 text-sm">{subject.subtitle}</p>
                </div>
                <span className="ml-auto text-white text-2xl">→</span>
              </div>
              <div
                className={`bg-gradient-to-br ${subject.bgLight} px-6 py-4`}
              >
                <p className={`${subject.textColor} font-bold`}>
                  {subject.description}
                </p>
              </div>
            </Link>
          ))}
        </div>

        <p className="mt-8 text-orange-300 text-sm">
          かみにいんさつしてれんしゅうしよう！ ✏️
        </p>
      </div>
    </div>
  );
}
