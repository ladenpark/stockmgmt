import { NextResponse } from "next/server";
import { searchStocks } from "@/lib/stockDictionary";
import { BACKEND_API_URL } from "@/lib/backend";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";
  const limit = parseInt(searchParams.get("limit") || "10", 10);

  if (!q.trim()) {
    const popular = searchStocks("", limit);
    return NextResponse.json({ success: true, data: popular });
  }

  // 1. 외부 Yahoo Finance 검색 API를 우선 사용한다.
  try {
    const response = await fetch(
      `${BACKEND_API_URL}/stocks/search?q=${encodeURIComponent(q.trim())}&limit=${Math.min(Math.max(limit, 1), 20)}`,
      { cache: "no-store" },
    );
    if (response.ok) {
      const apiResult = await response.json();
      if (Array.isArray(apiResult.data) && apiResult.data.length > 0) {
        return NextResponse.json({ success: true, data: apiResult.data, source: "yahoo_finance" });
      }
    }
  } catch {
    // API 장애 시 아래 로컬 사전 검색으로 계속 진행한다.
  }

  // 2. 로컬 사전은 초성 검색 및 외부 API 장애 시 백업으로 사용한다.
  const localResults = searchStocks(q, limit);

  // 3. 사전에도 없는 경우에만 사용자가 입력한 값을 후보로 반환한다.
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
    source: "local_fallback",
  });
}
