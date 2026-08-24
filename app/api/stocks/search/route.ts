import { NextResponse } from "next/server";
import { searchStocks } from "@/lib/stockDictionary";
import { fetchUSStockQuote, fetchKRStockQuote, fetchExchangeRate } from "@/lib/stockFetcher";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";
  const limit = parseInt(searchParams.get("limit") || "10", 10);

  if (!q.trim()) {
    const popular = searchStocks("", limit);
    return NextResponse.json({ success: true, data: popular });
  }

  // 1. 사전 기반 초고속 검색 (한글명, 영문명, 티커, 초성, 별칭)
  const localResults = searchStocks(q, limit);

  // 2. 만약 결과가 없거나 적은 경우, 실제 티커 형태인지 판별하여 실시간 조회 시도
  if (localResults.length === 0 && q.trim().length >= 2) {
    const cleanQ = q.trim().toUpperCase();
    const isKR = /^[0-9][0-9A-Z]{5}$/i.test(cleanQ);

    try {
      const exchangeInfo = await fetchExchangeRate();
      if (isKR) {
        const krQuote = await fetchKRStockQuote(cleanQ);
        if (krQuote && krQuote.name) {
          localResults.push({
            ticker: cleanQ,
            name: krQuote.name,
            market: "KR",
            currency: "KRW",
            category: "국내주식",
          });
        }
      } else {
        const usQuote = await fetchUSStockQuote(cleanQ, exchangeInfo.rate);
        if (usQuote && usQuote.name) {
          localResults.push({
            ticker: cleanQ,
            name: usQuote.name,
            nameEn: usQuote.name,
            market: "US",
            currency: "USD",
            category: "해외주식",
          });
        }
      }
    } catch {
      // ignore
    }
  }

  return NextResponse.json({
    success: true,
    data: localResults,
  });
}
