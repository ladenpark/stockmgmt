"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Info,
  Calendar,
  TrendingUp,
  TrendingDown,
  PieChart as PieIcon,
  LineChart as LineIcon,
  CircleDollarSign,
  Calculator,
  RefreshCw,
  Sparkles,
  Check,
} from "lucide-react";
import {
  ComposedChart,
  BarChart,
  LineChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { BottomNav } from "@/components/BottomNav";
import { StatValue } from "@/components/ui/StatValue";
import { formatCurrency } from "@/lib/utils";

interface HoldingItem {
  id: string;
  ticker: string;
  name?: string;
  category: string;
  account: string;
  currency: "KRW" | "USD";
  market: "KR" | "US";
  quantity: number;
  averagePrice: number;
  totalCost: number;
  currentPrice?: number;
  changeAmount?: number;
  changePct?: number;
}

interface TradeRecord {
  id: string;
  date: string;
  category: string;
  ticker: string;
  name?: string;
  account: string;
  currency: "KRW" | "USD";
  type: "매수" | "매도" | "배당";
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

interface DailySnapshot {
  date_full: string;
  total_valuation_krw: number;
  details: Array<{ name: string; ticker: string; price: number; shares: number }>;
}

const CHART_COLORS = [
  "#1366FF",
  "#16A34A",
  "#F59E0B",
  "#8B5CF6",
  "#EC4899",
  "#06B6D4",
  "#EF4444",
  "#64748B",
];

export default function AnalysisPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);

  const [holdings, setHoldings] = useState<HoldingItem[]>([]);
  const [tradeHistory, setTradeHistory] = useState<TradeRecord[]>([]);
  const [assetHistory, setAssetHistory] = useState<AssetHistoryRecord[]>([]);
  const [dailySnapshots, setDailySnapshots] = useState<DailySnapshot[]>([]);
  const [exchangeRate, setExchangeRate] = useState<number>(1385.48);

  const [activeMainTab, setActiveMainTab] = useState<"profit" | "tax" | "dividend" | "trend" | "weight">("profit");
  const [activeSubTab, setActiveSubTab] = useState<string>("ticker");

  // 수익 탭 상태
  const [profitPeriod, setProfitPeriod] = useState<"today" | "total" | "week" | "month" | "year">("total");
  const [isDetailExpanded, setIsDetailExpanded] = useState<boolean>(false);
  const [expandedEval, setExpandedEval] = useState<boolean>(false);
  const [expandedRealized, setExpandedRealized] = useState<boolean>(false);
  const [expandedDividend, setExpandedDividend] = useState<boolean>(false);
  const [isAllTimeRealizedOpen, setIsAllTimeRealizedOpen] = useState<boolean>(false);

  // 차트 뷰 모드 및 기준
  const [chartViewMode, setChartViewMode] = useState<"monthly" | "daily">("monthly");
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [chartMonth, setChartMonth] = useState<string>("2026-08");

  // 배당 탭 상태 (실수령액 vs 외화)
  const [dividendCurrencyMode, setDividendCurrencyMode] = useState<"KRW" | "USD">("KRW");

  // 실시간 시세 캐시
  const [quotes, setQuotes] = useState<
    Record<string, { name?: string; currentPrice?: number; previousClose?: number; changeAmount?: number; changePct?: number }>
  >({});

  const [showInfoModal, setShowInfoModal] = useState<string | null>(null);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && ["profit", "tax", "dividend", "trend", "weight"].includes(tab)) {
      setActiveMainTab(tab as any);
    }
  }, [searchParams]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [holdingRes, tradesRes, historyRes, matrixRes, summaryRes] = await Promise.all([
        fetch("/api/backend/portfolio/holdings"),
        fetch("/api/backend/transactions?limit=200"),
        fetch("/api/backend/portfolio/history"),
        fetch("/api/backend/daily/matrix"),
        fetch("/api/backend/portfolio/summary"),
      ]);

      let holdingData = holdingRes.ok ? await holdingRes.json() : [];
      let tradesData = tradesRes.ok ? await tradesRes.json() : [];
      let historyData = historyRes.ok ? await historyRes.json() : [];
      let matrixData = matrixRes.ok ? await matrixRes.json() : { snapshots: [] };
      let summaryData = summaryRes.ok ? await summaryRes.json() : {};

      if (summaryData.exchange_rate) {
        setExchangeRate(Number(summaryData.exchange_rate));
      }

      setHoldings(
        holdingData.map((h: any) => ({
          id: String(h.id),
          ticker: h.ticker,
          name: h.asset_name,
          category: h.asset_type || "주식",
          account: h.account_name || "일반계좌",
          currency: h.currency,
          market: h.market,
          quantity: Number(h.quantity),
          averagePrice: Number(h.average_buy_price),
          totalCost: Number(h.total_cost),
          currentPrice: Number(h.current_price),
          changeAmount: Number(h.change_amount),
          changePct: Number(h.change_pct),
        }))
      );

      setTradeHistory(
        tradesData.map((t: any) => ({
          id: String(t.id),
          date: String(t.transacted_at || "").slice(0, 10),
          category: "stock",
          ticker: t.ticker,
          name: t.asset_name,
          account: t.account_name || "일반계좌",
          currency: t.currency,
          type: t.type === "BUY" ? "매수" : t.type === "SELL" ? "매도" : "배당",
          quantity: Number(t.quantity),
          price: Number(t.price),
          realizedPnL: Number(t.realized_pnl || 0),
          market: t.market || (t.currency === "KRW" ? "KR" : "US"),
        }))
      );

      setAssetHistory(
        historyData.map((a: any) => ({
          date: a.recorded_at?.slice(0, 7) || "2024-05",
          category: a.category || "주식",
          account: a.account_name || "통합계좌",
          valueKRW: Number(a.valuation_krw || a.valuation_usd * exchangeRate),
          ticker: a.ticker || "UNKNOWN",
        }))
      );

      setDailySnapshots(matrixData.snapshots || []);

      setQuotes(
        Object.fromEntries(
          holdingData.map((holding: any) => [
            holding.ticker.toUpperCase(),
            {
              name: holding.asset_name,
              currentPrice: holding.current_price,
              previousClose: holding.previous_close || (holding.current_price - (holding.change_amount || 0)),
              changeAmount: holding.change_amount,
              changePct: holding.change_pct,
            },
          ])
        )
      );
    } catch (err) {
      console.error("분석 데이터 로딩 실패:", err);
    } finally {
      setLoading(false);
    }
  };

  // 1초 주기 실시간 폴링
  const fetchLiveQuotes = async () => {
    try {
      const [holdingsRes, summaryRes] = await Promise.all([
        fetch("/api/backend/portfolio/holdings", { cache: "no-store" }),
        fetch("/api/backend/portfolio/summary", { cache: "no-store" }),
      ]);
      if (!holdingsRes.ok || !summaryRes.ok) return;
      const [holdingData, summaryData] = await Promise.all([holdingsRes.json(), summaryRes.json()]);

      if (summaryData.exchange_rate) {
        setExchangeRate(Number(summaryData.exchange_rate));
      }

      setQuotes((prev) => {
        const next = { ...prev };
        for (const h of holdingData) {
          const ticker = h.ticker.toUpperCase();
          const prevQ = prev[ticker] || {};
          const currentPrice = h.current_price ?? prevQ.currentPrice;
          const previousClose = h.previous_close ?? prevQ.previousClose ?? (currentPrice - (h.change_amount || 0));
          const changeAmount = h.change_amount ?? (currentPrice - previousClose);
          const changePct = h.change_pct ?? (previousClose > 0 ? (changeAmount / previousClose) * 100 : 0);
          next[ticker] = {
            ...prevQ,
            name: h.asset_name,
            currentPrice,
            previousClose,
            changeAmount,
            changePct,
          };
        }
        return next;
      });
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchLiveQuotes();
    const interval = setInterval(fetchLiveQuotes, 1000);
    return () => clearInterval(interval);
  }, []);

  // KIS WebSocket 실시간 틱 수신 연동
  useEffect(() => {
    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let disposed = false;

    const connect = () => {
      if (disposed || typeof window === "undefined") return;
      const protocol = window.location.protocol === "https:" ? "wss" : "ws";
      socket = new WebSocket(`${protocol}://${window.location.hostname}:8001`);

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message?.type !== "TICK" || !message.data) return;
          const tick = message.data;
          const ticker = String(tick.ticker || "").toUpperCase();
          const currentPrice = Number(tick.currentPrice);
          if (!ticker || !Number.isFinite(currentPrice)) return;

          setQuotes((prev) => {
            const prevQuote = prev[ticker] || {};
            const previousClose =
              Number(tick.previousClose) ||
              prevQuote.previousClose ||
              (prevQuote.currentPrice ? prevQuote.currentPrice - (prevQuote.changeAmount || 0) : currentPrice);
            const changeAmount = Number.isFinite(Number(tick.changeAmount))
              ? Number(tick.changeAmount)
              : currentPrice - previousClose;
            const changePct = previousClose > 0 ? (changeAmount / previousClose) * 100 : 0;

            return {
              ...prev,
              [ticker]: {
                ...prevQuote,
                currentPrice,
                previousClose,
                changeAmount,
                changePct,
              },
            };
          });
        } catch {
          // ignore
        }
      };

      socket.onclose = () => {
        if (!disposed) reconnectTimer = setTimeout(connect, 3000);
      };
      socket.onerror = () => socket?.close();
    };

    connect();
    return () => {
      disposed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, []);

  // =========================================================================
  // 1. [수익] 탭 연산
  // =========================================================================
  const snapshotsAsc = useMemo(
    () => [...dailySnapshots].sort((a, b) => a.date_full.localeCompare(b.date_full)),
    [dailySnapshots]
  );

  const selectedRange = useMemo(() => {
    const today = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

    if (profitPeriod === "today") return { start: todayStr, end: todayStr, label: todayStr.replace(/-/g, ".") };
    if (profitPeriod === "total") return { start: "2020-01-01", end: todayStr, label: "2020.01.01 ~ " + todayStr.replace(/-/g, ".") };
    if (profitPeriod === "week") {
      const d = new Date(today);
      d.setDate(d.getDate() - 7);
      const s = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      return { start: s, end: todayStr, label: `${s.replace(/-/g, ".")} ~ ${todayStr.replace(/-/g, ".")}` };
    }
    if (profitPeriod === "month") {
      const s = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-01`;
      return { start: s, end: todayStr, label: `${s.replace(/-/g, ".")} ~ ${todayStr.replace(/-/g, ".")}` };
    }
    const s = `${today.getFullYear()}-01-01`;
    return { start: s, end: todayStr, label: `${s.replace(/-/g, ".")} ~ ${todayStr.replace(/-/g, ".")}` };
  }, [profitPeriod]);

  const profitOverview = useMemo(() => {
    const converted = (trade: TradeRecord, amount: number) =>
      trade.currency === "USD" ? amount * exchangeRate : amount;

    const filteredTrades = tradeHistory.filter((trade) => {
      if (profitPeriod === "total") return true;
      return trade.date >= selectedRange.start && trade.date <= selectedRange.end;
    });

    const realizedTrades = filteredTrades.filter((t) => t.type === "매도");
    const dividendTrades = filteredTrades.filter((t) => t.type === "배당");

    const realizedKRW = realizedTrades.reduce((sum, t) => sum + converted(t, t.realizedPnL), 0);
    const dividendKRW = dividendTrades.reduce((sum, t) => sum + converted(t, t.quantity * t.price), 0);

    let liveTodayGainKRW = 0;
    let livePrevCloseValuationKRW = 0;
    let liveTotalValuationKRW = 0;
    let liveTotalCostKRW = 0;

    const liveTodayDetails = holdings
      .map((h) => {
        const quote = quotes[h.ticker.toUpperCase()] || quotes[h.ticker];
        const curPrice = quote?.currentPrice ?? h.currentPrice ?? h.averagePrice;
        const prevClose = quote?.previousClose ?? (h.currentPrice - (h.changeAmount || 0));
        const changeAmt = quote?.changeAmount ?? (curPrice - prevClose);
        const rate = h.currency === "USD" ? exchangeRate : 1;

        const itemTodayGain = h.quantity * changeAmt * rate;
        const itemCurValuation = h.quantity * curPrice * rate;
        const itemCost = h.quantity * h.averagePrice * rate;
        const itemPrevClose = itemCurValuation - itemTodayGain;

        liveTodayGainKRW += itemTodayGain;
        livePrevCloseValuationKRW += itemPrevClose;
        liveTotalValuationKRW += itemCurValuation;
        liveTotalCostKRW += itemCost;

        return {
          name: h.name || h.ticker,
          ticker: h.ticker,
          price: curPrice,
          shares: h.quantity,
          gainKRW: itemTodayGain,
        };
      })
      .sort((a, b) => Math.abs(b.gainKRW) - Math.abs(a.gainKRW));

    const liveTotalReturnKRW = liveTotalValuationKRW - liveTotalCostKRW;
    const liveTotalReturnPct = liveTotalCostKRW > 0 ? (liveTotalReturnKRW / liveTotalCostKRW) * 100 : 0;
    const liveTodayReturnPct =
      livePrevCloseValuationKRW > 0 ? (liveTodayGainKRW / livePrevCloseValuationKRW) * 100 : 0;

    const liveTotalDetails = holdings
      .map((h) => {
        const quote = quotes[h.ticker.toUpperCase()] || quotes[h.ticker];
        const curPrice = quote?.currentPrice ?? h.currentPrice ?? h.averagePrice;
        const rate = h.currency === "USD" ? exchangeRate : 1;
        const itemTotalGain = (curPrice - h.averagePrice) * h.quantity * rate;
        return {
          name: h.name || h.ticker,
          ticker: h.ticker,
          price: curPrice,
          shares: h.quantity,
          gainKRW: itemTotalGain,
        };
      })
      .sort((a, b) => Math.abs(b.gainKRW) - Math.abs(a.gainKRW));

    let evalGainKRW = liveTotalReturnKRW;
    let evalPct = liveTotalReturnPct;
    let evalDetails = liveTotalDetails;

    if (profitPeriod === "today") {
      evalGainKRW = liveTodayGainKRW;
      evalPct = liveTodayReturnPct;
      evalDetails = liveTodayDetails;
    } else if (profitPeriod === "total") {
      evalGainKRW = liveTotalReturnKRW;
      evalPct = liveTotalReturnPct;
      evalDetails = liveTotalDetails;
    }

    const pct = (amount: number) => (liveTotalCostKRW > 0 ? (amount / liveTotalCostKRW) * 100 : 0);
    const sumKRW = evalGainKRW + realizedKRW + dividendKRW;
    const sumPct = profitPeriod === "today" ? evalPct : pct(sumKRW);

    const allTimeRealizedTrades = tradeHistory.filter((trade) => trade.type === "매도");
    const allTimeRealizedKRW = allTimeRealizedTrades.reduce((sum, trade) => sum + converted(trade, trade.realizedPnL), 0);
    const allTimeRealizedPct = liveTotalCostKRW > 0 ? (allTimeRealizedKRW / liveTotalCostKRW) * 100 : 0;

    return {
      evalGainKRW,
      evalPct,
      realizedKRW,
      realizedPct: pct(realizedKRW),
      dividendKRW,
      dividendPct: pct(dividendKRW),
      sumKRW,
      sumPct,
      realizedTrades,
      dividendTrades,
      evalDetails,
      allTimeRealizedKRW,
      allTimeRealizedPct,
      allTimeRealizedTrades,
    };
  }, [snapshotsAsc, selectedRange, tradeHistory, exchangeRate, holdings, quotes, profitPeriod]);

  // 차트 데이터 (실제 DB 스냅샷 기반으로만 연산)
  const chartData = useMemo(() => {
    const calculate = (rows: DailySnapshot[], fallback?: DailySnapshot) =>
      rows.map((row, index) => {
        const previous = index ? rows[index - 1] : fallback;
        const amountKRW = row.total_valuation_krw - (previous?.total_valuation_krw ?? row.total_valuation_krw);
        return {
          label: row.date_full,
          amountKRW,
          returnPct: previous?.total_valuation_krw ? (amountKRW / previous.total_valuation_krw) * 100 : 0,
        };
      });

    if (chartViewMode === "daily") {
      const rows = snapshotsAsc.filter((row) => row.date_full.startsWith(chartMonth));
      const first = rows[0];
      const fallback = first ? [...snapshotsAsc].reverse().find((row) => row.date_full < first.date_full) : undefined;
      return calculate(rows, fallback).map((item) => ({ ...item, label: String(Number(item.label.slice(8, 10))) }));
    }

    return Array.from({ length: 12 }, (_, index) => {
      const prefix = `${selectedYear}-${String(index + 1).padStart(2, "0")}`;
      const rows = snapshotsAsc.filter((row) => row.date_full.startsWith(prefix));
      const first = rows[0];
      const fallback = first ? [...snapshotsAsc].reverse().find((row) => row.date_full < first.date_full) : undefined;
      const last = rows.at(-1);
      const amountKRW = last
        ? last.total_valuation_krw - (fallback?.total_valuation_krw ?? first?.total_valuation_krw ?? last.total_valuation_krw)
        : 0;
      const base = fallback?.total_valuation_krw ?? first?.total_valuation_krw;
      const returnPct = base && base > 0 ? (amountKRW / base) * 100 : 0;
      return { label: String(index + 1), amountKRW, returnPct };
    });
  }, [snapshotsAsc, chartViewMode, chartMonth, selectedYear]);

  // =========================================================================
  // 2. [비중] 탭 데이터
  // =========================================================================
  const weightData = useMemo(() => {
    const map: Record<string, number> = {};
    let totalEvalKRW = 0;

    holdings.forEach((item) => {
      const quote = quotes[item.ticker.toUpperCase()] || quotes[item.ticker];
      const unitPrice = quote ? quote.currentPrice : item.averagePrice;
      const evalCurrency = item.quantity * unitPrice;
      const evalKRW = item.currency === "USD" ? evalCurrency * exchangeRate : evalCurrency;
      totalEvalKRW += evalKRW;

      let key = item.ticker;
      if (activeSubTab === "ticker") key = quote?.name ? `${quote.name} (${item.ticker})` : item.ticker;
      else if (activeSubTab === "account") key = item.account;
      else if (activeSubTab === "market") key = item.market === "US" ? "해외주식 (US)" : "국내주식 (KR)";
      else if (activeSubTab === "currency") key = item.currency === "USD" ? "달러 (USD)" : "원화 (KRW)";

      map[key] = (map[key] || 0) + evalKRW;
    });

    const chartList = Object.entries(map)
      .map(([name, val]) => ({
        name,
        value: Math.round(val),
        percent: totalEvalKRW > 0 ? (val / totalEvalKRW) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value);

    return { chartList, totalEvalKRW };
  }, [holdings, quotes, exchangeRate, activeSubTab]);

  // =========================================================================
  // 3. [배당] 탭 데이터 (Screen 3 Reference)
  // =========================================================================
  const dividendData = useMemo(() => {
    const monthlyBarList = [
      { month: "1월", amount: 27000 },
      { month: "2월", amount: 11000 },
      { month: "3월", amount: 69000 },
      { month: "4월", amount: 38000 },
      { month: "5월", amount: 42000 },
      { month: "6월", amount: 140000 },
      { month: "7월", amount: 128000 },
      { month: "8월", amount: 265000 },
      { month: "9월", amount: 515718 },
      { month: "10월", amount: 98000 },
      { month: "11월", amount: 12000 },
      { month: "12월", amount: 85000 },
    ];
    const totalExpectedDividendKRW = monthlyBarList.reduce((sum, item) => sum + item.amount, 0);
    const dividendYieldPct = weightData.totalEvalKRW > 0 ? (totalExpectedDividendKRW / weightData.totalEvalKRW) * 100 : 1.34;

    const samplePayoutList = [
      {
        month: "8월",
        totalMonthKRW: 8513,
        items: [
          { date: "7일", ticker: "ETHT", name: "ETHT", shares: 200, payoutPerShare: "$0.01", totalKRW: 2853, totalUSD: 2.03 },
        ],
      },
      {
        month: "9월",
        totalMonthKRW: 515718,
        items: [
          { date: "8일", ticker: "ETHT", name: "ETHT", shares: 200, payoutPerShare: "$1.6", totalKRW: 375711, totalUSD: 271.54 },
          { date: "11일", ticker: "MMM", name: "3M Company", shares: 58, payoutPerShare: "$0.78", totalKRW: 53552, totalUSD: 38.7 },
          { date: "29일", ticker: "ETHU", name: "ETHU", shares: 416, payoutPerShare: "$0.16", totalKRW: 79651, totalUSD: 57.57 },
          { date: "30일", ticker: "TNA", name: "TNA", shares: 80, payoutPerShare: "$0.07", totalKRW: 6804, totalUSD: 4.92 },
        ],
      },
    ];

    return { monthlyBarList, totalExpectedDividendKRW, dividendYieldPct, samplePayoutList };
  }, [weightData.totalEvalKRW]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 text-[#0F172A] selection:bg-[#1366FF]/20 selection:text-[#1366FF]">
      {/* 1. Header Bar (Screen 2 & 3 Reference) */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#E2E8F0] px-4 md:px-6 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => router.push("/")}
              className="w-9 h-9 rounded-xl bg-[#F1F5F9] hover:bg-[#E2E8F0] flex items-center justify-center text-[#0F172A] transition-colors"
              aria-label="홈으로 이동"
            >
              <ChevronLeft className="w-5 h-5" strokeWidth={2} />
            </button>
            <div className="flex items-center gap-1.5">
              <h1 className="text-base md:text-lg font-bold text-[#0F172A] tracking-tight">분석</h1>
              <button
                onClick={() =>
                  setShowInfoModal(
                    "분석 탭은 자산의 실시간 수익률, 실현손익, 배당, 세금, 비중 현황을 다차원으로 분석해 드립니다."
                  )
                }
                className="text-[#94A3B8] hover:text-[#0F172A] transition-colors"
              >
                <Info className="w-4 h-4" />
              </button>
            </div>
          </div>

          <button
            onClick={fetchData}
            disabled={loading}
            className="w-9 h-9 rounded-xl bg-[#F1F5F9] hover:bg-[#E2E8F0] flex items-center justify-center text-[#64748B] transition-colors disabled:opacity-50"
            aria-label="새로고침"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-[#1366FF]" : ""}`} />
          </button>
        </div>
      </header>

      {/* 2. Sub-Tabs: [수익] [세금] [배당] [추이] [비중] (Screen 2 Reference) */}
      <div className="bg-white border-b border-[#E2E8F0]">
        <div className="max-w-4xl mx-auto flex gap-1 px-4 md:px-6 py-2 overflow-x-auto no-scrollbar">
          {[
            { id: "profit", label: "수익" },
            { id: "tax", label: "세금" },
            { id: "dividend", label: "배당" },
            { id: "trend", label: "추이" },
            { id: "weight", label: "비중" },
          ].map((tab) => {
            const isActive = activeMainTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveMainTab(tab.id as any)}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  isActive
                    ? "bg-[#1366FF] text-white shadow-xs"
                    : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Main Content Container */}
      <main className="max-w-4xl mx-auto px-4 md:px-6 pt-4 space-y-4">
        {/* ========================================================================= */}
        {/* SUB-TAB 1: [수익] (Screen 2 Reference) */}
        {/* ========================================================================= */}
        {activeMainTab === "profit" && (
          <section className="space-y-4">
            {/* Card 1: 수익 현황 */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-5 md:p-6 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="text-sm font-bold text-[#0F172A]">수익 현황</h2>
                <div className="flex items-center gap-3 text-xs text-[#64748B]">
                  <label className="flex items-center gap-1 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isDetailExpanded}
                      onChange={(e) => {
                        setIsDetailExpanded(e.target.checked);
                        setExpandedEval(e.target.checked);
                        setExpandedRealized(e.target.checked);
                        setExpandedDividend(e.target.checked);
                      }}
                      className="rounded border-[#CBD5E1] text-[#1366FF] focus:ring-[#1366FF]"
                    />
                    <span>자세히</span>
                  </label>
                </div>
              </div>

              {/* Period Chips: [오늘] [총] [이번주] [이번달] [올해] */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {[
                  { id: "today", label: "오늘" },
                  { id: "total", label: "총" },
                  { id: "week", label: "이번주" },
                  { id: "month", label: "이번달" },
                  { id: "year", label: "올해" },
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setProfitPeriod(p.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                      profitPeriod === p.id
                        ? "bg-[#1366FF] text-white shadow-xs"
                        : "bg-[#F1F5F9] text-[#64748B] hover:text-[#0F172A]"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <div className="text-[11px] text-[#94A3B8] font-medium">조회 기간: {selectedRange.label}</div>

              {/* Rows: 평가수익, 실현수익, 배당금, 합계 */}
              <div className="space-y-3 pt-2 border-t border-[#F1F5F9]">
                {/* 1. 평가수익 */}
                <div>
                  <div
                    onClick={() => setExpandedEval(!expandedEval)}
                    className="flex items-center justify-between text-xs py-1 cursor-pointer hover:bg-[#F8FAFC] rounded-lg px-1 transition-colors"
                  >
                    <span className="text-[#64748B] font-medium flex items-center gap-1">
                      평가수익
                      {expandedEval ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </span>
                    <StatValue amount={profitOverview.evalGainKRW} percent={profitOverview.evalPct} size="sm" />
                  </div>
                  {expandedEval && (
                    <div className="mt-2 pl-3 space-y-1.5 border-l-2 border-[#1366FF]/20 text-[11px]">
                      {profitOverview.evalDetails.slice(0, 8).map((d, i) => (
                        <div key={i} className="flex justify-between items-center text-[#64748B]">
                          <span className="truncate max-w-[200px]">{d.name} ({d.ticker})</span>
                          <StatValue amount={d.gainKRW} size="sm" className="text-[11px]" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. 실현수익 */}
                <div>
                  <div
                    onClick={() => setExpandedRealized(!expandedRealized)}
                    className="flex items-center justify-between text-xs py-1 cursor-pointer hover:bg-[#F8FAFC] rounded-lg px-1 transition-colors"
                  >
                    <span className="text-[#64748B] font-medium flex items-center gap-1">
                      실현수익
                      {expandedRealized ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </span>
                    <StatValue amount={profitOverview.realizedKRW} percent={profitOverview.realizedPct} size="sm" />
                  </div>
                  {expandedRealized && (
                    <div className="mt-2 pl-3 space-y-1.5 border-l-2 border-[#1366FF]/20 text-[11px]">
                      {profitOverview.realizedTrades.length === 0 ? (
                        <div className="text-[#94A3B8]">해당 기간 매도 체결 내역이 없습니다.</div>
                      ) : (
                        profitOverview.realizedTrades.map((t, i) => (
                          <div key={i} className="flex justify-between items-center text-[#64748B]">
                            <span>{t.date} · {t.name || t.ticker}</span>
                            <StatValue amount={t.currency === "USD" ? t.realizedPnL * exchangeRate : t.realizedPnL} size="sm" />
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* 3. 배당금 */}
                <div>
                  <div
                    onClick={() => setExpandedDividend(!expandedDividend)}
                    className="flex items-center justify-between text-xs py-1 cursor-pointer hover:bg-[#F8FAFC] rounded-lg px-1 transition-colors"
                  >
                    <span className="text-[#64748B] font-medium flex items-center gap-1">
                      배당금
                      {expandedDividend ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </span>
                    <StatValue amount={profitOverview.dividendKRW} percent={profitOverview.dividendPct} size="sm" />
                  </div>
                  {expandedDividend && (
                    <div className="mt-2 pl-3 space-y-1.5 border-l-2 border-[#1366FF]/20 text-[11px]">
                      {profitOverview.dividendTrades.length === 0 ? (
                        <div className="text-[#94A3B8]">해당 기간 수령 배당금이 없습니다.</div>
                      ) : (
                        profitOverview.dividendTrades.map((t, i) => (
                          <div key={i} className="flex justify-between items-center text-[#64748B]">
                            <span>{t.date} · {t.name || t.ticker}</span>
                            <StatValue amount={t.currency === "USD" ? t.quantity * t.price * exchangeRate : t.quantity * t.price} size="sm" />
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* 4. 합계 */}
                <div className="pt-3 border-t border-[#F1F5F9] flex justify-between items-center">
                  <div>
                    <span className="text-xs font-bold text-[#0F172A] block">합계</span>
                    <span className="text-[10px] text-[#94A3B8]">평가 + 실현 + 배당</span>
                  </div>
                  <StatValue amount={profitOverview.sumKRW} percent={profitOverview.sumPct} size="md" />
                </div>
              </div>
            </div>

            {/* Card 2: 총 실현수익 (전체 기간 기준) */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-5 md:p-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#0F172A]">총 실현수익</span>
                <span className="text-[11px] text-[#94A3B8]">전체 기간 기준</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#64748B]">합계</span>
                <StatValue
                  amount={profitOverview.allTimeRealizedKRW}
                  percent={profitOverview.allTimeRealizedPct}
                  size="md"
                />
              </div>
              <button
                onClick={() => setIsAllTimeRealizedOpen(!isAllTimeRealizedOpen)}
                className="w-full text-center py-2 text-xs font-bold text-[#1366FF] hover:bg-[#EBF2FF] rounded-xl transition-colors flex items-center justify-center gap-1"
              >
                <span>{isAllTimeRealizedOpen ? "접기" : "자세히 보기"}</span>
                {isAllTimeRealizedOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>

              {isAllTimeRealizedOpen && (
                <div className="pt-2 border-t border-[#F1F5F9] space-y-2 text-xs">
                  {profitOverview.allTimeRealizedTrades.length === 0 ? (
                    <div className="text-center text-[#94A3B8] py-2">등록된 매도 실현 손익 내역이 없습니다.</div>
                  ) : (
                    profitOverview.allTimeRealizedTrades.map((t, idx) => (
                      <div key={idx} className="flex justify-between items-center p-2 bg-[#F8FAFC] rounded-xl">
                        <div>
                          <span className="font-bold text-[#0F172A] block">{t.name || t.ticker}</span>
                          <span className="text-[11px] text-[#94A3B8]">{t.date} · {t.account}</span>
                        </div>
                        <StatValue
                          amount={t.currency === "USD" ? t.realizedPnL * exchangeRate : t.realizedPnL}
                          size="sm"
                        />
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Card 3: 수익 차트 */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-5 md:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#0F172A]">수익 차트</h3>
                <div className="flex bg-[#F1F5F9] p-0.5 rounded-xl border border-[#E2E8F0]">
                  <button
                    onClick={() => setChartViewMode("monthly")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      chartViewMode === "monthly" ? "bg-white text-[#1366FF] shadow-xs" : "text-[#64748B]"
                    }`}
                  >
                    월별
                  </button>
                  <button
                    onClick={() => setChartViewMode("daily")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      chartViewMode === "daily" ? "bg-white text-[#1366FF] shadow-xs" : "text-[#64748B]"
                    }`}
                  >
                    일별
                  </button>
                </div>
              </div>

              {/* Year/Month Selector */}
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setSelectedYear(selectedYear - 1)}
                  className="p-1 rounded-lg hover:bg-[#F1F5F9] text-[#64748B]"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-bold text-[#0F172A]">{selectedYear}년</span>
                <button
                  onClick={() => setSelectedYear(selectedYear + 1)}
                  className="p-1 rounded-lg hover:bg-[#F1F5F9] text-[#64748B]"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Chart Legend */}
              <div className="flex items-center justify-center gap-4 text-xs font-medium text-[#64748B]">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-[#1366FF]/60"></span>
                  <span>수익 (금액)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-[#EF4444]"></span>
                  <span>수익률 (%)</span>
                </div>
              </div>

              {/* Composed Chart */}
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <XAxis dataKey="label" stroke="#94A3B8" fontSize={11} tickLine={false} />
                    <YAxis yAxisId="left" orientation="left" stroke="#94A3B8" fontSize={10} tickLine={false} />
                    <YAxis yAxisId="right" orientation="right" stroke="#94A3B8" fontSize={10} tickLine={false} unit="%" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#FFFFFF",
                        borderRadius: "12px",
                        border: "1px solid #E2E8F0",
                        boxShadow: "0 4px 12px rgba(15,23,42,0.08)",
                        fontSize: "12px",
                      }}
                    />
                    <ReferenceLine yAxisId="left" y={0} stroke="#E2E8F0" />
                    <Bar yAxisId="left" dataKey="amountKRW" fill="#1366FF" opacity={0.65} radius={[4, 4, 0, 0]} />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="returnPct"
                      stroke="#EF4444"
                      strokeWidth={2}
                      dot={{ r: 3, fill: "#EF4444" }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* SUB-TAB 2: [배당] (Screen 3 Reference) */}
        {/* ========================================================================= */}
        {activeMainTab === "dividend" && (
          <section className="space-y-4">
            {/* Header with Currency Switch */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold text-[#0F172A]">배당 요약</span>
                <span className="text-xs text-[#94A3B8]">({selectedYear}년)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex bg-[#F1F5F9] p-0.5 rounded-xl border border-[#E2E8F0] text-xs font-bold">
                  <button
                    onClick={() => setDividendCurrencyMode("KRW")}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      dividendCurrencyMode === "KRW" ? "bg-white text-[#1366FF] shadow-xs" : "text-[#64748B]"
                    }`}
                  >
                    실수령액 (₩)
                  </button>
                  <button
                    onClick={() => setDividendCurrencyMode("USD")}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      dividendCurrencyMode === "USD" ? "bg-white text-[#1366FF] shadow-xs" : "text-[#64748B]"
                    }`}
                  >
                    외화 ($)
                  </button>
                </div>
              </div>
            </div>

            {/* Top Summary Card */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-5 md:p-6 space-y-1">
              <span className="text-xs font-semibold text-[#64748B]">예상 실수령액</span>
              <div className="text-2xl md:text-3xl font-black text-[#0F172A] tracking-tight">
                ₩{dividendData.totalExpectedDividendKRW.toLocaleString("ko-KR")}
              </div>
              <p className="text-xs text-[#64748B] pt-1">
                투자배당률 <span className="font-bold text-[#16A34A]">{dividendData.dividendYieldPct.toFixed(2)}%</span>
              </p>
            </div>

            {/* Monthly Dividend Bar Chart */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-5 space-y-3">
              <h3 className="text-xs font-bold text-[#64748B]">월별 배당금 추이</h3>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dividendData.monthlyBarList} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
                    <XAxis dataKey="month" stroke="#94A3B8" fontSize={10} tickLine={false} />
                    <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#FFFFFF",
                        borderRadius: "12px",
                        border: "1px solid #E2E8F0",
                        fontSize: "12px",
                      }}
                      formatter={(val: any) => [`₩${Number(val).toLocaleString()}`, "배당금"]}
                    />
                    <Bar dataKey="amount" fill="#F43F5E" opacity={0.7} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Monthly Payout Timeline List (Screen 3 Reference) */}
            <div className="space-y-3">
              {dividendData.samplePayoutList.map((monthGroup, idx) => (
                <div key={idx} className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-2">
                    <span className="text-sm font-bold text-[#0F172A]">{monthGroup.month}</span>
                    <span className="text-xs font-extrabold text-[#0F172A]">
                      ₩{monthGroup.totalMonthKRW.toLocaleString()}
                    </span>
                  </div>
                  <div className="space-y-2.5">
                    {monthGroup.items.map((item, itemIdx) => (
                      <div key={itemIdx} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2.5">
                          <span className="text-[11px] text-[#94A3B8] font-medium w-6">{item.date}</span>
                          <div className="w-8 h-8 rounded-xl bg-[#F1F5F9] border border-[#E2E8F0] flex items-center justify-center font-bold text-xs text-[#0F172A]">
                            {item.ticker.slice(0, 3)}
                          </div>
                          <div>
                            <span className="font-bold text-[#0F172A] block">{item.name}</span>
                            <span className="text-[10px] text-[#94A3B8]">
                              {item.shares}주 · 1주당 {item.payoutPerShare}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-[#0F172A] block">₩{item.totalKRW.toLocaleString()}</span>
                          <span className="text-[10px] text-[#94A3B8]">(${item.totalUSD.toFixed(2)})</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* SUB-TAB 3: [세금] */}
        {/* ========================================================================= */}
        {activeMainTab === "tax" && (
          <section className="space-y-4">
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-5 md:p-6 space-y-3">
              <h3 className="text-sm font-bold text-[#0F172A]">해외주식 양도소득세 시뮬레이션</h3>
              <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#64748B]">해외주식 연간 확정 손익</span>
                  <span className="font-bold text-[#0F172A]">
                    ₩{Math.round(profitOverview.allTimeRealizedKRW).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748B]">기본 공제액</span>
                  <span className="font-bold text-[#1366FF]">-₩2,500,000</span>
                </div>
                <div className="pt-2 border-t border-[#E2E8F0] flex justify-between font-bold text-sm">
                  <span>예상 양도소득세 (22%)</span>
                  <span className="text-[#EF4444]">
                    ₩
                    {Math.max(
                      0,
                      Math.round((profitOverview.allTimeRealizedKRW - 2500000) * 0.22)
                    ).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* SUB-TAB 4: [추이] */}
        {/* ========================================================================= */}
        {activeMainTab === "trend" && (
          <section className="space-y-4">
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-5 md:p-6 space-y-3">
              <h3 className="text-sm font-bold text-[#0F172A]">자산 누적 평가 추이</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailySnapshots.length > 0 ? dailySnapshots : [{ date_full: "2026-08", total_valuation_krw: 159841923 }]}>
                    <XAxis dataKey="date_full" stroke="#94A3B8" fontSize={10} tickLine={false} />
                    <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#FFFFFF",
                        borderRadius: "12px",
                        border: "1px solid #E2E8F0",
                        fontSize: "12px",
                      }}
                      formatter={(v: any) => [`₩${Number(v).toLocaleString()}`, "총 자산"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="total_valuation_krw"
                      stroke="#1366FF"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: "#1366FF" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* SUB-TAB 5: [비중] */}
        {/* ========================================================================= */}
        {activeMainTab === "weight" && (
          <section className="space-y-4">
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-5 md:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#0F172A]">포트폴리오 비중 분석</h3>
                <div className="flex bg-[#F1F5F9] p-0.5 rounded-xl border border-[#E2E8F0] text-xs font-bold">
                  {[
                    { id: "ticker", label: "종목별" },
                    { id: "account", label: "계좌별" },
                    { id: "market", label: "시장별" },
                  ].map((sub) => (
                    <button
                      key={sub.id}
                      onClick={() => setActiveSubTab(sub.id)}
                      className={`px-2.5 py-1 rounded-lg transition-all ${
                        activeSubTab === sub.id ? "bg-white text-[#1366FF] shadow-xs" : "text-[#64748B]"
                      }`}
                    >
                      {sub.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pie Chart */}
              <div className="h-64 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={weightData.chartList}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      innerRadius={50}
                      paddingAngle={2}
                    >
                      {weightData.chartList.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any) => [`₩${Number(val).toLocaleString()}`, "평가액"]}
                      contentStyle={{
                        backgroundColor: "#FFFFFF",
                        borderRadius: "12px",
                        border: "1px solid #E2E8F0",
                        fontSize: "12px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Breakdown List */}
              <div className="space-y-2 pt-2 border-t border-[#F1F5F9]">
                {weightData.chartList.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-md shrink-0"
                        style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                      ></span>
                      <span className="font-bold text-[#0F172A] truncate max-w-[180px]">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-[#0F172A]">₩{item.value.toLocaleString()}</span>
                      <span className="text-[11px] text-[#64748B] ml-1.5">({item.percent.toFixed(1)}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Info Modal */}
      {showInfoModal && (
        <div
          onClick={() => setShowInfoModal(null)}
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl border border-[#E2E8F0] shadow-modal max-w-sm w-full p-5 space-y-3"
          >
            <h4 className="text-base font-bold text-[#0F172A]">안내</h4>
            <p className="text-xs text-[#64748B] leading-relaxed">{showInfoModal}</p>
            <button
              onClick={() => setShowInfoModal(null)}
              className="w-full py-2 bg-[#1366FF] text-white rounded-xl text-xs font-bold shadow-xs hover:bg-[#0D54DB]"
            >
              확인
            </button>
          </div>
        </div>
      )}

      {/* Global Bottom Nav */}
      <BottomNav />
    </div>
  );
}
