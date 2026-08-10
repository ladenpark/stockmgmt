"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  PieChart as PieIcon,
  LineChart as LineIcon,
  TrendingUp,
  TrendingDown,
  CircleDollarSign,
  Calculator,
  RefreshCw,
  ArrowUpRight,
  Sparkles,
  Calendar,
  Layers,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  LineChart,
  Line,
  XAxis,
  YAxis,
  BarChart,
  Bar,
} from "recharts";

interface HoldingItem {
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

interface TradeRecord {
  id: string;
  date: string;
  category: string;
  ticker: string;
  account: string;
  currency: "KRW" | "USD";
  type: "매수" | "매도";
  quantity: number;
  price: number;
  realizedPnL: number;
  market: "KR" | "US";
}

interface AssetHistoryRecord {
  date: string;
  category: string;
  account: string;
  valueKRW: number;
  ticker: string;
}

// Toss White Modern Color Palette for Charts
const CHART_COLORS = [
  "#3182F6", // Toss Blue
  "#22C55E", // Green
  "#F59E0B", // Amber/Gold
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#06B6D4", // Cyan
  "#10B981", // Emerald
  "#6366F1", // Indigo
];

export default function AnalysisPage() {
  const [loading, setLoading] = useState(true);
  const [activeMainTab, setActiveMainTab] = useState<"weight" | "trend" | "profit" | "dividend" | "tax">("weight");
  const [activeSubTab, setActiveSubTab] = useState<"ticker" | "account" | "market" | "currency">("ticker");
  const [trendPeriod, setTrendPeriod] = useState<"all" | "thisYear" | "thisMonth" | "1m" | "6m" | "1y">("all");

  const [holdings, setHoldings] = useState<HoldingItem[]>([]);
  const [tradeHistory, setTradeHistory] = useState<TradeRecord[]>([]);
  const [assetHistory, setAssetHistory] = useState<AssetHistoryRecord[]>([]);
  const [exchangeRate, setExchangeRate] = useState<number>(1385.0);
  const [quotes, setQuotes] = useState<Record<string, any>>({});

  // API 데이터 연동
  const fetchData = async () => {
    setLoading(true);
    try {
      const portRes = await fetch("/api/portfolio");
      const portData = await portRes.json();

      if (portData.success) {
        setHoldings(portData.holdings || []);
        setTradeHistory(portData.tradeHistory || []);
        setAssetHistory(portData.assetHistory || []);
      }

      const stockRes = await fetch("/api/stocks");
      const stockData = await stockRes.json();
      if (stockData.success && stockData.data) {
        setQuotes(stockData.data.quotes || {});
        if (stockData.data.exchangeRate?.rate) {
          setExchangeRate(stockData.data.exchangeRate.rate);
        }
      }
    } catch (err) {
      console.error("분석 데이터 로딩 실패:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 1. [비중] 탭 데이터 가공 (종목별, 증권사/계좌별, 국내/해외별, 통화별)
  const weightData = useMemo(() => {
    const map: Record<string, number> = {};
    let totalEvalKRW = 0;

    holdings.forEach((item) => {
      const quote = quotes[item.ticker];
      const unitPrice = quote ? quote.currentPrice : item.averagePrice;
      const evalCurrency = item.quantity * unitPrice;
      const evalKRW = item.currency === "USD" ? evalCurrency * exchangeRate : evalCurrency;

      totalEvalKRW += evalKRW;

      let key = item.ticker;
      if (activeSubTab === "ticker") {
        key = quote?.name ? `${quote.name} (${item.ticker})` : item.ticker;
      } else if (activeSubTab === "account") {
        key = item.account;
      } else if (activeSubTab === "market") {
        key = item.market === "US" ? "해외주식 (US 🇺🇸)" : "국내주식 (KR 🇰🇷)";
      } else if (activeSubTab === "currency") {
        key = item.currency === "USD" ? "달러 (USD $)" : "원화 (KRW ₩)";
      }

      map[key] = (map[key] || 0) + evalKRW;
    });

    const chartList = Object.entries(map).map(([name, val]) => ({
      name,
      value: Math.round(val),
      percent: totalEvalKRW > 0 ? (val / totalEvalKRW) * 100 : 0,
    })).sort((a, b) => b.value - a.value);

    return { chartList, totalEvalKRW };
  }, [holdings, quotes, exchangeRate, activeSubTab]);

  // 2. [추이] 탭 데이터 가공
  const trendData = useMemo(() => {
    if (!assetHistory || assetHistory.length === 0) {
      return [
        { date: "2024-01", valueKRW: 110000000 },
        { date: "2024-02", valueKRW: 118500000 },
        { date: "2024-03", valueKRW: 124000000 },
        { date: "2024-04", valueKRW: 128450000 },
      ];
    }

    return assetHistory.map((item) => ({
      date: item.date,
      valueKRW: item.valueKRW,
    }));
  }, [assetHistory]);

  // 3. [수익] 탭 데이터 가공
  const profitData = useMemo(() => {
    let totalRealizedPnLKRW = 0;
    let totalUnrealizedPnLKRW = 0;

    tradeHistory.forEach((t) => {
      const pnlKRW = t.currency === "USD" ? t.realizedPnL * exchangeRate : t.realizedPnL;
      totalRealizedPnLKRW += pnlKRW;
    });

    holdings.forEach((item) => {
      const quote = quotes[item.ticker];
      const unitPrice = quote ? quote.currentPrice : item.averagePrice;
      const evalKRW = (item.quantity * unitPrice) * (item.currency === "USD" ? exchangeRate : 1);
      const costKRW = item.totalCost * (item.currency === "USD" ? exchangeRate : 1);
      totalUnrealizedPnLKRW += (evalKRW - costKRW);
    });

    return {
      totalRealizedPnLKRW,
      totalUnrealizedPnLKRW,
      totalPnLKRW: totalRealizedPnLKRW + totalUnrealizedPnLKRW,
    };
  }, [tradeHistory, holdings, quotes, exchangeRate]);

  // 4. [배당] 탭 데이터 가공 (예상 배당금)
  const dividendData = useMemo(() => {
    // 1~12월 월별 예상 배당금 셋업 (샘플 추정치 기반)
    const monthlyList = [
      { month: "1월", amount: 85000 },
      { month: "2월", amount: 120000 },
      { month: "3월", amount: 250000 },
      { month: "4월", amount: 320000 },
      { month: "5월", amount: 95000 },
      { month: "6월", amount: 180000 },
      { month: "7월", amount: 90000 },
      { month: "8월", amount: 140000 },
      { month: "9월", amount: 280000 },
      { month: "10월", amount: 310000 },
      { month: "11월", amount: 110000 },
      { month: "12월", amount: 220000 },
    ];

    const totalAnnualDividend = monthlyList.reduce((sum, item) => sum + item.amount, 0);
    const dividendYieldPercent = weightData.totalEvalKRW > 0 ? (totalAnnualDividend / weightData.totalEvalKRW) * 100 : 0;

    return { monthlyList, totalAnnualDividend, dividendYieldPercent };
  }, [weightData.totalEvalKRW]);

  return (
    <div className="flex-1 pb-16 bg-white text-[#191F28]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-[#E5E8EB] px-5 py-3.5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-[#191F28] tracking-tight">포트폴리오 다차원 분석</h1>
          <p className="text-xs text-[#8B95A1] mt-0.5">자산 비중 · 추이 · 실현손익 · 배당 및 세금 모니터링</p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="p-2 rounded-full bg-[#F8F9FA] border border-[#E5E8EB] text-[#8B95A1] hover:text-[#3182F6] transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-[#3182F6]" : ""}`} />
        </button>
      </header>

      {/* Main 5 Tabs Header ([비중], [추이], [수익], [배당], [세금]) */}
      <div className="bg-[#F8F9FA] border-b border-[#E5E8EB] p-2">
        <div className="grid grid-cols-5 gap-1 text-center font-bold text-xs">
          <button
            onClick={() => setActiveMainTab("weight")}
            className={`py-2.5 rounded-xl transition-all flex flex-col items-center justify-center gap-1 ${
              activeMainTab === "weight"
                ? "bg-white text-[#3182F6] shadow-sm font-black border border-[#E5E8EB]"
                : "text-[#8B95A1] hover:text-[#191F28]"
            }`}
          >
            <PieIcon className="w-4 h-4" />
            <span>비중</span>
          </button>

          <button
            onClick={() => setActiveMainTab("trend")}
            className={`py-2.5 rounded-xl transition-all flex flex-col items-center justify-center gap-1 ${
              activeMainTab === "trend"
                ? "bg-white text-[#3182F6] shadow-sm font-black border border-[#E5E8EB]"
                : "text-[#8B95A1] hover:text-[#191F28]"
            }`}
          >
            <LineIcon className="w-4 h-4" />
            <span>추이</span>
          </button>

          <button
            onClick={() => setActiveMainTab("profit")}
            className={`py-2.5 rounded-xl transition-all flex flex-col items-center justify-center gap-1 ${
              activeMainTab === "profit"
                ? "bg-white text-[#22C55E] shadow-sm font-black border border-[#E5E8EB]"
                : "text-[#8B95A1] hover:text-[#191F28]"
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>수익</span>
          </button>

          <button
            onClick={() => setActiveMainTab("dividend")}
            className={`py-2.5 rounded-xl transition-all flex flex-col items-center justify-center gap-1 ${
              activeMainTab === "dividend"
                ? "bg-white text-[#F59E0B] shadow-sm font-black border border-[#E5E8EB]"
                : "text-[#8B95A1] hover:text-[#191F28]"
            }`}
          >
            <CircleDollarSign className="w-4 h-4" />
            <span>배당</span>
          </button>

          <button
            onClick={() => setActiveMainTab("tax")}
            className={`py-2.5 rounded-xl transition-all flex flex-col items-center justify-center gap-1 ${
              activeMainTab === "tax"
                ? "bg-white text-[#8B5CF6] shadow-sm font-black border border-[#E5E8EB]"
                : "text-[#8B95A1] hover:text-[#191F28]"
            }`}
          >
            <Calculator className="w-4 h-4" />
            <span>세금</span>
          </button>
        </div>
      </div>

      <main className="p-4 md:p-6 space-y-6">
        {/* ================================================================= */}
        {/* 1. [비중] 탭 (Recharts Donut Chart + 4개 서브 탭) */}
        {/* ================================================================= */}
        {activeMainTab === "weight" && (
          <section className="space-y-4">
            {/* 4개 서브 탭 버튼 */}
            <div className="flex items-center gap-1.5 bg-[#F8F9FA] p-1.5 rounded-2xl border border-[#E5E8EB] text-xs font-bold overflow-x-auto">
              <button
                onClick={() => setActiveSubTab("ticker")}
                className={`px-3 py-2 rounded-xl transition-all shrink-0 ${
                  activeSubTab === "ticker"
                    ? "bg-[#3182F6] text-white shadow-xs font-black"
                    : "text-[#6B7684] hover:bg-[#F2F4F6]"
                }`}
              >
                종목별
              </button>
              <button
                onClick={() => setActiveSubTab("account")}
                className={`px-3 py-2 rounded-xl transition-all shrink-0 ${
                  activeSubTab === "account"
                    ? "bg-[#3182F6] text-white shadow-xs font-black"
                    : "text-[#6B7684] hover:bg-[#F2F4F6]"
                }`}
              >
                증권사/계좌별
              </button>
              <button
                onClick={() => setActiveSubTab("market")}
                className={`px-3 py-2 rounded-xl transition-all shrink-0 ${
                  activeSubTab === "market"
                    ? "bg-[#3182F6] text-white shadow-xs font-black"
                    : "text-[#6B7684] hover:bg-[#F2F4F6]"
                }`}
              >
                국내/해외별
              </button>
              <button
                onClick={() => setActiveSubTab("currency")}
                className={`px-3 py-2 rounded-xl transition-all shrink-0 ${
                  activeSubTab === "currency"
                    ? "bg-[#3182F6] text-white shadow-xs font-black"
                    : "text-[#6B7684] hover:bg-[#F2F4F6]"
                }`}
              >
                통화별 (KRW vs USD)
              </button>
            </div>

            {/* Recharts Donut Chart Container */}
            <div className="bg-[#F8F9FA] rounded-3xl p-6 border border-[#E5E8EB] space-y-4">
              <div className="text-center space-y-1">
                <span className="text-xs text-[#8B95A1] font-bold">평가자산 총액 기준 비중</span>
                <div className="text-2xl font-black text-[#191F28]">
                  ₩{weightData.totalEvalKRW.toLocaleString("ko-KR")}
                </div>
              </div>

              <div className="h-64 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={weightData.chartList}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={95}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {weightData.chartList.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                          stroke="#FFFFFF"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: number) => [`₩${val.toLocaleString("ko-KR")}`, "평가금액"]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* 하단 비중(%) 리스트 */}
              <div className="space-y-2 pt-2 border-t border-[#E5E8EB]">
                {weightData.chartList.map((item, idx) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-[#E5E8EB] text-xs font-bold"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3.5 h-3.5 rounded-full shrink-0"
                        style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                      />
                      <span className="text-[#191F28] font-bold">{item.name}</span>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <span className="text-[#8B95A1]">₩{item.value.toLocaleString("ko-KR")}</span>
                      <span className="bg-[#F8F9FA] px-2 py-0.5 rounded-md border border-[#E5E8EB] text-[#3182F6]">
                        {item.percent.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ================================================================= */}
        {/* 2. [추이] 탭 (Recharts Line Chart + 기간 필터) */}
        {/* ================================================================= */}
        {activeMainTab === "trend" && (
          <section className="space-y-4">
            {/* 기간 필터 버튼 */}
            <div className="flex items-center justify-between bg-[#F8F9FA] p-1.5 rounded-2xl border border-[#E5E8EB] text-xs font-bold">
              <span className="text-[#8B95A1] pl-2 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> 기간:
              </span>
              <div className="flex items-center gap-1">
                {(["all", "thisYear", "thisMonth", "1m", "6m", "1y"] as const).map((p) => {
                  const labels: Record<string, string> = {
                    all: "전체",
                    thisYear: "올해",
                    thisMonth: "이달",
                    "1m": "1달",
                    "6m": "6달",
                    "1y": "1년",
                  };
                  return (
                    <button
                      key={p}
                      onClick={() => setTrendPeriod(p)}
                      className={`px-2.5 py-1.5 rounded-xl transition-all ${
                        trendPeriod === p
                          ? "bg-[#3182F6] text-white font-black shadow-xs"
                          : "text-[#6B7684] hover:bg-[#F2F4F6]"
                      }`}
                    >
                      {labels[p]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Line Chart Card */}
            <div className="bg-[#F8F9FA] rounded-3xl p-6 border border-[#E5E8EB] space-y-4">
              <div>
                <h3 className="text-sm font-bold text-[#8B95A1]">시간 흐름별 자산 추이 (Value_KRW)</h3>
                <div className="text-2xl font-black text-[#191F28] mt-0.5">
                  ₩{(trendData[trendData.length - 1]?.valueKRW || 0).toLocaleString("ko-KR")}
                </div>
              </div>

              <div className="h-64 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <XAxis dataKey="date" stroke="#8B95A1" fontSize={11} tickLine={false} />
                    <YAxis
                      stroke="#8B95A1"
                      fontSize={10}
                      tickLine={false}
                      tickFormatter={(v) => `${(v / 10000).toLocaleString()}만`}
                    />
                    <Tooltip formatter={(val: number) => [`₩${val.toLocaleString("ko-KR")}`, "자산금액"]} />
                    <Line
                      type="monotone"
                      dataKey="valueKRW"
                      stroke="#3182F6"
                      strokeWidth={3}
                      dot={{ r: 4, fill: "#3182F6" }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>
        )}

        {/* ================================================================= */}
        {/* 3. [수익] 탭 (Realized & Unrealized PnL Cards) */}
        {/* ================================================================= */}
        {activeMainTab === "profit" && (
          <section className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Card 1: 매도 실현 손익 */}
              <div className="bg-[#F8F9FA] rounded-2xl p-5 border border-[#E5E8EB] space-y-2">
                <span className="text-xs font-bold text-[#8B95A1]">누적 매도 실현 손익 (Realized PnL)</span>
                <div className={`text-2xl font-black ${profitData.totalRealizedPnLKRW >= 0 ? "text-[#22C55E]" : "text-[#EF4444]"}`}>
                  {profitData.totalRealizedPnLKRW >= 0 ? "+" : ""}
                  ₩{Math.round(profitData.totalRealizedPnLKRW).toLocaleString("ko-KR")}
                </div>
                <p className="text-[11px] text-[#8B95A1]">구글 시트 [거래내역] 매도 손익 집계</p>
              </div>

              {/* Card 2: 보유 종목 평가 손익 */}
              <div className="bg-[#F8F9FA] rounded-2xl p-5 border border-[#E5E8EB] space-y-2">
                <span className="text-xs font-bold text-[#8B95A1]">보유 종목 평가 손익 (Unrealized PnL)</span>
                <div className={`text-2xl font-black ${profitData.totalUnrealizedPnLKRW >= 0 ? "text-[#22C55E]" : "text-[#EF4444]"}`}>
                  {profitData.totalUnrealizedPnLKRW >= 0 ? "+" : ""}
                  ₩{Math.round(profitData.totalUnrealizedPnLKRW).toLocaleString("ko-KR")}
                </div>
                <p className="text-[11px] text-[#8B95A1]">실시간 평가 시세 기준 계산</p>
              </div>

              {/* Card 3: 총합 수익 */}
              <div className="bg-[#F8F9FA] rounded-2xl p-5 border border-[#E5E8EB] space-y-2">
                <span className="text-xs font-bold text-[#8B95A1]">합산 손익</span>
                <div className={`text-2xl font-black ${profitData.totalPnLKRW >= 0 ? "text-[#22C55E]" : "text-[#EF4444]"}`}>
                  {profitData.totalPnLKRW >= 0 ? "+" : ""}
                  ₩{Math.round(profitData.totalPnLKRW).toLocaleString("ko-KR")}
                </div>
                <p className="text-[11px] text-[#8B95A1]">실현 손익 + 평가 손익 종합</p>
              </div>
            </div>

            {/* 거래 내역 리스트 */}
            <div className="bg-white rounded-2xl p-4 border border-[#E5E8EB] space-y-3">
              <h3 className="text-sm font-extrabold text-[#191F28]">최근 매수/매도 거래 내역</h3>
              <div className="space-y-2">
                {tradeHistory.map((t) => (
                  <div
                    key={t.id}
                    className="p-3 rounded-xl bg-[#F8F9FA] border border-[#E5E8EB] flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-[#191F28]">
                        {t.ticker} · <span className={t.type === "매수" ? "text-[#3182F6]" : "text-[#22C55E]"}>{t.type}</span>
                      </div>
                      <div className="text-[#8B95A1] text-[11px]">
                        {t.date} · {t.account} · {t.quantity}주 @ {t.currency === "USD" ? "$" : "₩"}{t.price}
                      </div>
                    </div>
                    {t.type === "매도" && (
                      <div className={`font-bold text-right ${t.realizedPnL >= 0 ? "text-[#22C55E]" : "text-[#EF4444]"}`}>
                        {t.realizedPnL >= 0 ? "+" : ""}{t.currency === "USD" ? "$" : "₩"}{t.realizedPnL}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ================================================================= */}
        {/* 4. [배당] 탭 (Recharts Bar Chart + 배당 리스트) */}
        {/* ================================================================= */}
        {activeMainTab === "dividend" && (
          <section className="space-y-4">
            <div className="bg-[#F8F9FA] rounded-3xl p-6 border border-[#E5E8EB] space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-[#8B95A1] font-bold">예상 연간 배당금 합계</span>
                  <div className="text-2xl font-black text-[#F59E0B] mt-0.5">
                    ₩{dividendData.totalAnnualDividend.toLocaleString("ko-KR")}
                  </div>
                </div>
                <div className="bg-white px-3 py-1.5 rounded-xl border border-[#E5E8EB] text-right">
                  <span className="text-[10px] text-[#8B95A1] block font-bold">평가자산 대비 시가배당률</span>
                  <span className="text-sm font-extrabold text-[#F59E0B]">
                    {dividendData.dividendYieldPercent.toFixed(2)}%
                  </span>
                </div>
              </div>

              {/* Monthly Bar Chart */}
              <div className="h-60 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dividendData.monthlyList}>
                    <XAxis dataKey="month" stroke="#8B95A1" fontSize={11} tickLine={false} />
                    <YAxis
                      stroke="#8B95A1"
                      fontSize={10}
                      tickLine={false}
                      tickFormatter={(v) => `${(v / 10000).toLocaleString()}만`}
                    />
                    <Tooltip formatter={(val: number) => [`₩${val.toLocaleString("ko-KR")}`, "예상 배당금"]} />
                    <Bar dataKey="amount" fill="#F59E0B" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>
        )}

        {/* ================================================================= */}
        {/* 5. [세금] 탭 (Overseas Stock Tax Calculator) */}
        {/* ================================================================= */}
        {activeMainTab === "tax" && (
          <section className="space-y-4">
            <div className="bg-[#F8F9FA] rounded-3xl p-6 border border-[#E5E8EB] space-y-4">
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-[#8B5CF6]" />
                <h3 className="text-base font-bold text-[#191F28]">해외주식 양도소득세 시뮬레이터</h3>
              </div>

              <div className="space-y-3 text-xs font-semibold">
                <div className="bg-white p-4 rounded-2xl border border-[#E5E8EB] flex items-center justify-between">
                  <span className="text-[#8B95A1]">해외주식 기본 공제액</span>
                  <span className="text-sm font-bold text-[#191F28]">₩2,500,000</span>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-[#E5E8EB] flex items-center justify-between">
                  <span className="text-[#8B95A1]">달러 매도 실현 손익 (원화 환산)</span>
                  <span className="text-sm font-bold text-[#22C55E]">
                    ₩{Math.round(profitData.totalRealizedPnLKRW).toLocaleString("ko-KR")}
                  </span>
                </div>

                <div className="bg-[#8B5CF6]/10 p-5 rounded-2xl border border-[#8B5CF6]/20 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-[#8B5CF6] block font-bold">예상 납부 세액 (양도세 20% + 지방세 2%)</span>
                    <span className="text-2xl font-black text-[#8B5CF6]">
                      ₩{Math.max(0, Math.round((profitData.totalRealizedPnLKRW - 2500000) * 0.22)).toLocaleString("ko-KR")}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
