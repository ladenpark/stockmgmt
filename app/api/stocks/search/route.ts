import { NextResponse } from "next/server";
import { searchStocks } from "@/lib/stockDictionary";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";
  const limit = parseInt(searchParams.get("limit") || "10", 10);

  if (!q.trim()) {
    const popular = searchStocks("", limit);
    return NextResponse.json({ success: true, data: popular });
  }

  // 1. KRX 2,747개 전 상장종목 + 미국 주요주 인메모리 초고속 검색 (1ms 미만)
  const localResults = searchStocks(q, limit);

  // 2. 만약 상장 데이터에 없는 경우 (예: 비상장 스타트업 '마키나락스' 등)
  if (localResults.length === 0 && q.trim().length >= 1) {
    const raw = q.trim();
    const isKorean = /[가-힣ㄱ-ㅎ]/.test(raw);

    localResults.push({
      ticker: raw.toUpperCase(),
      name: raw,
      nameEn: raw,
      market: isKorean ? "KR" : "US",
      currency: isKorean ? "KRW" : "USD",
      category: isKorean ? "국내주식 / 비상장" : "해외주식 / 기타",
    });
  }

  return NextResponse.json({
    success: true,
    data: localResults,
  });
}
