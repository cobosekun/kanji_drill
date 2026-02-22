import { NextResponse } from "next/server";
import { kanjiQuestions } from "@/data/kanji-questions";

export async function GET() {
  return NextResponse.json(kanjiQuestions);
}
