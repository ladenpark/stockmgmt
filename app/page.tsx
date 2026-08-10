"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Wallet,
  ArrowUpDown,
  SlidersHorizontal,
  RefreshCw,
  Eye,
  EyeOff,
  Building2,
  Globe2,
  Coins,
  TrendingUp,
  TrendingDown,
  Layers,
  Sparkles,
  DollarSign,
} from "lucide-react";
import { SparklineChart } from "@/components/SparklineChart";
import { FilterModal } from "@/components/FilterModal";
import { QuickNavButtons } from "@/components/QuickNavButtons";
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
  const [currencyView, setCurrencyView] = useState<"KRW" | "USD">("KRW"); // 원화 / 달러 표시 토글
  const [mode, setMode] = useState<"regular" | "evaluation">("evaluation"); // 시세 vs 평가 모드
  const [profitViewMode, setProfitViewMode] = useState<"total" | "daily">("total"); // 전체 수익 vs 일간 수익 토글
  const [marketFilter, setMarketFilter] = useState<"all" | "us" | "kr">("all");
  const [accountFilter, setAccountFilter] = useState<string>("all");
  const [currencyFilter, setCurrencyFilter] = useState<"all" | "KRW" | "USD">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [hideAssetAmounts, setHideAssetAmounts] = useState(false);

  // Modal & Drawer States
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isAccountsDrawerOpen, setIsAccountsDrawerOpen] = useState(false);

  // API 데이터 로딩
  const fetchData = async () => {
    setLoading(true);
    try {
      // API 1: Portfolio Data
      const portRes = await fetch(
        `/api/portfolio?market=${marketFilter}&account=${accountFilter}&currency=${currencyFilter}&category=${categoryFilter}`
      );
      const portData = await portRes.json();

      if (portData.success) {
        setHoldings(portData.holdings || []);
        setCashHoldings(portData.cashHoldings || []);
        setSummaryData(portData.summary || {});

        if (portData.availableFilters) {
          setAccountList(portData.availableFilters.accounts || []);
          setCategoryList(portData.availableFilters.categories || []);
        }
      }

      // Collect tickers for API 2
      const tickerSet = new Set((portData.holdings || []).map((h: PortfolioItem) => h.ticker));
      const tickerList = Array.from(tickerSet).join(",");

      // API 2: Realtime Stock Quotes & Exchange Rate
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [marketFilter, accountFilter, currencyFilter, categoryFilter]);

  // 3. Dynamic Realtime Portfolio Calculations with Multi-Account Grouping
  const calculatedData = useMemo(() => {
    let currentEvaluationKRW = 0;
    let initialCostKRW = 0;
    let totalDailyGainKRW = 0;

    // 1차 개별 종목 수치 계산
    const rawProcessed = holdings.map((item) => {
      const quote = quotes[item.ticker];

      // 실시간 시세 단가
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

      // 전체 손익
      const gainCurrency = evalAmountCurrency - costAmountCurrency;
      const gainKRW = evalKRW - costKRW;
      const gainPercent = costAmountCurrency > 0 ? (gainCurrency / costAmountCurrency) * 100 : 0;

      // 일간 손익 (당일 시세 변동액 기반)
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

    // 2차 그룹핑 (전체계좌 선택 시 동일 종목 그룹핑 & 계좌 복수 표시)
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

          // 가중 평단가 및 수익률 재계산
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

    // 현금 예수금 합산 (원화 / 달러)
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

    // 총 자산 평가액 = 주식 평가금액
    const totalAssetKRW = currentEvaluationKRW;

    // 전체 손익 합계
    const totalGainKRW = currentEvaluationKRW - initialCostKRW;
    const totalGainPercent = initialCostKRW > 0 ? (totalGainKRW / initialCostKRW) * 100 : 0;

    // 일간 손익 합계
    const totalDailyGainPercent = currentEvaluationKRW > 0 ? (totalDailyGainKRW / currentEvaluationKRW) * 100 : 0;

    // 달러 단위 가치 환산
    const totalAssetUSD = totalAssetKRW / exchangeRate;
    const totalGainUSD = totalGainKRW / exchangeRate;
    const totalDailyGainUSD = totalDailyGainKRW / exchangeRate;

    return {
      processedHoldings,
      totalAssetKRW,
      totalAssetUSD,
      totalGainKRW,
      totalGainUSD,
      totalGainPercent,
      totalDailyGainKRW,
      totalDailyGainUSD,
      totalDailyGainPercent,
      cashKRW,
      cashUSD,
    };
  }, [holdings, cashHoldings, quotes, exchangeRate, mode, accountFilter]);

  // 금액 표시 포맷터
  const displayAmount = (krw: number, usd: number) => {
    if (hideAssetAmounts) return "••••••";
    if (currencyView === "USD") {
      return `$${usd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `₩${Math.round(krw).toLocaleString("ko-KR")}`;
  };

  const handleResetFilters = () => {
    setMarketFilter("all");
    setAccountFilter("all");
    setCurrencyFilter("all");
    setCategoryFilter("all");
    setMode("evaluation");
    setProfitViewMode("total");
  };

  return (
    <div className="flex-1 pb-12 bg-white text-[#191F28]">
      {/* Navbar Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-[#E5E8EB] px-5 py-3.5 flex items-center justify-between">
        <button
          onClick={() => setIsAccountsDrawerOpen(true)}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer group"
          title="계좌 관리 서랍장 열기"
        >
          <div className="w-8 h-8 rounded-xl bg-[#3182F6] flex items-center justify-center text-white font-extrabold text-sm shadow-md shadow-[#3182F6]/20 group-hover:scale-105 transition-transform">
            S
          </div>
          <div className="text-left">
            <span className="font-extrabold text-lg tracking-tight text-[#191F28] block leading-none">mystockapp</span>
            <span className="text-[10px] text-[#3182F6] font-bold">계좌 서랍 ☰</span>
          </div>
        </button>

        <div className="flex items-center gap-2">
          {/* Currency Toggle (KRW ₩ vs USD $) */}
          <button
            onClick={() => setCurrencyView(currencyView === "KRW" ? "USD" : "KRW")}
            className="px-3 py-1.5 rounded-full bg-[#F8F9FA] border border-[#E5E8EB] text-xs font-bold text-[#191F28] hover:bg-[#F1F3F5] transition-all flex items-center gap-1"
          >
            <Coins className="w-3.5 h-3.5 text-[#3182F6]" />
            {currencyView === "KRW" ? "원화 (₩)" : "달러 ($)"}
          </button>

          {/* Eye Hide Toggle */}
          <button
            onClick={() => setHideAssetAmounts(!hideAssetAmounts)}
            className="p-2 rounded-full bg-[#F8F9FA] border border-[#E5E8EB] text-[#8B95A1] hover:text-[#191F28] transition-colors"
            title="자산 숨기기"
          >
            {hideAssetAmounts ? <EyeOff className="w-4 h-4 text-[#EF4444]" /> : <Eye className="w-4 h-4" />}
          </button>

          {/* Refresh Button */}
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 rounded-full bg-[#F8F9FA] border border-[#E5E8EB] text-[#8B95A1] hover:text-[#3182F6] transition-colors disabled:opacity-50"
            title="새로고침"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-[#3182F6]" : ""}`} />
          </button>
        </div>
      </header>

      <main className="p-4 md:p-6 space-y-5">
        {/* 1. 상단 총 자산 요약 섹션 */}
        <section className="bg-gradient-to-b from-[#F8F9FA] to-[#FFFFFF] rounded-3xl p-6 border border-[#E5E8EB] shadow-sm space-y-4">
          <div className="flex items-center justify-between text-xs text-[#8B95A1] font-semibold">
            <span className="flex items-center gap-1.5">
              <Wallet className="w-4 h-4 text-[#3182F6]" />
              총 자산 평가액
            </span>
            <span className="bg-white px-2.5 py-1 rounded-full border border-[#E5E8EB] text-[#191F28] font-bold">
              실시간 환율 ₩{exchangeRate.toLocaleString("ko-KR")}
            </span>
          </div>

          <div>
            <div className="text-3xl md:text-4xl font-black text-[#191F28] tracking-tight">
              {displayAmount(calculatedData.totalAssetKRW, calculatedData.totalAssetUSD)}
            </div>

            {/* 수익금 [전체 수익 / 일간 수익] 토글 및 수익률 표시 */}
            <div className="flex items-center justify-between flex-wrap gap-2 mt-3 pt-2 border-t border-[#E5E8EB]/60">
              <div className="flex items-center gap-2">
                {profitViewMode === "total" ? (
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${
                      calculatedData.totalGainKRW >= 0
                        ? "bg-[#22C55E]/10 text-[#22C55E]"
                        : "bg-[#EF4444]/10 text-[#EF4444]"
                    }`}
                  >
                    {calculatedData.totalGainKRW >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                    {calculatedData.totalGainKRW >= 0 ? "+" : ""}
                    {displayAmount(calculatedData.totalGainKRW, calculatedData.totalGainUSD)} (
                    {calculatedData.totalGainPercent >= 0 ? "+" : ""}
                    {calculatedData.totalGainPercent.toFixed(2)}%)
                  </span>
                ) : (
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${
                      calculatedData.totalDailyGainKRW >= 0
                        ? "bg-[#22C55E]/10 text-[#22C55E]"
                        : "bg-[#EF4444]/10 text-[#EF4444]"
                    }`}
                  >
                    {calculatedData.totalDailyGainKRW >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                    {calculatedData.totalDailyGainKRW >= 0 ? "+" : ""}
                    {displayAmount(calculatedData.totalDailyGainKRW, calculatedData.totalDailyGainUSD)} (
                    {calculatedData.totalDailyGainPercent >= 0 ? "+" : ""}
                    {calculatedData.totalDailyGainPercent.toFixed(2)}%)
                  </span>
                )}
                <span className="text-xs text-[#8B95A1] font-medium">
                  {profitViewMode === "total" ? "누적 원금 대비" : "오늘 당일 변동"}
                </span>
              </div>

              {/* [전체 수익 / 일간 수익] 토글 버튼 */}
              <div className="bg-[#F8F9FA] p-1 rounded-xl border border-[#E5E8EB] flex items-center text-xs font-bold">
                <button
                  onClick={() => setProfitViewMode("total")}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    profitViewMode === "total"
                      ? "bg-[#3182F6] text-white shadow-xs font-black"
                      : "text-[#8B95A1] hover:text-[#191F28]"
                  }`}
                >
                  전체 수익
                </button>
                <button
                  onClick={() => setProfitViewMode("daily")}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    profitViewMode === "daily"
                      ? "bg-[#3182F6] text-white shadow-xs font-black"
                      : "text-[#8B95A1] hover:text-[#191F28]"
                  }`}
                >
                  일간 수익
                </button>
              </div>
            </div>
          </div>

          {/* 증권사 앱 대조용 예수금 (현금 잔고) 배너 */}
          <div className="bg-white rounded-2xl p-4 border border-[#E5E8EB] flex items-center justify-between shadow-xs mt-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#3182F6]/10 flex items-center justify-center text-[#3182F6]">
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <div className="font-extrabold text-[#191F28] text-sm flex items-center gap-1.5">
                  {accountFilter === "all" ? "전체 계좌 예수금 (현금 잔고)" : `${accountFilter} 계좌 예수금`}
                  <span className="bg-[#3182F6]/10 text-[#3182F6] px-2 py-0.5 rounded-full text-[10px] font-bold">
                    증권사 1:1 대조용
                  </span>
                </div>
                <div className="text-xs text-[#8B95A1]">증권사 앱 현금 잔고와 직접 대조하는 실시간 예수금</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-base md:text-lg font-black text-[#191F28]">
                {displayAmount(calculatedData.cashKRW, calculatedData.cashUSD)}
              </div>
            </div>
          </div>
        </section>

        {/* 2. 다차원 필터링 바 (핵심 기능) */}
        <section className="bg-white rounded-2xl p-4 border border-[#E5E8EB] space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-[#191F28] flex items-center gap-1.5">
              <SlidersHorizontal className="w-4 h-4 text-[#3182F6]" />
              다차원 포트폴리오 필터
            </h2>
          </div>

          {/* 필터 칩 목록 (시장, 증권사/계좌, 통화) */}
          <div className="space-y-2 pt-1">
            {/* 시장 구분 칩: [전체], [해외주식 (US)], [국내주식 (KR)] */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs font-bold">
              <span className="text-[#8B95A1] shrink-0 mr-1 flex items-center gap-1">
                <Globe2 className="w-3.5 h-3.5" /> 시장:
              </span>
              <button
                onClick={() => setMarketFilter("all")}
                className={`px-3 py-1.5 rounded-full transition-all shrink-0 border ${
                  marketFilter === "all"
                    ? "bg-[#191F28] text-white border-[#191F28]"
                    : "bg-[#F8F9FA] text-[#6B7684] border-[#E5E8EB] hover:bg-[#F2F4F6]"
                }`}
              >
                전체 (All)
              </button>
              <button
                onClick={() => setMarketFilter("us")}
                className={`px-3 py-1.5 rounded-full transition-all shrink-0 border ${
                  marketFilter === "us"
                    ? "bg-[#3182F6] text-white border-[#3182F6]"
                    : "bg-[#F8F9FA] text-[#6B7684] border-[#E5E8EB] hover:bg-[#F2F4F6]"
                }`}
              >
                해외주식 (US) 🇺🇸
              </button>
              <button
                onClick={() => setMarketFilter("kr")}
                className={`px-3 py-1.5 rounded-full transition-all shrink-0 border ${
                  marketFilter === "kr"
                    ? "bg-[#3182F6] text-white border-[#3182F6]"
                    : "bg-[#F8F9FA] text-[#6B7684] border-[#E5E8EB] hover:bg-[#F2F4F6]"
                }`}
              >
                국내주식 (KR) 🇰🇷
              </button>
            </div>

            {/* 증권사/계좌 칩 */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs font-bold">
              <span className="text-[#8B95A1] shrink-0 mr-1 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" /> 계좌:
              </span>
              <button
                onClick={() => setAccountFilter("all")}
                className={`px-3 py-1.5 rounded-full transition-all shrink-0 border ${
                  accountFilter === "all"
                    ? "bg-[#191F28] text-white border-[#191F28]"
                    : "bg-[#F8F9FA] text-[#6B7684] border-[#E5E8EB] hover:bg-[#F2F4F6]"
                }`}
              >
                전체 계좌 (합산 뷰)
              </button>
              {accountList.map((acc) => (
                <button
                  key={acc}
                  onClick={() => setAccountFilter(acc)}
                  className={`px-3 py-1.5 rounded-full transition-all shrink-0 border ${
                    accountFilter === acc
                      ? "bg-[#3182F6] text-white border-[#3182F6]"
                      : "bg-[#F8F9FA] text-[#6B7684] border-[#E5E8EB] hover:bg-[#F2F4F6]"
                  }`}
                >
                  {acc}
                </button>
              ))}
            </div>

            {/* 자산유형 구분 칩 (상세모달의 자산유형 대체) */}
            <div className="flex items-center justify-between pt-1 text-xs">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar font-bold">
                <span className="text-[#8B95A1] shrink-0 mr-1 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5" /> 자산유형:
                </span>
                <button
                  onClick={() => setCategoryFilter("all")}
                  className={`px-3 py-1 rounded-full transition-all shrink-0 border ${
                    categoryFilter === "all"
                      ? "bg-[#191F28] text-white border-[#191F28]"
                      : "bg-[#F8F9FA] text-[#6B7684] border-[#E5E8EB] hover:bg-[#F2F4F6]"
                  }`}
                >
                  전체 (All)
                </button>
                {categoryList.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-3 py-1 rounded-full transition-all shrink-0 border ${
                      categoryFilter === cat
                        ? "bg-[#3182F6] text-white border-[#3182F6]"
                        : "bg-[#F8F9FA] text-[#6B7684] border-[#E5E8EB] hover:bg-[#F2F4F6]"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 3. 투자 종목 리스트 카드 개편 (통합 뷰 & 복수 계좌 표시) */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-base font-extrabold text-[#191F28] flex items-center gap-1.5">
              보유 종목 목록
              <span className="bg-[#F8F9FA] border border-[#E5E8EB] text-[#3182F6] px-2 py-0.5 rounded-full text-xs font-bold">
                {calculatedData.processedHoldings.length}개
              </span>
            </h2>

            {(marketFilter !== "all" || accountFilter !== "all" || currencyFilter !== "all") && (
              <button
                onClick={handleResetFilters}
                className="text-xs text-[#8B95A1] hover:text-[#3182F6] flex items-center gap-1 font-semibold"
              >
                <RefreshCw className="w-3 h-3" /> 필터 초기화
              </button>
            )}
          </div>

          {loading ? (
            <div className="bg-[#F8F9FA] rounded-2xl p-8 border border-[#E5E8EB] text-center space-y-2">
              <div className="w-8 h-8 border-3 border-[#3182F6] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-[#8B95A1] font-bold">실시간 포트폴리오 파싱 중...</p>
            </div>
          ) : calculatedData.processedHoldings.length === 0 ? (
            <div className="bg-[#F8F9FA] rounded-2xl p-8 border border-[#E5E8EB] text-center space-y-2">
              <p className="text-sm font-bold text-[#191F28]">선택한 필터 조건에 해당되는 종목이 없습니다.</p>
              <p className="text-xs text-[#8B95A1]">필터 조건을 변경하거나 초기화해 보세요.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {calculatedData.processedHoldings.map((item) => {
                // 수익 모드 선택 (전체 수익 vs 일간 수익)
                const isTotalMode = profitViewMode === "total";
                const profitAmount = isTotalMode ? item.gainKRW : item.dailyGainKRW;
                const profitAmountUSD = isTotalMode ? item.gainCurrency : item.dailyGainCurrency;
                const profitPercent = isTotalMode ? item.gainPercent : item.dailyChangePercent;

                const isPositive = profitAmount >= 0;
                const bgBadge = isPositive ? "bg-[#22C55E]/10 text-[#22C55E]" : "bg-[#EF4444]/10 text-[#EF4444]";

                return (
                  <div
                    key={`${item.accountsList.join("-")}-${item.ticker}`}
                    className="bg-[#F8F9FA] hover:bg-[#F1F3F5] transition-all p-4 rounded-2xl border border-[#E5E8EB] space-y-3 cursor-pointer group shadow-2xs"
                  >
                    {/* Header Row: Stock Name, Ticker, Multiple Account Badges */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-white border border-[#E5E8EB] flex items-center justify-center font-extrabold text-xs text-[#191F28] shadow-xs group-hover:scale-105 transition-transform">
                          {item.ticker.substring(0, 4)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-extrabold text-sm text-[#191F28]">{item.name}</span>
                            <span className="text-[10px] font-bold bg-white text-[#8B95A1] border border-[#E5E8EB] px-1.5 py-0.5 rounded-md">
                              {item.ticker}
                            </span>

                            {/* 복수 증권사/계좌 뱃지 표시 */}
                            {item.accountsList.map((accName) => (
                              <span
                                key={accName}
                                className="bg-[#3182F6]/10 text-[#3182F6] font-bold px-1.5 py-0.5 rounded-md text-[10px]"
                              >
                                {accName}
                              </span>
                            ))}
                          </div>
                          <span className="text-xs text-[#8B95A1]">
                            보유 {item.quantity.toLocaleString()}주 · {accountFilter === "all" ? "가중평단" : "평단"}{" "}
                            {item.currency === "USD" ? "$" : "₩"}
                            {item.averagePrice.toLocaleString(undefined, {
                              minimumFractionDigits: item.currency === "USD" && item.averagePrice % 1 !== 0 ? 2 : 0,
                              maximumFractionDigits: 4,
                            })}
                          </span>
                        </div>
                      </div>

                      {/* Right: 현재 총 평가금액 및 장 상태 */}
                      <div className="text-right shrink-0 space-y-0.5">
                        <span className="text-[10px] text-[#8B95A1] font-bold block">평가금액</span>
                        <span className="font-black text-sm text-[#191F28] block">
                          {hideAssetAmounts ? "••••••" : displayAmount(item.evalKRW, item.evalAmountCurrency)}
                        </span>
                        {item.market === "US" && (
                          <span className="text-[9px] font-bold bg-white border border-[#E5E8EB] text-[#3182F6] px-1.5 py-0.2 rounded-md inline-block">
                            {item.marketStateLabel}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Content Grid: 현재가, 투자원금, 수익금/수익률 */}
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#E5E8EB]/70 text-xs">
                      {/* 1. 현재가 */}
                      <div>
                        <span className="text-[11px] text-[#8B95A1] font-bold block">현재가</span>
                        <div className="font-extrabold text-[#191F28] mt-0.5">
                          {item.currency === "USD"
                            ? `$${item.currentUnitPrice.toLocaleString()}`
                            : `₩${item.currentUnitPrice.toLocaleString()}`}
                        </div>
                        <div className="text-[10px] text-[#8B95A1]">
                          (₩
                          {Math.round(
                            item.currency === "USD" ? item.currentUnitPrice * exchangeRate : item.currentUnitPrice
                          ).toLocaleString()}
                          )
                        </div>
                      </div>

                      {/* 2. 투자원금 (전체계좌 합산원금) */}
                      <div>
                        <span className="text-[11px] text-[#8B95A1] font-bold block">
                          {accountFilter === "all" ? "합산 투자원금" : "투자원금"}
                        </span>
                        <div className="font-extrabold text-[#191F28] mt-0.5">
                          {hideAssetAmounts ? "••••••" : displayAmount(item.costKRW, item.costAmountCurrency)}
                        </div>
                        <div className="text-[10px] text-[#8B95A1]">
                          {item.currency === "USD"
                            ? `($${item.costAmountCurrency.toLocaleString(undefined, { maximumFractionDigits: 2 })})`
                            : "매수 총액"}
                        </div>
                      </div>

                      {/* 3. 수익금 & 수익률 (전체/일간 모드 반영) */}
                      <div className="text-right">
                        <span className="text-[11px] text-[#8B95A1] font-bold block">
                          {isTotalMode ? "전체 수익금" : "일간 수익금"}
                        </span>
                        <div className={`font-extrabold mt-0.5 ${isPositive ? "text-[#22C55E]" : "text-[#EF4444]"}`}>
                          {hideAssetAmounts
                            ? "••••••"
                            : `${isPositive ? "+" : ""}${displayAmount(profitAmount, profitAmountUSD)}`}
                        </div>
                        <div className="flex items-center justify-end gap-1 mt-0.5">
                          <span className={`px-1.5 py-0.2 rounded-md font-extrabold text-[10px] ${bgBadge}`}>
                            {isPositive ? "+" : ""}
                            {profitPercent.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* 4. 필터 바텀 시트 모달 */}
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

      {/* 5. 계좌 사이드 메뉴 서랍장 (Drawer) */}
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
