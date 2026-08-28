"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Menu,
  RefreshCw,
  Eye,
  EyeOff,
  Plus,
  ArrowLeft,
  Star,
  CheckCircle2,
  TrendingUp,
  SlidersHorizontal,
  FileSpreadsheet,
  FileText,
  Download,
  ReceiptText,
  Calendar,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ManualAssetModal from "@/components/ManualAssetModal";
import BatchImportPreviewModal from "@/components/BatchImportPreviewModal";
import { KeypadModal } from "@/components/KeypadModal";
import { AccountsDrawer } from "@/components/AccountsDrawer";
import { FilterModal } from "@/components/FilterModal";
import { StockCard } from "@/components/StockCard";
import { QuickNavButtons } from "@/components/QuickNavButtons";
import { BottomNav } from "@/components/BottomNav";
import { StatValue } from "@/components/ui/StatValue";
import { parseExcelFile, parsePdfFile, ParsedRowItem } from "@/lib/apiClient";
import { formatCurrency } from "@/lib/utils";

type TabType = "home" | "transactions";
type CurrencyType = "KRW" | "USD";

type PortfolioSummary = {
  total_valuation_usd: number;
  total_invested_usd: number;
  total_return_usd: number;
  total_return_pct: number;
  today_change_usd: number;
  today_change_pct: number;
  exchange_rate: number;
};

type PortfolioStock = {
  id: string;
  ticker: string;
  name: string;
  category: string;
  market: string;
  currency: string;
  currentPriceUsd: number;
  previousCloseUsd: number;
  changePct: number;
  changeAmountUsd: number;
  shares: number;
  avgPriceUsd: number;
  realizedGainUsd: number;
  marketStateLabel?: string;
  holdings: Array<{ id: string; brokerage: string; shares: number; avgPriceUsd: number }>;
  transactions: Array<{
    id: string;
    type: string;
    date: string;
    shares: number;
    priceUsd: number;
    brokerage: string;
    notes?: string;
    transactionId?: number;
    accountId?: number;
    currency?: "KRW" | "USD";
    rawType?: "BUY" | "SELL" | "DIVIDEND";
    transactedAt?: string;
  }>;
};

