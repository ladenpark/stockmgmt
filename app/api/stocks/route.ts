import { NextRequest, NextResponse } from "next/server";
import { fetchStockQuotesBatch, fetchExchangeRate } from "@/lib/stockFetcher";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tickersParam = searchParams.get("tickers");

    let tickersToFetch: string[] = [];

    if (tickersParam) {
      tickersToFetch = tickersParam
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
    }

    // 기본 티커가 없는 경우 주요 종목 프리셋 사용
    if (tickersToFetch.length === 0) {
      tickersToFetch = ["NVDA", "TSLA", "AAPL", "005930", "371160", "480310"];
    }

    const batchResult = await fetchStockQuotesBatch(tickersToFetch);

    return NextResponse.json({
      success: true,
      data: batchResult,
    });
  } catch (error: any) {
    console.error("실시간 시세 API 수집 오류:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "실시간 시세 및 환율을 수집하는 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}
