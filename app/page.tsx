"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  SlidersHorizontal,
  RefreshCw,
  Globe2,
  Building2,
  Layers,
} from "lucide-react";
import { DashboardHeader } from "@/components/DashboardHeader";
import { StockCard } from "@/components/StockCard";
import { FilterModal } from "@/components/FilterModal";
import { AccountsDrawer } from "@/components/AccountsDrawer";

interface PortfolioItem {
  id: string;
  ticker: string;
  category: string;
  account: string;
  currency: "KRW" | "USD";
  market: "KR" | "US";
  quantity: number;
  averagePrice: number;
  totalCost: number;
}

interface CashItem {
  account: string;
  currency: "KRW" | "USD";
  amount: number;
}

interface StockQuote {
  ticker: string;
  name: string;
  currency: "USD" | "KRW";
  market: "US" | "KR";
  regularMarketPrice: number;
  currentPrice: number;
  currentChangePercent: number;
  priceKRW: number;
  marketState: "REGULAR" | "PRE" | "POST" | "CLOSED";
  marketStateLabel: string;
  preMarketPrice?: number;
  postMarketPrice?: number;
}

export default function DashboardPage() {
  // 1. Data States
  const [loading, setLoading] = useState(true);
  const [holdings, setHoldings] = useState<PortfolioItem[]>([]);
  const [cashHoldings, setCashHoldings] = useState<CashItem[]>([]);
  const [quotes, setQuotes] = useState<Record<string, StockQuote>>({});
  const [exchangeRate, setExchangeRate] = useState<number>(1385.0);
  const [summaryData, setSummaryData] = useState({
    totalInitialCostKRW: 0,
    totalInitialCostUSD: 0,
    totalRealizedPnLKRW: 0,
    totalRealizedPnLUSD: 0,
  });

  // Filter options from API
  const [accountList, setAccountList] = useState<string[]>([]);
  const [categoryList, setCategoryList] = useState<string[]>([]);

  // 2. Interactive Filter & View States
  const [currencyView, setCurrencyView] = useState<"KRW" | "USD">("KRW");
  const [mode] = useState<"regular" | "evaluation">("evaluation");
  const [profitViewMode, setProfitViewMode] = useState<"total" | "daily">("total");
  const [marketFilter, setMarketFilter] = useState<"all" | "us" | "kr">("all");
  const [accountFilter, setAccountFilter] = useState<string>("all");
  const [currencyFilter, setCurrencyFilter] = useState<"all" | "KRW" | "USD">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [hideAssetAmounts, setHideAssetAmounts] = useState(false);

  // Modal & Drawer States
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isAccountsDrawerOpen, setIsAccountsDrawerOpen] = useState(false);

  // API 데이터 로딩 (단계별 Progressive Loading)
  const fetchData = async () => {
    setLoading(true);

    // 안전 방어막: 2초 내에 무조건 로딩 해제 보장
    const safetyTimer = setTimeout(() => {
      setLoading(false);
    }, 2000);

    try {
      const portRes = await fetch(
        `/api/portfolio?market=${marketFilter}&account=${accountFilter}&currency=${currencyFilter}&category=${categoryFilter}`
      );
      const portData = await portRes.json();

      let currentHoldings: PortfolioItem[] = [];

      if (portData.success) {
        currentHoldings = portData.holdings || [];
        setHoldings(currentHoldings);
        setCashHoldings(portData.cashHoldings || []);
        setSummaryData(portData.summary || {});

        if (portData.availableFilters) {
          setAccountList(portData.availableFilters.accounts || []);
          setCategoryList(portData.availableFilters.categories || []);
        }
      }

      clearTimeout(safetyTimer);
      setLoading(false);

      const tickerSet = new Set(currentHoldings.map((h) => h.ticker));
      const tickerList = Array.from(tickerSet).join(",");

      const stockRes = await fetch(`/api/stocks?tickers=${tickerList || "NVDA,TSLA,005930,371160"}`);
      const stockData = await stockRes.json();

      if (stockData.success && stockData.data) {
        setQuotes(stockData.data.quotes || {});
        if (stockData.data.exchangeRate?.rate) {
          setExchangeRate(stockData.data.exchangeRate.rate);
        }
      }
    } catch (err) {
      console.error("데이터 로딩 실패:", err);
      clearTimeout(safetyTimer);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [marketFilter, accountFilter, currencyFilter, categoryFilter]);

  // 3. Dynamic Realtime Portfolio Calculations
  const calculatedData = useMemo(() => {
    let currentEvaluationKRW = 0;
    let initialCostKRW = 0;
    let totalDailyGainKRW = 0;

    const rawProcessed = holdings.map((item) => {
      const quote = quotes[item.ticker];

      const unitPrice =
        quote && quote.currentPrice > 0
          ? mode === "evaluation"
            ? quote.currentPrice
            : quote.regularMarketPrice
          : item.averagePrice || 1.0;

      const evalAmountCurrency = item.quantity * unitPrice;
      const costAmountCurrency = item.totalCost;

      const evalKRW = item.currency === "USD" ? evalAmountCurrency * exchangeRate : evalAmountCurrency;
      const costKRW = item.currency === "USD" ? costAmountCurrency * exchangeRate : costAmountCurrency;

      currentEvaluationKRW += evalKRW;
      initialCostKRW += costKRW;

      const gainCurrency = evalAmountCurrency - costAmountCurrency;
      const gainKRW = evalKRW - costKRW;
      const gainPercent = costAmountCurrency > 0 ? (gainCurrency / costAmountCurrency) * 100 : 0;

      const dailyChangePercent = quote?.currentChangePercent || 0;
      const dailyGainCurrency = (evalAmountCurrency * dailyChangePercent) / 100;
      const dailyGainKRW = item.currency === "USD" ? dailyGainCurrency * exchangeRate : dailyGainCurrency;

      totalDailyGainKRW += dailyGainKRW;

      return {
        ...item,
        name: quote?.name || item.ticker,
        currentUnitPrice: unitPrice,
        evalAmountCurrency,
        evalKRW,
        costAmountCurrency,
        costKRW,
        gainCurrency,
        gainKRW,
        gainPercent,
        dailyChangePercent,
        dailyGainCurrency,
        dailyGainKRW,
        marketStateLabel: quote?.marketStateLabel || (item.market === "US" ? "장마감" : "정규장"),
      };
    });

    let processedHoldings: (typeof rawProcessed[0] & { accountsList: string[] })[] = [];

    if (accountFilter === "all") {
      const groupedMap = new Map<string, typeof rawProcessed[0] & { accountsList: string[] }>();

      for (const item of rawProcessed) {
        const key = `${item.currency}-${item.ticker}`;
        const existing = groupedMap.get(key);

        if (existing) {
          existing.quantity += item.quantity;
          existing.costAmountCurrency += item.costAmountCurrency;
          existing.costKRW += item.costKRW;
          existing.evalAmountCurrency += item.evalAmountCurrency;
          existing.evalKRW += item.evalKRW;
          existing.gainCurrency += item.gainCurrency;
          existing.gainKRW += item.gainKRW;
          existing.dailyGainCurrency += item.dailyGainCurrency;
          existing.dailyGainKRW += item.dailyGainKRW;

          if (!existing.accountsList.includes(item.account)) {
            existing.accountsList.push(item.account);
          }

          existing.averagePrice = existing.quantity > 0 ? existing.costAmountCurrency / existing.quantity : 0;
          existing.gainPercent =
            existing.costAmountCurrency > 0 ? (existing.gainCurrency / existing.costAmountCurrency) * 100 : 0;
        } else {
          groupedMap.set(key, {
            ...item,
            accountsList: [item.account],
            gainPercent: item.costAmountCurrency > 0 ? (item.gainCurrency / item.costAmountCurrency) * 100 : 0,
          });
        }
      }
      processedHoldings = Array.from(groupedMap.values());
    } else {
      processedHoldings = rawProcessed.map((item) => ({
        ...item,
        accountsList: [item.account],
        gainPercent: item.costAmountCurrency > 0 ? (item.gainCurrency / item.costAmountCurrency) * 100 : 0,
      }));
    }

    let cashKRW = 0;
    let cashUSD = 0;

    cashHoldings.forEach((c) => {
      if (c.currency === "USD") {
        cashUSD += c.amount;
        cashKRW += c.amount * exchangeRate;
      } else {
        cashKRW += c.amount;
        cashUSD += c.amount / exchangeRate;
      }
    });

    const totalAssetKRW = currentEvaluationKRW;
    const totalGainKRW = currentEvaluationKRW - initialCostKRW;
    const totalGainPercent = initialCostKRW > 0 ? (totalGainKRW / initialCostKRW) * 100 : 0;

    const totalDailyGainPercent = currentEvaluationKRW > 0 ? (totalDailyGainKRW / currentEvaluationKRW) * 100 : 0;

    const totalAssetUSD = totalAssetKRW / exchangeRate;
    const totalGainUSD = totalGainKRW / exchangeRate;
    const totalDailyGainUSD = totalDailyGainKRW / exchangeRate;
    const totalInitialCostUSD = initialCostKRW / exchangeRate;

    return {
      totalAssetKRW,
      totalAssetUSD,
      totalGainKRW,
      totalGainUSD,
      totalGainPercent,
      totalDailyGainKRW,
      totalDailyGainUSD,
      totalDailyGainPercent,
      initialCostKRW,
      totalInitialCostUSD,
      cashKRW,
      cashUSD,
      processedHoldings,
    };
  }, [holdings, quotes, exchangeRate, mode, accountFilter, cashHoldings]);

  const handleResetFilters = () => {
    setMarketFilter("all");
    setAccountFilter("all");
    setCurrencyFilter("all");
    setCategoryFilter("all");
  };

  return (
    <div className="min-h-screen bg-slate-50/60 pb-20">
      <main className="max-w-md md:max-w-4xl mx-auto p-4 md:p-6 space-y-6">
        {/* 1. 리디자인된 대시보드 헤더 & 총자산 카드 */}
        <DashboardHeader
          totalAssetKRW={calculatedData.totalAssetKRW}
          totalAssetUSD={calculatedData.totalAssetUSD}
          totalGainKRW={calculatedData.totalGainKRW}
          totalGainUSD={calculatedData.totalGainUSD}
          totalGainPercent={calculatedData.totalGainPercent}
          totalDailyGainKRW={calculatedData.totalDailyGainKRW}
          totalDailyGainUSD={calculatedData.totalDailyGainUSD}
          totalDailyGainPercent={calculatedData.totalDailyGainPercent}
          totalInitialCostKRW={calculatedData.initialCostKRW}
          totalInitialCostUSD={calculatedData.totalInitialCostUSD}
          cashKRW={calculatedData.cashKRW}
          cashUSD={calculatedData.cashUSD}
          exchangeRate={exchangeRate}
          currencyView={currencyView}
          profitViewMode={profitViewMode}
          hideAssetAmounts={hideAssetAmounts}
          onToggleCurrency={() => setCurrencyView((prev) => (prev === "KRW" ? "USD" : "KRW"))}
          onToggleProfitMode={(m) => setProfitViewMode(m)}
          onToggleHideAmounts={() => setHideAssetAmounts((prev) => !prev)}
          onOpenAccountsDrawer={() => setIsAccountsDrawerOpen(true)}
          onRefresh={fetchData}
        />

        {/* 2. 현대적인 가로 스크롤형 칩 필터 바 (Segmented Control) */}
        <section className="bg-white rounded-3xl p-4 border border-slate-100 shadow-xs space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-blue-500" />
              다차원 포트폴리오 필터
            </h2>
            {(marketFilter !== "all" || accountFilter !== "all" || categoryFilter !== "all") && (
              <button
                onClick={handleResetFilters}
                className="text-xs text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> 초기화
              </button>
            )}
          </div>

          <div className="space-y-2.5">
            {/* 시장 필터 칩 */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
              <span className="text-slate-400 font-semibold shrink-0 mr-1 flex items-center gap-1 text-[11px]">
                <Globe2 className="w-3 h-3 text-slate-400" /> 시장
              </span>
              <button
                onClick={() => setMarketFilter("all")}
                className={`px-3.5 py-1.5 rounded-full shrink-0 transition-all ${
                  marketFilter === "all"
                    ? "bg-slate-900 text-white font-bold shadow-xs"
                    : "bg-slate-100 hover:bg-slate-200/70 text-slate-600 font-medium"
                }`}
              >
                전체 (All)
              </button>
              <button
                onClick={() => setMarketFilter("us")}
                className={`px-3.5 py-1.5 rounded-full shrink-0 transition-all ${
                  marketFilter === "us"
                    ? "bg-slate-900 text-white font-bold shadow-xs"
                    : "bg-slate-100 hover:bg-slate-200/70 text-slate-600 font-medium"
                }`}
              >
                해외주식 (US) 🇺🇸
              </button>
              <button
                onClick={() => setMarketFilter("kr")}
                className={`px-3.5 py-1.5 rounded-full shrink-0 transition-all ${
                  marketFilter === "kr"
                    ? "bg-slate-900 text-white font-bold shadow-xs"
                    : "bg-slate-100 hover:bg-slate-200/70 text-slate-600 font-medium"
                }`}
              >
                국내주식 (KR) 🇰🇷
              </button>
            </div>

            {/* 계좌 필터 칩 */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
              <span className="text-slate-400 font-semibold shrink-0 mr-1 flex items-center gap-1 text-[11px]">
                <Building2 className="w-3 h-3 text-slate-400" /> 계좌
              </span>
              <button
                onClick={() => setAccountFilter("all")}
                className={`px-3.5 py-1.5 rounded-full shrink-0 transition-all ${
                  accountFilter === "all"
                    ? "bg-slate-900 text-white font-bold shadow-xs"
                    : "bg-slate-100 hover:bg-slate-200/70 text-slate-600 font-medium"
                }`}
              >
                전체 계좌 (합산)
              </button>
              {accountList.map((acc) => (
                <button
                  key={acc}
                  onClick={() => setAccountFilter(acc)}
                  className={`px-3.5 py-1.5 rounded-full shrink-0 transition-all ${
                    accountFilter === acc
                      ? "bg-slate-900 text-white font-bold shadow-xs"
                      : "bg-slate-100 hover:bg-slate-200/70 text-slate-600 font-medium"
                  }`}
                >
                  {acc}
                </button>
              ))}
            </div>

            {/* 자산유형 필터 칩 */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
              <span className="text-slate-400 font-semibold shrink-0 mr-1 flex items-center gap-1 text-[11px]">
                <Layers className="w-3 h-3 text-slate-400" /> 자산유형
              </span>
              <button
                onClick={() => setCategoryFilter("all")}
                className={`px-3.5 py-1.5 rounded-full shrink-0 transition-all ${
                  categoryFilter === "all"
                    ? "bg-slate-900 text-white font-bold shadow-xs"
                    : "bg-slate-100 hover:bg-slate-200/70 text-slate-600 font-medium"
                }`}
              >
                전체 (All)
              </button>
              {categoryList.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3.5 py-1.5 rounded-full shrink-0 transition-all ${
                    categoryFilter === cat
                      ? "bg-slate-900 text-white font-bold shadow-xs"
                      : "bg-slate-100 hover:bg-slate-200/70 text-slate-600 font-medium"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* 3. 리디자인된 보유 종목 카드 리스트 */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              보유 종목 목록
              <span className="bg-blue-50 text-blue-600 border border-blue-100 px-2.5 py-0.5 rounded-full text-xs font-bold">
                {calculatedData.processedHoldings.length}개
              </span>
            </h2>
          </div>

          {loading ? (
            <div className="bg-white rounded-3xl p-10 border border-slate-100 text-center space-y-3 shadow-xs">
              <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-500 font-bold">실시간 포트폴리오 파싱 중...</p>
            </div>
          ) : calculatedData.processedHoldings.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 border border-slate-100 text-center space-y-2 shadow-xs">
              <p className="text-sm font-bold text-slate-900">선택한 필터 조건에 해당되는 종목이 없습니다.</p>
              <p className="text-xs text-slate-400">필터 조건을 변경하거나 초기화해 보세요.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {calculatedData.processedHoldings.map((item) => (
                <StockCard
                  key={`${item.accountsList.join("-")}-${item.ticker}`}
                  item={item}
                  currencyView={currencyView}
                  profitViewMode={profitViewMode}
                  hideAssetAmounts={hideAssetAmounts}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* 4. 필터 모달 */}
      <FilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        hideAssetAmounts={hideAssetAmounts}
        setHideAssetAmounts={setHideAssetAmounts}
        selectedCategory={categoryFilter}
        setSelectedCategory={setCategoryFilter}
        categories={categoryList}
        onResetFilters={handleResetFilters}
      />

      {/* 5. 계좌 서랍장 (Drawer) */}
      <AccountsDrawer
        isOpen={isAccountsDrawerOpen}
        onClose={() => setIsAccountsDrawerOpen(false)}
        selectedAccount={accountFilter}
        onSelectAccount={(accName) => setAccountFilter(accName)}
        totalAssetKRW={calculatedData.totalAssetKRW}
        hideAssetAmounts={hideAssetAmounts}
      />
    </div>
  );
}