export default function AlexandriaApp() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Navigation & View States
  const [activeTab, setActiveTab] = useState<TabType>("home");
  const [currency, setCurrency] = useState<CurrencyType>("KRW");
  const [hideAssetAmounts, setHideAssetAmounts] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("전체");
  const [selectedAccountFilter, setSelectedAccountFilter] = useState<string>("전체");
  const [cardProfitMode, setCardProfitMode] = useState<"total" | "daily">("total");
  const [txFilterType, setTxFilterType] = useState<"ALL" | "매수" | "매도" | "배당">("ALL");

  // Stock Detail & Keypad States
  const [selectedStockId, setSelectedStockId] = useState<string | null>(null);
  const [detailSubTab, setDetailSubTab] = useState<"assets" | "transactions">("assets");
  const [isKeypadOpen, setIsKeypadOpen] = useState(false);
  const [keypadType, setKeypadType] = useState<"buy" | "sell" | "dividend">("buy");
  const [editingTransaction, setEditingTransaction] = useState<{
    id: number;
    account_id: number;
    type: "BUY" | "SELL" | "DIVIDEND";
    quantity: number;
    price: number;
    currency: "KRW" | "USD";
    ticker: string;
    stockName: string;
    transacted_at?: string;
  } | null>(null);

  // Overlays
  const [isAccountDrawerOpen, setIsAccountDrawerOpen] = useState(false);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [portfolioSummary, setPortfolioSummary] = useState<PortfolioSummary | null>(null);

  // Batch Import
  const [isExcelLoading, setIsExcelLoading] = useState(false);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewFileName, setPreviewFileName] = useState("");
  const [previewItems, setPreviewItems] = useState<ParsedRowItem[]>([]);
  const [previewBrokerage, setPreviewBrokerage] = useState<string | undefined>(undefined);

  const excelInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  // Real-time State & Exchange Rate
  const [rate, setRate] = useState<number>(1385.48);
  const [isLiveLoading, setIsLiveLoading] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>("");
  const [isWsConnected, setIsWsConnected] = useState(false);
  const [isPortfolioLoaded, setIsPortfolioLoaded] = useState(false);
  const [stocks, setStocks] = useState<PortfolioStock[]>([]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Sync route query tab
  useEffect(() => {
    const requestedTab = searchParams.get("tab");
    if (requestedTab === "transactions") {
      setSelectedStockId(null);
      setActiveTab("transactions");
    } else {
      setActiveTab("home");
    }
  }, [searchParams]);

  // Format money helper
  const formatMoney = (valInUsd: number) => {
    if (hideAssetAmounts) return "••••••";
    if (currency === "KRW") {
      const valKrw = Math.round(valInUsd * rate);
      return `₩${valKrw.toLocaleString("ko-KR")}`;
    }
    return `$${valInUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // 1. Fetch Realtime Quotes from FastAPI
  const fetchRealtimeQuotes = async (manual = false) => {
    if (manual) setIsLiveLoading(true);
    try {
      const [holdingsRes, summaryRes] = await Promise.all([
        fetch("/api/backend/portfolio/holdings", { cache: "no-store" }),
        fetch("/api/backend/portfolio/summary", { cache: "no-store" }),
      ]);
      if (!holdingsRes.ok || !summaryRes.ok) throw new Error("FastAPI 시세 동기화 실패");
      const [holdings, summary] = await Promise.all([holdingsRes.json(), summaryRes.json()]);
      const currentRate = Number(summary.exchange_rate || rate);
      setRate(currentRate);
      setPortfolioSummary(summary);
      const quoteByTicker = new Map<string, any>(holdings.map((holding: any) => [holding.ticker, holding]));
      setStocks((prev) =>
        prev.map((stock) => {
          const holding = quoteByTicker.get(stock.ticker);
          if (!holding) return stock;
          return {
            ...stock,
            name: holding.asset_name,
            currentPriceUsd: holding.currency === "KRW" ? holding.current_price / currentRate : holding.current_price,
            previousCloseUsd: holding.currency === "KRW" ? holding.previous_close / currentRate : holding.previous_close,
            changeAmountUsd:
              (holding.currency === "KRW" ? holding.current_price / currentRate : holding.current_price) -
              (holding.currency === "KRW" ? holding.previous_close / currentRate : holding.previous_close),
            changePct:
              holding.previous_close > 0
                ? ((holding.current_price - holding.previous_close) / holding.previous_close) * 100
                : 0,
          };
        })
      );
      setLastSyncTime(
        new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
      );
      if (manual) showToast("실시간 시세를 갱신했습니다.");
    } catch (err) {
      console.error("FastAPI 시세 동기화 오류:", err);
    } finally {
      if (manual) setIsLiveLoading(false);
    }
  };

  // 2. Load Portfolio Holdings & Transactions from DB
  const loadPortfolio = async () => {
    try {
      const [holdingsRes, transactionsRes] = await Promise.all([
        fetch("/api/backend/portfolio/holdings", { cache: "no-store" }),
        fetch("/api/backend/transactions?limit=200", { cache: "no-store" }),
      ]);

      if (!holdingsRes.ok || !transactionsRes.ok) {
        throw new Error("포트폴리오 DB 조회 실패");
      }
      const holdings = await holdingsRes.json();
      const transactions = await transactionsRes.json();
      const byTicker = new Map<string, any>();

      for (const holding of holdings) {
        const item = byTicker.get(holding.ticker) || {
          id: `s_${holding.ticker.toLowerCase()}`,
          ticker: holding.ticker,
          name: holding.asset_name,
          category: holding.asset_type,
          market: holding.market,
          currency: holding.currency,
          currentPriceUsd: holding.currency === "KRW" ? holding.current_price / rate : holding.current_price,
          previousCloseUsd: holding.currency === "KRW" ? holding.previous_close / rate : holding.previous_close,
          changePct:
            holding.previous_close > 0
              ? ((holding.current_price - holding.previous_close) / holding.previous_close) * 100
              : 0,
          changeAmountUsd:
            (holding.currency === "KRW" ? holding.current_price / rate : holding.current_price) -
            (holding.currency === "KRW" ? holding.previous_close / rate : holding.previous_close),
          shares: 0,
          avgPriceUsd: 0,
          realizedGainUsd: 0,
          holdings: [],
          transactions: [],
        };
        const priceInUsd = holding.currency === "KRW" ? holding.average_buy_price / rate : holding.average_buy_price;
        const oldCost = item.shares * item.avgPriceUsd;
        item.shares += holding.quantity;
        item.avgPriceUsd = item.shares > 0 ? (oldCost + holding.quantity * priceInUsd) / item.shares : 0;
        item.holdings.push({
          id: `h_${holding.id}`,
          brokerage: holding.account_name,
          shares: holding.quantity,
          avgPriceUsd: priceInUsd,
        });
        byTicker.set(holding.ticker, item);
      }

      for (const tx of transactions) {
        const item = byTicker.get(tx.ticker);
        if (!item) continue;
        const priceInUsd = tx.currency === "KRW" ? tx.price / rate : tx.price;
        item.realizedGainUsd += tx.type === "SELL" || tx.type === "DIVIDEND" ? Number(tx.realized_pnl || 0) : 0;
        item.transactions.push({
          id: `t_${tx.id}`,
          type: tx.type === "BUY" ? "매수" : tx.type === "SELL" ? "매도" : "배당",
          date: String(tx.transacted_at).slice(0, 10),
          shares: tx.quantity,
          priceUsd: priceInUsd,
          brokerage: tx.account_name,
          transactionId: tx.id,
          accountId: tx.account_id,
          currency: tx.currency,
          rawType: tx.type,
          transactedAt: String(tx.transacted_at).slice(0, 10),
        });
      }

      if (byTicker.size > 0) setStocks(Array.from(byTicker.values()) as any);
    } catch (err) {
      console.error("포트폴리오 DB 로드 실패:", err);
      showToast("포트폴리오 DB에 연결할 수 없습니다.");
    } finally {
      setIsPortfolioLoaded(true);
    }
  };

  useEffect(() => {
    loadPortfolio();
  }, []);

  // 3. Fast 1-second REST Polling for single source of truth
  useEffect(() => {
    fetchRealtimeQuotes();
    const interval = setInterval(() => {
      fetchRealtimeQuotes();
    }, 1000);
    return () => clearInterval(interval);
  }, [rate]);

  // 4. WebSocket Ticks Instant Live Broadcast
  useEffect(() => {
    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let isDisposed = false;

    const connect = () => {
      if (isDisposed) return;
      try {
        const protocol = window.location.protocol === "https:" ? "wss" : "ws";
        socket = new WebSocket(`${protocol}://${window.location.hostname}:8001`);

        socket.onopen = () => {
          setIsWsConnected(true);
        };

        socket.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            if (message?.type !== "TICK" || !message.data) return;
            const tick = message.data;
            const ticker = String(tick.ticker || "").toUpperCase();
            const currentPrice = Number(tick.currentPrice);
            if (!ticker || !Number.isFinite(currentPrice)) return;

            setStocks((prev) =>
              prev.map((s) => {
                if (s.ticker.toUpperCase() !== ticker) return s;
                const priceUsd = tick.currency === "KRW" ? currentPrice / rate : currentPrice;
                const previousCloseUsd =
                  Number(tick.previousClose) > 0
                    ? tick.currency === "KRW"
                      ? Number(tick.previousClose) / rate
                      : Number(tick.previousClose)
                    : s.previousCloseUsd > 0
                    ? s.previousCloseUsd
                    : priceUsd;
                const changeAmountUsd = priceUsd - previousCloseUsd;
                const changePct = previousCloseUsd > 0 ? (changeAmountUsd / previousCloseUsd) * 100 : 0;

                return {
                  ...s,
                  currentPriceUsd: priceUsd,
                  previousCloseUsd,
                  changeAmountUsd,
                  changePct,
                };
              })
            );
          } catch {
            // ignore
          }
        };

        socket.onclose = () => {
          setIsWsConnected(false);
          if (!isDisposed) reconnectTimer = setTimeout(connect, 3000);
        };

        socket.onerror = () => {
          socket?.close();
        };
      } catch {
        if (!isDisposed) reconnectTimer = setTimeout(connect, 3000);
      }
    };

    connect();

    return () => {
      isDisposed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, [rate]);

  const openTransactionEditor = (transaction: any, ticker: string, stockName: string) => {
    if (!transaction.transactionId || !transaction.accountId || !transaction.rawType) {
      showToast("거래 정보를 불러오는 중입니다. 잠시 후 다시 선택해주세요.");
      return;
    }
    setEditingTransaction({
      id: transaction.transactionId,
      account_id: transaction.accountId,
      type: transaction.rawType,
      quantity: transaction.shares,
      price: transaction.currency === "KRW" ? transaction.priceUsd * rate : transaction.priceUsd,
      currency: transaction.currency,
      ticker,
      stockName,
      transacted_at: transaction.transactedAt,
    });
  };

  // Calculations
  const totalValuationUsd = stocks.reduce((acc, s) => acc + s.shares * s.currentPriceUsd, 0);
  const totalInvestedUsd = stocks.reduce((acc, s) => acc + s.shares * s.avgPriceUsd, 0);
  const totalReturnUsd = totalValuationUsd - totalInvestedUsd;
  const totalReturnPct = totalInvestedUsd > 0 ? (totalReturnUsd / totalInvestedUsd) * 100 : 0;
  const previousCloseValuationUsd = stocks.reduce((acc, s) => acc + s.shares * s.previousCloseUsd, 0);
  const todayGainUsd = totalValuationUsd - previousCloseValuationUsd;
  const todayGainPct = previousCloseValuationUsd > 0 ? (todayGainUsd / previousCloseValuationUsd) * 100 : 0;

  const dashboardValuationUsd = totalValuationUsd;
  const dashboardInvestedUsd = totalInvestedUsd;
  const dashboardReturnUsd = totalReturnUsd;
  const dashboardReturnPct = totalReturnPct;
  const dashboardTodayUsd = todayGainUsd;
  const dashboardTodayPct = todayGainPct;

  const dashboardValuationDisplay = currency === "KRW" ? dashboardValuationUsd * rate : dashboardValuationUsd;
  const dashboardInvestedDisplay = currency === "KRW" ? dashboardInvestedUsd * rate : dashboardInvestedUsd;
  const dashboardReturnDisplay = currency === "KRW" ? dashboardReturnUsd * rate : dashboardReturnUsd;
  const dashboardTodayDisplay = currency === "KRW" ? dashboardTodayUsd * rate : dashboardTodayUsd;

  // Selected Stock for P-101 Detail
  const selectedStock = stocks.find((s) => s.id === selectedStockId) || stocks[0];

  // StockCard Items transformation
  const stockCardItems = stocks.map((s) => {
    const evalUsd = s.shares * s.currentPriceUsd;
    const costUsd = s.shares * s.avgPriceUsd;
    const gainUsd = evalUsd - costUsd;
    const dailyGainUsd = s.shares * s.changeAmountUsd;

    return {
      id: s.id,
      ticker: s.ticker,
      name: s.name,
      category: s.category || "주식",
      account: (s.holdings && s.holdings[0]?.brokerage) || "일반",
      accountsList: s.holdings ? s.holdings.map((h) => h.brokerage) : [],
      currency: (s.currency === "KRW" ? "KRW" : "USD") as "KRW" | "USD",
      market: (s.market === "KR" ? "KR" : "US") as "KR" | "US",
      quantity: s.shares,
      averagePrice: s.currency === "KRW" ? s.avgPriceUsd * rate : s.avgPriceUsd,
      currentUnitPrice: s.currency === "KRW" ? s.currentPriceUsd * rate : s.currentPriceUsd,
      evalAmountCurrency: s.currency === "KRW" ? evalUsd * rate : evalUsd,
      evalKRW: evalUsd * rate,
      costAmountCurrency: s.currency === "KRW" ? costUsd * rate : costUsd,
      costKRW: costUsd * rate,
      gainCurrency: s.currency === "KRW" ? gainUsd * rate : gainUsd,
      gainKRW: gainUsd * rate,
      gainPercent: ((s.currentPriceUsd - s.avgPriceUsd) / (s.avgPriceUsd || 1)) * 100,
      dailyChangePercent: s.changePct,
      dailyGainCurrency: s.currency === "KRW" ? dailyGainUsd * rate : dailyGainUsd,
      dailyGainKRW: dailyGainUsd * rate,
      marketStateLabel: s.marketStateLabel || "장중",
    };
  });

  const categories = ["전체", ...Array.from(new Set(stocks.map((s) => s.category).filter(Boolean)))];

  const filteredStockCardItems = stockCardItems.filter((item) => {
    if (selectedCategory !== "전체" && item.category !== selectedCategory) return false;
    if (selectedAccountFilter !== "전체" && !item.accountsList.includes(selectedAccountFilter)) return false;
    return true;
  });

  // All Transactions for Timeline
  const allTx = stocks.flatMap((s) =>
    s.transactions.map((t) => ({
      ...t,
      ticker: s.ticker,
      stockName: s.name,
      market: s.market,
      currency: s.currency,
      totalUsd: t.shares * t.priceUsd,
      totalKRW: t.shares * t.priceUsd * rate,
    }))
  );

  const filteredTx = (txFilterType === "ALL" ? allTx : allTx.filter((t) => t.type === txFilterType)).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Group transactions by date
  const txGroupedByDate = filteredTx.reduce((acc, tx) => {
    const d = tx.date;
    if (!acc[d]) acc[d] = [];
    acc[d].push(tx);
    return acc;
  }, {} as Record<string, typeof filteredTx>);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] pb-24 selection:bg-[#1366FF]/20 selection:text-[#1366FF]">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-[#0F172A] text-white px-4 py-2.5 rounded-xl shadow-modal text-xs font-semibold flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. TOP APP HEADER (Screen 1 & 5) */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#E2E8F0] px-4 md:px-6 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsAccountDrawerOpen(true)}
              className="w-9 h-9 rounded-xl bg-[#F1F5F9] hover:bg-[#E2E8F0] flex items-center justify-center text-[#0F172A] transition-colors"
              aria-label="계좌 드로어 열기"
            >
              <Menu className="w-5 h-5" strokeWidth={2} />
            </button>
            <h1 className="text-base md:text-lg font-bold text-[#0F172A] tracking-tight">
              {selectedStockId
                ? "종목 상세"
                : activeTab === "home"
                ? "내 자산 포트폴리오"
                : "거래내역"}
            </h1>
          </div>

          {/* Right Action Icons: Currency Switch & Quick Icons */}
          <div className="flex items-center gap-2">
            {/* Currency Pill Switch [KRW] [USD] */}
            <div className="inline-flex bg-[#F1F5F9] p-0.5 rounded-xl border border-[#E2E8F0]">
              <button
                onClick={() => setCurrency("KRW")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  currency === "KRW"
                    ? "bg-white text-[#1366FF] shadow-xs"
                    : "text-[#64748B] hover:text-[#0F172A]"
                }`}
              >
                KRW
              </button>
              <button
                onClick={() => setCurrency("USD")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  currency === "USD"
                    ? "bg-white text-[#1366FF] shadow-xs"
                    : "text-[#64748B] hover:text-[#0F172A]"
                }`}
              >
                USD
              </button>
            </div>

            {/* Asset Amount Mask Toggle */}
            <button
              onClick={() => setHideAssetAmounts(!hideAssetAmounts)}
              className="w-9 h-9 rounded-xl bg-[#F1F5F9] hover:bg-[#E2E8F0] flex items-center justify-center text-[#64748B] transition-colors"
              aria-label="금액 숨김 토글"
            >
              {hideAssetAmounts ? (
                <EyeOff className="w-4 h-4 text-[#EF4444]" />
              ) : (
                <Eye className="w-4 h-4 text-[#64748B]" />
              )}
            </button>

            {/* Refresh Quotes */}
            <button
              onClick={() => fetchRealtimeQuotes(true)}
              disabled={isLiveLoading}
              className="w-9 h-9 rounded-xl bg-[#F1F5F9] hover:bg-[#E2E8F0] flex items-center justify-center text-[#64748B] transition-colors disabled:opacity-50"
              aria-label="시세 새로고침"
            >
              <RefreshCw className={`w-4 h-4 ${isLiveLoading ? "animate-spin text-[#1366FF]" : ""}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Loading Overlay */}
      {!isPortfolioLoaded && (
        <div className="fixed inset-x-0 top-16 bottom-16 z-20 flex items-center justify-center bg-[#F8FAFC]/80 backdrop-blur-xs">
          <div className="flex flex-col items-center gap-2.5 text-[#64748B]">
            <RefreshCw className="w-6 h-6 animate-spin text-[#1366FF]" />
            <span className="text-xs font-semibold">포트폴리오를 불러오는 중입니다...</span>
          </div>
        </div>
      )}

      {/* MAIN CONTAINER */}
      <main className="max-w-4xl mx-auto px-4 md:px-6 pt-4 space-y-4">
        {/* ========================================================================= */}
        {/* VIEW A: [P-101] STOCK DETAIL VIEW */}
        {/* ========================================================================= */}
        {selectedStockId ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setSelectedStockId(null)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#E2E8F0] text-xs font-bold text-[#0F172A] hover:bg-[#F1F5F9] shadow-xs"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>목록으로</span>
              </button>
              <span className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
                {selectedStock.category}
              </span>
              <button
                onClick={() => showToast("관심 종목에 등록되었습니다.")}
                className="w-9 h-9 rounded-xl bg-white border border-[#E2E8F0] flex items-center justify-center text-[#64748B] hover:text-[#F59E0B] shadow-xs"
              >
                <Star className="w-4 h-4" />
              </button>
            </div>

            {/* Top Detail Card */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 md:p-6 text-center space-y-2 shadow-xs">
              <h2 className="text-xl md:text-2xl font-black text-[#0F172A]">
                {selectedStock.name}{" "}
                <span className="text-sm font-semibold text-[#64748B] uppercase">({selectedStock.ticker})</span>
              </h2>
              <div className="text-3xl md:text-4xl font-extrabold text-[#0F172A] tracking-tight">
                {formatMoney(selectedStock.currentPriceUsd)}
              </div>
              <div className="pt-1">
                <StatValue
                  amount={currency === "KRW" ? selectedStock.changeAmountUsd * rate : selectedStock.changeAmountUsd}
                  percent={selectedStock.changePct}
                  currency={currency}
                  size="md"
                />
              </div>

              {/* 3 Metrics */}
              <div className="grid grid-cols-3 gap-2 pt-4 mt-4 border-t border-[#F1F5F9]">
                <div>
                  <span className="text-[11px] font-medium text-[#64748B] block">총 평가금</span>
                  <div className="text-sm md:text-base font-bold text-[#0F172A] mt-0.5">
                    {formatMoney(selectedStock.shares * selectedStock.currentPriceUsd)}
                  </div>
                </div>
                <div className="border-x border-[#F1F5F9]">
                  <span className="text-[11px] font-medium text-[#64748B] block">매입 원금</span>
                  <div className="text-sm md:text-base font-bold text-[#64748B] mt-0.5">
                    {formatMoney(selectedStock.shares * selectedStock.avgPriceUsd)}
                  </div>
                </div>
                <div>
                  <span className="text-[11px] font-medium text-[#64748B] block">총 수익률</span>
                  <div className="mt-0.5">
                    <StatValue
                      amount={selectedStock.shares * (selectedStock.currentPriceUsd - selectedStock.avgPriceUsd) * (currency === "KRW" ? rate : 1)}
                      percent={((selectedStock.currentPriceUsd - selectedStock.avgPriceUsd) / (selectedStock.avgPriceUsd || 1)) * 100}
                      currency={currency}
                      size="sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Sub-Tabs: Assets & Transactions */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-xs space-y-3">
              <div className="flex gap-2 p-1 bg-[#F1F5F9] rounded-xl">
                <button
                  onClick={() => setDetailSubTab("assets")}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    detailSubTab === "assets" ? "bg-white text-[#1366FF] shadow-xs" : "text-[#64748B]"
                  }`}
                >
                  계좌별 보유 ({selectedStock.holdings.length})
                </button>
                <button
                  onClick={() => setDetailSubTab("transactions")}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    detailSubTab === "transactions" ? "bg-white text-[#1366FF] shadow-xs" : "text-[#64748B]"
                  }`}
                >
                  체결 이력 ({selectedStock.transactions.length})
                </button>
              </div>

              {detailSubTab === "assets" ? (
                <div className="space-y-2">
                  {selectedStock.holdings.map((h) => (
                    <div
                      key={h.id}
                      className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] flex justify-between items-center text-xs"
                    >
                      <div>
                        <span className="font-bold text-[#0F172A] block">{h.brokerage}</span>
                        <span className="text-[#64748B]">
                          {h.shares}주 · 평단 {formatMoney(h.avgPriceUsd)}
                        </span>
                      </div>
                      <StatValue
                        amount={(selectedStock.currentPriceUsd - h.avgPriceUsd) * h.shares * (currency === "KRW" ? rate : 1)}
                        percent={((selectedStock.currentPriceUsd - h.avgPriceUsd) / (h.avgPriceUsd || 1)) * 100}
                        currency={currency}
                        size="sm"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedStock.transactions.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => openTransactionEditor(t, selectedStock.ticker, selectedStock.name)}
                      className="w-full p-3 bg-[#F8FAFC] hover:bg-[#F1F5F9] rounded-xl border border-[#E2E8F0] flex justify-between items-center text-left text-xs transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                            t.type === "매수"
                              ? "bg-blue-50 text-[#1366FF] border border-blue-100"
                              : t.type === "매도"
                              ? "bg-red-50 text-[#EF4444] border border-red-100"
                              : "bg-amber-50 text-amber-600 border border-amber-100"
                          }`}
                        >
                          {t.type}
                        </span>
                        <div>
                          <span className="font-bold text-[#0F172A]">{t.brokerage}</span>
                          <span className="text-[#64748B] block text-[11px]">{t.date}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-[#0F172A] block">
                          {t.shares}주 @ {formatMoney(t.priceUsd)}
                        </span>
                        <span className="text-[11px] text-[#64748B]">{formatMoney(t.shares * t.priceUsd)}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* ===================================================================== */}
            {/* SCREEN 1: 포트폴리오 홈 / 대시보드 */}
            {/* ===================================================================== */}
            {activeTab === "home" && (
              <section className="space-y-4">
                {/* 1. Main Valuation Card (Screen 1 Reference) */}
                <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-5 md:p-6 space-y-4">
                  {/* Card Header: Total Label & LIVE Badge */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#64748B]">총 자산 평가액</span>
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#DCFCE7] text-[#16A34A] font-bold text-[11px]">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#16A34A] opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-[#16A34A]"></span>
                      </span>
                      <span>LIVE</span>
                    </div>
                  </div>

                  {/* Large Valuation Amount & Exchange Rate */}
                  <div>
                    <div className="flex items-baseline gap-2.5 flex-wrap">
                      <h2 className="text-2xl md:text-3xl font-black text-[#0F172A] tracking-tight">
                        {hideAssetAmounts ? "••••••••" : formatCurrency(dashboardValuationDisplay, currency)}
                      </h2>
                      <span className="px-2 py-0.5 rounded-md bg-[#EBF2FF] text-[#1366FF] text-xs font-bold">
                        ₩{rate.toLocaleString()}/$
                      </span>
                    </div>
                    {lastSyncTime && (
                      <p className="text-[11px] text-[#94A3B8] mt-1 font-medium">실시간 정산 {lastSyncTime}</p>
                    )}
                  </div>

                  {/* 2-Column Stats: Total Return & Today Delta */}
                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#F1F5F9]">
                    <div>
                      <span className="text-xs font-medium text-[#64748B] block">총 투자수익</span>
                      <div className="mt-1">
                        {hideAssetAmounts ? (
                          <span className="text-sm font-bold text-[#64748B]">••••••</span>
                        ) : (
                          <StatValue
                            amount={dashboardReturnDisplay}
                            percent={dashboardReturnPct}
                            currency={currency}
                            size="md"
                          />
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-[#64748B] block">오늘의 변동 (Δ)</span>
                      <div className="mt-1">
                        {hideAssetAmounts ? (
                          <span className="text-sm font-bold text-[#64748B]">••••••</span>
                        ) : (
                          <StatValue
                            amount={dashboardTodayDisplay}
                            percent={dashboardTodayPct}
                            currency={currency}
                            size="md"
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Bottom Line: Total Invested Cost */}
                  <div className="pt-3 border-t border-[#F1F5F9] flex items-center justify-between text-xs">
                    <span className="text-[#64748B] font-medium">투자 매입 원금</span>
                    <span className="font-bold text-[#0F172A]">
                      {hideAssetAmounts ? "••••••" : formatCurrency(dashboardInvestedDisplay, currency)}
                    </span>
                  </div>
                </div>

                {/* 2. Quick Analysis Action Tiles (Screen 1 Reference) */}
                <QuickNavButtons />

                {/* 3. Holdings Section (Screen 1 Reference) */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between gap-2 px-0.5">
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-[#0F172A]">보유 종목</h2>
                      <div className="flex bg-[#F1F5F9] p-0.5 rounded-xl border border-[#E2E8F0]">
                        <button
                          onClick={() => setCardProfitMode("total")}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                            cardProfitMode === "total"
                              ? "bg-white text-[#1366FF] shadow-xs"
                              : "text-[#64748B] hover:text-[#0F172A]"
                          }`}
                        >
                          전체
                        </button>
                        <button
                          onClick={() => setCardProfitMode("daily")}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                            cardProfitMode === "daily"
                              ? "bg-white text-[#1366FF] shadow-xs"
                              : "text-[#64748B] hover:text-[#0F172A]"
                          }`}
                        >
                          일간
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setIsManualModalOpen(true)}
                        className="flex items-center gap-1 bg-[#1366FF] hover:bg-[#0D54DB] text-white px-3 py-1.5 rounded-xl font-bold text-xs shadow-xs transition-all active:scale-95"
                      >
                        <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
                        <span>종목 직접 등록</span>
                      </button>
                      <button
                        onClick={() => setIsFilterSheetOpen(true)}
                        className="p-1.5 bg-white border border-[#E2E8F0] rounded-xl text-[#64748B] hover:bg-[#F1F5F9] shadow-xs"
                        aria-label="필터"
                      >
                        <SlidersHorizontal className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Stock Cards List */}
                  <div className="space-y-2.5">
                    {filteredStockCardItems.length === 0 ? (
                      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-8 text-center text-xs text-[#64748B] space-y-2">
                        <p className="font-semibold">등록된 보유 종목이 없습니다.</p>
                        <button
                          onClick={() => setIsManualModalOpen(true)}
                          className="text-[#1366FF] font-bold underline"
                        >
                          + 새 종목 등록하기
                        </button>
                      </div>
                    ) : (
                      filteredStockCardItems.map((item) => (
                        <StockCard
                          key={item.id}
                          item={item}
                          currencyView={currency}
                          profitViewMode={cardProfitMode}
                          hideAssetAmounts={hideAssetAmounts}
                          onClick={() => router.push(`/stock/${encodeURIComponent(item.ticker)}`)}
                        />
                      ))
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* ===================================================================== */}
            {/* SCREEN 5: 전체 거래내역 타임라인 */}
            {/* ===================================================================== */}
            {activeTab === "transactions" && (
              <section className="space-y-4">
                <div className="flex items-center justify-between px-0.5">
                  <h2 className="text-base md:text-lg font-bold text-[#0F172A]">거래내역</h2>
                  <button
                    onClick={() => setIsManualModalOpen(true)}
                    className="flex items-center gap-1 bg-[#1366FF] hover:bg-[#0D54DB] text-white px-3.5 py-1.5 rounded-xl font-bold text-xs shadow-xs transition-all active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
                    <span>거래 등록</span>
                  </button>
                </div>

                {/* Filter Chips: [전체] [매수] [매도] [배당] */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  {(["ALL", "매수", "매도", "배당"] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setTxFilterType(filter)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                        txFilterType === filter
                          ? "bg-[#1366FF] text-white shadow-xs"
                          : "bg-white border border-[#E2E8F0] text-[#64748B] hover:bg-[#F1F5F9]"
                      }`}
                    >
                      {filter === "ALL" ? "전체" : filter}
                    </button>
                  ))}
                </div>

                {/* Date Grouped Timeline */}
                <div className="space-y-4">
                  {Object.keys(txGroupedByDate).length === 0 ? (
                    <div className="bg-white rounded-2xl border border-[#E2E8F0] p-10 text-center text-xs text-[#64748B] space-y-2">
                      <ReceiptText className="w-8 h-8 text-[#CBD5E1] mx-auto" />
                      <p className="font-bold">해당 내역이 없습니다.</p>
                      <p>상단 [+ 거래 등록] 버튼을 눌러 첫 거래를 등록해보세요.</p>
                    </div>
                  ) : (
                    Object.entries(txGroupedByDate).map(([date, txList]) => (
                      <div key={date} className="space-y-2">
                        <div className="text-xs font-bold text-[#64748B] px-1">{date}</div>
                        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs divide-y divide-[#F1F5F9] overflow-hidden">
                          {txList.map((tx, idx) => (
                            <button
                              key={idx}
                              onClick={() => openTransactionEditor(tx, tx.ticker, tx.stockName)}
                              className="w-full p-4 flex items-center justify-between hover:bg-[#F8FAFC] transition-colors text-left gap-3"
                            >
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <span
                                  className={`px-2 py-1 rounded-lg text-xs font-bold shrink-0 ${
                                    tx.type === "매수"
                                      ? "bg-blue-50 text-[#1366FF] border border-blue-100"
                                      : tx.type === "매도"
                                      ? "bg-red-50 text-[#EF4444] border border-red-100"
                                      : "bg-amber-50 text-amber-600 border border-amber-100"
                                  }`}
                                >
                                  {tx.type}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="font-bold text-sm text-[#0F172A] truncate">
                                      {tx.stockName}
                                    </span>
                                    <span className="text-xs text-[#64748B] uppercase shrink-0">
                                      {tx.ticker}
                                    </span>
                                    <span className="text-[10px] bg-[#F1F5F9] text-[#475569] px-1.5 py-0.5 rounded-md truncate max-w-[100px]">
                                      {tx.brokerage}
                                    </span>
                                  </div>
                                  <div className="text-xs text-[#64748B] mt-0.5 truncate">
                                    {tx.shares.toLocaleString()}주 @ {formatMoney(tx.priceUsd)}
                                  </div>
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <div className="text-sm font-bold text-[#0F172A] tracking-tight">
                                  {formatMoney(tx.totalUsd)}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      {/* Global Bottom Navigation (Screen 1~6 Unified) */}
      <BottomNav />

      {/* Overlays and Modals */}
      <AccountsDrawer
        isOpen={isAccountDrawerOpen}
        onClose={() => setIsAccountDrawerOpen(false)}
        selectedAccount={selectedAccountFilter}
        onSelectAccount={(acc) => {
          setSelectedAccountFilter(acc);
          setIsAccountDrawerOpen(false);
        }}
        totalAssetKRW={dashboardValuationDisplay}
        hideAssetAmounts={hideAssetAmounts}
      />

      <FilterModal
        isOpen={isFilterSheetOpen}
        onClose={() => setIsFilterSheetOpen(false)}
        hideAssetAmounts={hideAssetAmounts}
        setHideAssetAmounts={setHideAssetAmounts}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        categories={categories}
        onResetFilters={() => {
          setSelectedCategory("전체");
          setSelectedAccountFilter("전체");
          setIsFilterSheetOpen(false);
        }}
      />

      {/* Manual Asset Creation Modal */}
      {isManualModalOpen && (
        <ManualAssetModal
          isOpen={isManualModalOpen}
          onClose={() => setIsManualModalOpen(false)}
          onSuccess={() => {
            loadPortfolio();
            showToast("종목 및 거래 정보가 등록되었습니다.");
          }}
        />
      )}

      {/* Keypad Modal for Editing Transactions */}
      {editingTransaction && (
        <KeypadModal
          isOpen={Boolean(editingTransaction)}
          onClose={() => setEditingTransaction(null)}
          transaction={editingTransaction}
          ticker={editingTransaction.ticker}
          stockName={editingTransaction.stockName}
          defaultPrice={editingTransaction.price}
          currency={editingTransaction.currency}
          initialType={editingTransaction.type}
          defaultAccountId={editingTransaction.account_id}
          onSuccess={() => {
            setEditingTransaction(null);
            loadPortfolio();
            showToast("거래 내역이 수정되었습니다.");
          }}
        />
      )}
    </div>
  );
}
