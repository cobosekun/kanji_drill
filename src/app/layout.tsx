import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "小1かんじドリル — 80字マスター",
  description: "小学1年生の漢字80字を楽しく練習するドリルアプリ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
