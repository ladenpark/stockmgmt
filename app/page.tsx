"use client";

import React, { useState, useEffect } from "react";
import {
  Menu, Tune, TrendingUp, TrendingDown, Star, ArrowBack,
  Close, Add, Delete, UploadFile, PictureAsPdf, AccountBalance,
  Payments, Monitoring, ReceiptLong, ShowChart, PieChart,
  CheckCircle, FilterList, AddCircle
} from "@mui/icons-material"; // or Material symbols span
import { motion, AnimatePresence } from "framer-motion";
import ManualAssetModal from "@/components/ManualAssetModal";

// Types
type TabType = "home" | "daily" | "whatif" | "analysis" | "hub";
type AnalysisSubView = "dividend" | "profit" | "tax" | "trend" | "weight";
type CurrencyType = "KRW" | "USD";

export default function AlexandriaApp() {
  // Navigation & View States
  const [activeTab, setActiveTab] = useState<TabType>("home");
  const [currency, setCurrency] = useState<CurrencyType>("KRW");
  const [analysisSubView, setAnalysisSubView] = useState<AnalysisSubView>("dividend");
  const [weightCategory, setWeightCategory] = useState<"stocks" | "assets" | "accounts">("stocks");
  const [whatIfMode, setWhatIfMode] = useState<"divested" | "virtual">("divested");

  // Stock Detail (P-101) & Keypad (P-102) States
  const [selectedStockId, setSelectedStockId] = useState<string | null>(null);
  const [detailSubTab, setDetailSubTab] = useState<"assets" | "transactions">("assets");
  const [isKeypadOpen, setIsKeypadOpen] = useState(false);
  const [keypadType, setKeypadType] = useState<"buy" | "sell" | "dividend">("buy");
  const [keypadField, setKeypadField] = useState<"quantity" | "price">("quantity");
  const [keypadQty, setKeypadQty] = useState("10");
  const [keypadPrice, setKeypadPrice] = useState("192.42");

  // Other Overlays
  const [isAccountDrawerOpen, setIsAccountDrawerOpen] = useState(false);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [isDailyDetailOpen, setIsDailyDetailOpen] = useState(false);
  const [selectedDailyRow, setSelectedDailyRow] = useState<any>(null);
  const [isAddVirtualOpen, setIsAddVirtualOpen] = useState(false);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Exchange rate & Real-time Live State
  const [rate, setRate] = useState<number>(1385.48);
  const [isLiveLoading, setIsLiveLoading] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>("");
  const [refreshInterval, setRefreshInterval] = useState<number>(3); // 3초 초고속 실시간 기본값
  const [isWsConnected, setIsWsConnected] = useState<boolean>(false);
  const [flashingTicks, setFlashingTicks] = useState<Record<string, "UP" | "DOWN">>({});

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Stock Database
  const [stocks, setStocks] = useState([
    {
      id: "s_aapl",
      ticker: "AAPL",
      name: "애플",
      category: "Technology",
      market: "US",
      currency: "USD",
      currentPriceUsd: 192.42,
      changePct: 1.25,
      changeAmountUsd: 2.38,
      shares: 80,
      avgPriceUsd: 153.75,
      realizedGainUsd: 3200.00,
      holdings: [
        { id: "h1", brokerage: "Fidelity Investments", shares: 50, avgPriceUsd: 150.00 },
        { id: "h2", brokerage: "토스증권", shares: 30, avgPriceUsd: 160.00 }
      ],
      transactions: [
        { id: "t1", type: "매수", date: "2024.05.10", shares: 10, priceUsd: 182.50, brokerage: "토스증권" },
        { id: "t2", type: "매도", date: "2024.04.15", shares: 20, priceUsd: 175.00, brokerage: "Fidelity" },
        { id: "t3", type: "매수", date: "2024.02.01", shares: 50, priceUsd: 150.00, brokerage: "Fidelity" }
      ]
    },
    {
      id: "s_nvda",
      ticker: "NVDA",
      name: "엔비디아",
      category: "Semiconductors",
      market: "US",
      currency: "USD",
      currentPriceUsd: 945.50,
      changePct: 3.42,
      changeAmountUsd: 31.20,
      shares: 45,
      avgPriceUsd: 520.00,
      realizedGainUsd: 8500.00,
      holdings: [
        { id: "h3", brokerage: "Fidelity Investments", shares: 45, avgPriceUsd: 520.00 }
      ],
      transactions: [
        { id: "t4", type: "매수", date: "2024.01.15", shares: 45, priceUsd: 520.00, brokerage: "Fidelity" }
      ]
    },
    {
      id: "s_msft",
      ticker: "MSFT",
      name: "마이크로소프트",
      category: "Software",
      market: "US",
      currency: "USD",
      currentPriceUsd: 428.15,
      changePct: -0.45,
      changeAmountUsd: -1.95,
      shares: 40,
      avgPriceUsd: 330.00,
      realizedGainUsd: 1200.00,
      holdings: [
        { id: "h4", brokerage: "토스증권", shares: 40, avgPriceUsd: 330.00 }
      ],
      transactions: [
        { id: "t5", type: "매수", date: "2024.03.01", shares: 40, priceUsd: 330.00, brokerage: "토스증권" }
      ]
    },
    {
      id: "s_samsung",
      ticker: "005930",
      name: "삼성전자",
      category: "국내 대형주",
      market: "KR",
      currency: "KRW",
      currentPriceUsd: 57.02,
      changePct: 0.89,
      changeAmountUsd: 0.50,
      shares: 250,
      avgPriceUsd: 49.08,
      realizedGainUsd: 650.00,
      holdings: [
        { id: "h5", brokerage: "토스증권", shares: 250, avgPriceUsd: 49.08 }
      ],
      transactions: [
        { id: "t6", type: "매수", date: "2024.02.10", shares: 250, priceUsd: 49.08, brokerage: "토스증권" }
      ]
    },
    {
      id: "s_tsla",
      ticker: "TSLA",
      name: "테슬라",
      category: "EV / Clean Energy",
      market: "US",
      currency: "USD",
      currentPriceUsd: 178.50,
      changePct: 2.15,
      changeAmountUsd: 3.75,
      shares: 35,
      avgPriceUsd: 190.00,
      realizedGainUsd: -400.00,
      holdings: [
        { id: "h6", brokerage: "카카오페이증권", shares: 35, avgPriceUsd: 190.00 }
      ],
      transactions: [
        { id: "t7", type: "매수", date: "2024.04.05", shares: 35, priceUsd: 190.00, brokerage: "카카오페이" }
      ]
    },
    {
      id: "s_o",
      ticker: "O",
      name: "리얼티 인컴",
      category: "Real Estate (월배당)",
      market: "US",
      currency: "USD",
      currentPriceUsd: 54.20,
      changePct: 0.35,
      changeAmountUsd: 0.19,
      shares: 120,
      avgPriceUsd: 52.00,
      realizedGainUsd: 260.00,
      holdings: [
        { id: "h7", brokerage: "카카오페이증권", shares: 120, avgPriceUsd: 52.00 }
      ],
      transactions: [
        { id: "t8", type: "배당", date: "2024.05.15", shares: 120, priceUsd: 0.256, brokerage: "카카오페이" }
      ]
    }
  ]);

  // 실시간 시세 및 환율 자동 수집 함수
  const fetchRealtimeQuotes = async (manual = false) => {
    if (manual) setIsLiveLoading(true);
    try {
      const tickers = stocks.map((s) => s.ticker).join(",");
      const res = await fetch(`/api/stocks?tickers=${tickers}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const quotes = json.data.quotes || {};
          const currentRate = json.data.exchangeRate?.rate;
          if (currentRate && typeof currentRate === "number") {
            setRate(currentRate);
          }

          setStocks((prev) =>
            prev.map((s) => {
              const q = quotes[s.ticker];
              if (q) {
                const effectiveRate = currentRate || rate || 1385.48;
                // 한국 주식(KRW)은 USD 기준 환산, 미국 주식(USD)은 그대로 적용
                const priceInUsd =
                  q.currency === "KRW"
                    ? q.currentPrice / effectiveRate
                    : q.currentPrice;
                const changeInUsd =
                  q.currency === "KRW"
                    ? q.regularMarketChange / effectiveRate
                    : q.regularMarketChange;

                const newPrice = Number(priceInUsd.toFixed(2));

                // 이전 가격과 다르면 틱 플래시 효과 발동!
                if (s.currentPriceUsd > 0 && Math.abs(newPrice - s.currentPriceUsd) >= 0.01) {
                  const type = newPrice >= s.currentPriceUsd ? "UP" : "DOWN";
                  setFlashingTicks((prevF) => ({ ...prevF, [s.ticker]: type }));
                  setTimeout(() => {
                    setFlashingTicks((prevF) => {
                      const copy = { ...prevF };
                      delete copy[s.ticker];
                      return copy;
                    });
                  }, 800);
                }

                return {
                  ...s,
                  currentPriceUsd: newPrice,
                  changePct: Number((q.currentChangePercent || 0).toFixed(2)),
                  changeAmountUsd: Number(changeInUsd.toFixed(2)),
                  marketStateLabel: q.marketStateLabel || (s.market === "KR" ? "장마감" : "프리마켓"),
                };
              }
              return s;
            })
          );

          const now = new Date();
          setLastSyncTime(
            now.toLocaleTimeString("ko-KR", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })
          );
          if (manual) showToast("한국투자증권 실시간 시세가 갱신되었습니다.");
        }
      }
    } catch (err) {
      console.error("실시간 시세 수집 오류:", err);
    } finally {
      if (manual) setIsLiveLoading(false);
    }
  };

  useEffect(() => {
    // 1. WebSocket 실시간 틱(Tick) 스트리밍 연결 (0.01초 체결)
    let ws: WebSocket | null = null;
    let reconnectTimeout: any = null;

    const connectWebSocket = () => {
      if (typeof window === "undefined") return;
      const wsUrl = "ws://localhost:8001";
      try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          setIsWsConnected(true);
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === "TICK" && msg.data) {
              const tick = msg.data;
              const ticker = tick.ticker;
              const tickType = tick.tickType || "UP";

              // 틱 플래시 효과 트리거 (800ms 동안 시각적 하이라이트)
              setFlashingTicks((prev) => ({ ...prev, [ticker]: tickType }));
              setTimeout(() => {
                setFlashingTicks((prev) => {
                  const copy = { ...prev };
                  delete copy[ticker];
                  return copy;
                });
              }, 800);

              // 주가 및 등락률 실시간 업데이트
              setStocks((prev) =>
                prev.map((s) => {
                  if (s.ticker === ticker || s.ticker.toUpperCase() === ticker.toUpperCase()) {
                    const effectiveRate = rate || 1385.48;
                    const priceInUsd =
                      tick.currency === "KRW"
                        ? tick.currentPrice / effectiveRate
                        : tick.currentPrice;
                    const changeInUsd =
                      tick.currency === "KRW"
                        ? tick.changeAmount / effectiveRate
                        : tick.changeAmount;

                    return {
                      ...s,
                      currentPriceUsd: Number(priceInUsd.toFixed(2)),
                      changePct: Number((tick.changePercent || 0).toFixed(2)),
                      changeAmountUsd: Number(changeInUsd.toFixed(2)),
                    };
                  }
                  return s;
                })
              );

              const now = new Date();
              setLastSyncTime(
                now.toLocaleTimeString("ko-KR", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })
              );
            }
          } catch {
            // ignore parse error
          }
        };

        ws.onclose = () => {
          setIsWsConnected(false);
          reconnectTimeout = setTimeout(connectWebSocket, 5000);
        };

        ws.onerror = () => {
          setIsWsConnected(false);
        };
      } catch {
        setIsWsConnected(false);
      }
    };

    connectWebSocket();

    // 2. 1.5초 주기 고속 실시간 REST 동기화
    fetchRealtimeQuotes();
    const interval = setInterval(() => {
      fetchRealtimeQuotes();
    }, 1500); // 1.5초마다 고속 갱신

    return () => {
      if (ws) ws.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      clearInterval(interval);
    };
  }, [rate]);

  // Format money helper
  const formatMoney = (usdVal: number) => {
    if (currency === "KRW") {
      const krw = Math.round(usdVal * rate);
      return (krw < 0 ? "-₩" : "₩") + Math.abs(krw).toLocaleString();
    }
    return (usdVal < 0 ? "-$" : "$") + Math.abs(usdVal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Calculations
  const totalValuationUsd = stocks.reduce((acc, s) => acc + s.shares * s.currentPriceUsd, 0);
  const totalInvestedUsd = stocks.reduce((acc, s) => acc + s.shares * s.avgPriceUsd, 0);
  const totalReturnUsd = totalValuationUsd - totalInvestedUsd;
  const totalReturnPct = totalInvestedUsd > 0 ? (totalReturnUsd / totalInvestedUsd) * 100 : 0;
  const todayGainUsd = stocks.reduce((acc, s) => acc + s.shares * s.changeAmountUsd, 0);
  const todayGainPct = (todayGainUsd / (totalValuationUsd - todayGainUsd)) * 100;

  // Selected Stock for P-101
  const selectedStock = stocks.find((s) => s.id === selectedStockId) || stocks[0];

  // Keypad Click handler
  const handleKeypadPress = (val: string) => {
    const cur = keypadField === "quantity" ? keypadQty : keypadPrice;
    const setter = keypadField === "quantity" ? setKeypadQty : setKeypadPrice;

    if (val === "DEL") {
      setter(cur.length <= 1 ? "0" : cur.slice(0, -1));
    } else if (val === ".") {
      if (!cur.includes(".")) setter(cur + ".");
    } else {
      setter(cur === "0" ? val : cur + val);
    }
  };

  // Save Transaction
  const handleSaveTransaction = () => {
    const q = parseFloat(keypadQty) || 0;
    const p = parseFloat(keypadPrice) || 0;
    if (q <= 0 || p <= 0) {
      alert("수량과 금액을 입력해주세요.");
      return;
    }

    const updated = stocks.map((s) => {
      if (s.id === selectedStock.id) {
        let newShares = s.shares;
        let newAvg = s.avgPriceUsd;
        let newRealized = s.realizedGainUsd;

        if (keypadType === "buy") {
          const oldCost = s.shares * s.avgPriceUsd;
          newShares = s.shares + q;
          newAvg = (oldCost + q * p) / newShares;
        } else if (keypadType === "sell") {
          newShares = Math.max(0, s.shares - q);
          newRealized += q * (p - s.avgPriceUsd);
        }

        const newTx = {
          id: "t_" + Date.now(),
          type: keypadType === "buy" ? "매수" : keypadType === "sell" ? "매도" : "배당",
          date: "2024.05.24",
          shares: q,
          priceUsd: p,
          brokerage: "토스증권"
        };

        return {
          ...s,
          shares: newShares,
          avgPriceUsd: newAvg,
          realizedGainUsd: newRealized,
          transactions: [newTx, ...s.transactions]
        };
      }
      return s;
    });

    setStocks(updated);
    setIsKeypadOpen(false);
    showToast(`${selectedStock.name} 체결 내역이 등록되었습니다.`);
  };

  // Daily Data Sample
  const dailyData = [
    {
      date: "05.24",
      dateFull: "2024-05-24",
      totalUsd: 124500.0,
      diffUsd: 1200.0,
      diffPct: 0.97,
      summaryTag: "AAPL, TSLA 상승",
      details: [
        { name: "Apple (AAPL)", price: 192.42, diffAmount: 2.38, diffPct: 1.25, shares: 80, gainUsd: 190.4 },
        { name: "NVIDIA (NVDA)", price: 945.5, diffAmount: 18.5, diffPct: 2.0, shares: 45, gainUsd: 832.5 },
        { name: "Tesla (TSLA)", price: 178.5, diffAmount: 3.75, diffPct: 2.15, shares: 35, gainUsd: 131.25 }
      ]
    },
    {
      date: "05.23",
      dateFull: "2024-05-23",
      totalUsd: 123300.0,
      diffUsd: -450.0,
      diffPct: -0.36,
      summaryTag: "MSFT 조정",
      details: [
        { name: "Microsoft (MSFT)", price: 425.1, diffAmount: -5.2, diffPct: -1.21, shares: 40, gainUsd: -208.0 }
      ]
    },
    {
      date: "05.22",
      dateFull: "2024-05-22",
      totalUsd: 123750.0,
      diffUsd: 800.0,
      diffPct: 0.65,
      summaryTag: "NVDA 실적 랠리",
      details: [
        { name: "NVIDIA (NVDA)", price: 927.0, diffAmount: 22.0, diffPct: 2.43, shares: 45, gainUsd: 990.0 }
      ]
    },
    {
      date: "05.21",
      dateFull: "2024-05-21",
      totalUsd: 122950.0,
      diffUsd: 150.0,
      diffPct: 0.12,
      summaryTag: "보합세 마감",
      details: [
        { name: "Apple (AAPL)", price: 190.04, diffAmount: 0.8, diffPct: 0.42, shares: 80, gainUsd: 64.0 }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-[#faf9fa] text-[#1b1c1d] font-body pb-28">
      {/* 1. TOP APP HEADER */}
      <header className="fixed top-0 left-0 w-full z-40 bg-white/95 glass-nav border-b border-[#c3c6d5]/40">
        <div className="max-w-4xl mx-auto px-4 md:px-8 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsAccountDrawerOpen(true)}
              className="w-9 h-9 rounded-full bg-[#f5f3f4] flex items-center justify-center text-[#094cb2] hover:bg-[#efedee] transition-colors"
            >
              <span className="material-symbols-outlined text-xl">menu</span>
            </button>
            <h1 className="font-headline font-bold text-lg md:text-xl text-[#1b1c1d] tracking-tight">
              {selectedStockId ? "종목 상세" : activeTab === "home" ? "내 자산 포트폴리오" : activeTab === "daily" ? "데일리 손익" : activeTab === "whatif" ? "What-If 시뮬레이션" : activeTab === "analysis" ? "통합 분석 리포트" : "데이터 허브"}
            </h1>
          </div>

          {/* Right Header: Currency Toggle & Filter */}
          <div className="flex items-center gap-2">
            <div className="inline-flex bg-[#efedee] p-0.5 rounded-full ghost-border">
              <button
                onClick={() => setCurrency("KRW")}
                className={`px-3 py-1 rounded-full font-label text-xs font-bold transition-all ${
                  currency === "KRW" ? "bg-white shadow-xs text-[#094cb2]" : "text-[#434653]"
                }`}
              >
                KRW
              </button>
              <button
                onClick={() => setCurrency("USD")}
                className={`px-3 py-1 rounded-full font-label text-xs font-bold transition-all ${
                  currency === "USD" ? "bg-white shadow-xs text-[#094cb2]" : "text-[#434653]"
                }`}
              >
                USD
              </button>
            </div>
            <button
              onClick={() => setIsFilterSheetOpen(true)}
              className="w-9 h-9 rounded-full bg-[#f5f3f4] flex items-center justify-center text-[#434653] hover:bg-[#efedee]"
            >
              <span className="material-symbols-outlined text-xl">tune</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. MAIN CONTAINER */}
      <main className="pt-20 pb-20 px-4 md:px-8 max-w-4xl mx-auto w-full">
        {/* ========================================================================= */}
        {/* VIEW A: [P-101] STOCK DETAIL PAGE */}
        {/* ========================================================================= */}
        {selectedStockId ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setSelectedStockId(null)}
                className="w-9 h-9 rounded-full bg-[#f5f3f4] flex items-center justify-center text-[#094cb2]"
              >
                <span className="material-symbols-outlined text-2xl">arrow_back</span>
              </button>
              <span className="font-label text-xs uppercase tracking-wider text-[#434653] font-bold">
                {selectedStock.category}
              </span>
              <button onClick={() => showToast("관심 종목 등록 완료")} className="w-9 h-9 rounded-full bg-[#f5f3f4] flex items-center justify-center text-[#434653]">
                <span className="material-symbols-outlined text-xl">star</span>
              </button>
            </div>

            <div className="text-center space-y-1">
              <h2 className="font-headline text-3xl md:text-4xl font-bold text-[#1b1c1d]">
                {selectedStock.name} ({selectedStock.ticker})
              </h2>
              <div className="font-headline text-4xl font-bold text-[#1b1c1d]">
                {formatMoney(selectedStock.currentPriceUsd)}
              </div>
              <div className="text-base font-body text-[#094cb2] font-semibold flex items-center justify-center gap-1">
                <span className="material-symbols-outlined text-lg">trending_up</span>
                +{selectedStock.changePct}% (+{formatMoney(selectedStock.changeAmountUsd)})
              </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-3 gap-1 bg-white rounded-3xl ghost-border p-5 text-center shadow-xs">
              <div>
                <span className="font-label text-xs text-[#434653] block font-bold">총 평가금</span>
                <div className="font-headline text-xl font-bold text-[#1b1c1d] mt-1">
                  {formatMoney(selectedStock.shares * selectedStock.currentPriceUsd)}
                </div>
              </div>
              <div className="border-x border-[#c3c6d5]/40">
                <span className="font-label text-xs text-[#434653] block font-bold">매입 원금</span>
                <div className="font-headline text-lg text-[#434653] mt-1">
                  {formatMoney(selectedStock.shares * selectedStock.avgPriceUsd)}
                </div>
              </div>
              <div>
                <span className="font-label text-xs text-[#434653] block font-bold">총 수익률</span>
                <div className="font-headline text-xl text-[#094cb2] font-bold mt-1">
                  +{(((selectedStock.currentPriceUsd - selectedStock.avgPriceUsd) / selectedStock.avgPriceUsd) * 100).toFixed(2)}%
                </div>
              </div>
            </div>

            {/* Realized Profit Banner */}
            <div className="p-4 bg-[#efedee] rounded-2xl flex justify-between items-center ghost-border shadow-xs">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[#6d5e00] text-2xl">check_circle</span>
                <span className="font-body text-sm font-semibold text-[#1b1c1d]">누적 확정 실현손익</span>
              </div>
              <span className="font-headline text-lg font-bold text-[#6d5e00]">{formatMoney(selectedStock.realizedGainUsd)}</span>
            </div>

            {/* Sub-Tabs */}
            <div className="space-y-4">
              <div className="flex justify-around border-b border-[#c3c6d5] font-label text-sm">
                <button
                  onClick={() => setDetailSubTab("assets")}
                  className={`pb-3 uppercase tracking-wider font-bold ${
                    detailSubTab === "assets" ? "border-b-2 border-[#094cb2] text-[#094cb2]" : "text-[#434653]"
                  }`}
                >
                  자산 분할 보유 ({selectedStock.holdings.length})
                </button>
                <button
                  onClick={() => setDetailSubTab("transactions")}
                  className={`pb-3 uppercase tracking-wider font-bold ${
                    detailSubTab === "transactions" ? "border-b-2 border-[#094cb2] text-[#094cb2]" : "text-[#434653]"
                  }`}
                >
                  체결 이력 타임라인 ({selectedStock.transactions.length})
                </button>
              </div>

              {detailSubTab === "assets" ? (
                <div className="space-y-2.5">
                  {selectedStock.holdings.map((h) => (
                    <div key={h.id} className="p-4 bg-white rounded-2xl ghost-border flex justify-between items-center shadow-xs">
                      <div>
                        <div className="font-headline font-bold text-sm text-[#1b1c1d]">{h.brokerage}</div>
                        <span className="font-body text-xs text-[#434653]">{h.shares}주 • 평단 {formatMoney(h.avgPriceUsd)}</span>
                      </div>
                      <div className="text-right font-headline text-sm text-[#094cb2] font-bold">
                        +{(((selectedStock.currentPriceUsd - h.avgPriceUsd) / h.avgPriceUsd) * 100).toFixed(2)}%
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {selectedStock.transactions.map((t) => (
                    <div key={t.id} className="p-4 bg-white rounded-2xl ghost-border flex justify-between items-center shadow-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            t.type === "매수" ? "bg-[#d9e2ff] text-[#094cb2]" : "bg-[#ffdad6] text-[#ba1a1a]"
                          }`}>
                            {t.type}
                          </span>
                          <span className="font-bold text-sm text-[#1b1c1d]">{t.brokerage}</span>
                        </div>
                        <span className="text-xs text-[#434653] block mt-0.5">{t.date}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-headline text-sm font-bold text-[#1b1c1d]">{t.shares}주</div>
                        <span className="text-xs text-[#434653]">{formatMoney(t.priceUsd)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Floating Buy/Sell Bar */}
            <div className="pt-4 flex gap-3">
              <button
                onClick={() => {
                  setKeypadType("sell");
                  setKeypadPrice(String(selectedStock.currentPriceUsd));
                  setIsKeypadOpen(true);
                }}
                className="flex-1 py-3.5 rounded-2xl bg-[#e9e8e9] text-[#ba1a1a] font-label text-xs font-bold uppercase hover:bg-[#ffdad6]"
              >
                매도 (Sell)
              </button>
              <button
                onClick={() => {
                  setKeypadType("buy");
                  setKeypadPrice(String(selectedStock.currentPriceUsd));
                  setIsKeypadOpen(true);
                }}
                className="flex-1 py-3.5 rounded-2xl bg-gradient-to-br from-[#094cb2] to-[#3366cc] text-white font-label text-xs font-bold uppercase shadow-md"
              >
                매수 (Buy)
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* ===================================================================== */}
            {/* TAB 1: HOME (포트폴리오 대시보드) */}
            {/* ===================================================================== */}
            {activeTab === "home" && (
              <section className="space-y-5">
                {/* Total Assets Summary Card */}
                <div className="bg-gradient-to-br from-white to-[#f5f3f4] rounded-3xl p-6 md:p-7 ghost-border shadow-xs">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-label text-xs uppercase tracking-wider text-[#434653] font-semibold">총 자산 평가금</span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-headline text-3xl md:text-4xl font-bold text-[#1b1c1d]">
                          {formatMoney(totalValuationUsd)}
                        </span>
                        <span className="text-[11px] font-label px-2 py-0.5 rounded-md bg-[#d9e2ff] text-[#094cb2] font-bold">
                          ₩{rate.toLocaleString()}/$
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 font-label text-xs font-bold ghost-border shadow-xs">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <span>실시간 LIVE</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-5 pt-5 border-t border-[#c3c6d5]/50">
                    <div>
                      <span className="font-label text-xs text-[#434653] block">총 투자수익</span>
                      <div className="font-body text-sm font-bold text-[#094cb2] flex items-center gap-1 mt-1">
                        <span className="material-symbols-outlined text-base">trending_up</span>
                        +{totalReturnPct.toFixed(2)}% (+{formatMoney(totalReturnUsd)})
                      </div>
                    </div>
                    <div>
                      <span className="font-label text-xs text-[#434653] block">오늘의 변동 (Δ)</span>
                      <div className="font-body text-sm font-semibold text-[#094cb2] mt-1">
                        +{formatMoney(todayGainUsd)} (+{todayGainPct.toFixed(2)}%)
                      </div>
                    </div>
                    <div className="col-span-2 md:col-span-1 border-t md:border-t-0 pt-2 md:pt-0 border-[#c3c6d5]/40 flex md:flex-col justify-between md:justify-start">
                      <span className="font-label text-xs text-[#434653] block">투자 매입 원금</span>
                      <span className="font-headline text-sm font-semibold text-[#1b1c1d] mt-1">{formatMoney(totalInvestedUsd)}</span>
                    </div>
                  </div>
                </div>

                {/* 5 Quick Analysis Actions */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="font-label text-xs uppercase tracking-wider text-[#434653] font-bold">빠른 분석 바로가기</span>
                    <span
                      onClick={() => setActiveTab("analysis")}
                      className="font-label text-xs text-[#094cb2] font-semibold cursor-pointer hover:underline"
                    >
                      전체보기 ›
                    </span>
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {[
                      { id: "profit", label: "수익", icon: "monitoring", color: "text-[#094cb2]" },
                      { id: "tax", label: "세금", icon: "receipt_long", color: "text-[#6d5e00]" },
                      { id: "dividend", label: "배당", icon: "payments", color: "text-[#094cb2]" },
                      { id: "trend", label: "추이", icon: "show_chart", color: "text-[#434653]" },
                      { id: "weight", label: "비중", icon: "pie_chart", color: "text-[#094cb2]" },
                    ].map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          setAnalysisSubView(item.id as AnalysisSubView);
                          setActiveTab("analysis");
                        }}
                        className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white ghost-border card-interactive shadow-xs"
                      >
                        <span className={`material-symbols-outlined ${item.color} text-2xl`}>{item.icon}</span>
                        <span className="font-label text-xs font-semibold text-[#1b1c1d] mt-1">{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Holdings List */}
                <div className="pt-2 space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <h3 className="font-headline text-xl font-bold text-[#1b1c1d]">보유 종목 리스트</h3>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setIsManualModalOpen(true)}
                        className="flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-[#094cb2] text-white text-xs font-label font-bold hover:bg-[#003da5] active:scale-95 transition-all shadow-xs"
                      >
                        <span className="material-symbols-outlined text-sm">add</span>
                        <span>종목 직접 등록</span>
                      </button>
                      <button
                        onClick={() => setIsFilterSheetOpen(true)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#efedee] text-xs font-label text-[#434653] font-semibold hover:bg-[#e9e8e9]"
                      >
                        <span className="material-symbols-outlined text-sm">filter_list</span>
                        <span>필터</span>
                      </button>
                    </div>
                  </div>

                    <div className="space-y-2.5">
                    {stocks.map((stock) => {
                      const valUsd = stock.shares * stock.currentPriceUsd;
                      const returnPct = ((stock.currentPriceUsd - stock.avgPriceUsd) / stock.avgPriceUsd) * 100;
                      const isPos = returnPct >= 0;
                      const tickFlash = flashingTicks[stock.ticker];

                      return (
                        <div
                          key={stock.id}
                          onClick={() => setSelectedStockId(stock.id)}
                          className={`p-4.5 rounded-3xl ghost-border flex items-center justify-between cursor-pointer card-interactive shadow-xs transition-all duration-300 ${
                            tickFlash === "UP"
                              ? "bg-emerald-50/80 ring-2 ring-emerald-500 scale-[1.01]"
                              : tickFlash === "DOWN"
                              ? "bg-rose-50/80 ring-2 ring-rose-500 scale-[1.01]"
                              : "bg-white"
                          }`}
                        >
                          <div className="flex items-center gap-3.5">
                            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-headline font-bold text-sm transition-colors ${
                              tickFlash === "UP" ? "bg-emerald-200 text-emerald-800" : tickFlash === "DOWN" ? "bg-rose-200 text-rose-800" : "bg-[#efedee] text-[#094cb2]"
                            }`}>
                              {stock.ticker.slice(0, 3)}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-headline font-bold text-base text-[#1b1c1d]">{stock.name}</span>
                                {tickFlash && (
                                  <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${tickFlash === "UP" ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"}`}>
                                    {tickFlash === "UP" ? "▲ TICK" : "▼ TICK"}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 font-body text-xs text-[#434653] mt-0.5">
                                <span>{stock.ticker} • {stock.shares}주</span>
                                {(stock as any).marketStateLabel && (
                                  <span
                                    className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                                      (stock as any).marketStateLabel === "프리마켓"
                                        ? "bg-amber-100 text-amber-800"
                                        : (stock as any).marketStateLabel === "데이마켓"
                                        ? "bg-sky-100 text-sky-800"
                                        : (stock as any).marketStateLabel === "애프터마켓"
                                        ? "bg-purple-100 text-purple-800"
                                        : (stock as any).marketStateLabel === "정규장"
                                        ? "bg-emerald-100 text-emerald-800"
                                        : "bg-gray-100 text-gray-600"
                                    }`}
                                  >
                                    {(stock as any).marketStateLabel}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="font-headline font-bold text-base text-[#1b1c1d]">{formatMoney(valUsd)}</div>
                            <div className={`font-body text-xs font-bold ${isPos ? "text-[#094cb2]" : "text-[#ba1a1a]"}`}>
                              {isPos ? "+" : ""}{returnPct.toFixed(2)}%
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            )}

            {/* ===================================================================== */}
            {/* TAB 2: DAILY PERFORMANCE */}
            {/* ===================================================================== */}
            {activeTab === "daily" && (
              <section className="space-y-5">
                <div>
                  <h2 className="font-headline text-2xl font-bold text-[#1b1c1d]">데일리 손익 퍼포먼스</h2>
                  <p className="font-body text-xs text-[#434653] mt-0.5">일자별 자산 평가금 증감액(±Δ) 및 수익률 매트릭스</p>
                </div>

                <div className="bg-white rounded-3xl ghost-border overflow-hidden shadow-xs">
                  <table className="w-full text-left border-collapse min-w-[480px]">
                    <thead className="bg-[#f5f3f4] border-b border-[#c3c6d5]/40">
                      <tr>
                        <th className="font-label text-xs uppercase text-[#434653] py-3.5 px-4 font-bold">일자</th>
                        <th className="font-label text-xs uppercase text-[#434653] py-3.5 px-4 font-bold text-right">총 자산 평가액</th>
                        <th className="font-label text-xs uppercase text-[#434653] py-3.5 px-4 font-bold text-right">일간 변동 (±Δ)</th>
                        <th className="font-label text-xs uppercase text-[#434653] py-3.5 px-4 font-bold text-right">일간 수익률</th>
                      </tr>
                    </thead>
                    <tbody className="font-body text-xs divide-y divide-[#c3c6d5]/20">
                      {dailyData.map((row, idx) => {
                        const isPos = row.diffUsd >= 0;
                        return (
                          <tr
                            key={idx}
                            onClick={() => {
                              setSelectedDailyRow(row);
                              setIsDailyDetailOpen(true);
                            }}
                            className="hover:bg-[#efedee] transition-colors cursor-pointer"
                          >
                            <td className="py-3.5 px-4 font-semibold text-[#1b1c1d]">{row.date}</td>
                            <td className="py-3.5 px-4 text-right font-headline text-xs font-bold text-[#1b1c1d]">
                              {formatMoney(row.totalUsd)}
                            </td>
                            <td className={`py-3.5 px-4 text-right font-semibold ${isPos ? "text-[#094cb2]" : "text-[#ba1a1a]"}`}>
                              {isPos ? "+" : ""}{formatMoney(row.diffUsd)}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <span
                                className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                  isPos ? "bg-[#d9e2ff] text-[#094cb2]" : "bg-[#ffdad6] text-[#ba1a1a]"
                                }`}
                              >
                                {isPos ? "+" : ""}{row.diffPct}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div className="p-3 bg-[#f5f3f4] text-center font-label text-xs text-[#434653] border-t border-[#c3c6d5]/20">
                    행을 클릭하시면 해당 일자의 종목별 마감 상세 바텀시트가 호출됩니다.
                  </div>
                </div>
              </section>
            )}

            {/* ===================================================================== */}
            {/* TAB 3: WHAT-IF SIMULATION */}
            {/* ===================================================================== */}
            {activeTab === "whatif" && (
              <section className="space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="font-headline text-2xl font-bold text-[#1b1c1d]">What-If 시뮬레이션</h2>
                    <p className="font-body text-xs text-[#434653] mt-0.5">과거 매도 종목의 미매도 가정 기회비용 및 가상 보유 추적</p>
                  </div>
                  <div className="flex bg-[#efedee] p-1 rounded-full ghost-border">
                    <button
                      onClick={() => setWhatIfMode("divested")}
                      className={`px-4 py-1.5 rounded-full font-label text-xs font-bold transition-all ${
                        whatIfMode === "divested" ? "bg-white text-[#094cb2] shadow-xs" : "text-[#434653]"
                      }`}
                    >
                      과거 매도 종목
                    </button>
                    <button
                      onClick={() => setWhatIfMode("virtual")}
                      className={`px-4 py-1.5 rounded-full font-label text-xs font-bold transition-all ${
                        whatIfMode === "virtual" ? "bg-white text-[#094cb2] shadow-xs" : "text-[#434653]"
                      }`}
                    >
                      가상 보유 (모의)
                    </button>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-white to-[#f5f3f4] rounded-3xl p-6 ghost-border shadow-xs">
                  <span className="font-label text-[#6d5e00] uppercase tracking-widest text-xs font-bold">기회비용 & 회피손실 분석</span>
                  <h3 className="font-headline text-xl font-bold text-[#1b1c1d] mt-1">"만약 팔지 않았다면?"</h3>
                  <div className="flex justify-between items-end mt-4">
                    <span className="font-label text-xs text-[#434653]">총 평가금 차액</span>
                    <div className="text-right">
                      <span className="font-headline text-3xl font-bold text-[#094cb2]">+₩6,234,750</span>
                      <div className="font-body text-[#6d5e00] text-xs font-semibold flex items-center justify-end gap-1 mt-1">
                        <span className="material-symbols-outlined text-sm">trending_up</span> 놓친 수익 (Foregone Gain)
                      </div>
                    </div>
                  </div>
                </div>

                {whatIfMode === "divested" ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      { ticker: "NVDA", name: "엔비디아", date: "2023.10", qty: 20, sell: 450, curr: 945.5, gain: 9910, tag: "최고 기회비용" },
                      { ticker: "AAPL", name: "애플", date: "2023.01", qty: 30, sell: 145, curr: 192.42, gain: 1422.6, tag: "지속 상승" },
                      { ticker: "LCID", name: "루시드", date: "2023.04", qty: 300, sell: 8.5, curr: 3.15, gain: -1605, tag: "손실 회피 성공" }
                    ].map((item, idx) => (
                      <div key={idx} className="p-5 bg-white rounded-3xl ghost-border shadow-xs space-y-2.5">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#efedee] text-[#434653]">{item.tag}</span>
                            <h4 className="font-headline font-bold text-base text-[#1b1c1d] mt-1">{item.name} ({item.ticker})</h4>
                            <span className="text-xs text-[#434653]">{item.date} • {item.qty}주</span>
                          </div>
                          <div className={`font-headline font-bold text-base ${item.gain >= 0 ? "text-[#094cb2]" : "text-[#ba1a1a]"}`}>
                            {item.gain >= 0 ? "+" : ""}{formatMoney(item.gain)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      { ticker: "PLTR", name: "팔란티어", entry: 16.5, curr: 25.8, qty: 100, gain: 930 },
                      { ticker: "MU", name: "마이크론", entry: 85.0, curr: 128.5, qty: 50, gain: 2175 }
                    ].map((item, idx) => (
                      <div key={idx} className="p-5 bg-white rounded-3xl ghost-border shadow-xs space-y-2.5">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#efedee] text-[#434653]">가상 보유</span>
                            <h4 className="font-headline font-bold text-base text-[#1b1c1d] mt-1">{item.name} ({item.ticker})</h4>
                            <span className="text-xs text-[#434653]">{item.qty}주 • 매수 ${item.entry}</span>
                          </div>
                          <div className="font-headline font-bold text-base text-[#094cb2]">
                            +{formatMoney(item.gain)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* ===================================================================== */}
            {/* TAB 4: INTEGRATED ANALYSIS REPORT */}
            {/* ===================================================================== */}
            {activeTab === "analysis" && (
              <section className="space-y-5">
                <div>
                  <h2 className="font-headline text-2xl font-bold text-[#1b1c1d]">통합 분석 리포트</h2>
                  <p className="font-body text-xs text-[#434653] mt-0.5">배당, 수익, 세금, 추이 및 비중 분석</p>
                </div>

                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                  {[
                    { id: "dividend", label: "배당" },
                    { id: "profit", label: "수익" },
                    { id: "tax", label: "세금" },
                    { id: "trend", label: "추이" },
                    { id: "weight", label: "비중" }
                  ].map((sub) => (
                    <button
                      key={sub.id}
                      onClick={() => setAnalysisSubView(sub.id as AnalysisSubView)}
                      className={`whitespace-nowrap px-5 py-2 rounded-full font-label text-xs font-bold transition-all ${
                        analysisSubView === sub.id ? "bg-[#094cb2] text-white shadow-xs" : "bg-[#efedee] text-[#434653]"
                      }`}
                    >
                      {sub.label}
                    </button>
                  ))}
                </div>

                {/* 4.1 Dividend */}
                {analysisSubView === "dividend" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="bg-white rounded-3xl p-5 ghost-border shadow-xs">
                        <span className="font-label text-xs font-bold text-[#434653] uppercase block">연간 예상 배당금 총액</span>
                        <div className="font-headline text-3xl font-bold text-[#1b1c1d] mt-1">{formatMoney(2400)}</div>
                        <span className="text-xs text-[#094cb2] font-semibold block mt-1">+12% vs 전년 동기</span>
                      </div>
                      <div className="bg-white rounded-3xl p-5 ghost-border shadow-xs">
                        <span className="font-label text-xs font-bold text-[#434653] uppercase block">포트폴리오 배당 수익률</span>
                        <div className="font-headline text-3xl font-bold text-[#1b1c1d] mt-1">3.52%</div>
                        <span className="text-xs text-[#434653] block mt-1">시장 평균 상회</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4.2 Profit */}
                {analysisSubView === "profit" && (
                  <div className="bg-white rounded-3xl p-6 ghost-border space-y-4 shadow-xs">
                    <div>
                      <span className="font-label text-xs uppercase tracking-wider text-[#434653] font-bold">누적 합계 수익</span>
                      <div className="font-headline text-3xl font-bold text-[#094cb2] mt-1">+₩42,500,000</div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-[#c3c6d5]/40 text-xs">
                      <div className="p-3.5 bg-[#f5f3f4] rounded-2xl">
                        <span className="text-[#434653] block">미실현 평가손익</span>
                        <div className="font-headline text-base font-bold text-[#094cb2] mt-1">+₩34,540,000</div>
                      </div>
                      <div className="p-3.5 bg-[#f5f3f4] rounded-2xl">
                        <span className="text-[#434653] block">확정 실현손익</span>
                        <div className="font-headline text-base font-bold text-[#6d5e00] mt-1">+₩4,635,000</div>
                      </div>
                      <div className="p-3.5 bg-[#f5f3f4] rounded-2xl">
                        <span className="text-[#434653] block">누적 배당금</span>
                        <div className="font-headline text-base font-bold text-[#094cb2] mt-1">+₩3,325,200</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4.3 Tax (250만 공제 22%) */}
                {analysisSubView === "tax" && (
                  <div className="bg-white rounded-3xl p-6 ghost-border space-y-4 shadow-xs">
                    <div>
                      <span className="font-label text-xs uppercase tracking-wider text-[#6d5e00] font-bold">해외주식 양도소득세 계산기</span>
                      <h3 className="font-headline text-xl font-bold text-[#1b1c1d] mt-0.5">2024년 예상 납부 세액 시뮬레이션</h3>
                    </div>
                    <div className="bg-[#f5f3f4] rounded-2xl p-4.5 space-y-3 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-[#434653]">연간 확정 실현손익</span>
                        <span className="font-semibold text-[#1b1c1d]">₩17,595,850</span>
                      </div>
                      <div className="flex justify-between items-center text-[#094cb2]">
                        <span>기본 공제액 (연 1회)</span>
                        <span className="font-semibold">- ₩2,500,000</span>
                      </div>
                      <div className="flex justify-between items-center pt-2.5 border-t border-[#c3c6d5]/40 font-semibold">
                        <span>과세 표준 금액</span>
                        <span className="text-[#1b1c1d]">₩15,095,850</span>
                      </div>
                      <div className="flex justify-between items-center pt-2.5 border-t border-[#c3c6d5]/40 font-bold">
                        <span className="text-[#ba1a1a]">예상 납부 세액 (22%)</span>
                        <span className="text-[#ba1a1a] font-headline text-xl">₩3,321,087</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4.4 Trend */}
                {analysisSubView === "trend" && (
                  <div className="bg-white rounded-3xl p-6 ghost-border space-y-4 shadow-xs">
                    <h3 className="font-headline text-lg font-bold text-[#1b1c1d]">자산 vs 원금 성장 곡선</h3>
                    <div className="h-48 bg-[#f5f3f4] rounded-2xl flex items-center justify-center text-xs text-[#434653]">
                      누적 투자 원금 ₩1.38억 대비 총 자산 ₩1.72억 (+25.03% 성장)
                    </div>
                  </div>
                )}

                {/* 4.5 Weight */}
                {analysisSubView === "weight" && (
                  <div className="bg-white rounded-3xl p-6 ghost-border space-y-4 shadow-xs">
                    <div className="flex justify-between items-center">
                      <h3 className="font-headline text-lg font-bold text-[#1b1c1d]">포트폴리오 비중</h3>
                      <div className="flex gap-1.5 font-label text-xs">
                        <button
                          onClick={() => setWeightCategory("stocks")}
                          className={`px-3 py-1 rounded-full ${weightCategory === "stocks" ? "bg-[#094cb2] text-white" : "bg-[#efedee] text-[#434653]"}`}
                        >
                          종목별
                        </button>
                        <button
                          onClick={() => setWeightCategory("assets")}
                          className={`px-3 py-1 rounded-full ${weightCategory === "assets" ? "bg-[#094cb2] text-white" : "bg-[#efedee] text-[#434653]"}`}
                        >
                          자산군
                        </button>
                        <button
                          onClick={() => setWeightCategory("accounts")}
                          className={`px-3 py-1 rounded-full ${weightCategory === "accounts" ? "bg-[#094cb2] text-white" : "bg-[#efedee] text-[#434653]"}`}
                        >
                          계좌별
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {stocks.map((s) => {
                        const pct = (((s.shares * s.currentPriceUsd) / totalValuationUsd) * 100).toFixed(1);
                        return (
                          <div key={s.id} className="flex justify-between items-center py-1.5 border-b border-[#c3c6d5]/20 text-xs">
                            <span className="font-bold text-[#1b1c1d]">{s.name} ({s.ticker})</span>
                            <span className="font-headline font-bold text-[#094cb2]">{pct}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* ===================================================================== */}
            {/* TAB 5: DATA HUB */}
            {/* ===================================================================== */}
            {activeTab === "hub" && (
              <section className="space-y-5">
                <div>
                  <h2 className="font-headline text-2xl font-bold text-[#1b1c1d]">설정 & 데이터 허브</h2>
                  <p className="font-body text-xs text-[#434653] mt-0.5">엑셀 일괄 동기화, 증권사 PDF 분석 및 계좌 관리</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-white rounded-3xl p-6 ghost-border space-y-3 card-interactive shadow-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-[#d9e2ff] flex items-center justify-center text-[#094cb2]">
                        <span className="material-symbols-outlined text-2xl">table_view</span>
                      </div>
                      <div>
                        <h4 className="font-headline text-base font-bold text-[#1b1c1d]">Excel 데이터 일괄 동기화</h4>
                        <p className="font-body text-xs text-[#434653]">가계부형 엑셀 파일로 불러오기/내보내기</p>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => showToast("엑셀 파일 선택 완료")}
                        className="flex-1 py-2.5 rounded-xl bg-[#094cb2] text-white font-label text-xs font-bold"
                      >
                        엑셀 불러오기
                      </button>
                      <button
                        onClick={() => showToast("alexandria_portfolio.xlsx 파일로 내보냈습니다.")}
                        className="px-4 py-2.5 rounded-xl bg-[#efedee] text-[#1b1c1d] font-label text-xs font-semibold"
                      >
                        내보내기
                      </button>
                    </div>
                  </div>

                  <div className="bg-white rounded-3xl p-6 ghost-border space-y-3 card-interactive shadow-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-[#bfab49]/30 flex items-center justify-center text-[#6d5e00]">
                        <span className="material-symbols-outlined text-2xl">document_scanner</span>
                      </div>
                      <div>
                        <h4 className="font-headline text-base font-bold text-[#1b1c1d]">증권사 PDF 스마트 분석</h4>
                        <p className="font-body text-xs text-[#434653]">증권사 잔고명세서 PDF AI 자동 인식</p>
                      </div>
                    </div>
                    <button
                      onClick={() => showToast("증권사 PDF 스마트 분석 시뮬레이션 완료")}
                      className="w-full py-2.5 rounded-xl bg-[#efedee] text-[#1b1c1d] font-label text-xs font-bold"
                    >
                      PDF 분석 등록
                    </button>
                  </div>
                </div>

                {/* Connected Accounts */}
                <div className="bg-white rounded-3xl p-6 ghost-border space-y-3 shadow-xs">
                  <div className="flex justify-between items-center">
                    <h4 className="font-headline text-base font-bold text-[#1b1c1d]">연동 계좌 관리</h4>
                    <button onClick={() => showToast("새 증권사 계좌 연동")} className="text-[#094cb2] font-label text-xs font-bold flex items-center gap-1">
                      + 계좌추가
                    </button>
                  </div>
                  <div className="space-y-2 text-xs font-body">
                    <div className="flex items-center justify-between p-3.5 bg-[#f5f3f4] rounded-2xl">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-[#094cb2] text-2xl">account_balance</span>
                        <div>
                          <div className="font-bold text-[#1b1c1d] text-sm">Fidelity Investments</div>
                          <div className="text-xs text-[#434653]">미국 메인 계좌 • 2개 종목</div>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-[#d9e2ff] text-[#094cb2] text-xs font-bold">연동됨</span>
                    </div>

                    <div className="flex items-center justify-between p-3.5 bg-[#f5f3f4] rounded-2xl">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-[#094cb2] text-2xl">account_balance</span>
                        <div>
                          <div className="font-bold text-[#1b1c1d] text-sm">토스증권 / 카카오페이</div>
                          <div className="text-xs text-[#434653]">해외 성장주 & 배당주 계좌</div>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-[#d9e2ff] text-[#094cb2] text-xs font-bold">연동됨</span>
                    </div>
                  </div>
                </div>
              </section>
            )}
          </>
        )}
      </main>

      {/* 3. FIXED BOTTOM NAVIGATION BAR */}
      {!selectedStockId && (
        <nav className="fixed bottom-0 left-0 right-0 w-full h-16 bg-white/95 backdrop-blur-xl border-t border-[#c3c6d5]/40 flex justify-around items-center px-4 z-40 shadow-sm max-w-4xl mx-auto">
          {[
            { id: "home", label: "홈", icon: "account_balance_wallet" },
            { id: "daily", label: "데일리", icon: "calendar_view_day" },
            { id: "whatif", label: "What-If", icon: "auto_awesome" },
            { id: "analysis", label: "분석", icon: "analytics" },
            { id: "hub", label: "허브", icon: "tune" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setSelectedStockId(null);
                setActiveTab(tab.id as TabType);
              }}
              className={`flex flex-col items-center justify-center flex-1 py-1.5 rounded-xl transition-all ${
                activeTab === tab.id ? "text-[#094cb2] font-bold" : "text-[#434653] font-medium"
              }`}
            >
              <span className="material-symbols-outlined text-2xl">{tab.icon}</span>
              <span className="text-[11px] tracking-tight">{tab.label}</span>
              {activeTab === tab.id && <span className="w-4 h-0.5 bg-[#094cb2] rounded-full mt-0.5" />}
            </button>
          ))}
        </nav>
      )}

      {/* 4. OVERLAYS & MODALS */}
      {/* P-102 Keypad Modal */}
      {isKeypadOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs">
          <div className="relative z-10 w-full max-w-lg bg-white rounded-t-[32px] p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="w-10 h-1 bg-[#efedee] rounded-full mx-auto" />
            <div className="flex justify-between items-center pb-2 border-b border-[#c3c6d5]/40">
              <span className="font-headline font-bold text-lg text-[#1b1c1d]">{selectedStock.name} ({selectedStock.ticker})</span>
              <button onClick={() => setIsKeypadOpen(false)} className="p-1 text-[#434653]">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex bg-[#efedee] p-1 rounded-full">
              {(["buy", "sell", "dividend"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setKeypadType(t)}
                  className={`flex-1 py-2 rounded-full font-label text-xs font-bold transition-all ${
                    keypadType === t
                      ? t === "buy"
                        ? "bg-[#094cb2] text-white shadow-xs"
                        : t === "sell"
                        ? "bg-[#ba1a1a] text-white shadow-xs"
                        : "bg-[#6d5e00] text-white shadow-xs"
                      : "text-[#434653]"
                  }`}
                >
                  {t === "buy" ? "매수" : t === "sell" ? "매도" : "배당금"}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div
                onClick={() => setKeypadField("quantity")}
                className={`p-3.5 bg-[#efedee] rounded-2xl cursor-pointer ${keypadField === "quantity" ? "ring-2 ring-[#094cb2]" : ""}`}
              >
                <span className="font-label text-xs font-bold text-[#434653] block">수량 (주)</span>
                <div className="font-headline text-2xl font-bold text-[#1b1c1d] mt-0.5">{keypadQty}</div>
              </div>
              <div
                onClick={() => setKeypadField("price")}
                className={`p-3.5 bg-[#efedee] rounded-2xl cursor-pointer ${keypadField === "price" ? "ring-2 ring-[#094cb2]" : ""}`}
              >
                <span className="font-label text-xs font-bold text-[#434653] block">체결단가 ($)</span>
                <div className="font-headline text-2xl font-bold text-[#1b1c1d] mt-0.5">${keypadPrice}</div>
              </div>
              <div className="col-span-2 p-3.5 bg-[#f5f3f4] rounded-2xl border border-[#094cb2]/20 flex justify-between items-center">
                <div>
                  <span className="font-label text-xs font-bold text-[#434653] block">총 거래액</span>
                  <div className="font-headline text-2xl font-bold text-[#094cb2] mt-0.5">
                    ${((parseFloat(keypadQty) || 0) * (parseFloat(keypadPrice) || 0)).toFixed(2)}
                  </div>
                </div>
                <span className="font-label text-xs font-semibold text-[#434653]">
                  ≈ ₩{Math.round((parseFloat(keypadQty) || 0) * (parseFloat(keypadPrice) || 0) * rate).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "DEL"].map((k) => (
                <button
                  key={k}
                  onClick={() => handleKeypadPress(k)}
                  className="keypad-btn py-3.5 rounded-2xl bg-[#efedee] font-headline text-xl font-bold text-[#1b1c1d] flex items-center justify-center"
                >
                  {k === "DEL" ? <span className="material-symbols-outlined text-[#ba1a1a]">backspace</span> : k}
                </button>
              ))}
            </div>

            <button
              onClick={handleSaveTransaction}
              className="w-full py-4 rounded-2xl bg-gradient-to-br from-[#094cb2] to-[#3366cc] text-white font-label text-sm font-bold shadow-md"
            >
              체결 내역 등록하기
            </button>
          </div>
        </div>
      )}

      {/* P-202 Daily Detail Modal */}
      {isDailyDetailOpen && selectedDailyRow && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs">
          <div className="relative z-10 w-full max-w-lg bg-white rounded-t-[32px] p-6 shadow-2xl space-y-4">
            <div className="w-10 h-1 bg-[#efedee] rounded-full mx-auto" />
            <div className="flex justify-between items-center">
              <h3 className="font-headline font-bold text-xl text-[#1b1c1d]">{selectedDailyRow.dateFull} 마감 요약</h3>
              <button onClick={() => setIsDailyDetailOpen(false)} className="p-1 text-[#434653]">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-4 bg-[#f5f3f4] rounded-2xl ghost-border flex justify-between items-center">
              <div>
                <span className="font-label text-xs text-[#434653] block">총 자산 평가액</span>
                <div className="font-headline text-2xl font-bold text-[#1b1c1d]">{formatMoney(selectedDailyRow.totalUsd)}</div>
              </div>
              <div className="text-right">
                <span className="font-label text-xs text-[#434653] block">일간 변동</span>
                <div className={`font-headline text-2xl font-bold ${selectedDailyRow.diffUsd >= 0 ? "text-[#094cb2]" : "text-[#ba1a1a]"}`}>
                  {selectedDailyRow.diffUsd >= 0 ? "+" : ""}{formatMoney(selectedDailyRow.diffUsd)}
                </div>
              </div>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {selectedDailyRow.details.map((d: any, i: number) => (
                <div key={i} className="p-3 bg-[#faf9fa] rounded-xl flex justify-between items-center ghost-border text-xs">
                  <div>
                    <div className="font-bold text-[#1b1c1d]">{d.name}</div>
                    <span className="text-[#434653]">${d.price} • {d.shares}주</span>
                  </div>
                  <div className={`font-bold ${d.diffAmount >= 0 ? "text-[#094cb2]" : "text-[#ba1a1a]"}`}>
                    {d.diffAmount >= 0 ? "+" : ""}${d.gainUsd} ({d.diffPct >= 0 ? "+" : ""}{d.diffPct}%)
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Account Drawer */}
      {isAccountDrawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setIsAccountDrawerOpen(false)} />
          <div className="relative z-10 w-4/5 max-w-xs h-full bg-white shadow-2xl p-6 flex flex-col justify-between">
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b border-[#c3c6d5]/40 pb-3">
                <h3 className="font-headline font-bold text-xl text-[#094cb2]">내 연동 계좌</h3>
                <button onClick={() => setIsAccountDrawerOpen(false)} className="p-1 text-[#434653]">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <div className="space-y-2.5 text-xs">
                <div className="p-3 bg-[#d9e2ff]/40 rounded-xl font-semibold text-[#094cb2]">전체 계좌 통합 보기</div>
                <div className="p-3 hover:bg-[#efedee] rounded-xl cursor-pointer">
                  <div className="font-bold text-[#1b1c1d] text-sm">Fidelity Investments</div>
                  <div className="text-xs text-[#434653] mt-0.5">$65,420.00 (+28.5%)</div>
                </div>
                <div className="p-3 hover:bg-[#efedee] rounded-xl cursor-pointer">
                  <div className="font-bold text-[#1b1c1d] text-sm">토스증권</div>
                  <div className="text-xs text-[#434653] mt-0.5">$34,615.00 (+32.1%)</div>
                </div>
                <div className="p-3 hover:bg-[#efedee] rounded-xl cursor-pointer">
                  <div className="font-bold text-[#1b1c1d] text-sm">카카오페이증권</div>
                  <div className="text-xs text-[#434653] mt-0.5">$13,063.00 (+14.2%)</div>
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                setIsAccountDrawerOpen(false);
                setActiveTab("hub");
              }}
              className="w-full py-3 rounded-xl bg-[#efedee] text-[#1b1c1d] font-label text-xs font-bold"
            >
              계좌 관리 설정
            </button>
          </div>
        </div>
      )}

      {/* Filter BottomSheet */}
      {isFilterSheetOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs">
          <div className="relative z-10 w-full max-w-lg bg-white rounded-t-[32px] p-6 shadow-2xl space-y-4">
            <div className="w-10 h-1 bg-[#efedee] rounded-full mx-auto" />
            <div className="flex justify-between items-center">
              <h3 className="font-headline font-bold text-xl text-[#1b1c1d]">자산군 및 국가 필터</h3>
              <button onClick={() => setIsFilterSheetOpen(false)} className="p-1 text-[#434653]">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <span className="font-bold text-[#434653] block">국가</span>
              <div className="flex gap-2">
                <button className="px-4 py-2 rounded-xl bg-[#094cb2] text-white font-bold">전체</button>
                <button className="px-4 py-2 rounded-xl bg-[#efedee] text-[#1b1c1d]">미국 (US)</button>
                <button className="px-4 py-2 rounded-xl bg-[#efedee] text-[#1b1c1d]">한국 (KR)</button>
              </div>
              <span className="font-bold text-[#434653] block pt-2">자산군</span>
              <div className="flex gap-2">
                <button className="px-4 py-2 rounded-xl bg-[#094cb2] text-white font-bold">주식 / ETF</button>
                <button className="px-4 py-2 rounded-xl bg-[#efedee] text-[#1b1c1d]">연금</button>
                <button className="px-4 py-2 rounded-xl bg-[#efedee] text-[#1b1c1d]">암호화폐</button>
              </div>
            </div>
            <button
              onClick={() => {
                setIsFilterSheetOpen(false);
                showToast("필터가 적용되었습니다.");
              }}
              className="w-full py-3.5 rounded-xl bg-[#094cb2] text-white font-label text-xs font-bold"
            >
              적용하기
            </button>
          </div>
        </div>
      )}

      {/* Manual Asset Registration Modal */}
      <ManualAssetModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        exchangeRate={rate}
        onSuccess={(newAsset) => {
          const effectiveRate = rate || 1385.48;
          const priceInUsd =
            newAsset.currency === "KRW"
              ? Number(newAsset.average_buy_price) / effectiveRate
              : Number(newAsset.average_buy_price);

          const newStockItem = {
            id: `s_${newAsset.ticker.toLowerCase()}_${Date.now()}`,
            name: newAsset.name || newAsset.ticker,
            ticker: newAsset.ticker.toUpperCase(),
            category: newAsset.market === "KR" ? "국내주식" : "해외주식",
            market: (newAsset.market || "US") as "US" | "KR",
            shares: Number(newAsset.quantity),
            avgPriceUsd: Number(priceInUsd.toFixed(2)),
            currentPriceUsd: Number(priceInUsd.toFixed(2)),
            changePct: 0.0,
            changeAmountUsd: 0.0,
            marketStateLabel: newAsset.market === "KR" ? "장마감" : "프리마켓",
            holdings: [
              {
                id: `h_${Date.now()}`,
                brokerage: newAsset.brokerage || "기본 계좌",
                shares: Number(newAsset.quantity),
                avgPriceUsd: Number(priceInUsd.toFixed(2)),
              },
            ],
            transactions: [
              {
                id: `tx_${Date.now()}`,
                type: "매수",
                date: newAsset.transacted_at || new Date().toISOString().slice(0, 10),
                shares: Number(newAsset.quantity),
                priceUsd: Number(priceInUsd.toFixed(2)),
                brokerage: newAsset.brokerage || "기본 계좌",
              },
            ],
          };

          setStocks((prev) => {
            const exists = prev.find((s) => s.ticker === newStockItem.ticker);
            if (exists) {
              return prev.map((s) =>
                s.ticker === newStockItem.ticker
                  ? {
                      ...s,
                      shares: s.shares + newStockItem.shares,
                      holdings: [...s.holdings, ...newStockItem.holdings],
                      transactions: [...s.transactions, ...newStockItem.transactions],
                    }
                  : s
              );
            }
            return [newStockItem, ...prev];
          });

          showToast(`[${newStockItem.name}] 종목이 포트폴리오에 성공적으로 등록되었습니다.`);
        }}
      />

      {/* Floating Toast */}
      {toastMessage && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-[#1b1c1d] text-white px-5 py-3 rounded-full text-xs font-body shadow-xl">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
