import { NextRequest, NextResponse } from "next/server";
import { getPortfolioData } from "@/lib/googleSheets";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Query parameters 파싱
    const market = (searchParams.get("market") || "all").toLowerCase(); // 'all', 'kr', 'us'
    const account = searchParams.get("account") || "all";
    const currency = (searchParams.get("currency") || "all").toUpperCase(); // 'ALL', 'KRW', 'USD'
    const category = searchParams.get("category") || "all";

    // 1. 구글 시트 기반 종합 포트폴리오 데이터 수집
    const portfolio = await getPortfolioData();

    // 2. 보유 종목 다차원 필터링
    let filteredHoldings = portfolio.holdings.filter((item) => {
      // Market 필터 (KR / US)
      if (market !== "all") {
        if (market === "kr" && item.market !== "KR") return false;
        if (market === "us" && item.market !== "US") return false;
      }

      // Account 필터 (계좌별)
      if (account !== "all" && item.account !== account) {
        return false;
      }

      // Currency 필터 (통화별)
      if (currency !== "ALL" && item.currency !== currency) {
        return false;
      }

      // Category 필터 (카테고리별)
      if (category !== "all" && item.category !== category) {
        return false;
      }

      return true;
    });

    // 3. 예수금 현금 자산 필터링
    let filteredCash = portfolio.cashHoldings.filter((cash) => {
      if (account !== "all" && cash.account !== account) return false;
      if (currency !== "ALL" && cash.currency !== currency) return false;
      if (market === "kr" && cash.currency !== "KRW") return false;
      if (market === "us" && cash.currency !== "USD") return false;
      return true;
    });

    // 4. 거래내역 필터링
    let filteredTradeHistory = portfolio.tradeHistory.filter((trade) => {
      if (market !== "all") {
        if (market === "kr" && trade.market !== "KR") return false;
        if (market === "us" && trade.market !== "US") return false;
      }
      if (account !== "all" && trade.account !== account) return false;
      if (currency !== "ALL" && trade.currency !== currency) return false;
      if (category !== "all" && trade.category !== category) return false;
      return true;
    });

    // 5. History 필터링
    let filteredAssetHistory = portfolio.assetHistory.filter((history) => {
      if (account !== "all" && history.account !== "전체계좌" && history.account !== account) {
        return false;
      }
      if (category !== "all" && history.category !== "전체" && history.category !== category) {
        return false;
      }
      return true;
    });

    // 6. 필터링된 포트폴리오 요약 재산출
    let totalInitialCostKRW = 0;
    let totalInitialCostUSD = 0;
    let totalRealizedPnLKRW = 0;
    let totalRealizedPnLUSD = 0;

    for (const h of filteredHoldings) {
      if (h.currency === "USD") {
        totalInitialCostUSD += h.totalCost;
      } else {
        totalInitialCostKRW += h.totalCost;
      }
    }

    for (const t of filteredTradeHistory) {
      if (t.currency === "USD") {
        totalRealizedPnLUSD += t.realizedPnL;
      } else {
        totalRealizedPnLKRW += t.realizedPnL;
      }
    }

    return NextResponse.json({
      success: true,
      filtersApplied: {
        market,
        account,
        currency,
        category,
      },
      summary: {
        totalInitialCostKRW,
        totalInitialCostUSD,
        totalRealizedPnLKRW,
        totalRealizedPnLUSD,
        holdingCount: filteredHoldings.length,
      },
      holdings: filteredHoldings,
      cashHoldings: filteredCash,
      tradeHistory: filteredTradeHistory,
      assetHistory: filteredAssetHistory,
      availableFilters: {
        accounts: Array.from(new Set(portfolio.holdings.map((h) => h.account))),
        categories: Array.from(new Set(portfolio.holdings.map((h) => h.category))),
      },
    });
  } catch (error: any) {
    console.error("포트폴리오 API 처리 중 오류 발생:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "포트폴리오 데이터를 불러오는 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}
