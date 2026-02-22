import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "小1ドリル — こくご＆さんすう",
  description: "小学1年生の漢字・たしざん・ひきざんを楽しく練習するドリルアプリ",
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
