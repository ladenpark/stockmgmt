"use client";

import React, { useState, useEffect, useRef } from "react";
import { addManualAsset, ManualAssetPayload } from "@/lib/apiClient";
import { searchStocks, MasterStockItem, MASTER_STOCKS } from "@/lib/stockDictionary";

interface ManualAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (txData: any) => void;
  exchangeRate?: number;
}

type TxType = "BUY" | "SELL" | "DIVIDEND" | "CASH";

const BROKERAGES = ["토스증권", "키움증권", "미래에셋증권", "카카오페이증권", "한국투자증권", "KB증권", "직접입력"];

export default function ManualAssetModal({ isOpen, onClose, onSuccess, exchangeRate = 1385.5 }: ManualAssetModalProps) {
  const [txType, setTxType] = useState<TxType>("BUY");
  const [cashSubtype, setCashSubtype] = useState<"DEPOSIT" | "WITHDRAW">("DEPOSIT");

  const [brokerage, setBrokerage] = useState("토스증권");
  const [customBrokerage, setCustomBrokerage] = useState("");

  // Search & Selected Stock State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<MasterStockItem[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const [ticker, setTicker] = useState("");
  const [name, setName] = useState("");
  const [market, setMarket] = useState<"US" | "KR">("US");
  const [currency, setCurrency] = useState<"USD" | "KRW">("USD");

  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [cashAmount, setCashAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");

  const [liveQuoteInfo, setLiveQuoteInfo] = useState<{ price: number; currency: string; name: string } | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<any>(null);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
      setTicker("");
      setName("");
      setQuantity("");
      setPrice("");
      setCashAmount("");
      setLiveQuoteInfo(null);
      setErrorMessage("");
      setIsDropdownOpen(false);
    }
  }, [isOpen]);

  // ESC key listener to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Click outside to close search dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle Smart Search Input (Ticker, Korean name, English name, Chosung, Aliases)
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (!query.trim()) {
      setSearchResults(MASTER_STOCKS.slice(0, 8));
      setIsDropdownOpen(true);
      return;
    }

    setIsSearching(true);
    setIsDropdownOpen(true);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/stocks/search?q=${encodeURIComponent(query.trim())}&limit=8`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            setSearchResults(json.data);
          }
        } else {
          // Fallback to local dictionary search
          setSearchResults(searchStocks(query, 8));
        }
      } catch {
        setSearchResults(searchStocks(query, 8));
      } finally {
        setIsSearching(false);
      }
    }, 200);
  };

  // When a stock is selected from search results or popular chips
  const handleSelectStock = (item: MasterStockItem) => {
    setTicker(item.ticker);
    setName(item.name);
    setSearchQuery(`${item.name} (${item.ticker})`);
    setMarket(item.market);
    setCurrency(item.currency);
    setIsDropdownOpen(false);
    setErrorMessage("");

    // Fetch live market quote immediately
    fetchLiveQuote(item.ticker, item.market);
  };

  const fetchLiveQuote = async (cleanTicker: string, itemMarket: "US" | "KR") => {
    try {
      const res = await fetch(`/api/stocks?tickers=${cleanTicker}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data?.quotes?.[cleanTicker]) {
          const q = json.data.quotes[cleanTicker];
          setLiveQuoteInfo({
            price: q.currentPrice,
            currency: q.currency,
            name: q.name || name,
          });
        }
      }
    } catch {
      // ignore
    }
  };

  const handleApplyLivePrice = () => {
    if (liveQuoteInfo && liveQuoteInfo.price > 0) {
      setPrice(String(liveQuoteInfo.price));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    const finalBrokerage = brokerage === "직접입력" ? customBrokerage.trim() : brokerage;
    const cleanTicker = ticker.trim().toUpperCase() || searchQuery.trim().toUpperCase();
    const cleanName = name.trim() || cleanTicker;
    const numQty = parseFloat(quantity);
    const numPrice = parseFloat(price);
    const numCash = parseFloat(cashAmount);

    let finalTypeLabel = "매수";
    if (txType === "BUY") finalTypeLabel = "매수";
    else if (txType === "SELL") finalTypeLabel = "매도";
    else if (txType === "DIVIDEND") finalTypeLabel = "배당";
    else if (txType === "CASH") finalTypeLabel = cashSubtype === "DEPOSIT" ? "입금" : "출금";

    if (txType === "BUY" || txType === "SELL") {
      if (!cleanTicker) {
        setErrorMessage("종목을 검색하여 선택해주세요.");
        return;
      }
      if (isNaN(numQty) || numQty <= 0) {
        setErrorMessage("올바른 수량을 입력해주세요.");
        return;
      }
      if (isNaN(numPrice) || numPrice <= 0) {
        setErrorMessage("올바른 체결단가를 입력해주세요.");
        return;
      }
    } else if (txType === "DIVIDEND") {
      if (!cleanTicker) {
        setErrorMessage("배당을 지급한 종목을 검색하여 선택해주세요.");
        return;
      }
      if (isNaN(numPrice) || numPrice <= 0) {
        setErrorMessage("배당금 총액을 입력해주세요.");
        return;
      }
    } else if (txType === "CASH") {
      if (isNaN(numCash) || numCash <= 0) {
        setErrorMessage("올바른 입출금 금액을 입력해주세요.");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload: ManualAssetPayload = {
        type: txType === "CASH" ? (cashSubtype === "DEPOSIT" ? "DEPOSIT" : "WITHDRAW") : txType,
        brokerage: finalBrokerage || "기본 계좌",
        ticker: txType === "CASH" ? "CASH" : cleanTicker,
        name: txType === "CASH" ? (cashSubtype === "DEPOSIT" ? "예수금 입금" : "예수금 출금") : cleanName,
        market: txType === "CASH" ? (currency === "KRW" ? "KR" : "US") : market,
        quantity: txType === "CASH" ? 1 : txType === "DIVIDEND" ? (numQty > 0 ? numQty : 1) : numQty,
        price: txType === "CASH" ? numCash : numPrice,
        average_buy_price: txType === "CASH" ? numCash : numPrice,
        amount: txType === "CASH" ? numCash : txType === "DIVIDEND" ? numPrice : numQty * numPrice,
        currency,
        transacted_at: date,
        notes: notes.trim(),
      };

      const result = await addManualAsset(payload);
      if (result.success) {
        onSuccess({
          ...payload,
          id: `tx_${Date.now()}`,
          displayType: finalTypeLabel,
        });
        onClose();
      } else {
        setErrorMessage(result.error || "등록 중 오류가 발생했습니다.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "서버 통신 실패");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-[#c3c6d5]/40 max-h-[90vh] overflow-y-auto cursor-default"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#efedee]">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold ${
                txType === "BUY"
                  ? "bg-[#d9e2ff] text-[#094cb2]"
                  : txType === "SELL"
                  ? "bg-[#ffdad6] text-[#ba1a1a]"
                  : txType === "DIVIDEND"
                  ? "bg-[#fef3c7] text-[#6d5e00]"
                  : "bg-emerald-100 text-emerald-800"
              }`}
            >
              <span className="material-symbols-outlined text-xl">
                {txType === "BUY"
                  ? "add_circle"
                  : txType === "SELL"
                  ? "do_not_disturb_on"
                  : txType === "DIVIDEND"
                  ? "payments"
                  : "account_balance_wallet"}
              </span>
            </div>
            <div>
              <h3 className="font-headline font-bold text-lg text-[#1b1c1d]">종합 거래내역 직접 등록</h3>
              <p className="font-body text-xs text-[#434653]">종목명, 티커, 초성으로 손쉽게 검색하여 등록합니다.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
            aria-label="닫기"
            className="w-9 h-9 rounded-full flex items-center justify-center bg-[#f5f3f4] hover:bg-[#efedee] text-[#1b1c1d] active:scale-90 transition-all cursor-pointer z-20"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* 1. Transaction Type Tab Selector */}
        <div className="grid grid-cols-4 gap-1.5 p-1.5 bg-[#efedee] rounded-2xl mt-4">
          {[
            { id: "BUY", label: "매수", color: "bg-[#094cb2] text-white shadow-xs" },
            { id: "SELL", label: "매도", color: "bg-[#ba1a1a] text-white shadow-xs" },
            { id: "DIVIDEND", label: "배당금", color: "bg-[#6d5e00] text-white shadow-xs" },
            { id: "CASH", label: "입출금", color: "bg-emerald-700 text-white shadow-xs" },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setTxType(t.id as TxType);
                setErrorMessage("");
              }}
              className={`py-2 text-xs font-bold rounded-xl transition-all ${
                txType === t.id ? t.color : "text-[#434653] hover:text-[#1b1c1d]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {errorMessage && (
          <div className="mt-3 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">error</span>
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* 입출금 전용 서브타입 (입금 vs 출금) */}
          {txType === "CASH" && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCashSubtype("DEPOSIT")}
                className={`flex-1 py-2.5 rounded-xl font-bold text-xs border transition-all ${
                  cashSubtype === "DEPOSIT"
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                    : "bg-[#f5f3f4] text-[#434653] border-transparent"
                }`}
              >
                + 예수금 입금 (원금 추가)
              </button>
              <button
                type="button"
                onClick={() => setCashSubtype("WITHDRAW")}
                className={`flex-1 py-2.5 rounded-xl font-bold text-xs border transition-all ${
                  cashSubtype === "WITHDRAW"
                    ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                    : "bg-[#f5f3f4] text-[#434653] border-transparent"
                }`}
              >
                - 예수금 출금 (자금 인출)
              </button>
            </div>
          )}

          {/* 계좌 선택 */}
          <div>
            <label className="block text-xs font-bold text-[#1b1c1d] mb-1.5">증권사 / 계좌 선택</label>
            <div className="grid grid-cols-3 gap-1.5 mb-2">
              {BROKERAGES.slice(0, 6).map((b) => (
                <button
                  type="button"
                  key={b}
                  onClick={() => setBrokerage(b)}
                  className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all ${
                    brokerage === b ? "bg-[#094cb2] text-white border-[#094cb2]" : "bg-[#f5f3f4] text-[#434653] border-transparent hover:bg-[#efedee]"
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
            {brokerage === "직접입력" && (
              <input
                type="text"
                value={customBrokerage}
                onChange={(e) => setCustomBrokerage(e.target.value)}
                placeholder="증권사/계좌명 입력 (예: 해외 직투 계좌)"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#c3c6d5] text-xs focus:outline-none focus:border-[#094cb2]"
              />
            )}
          </div>

          {/* 🌟 스마트 통합 종목 검색바 (주식 거래 & 배당 시) */}
          {txType !== "CASH" && (
            <div className="relative">
              <label className="block text-xs font-bold text-[#1b1c1d] mb-1.5 flex items-center justify-between">
                <span>종목 검색 (종목명, 티커, 초성) *</span>
                {isSearching && (
                  <span className="text-[10px] text-[#094cb2] font-semibold flex items-center gap-0.5">
                    <span className="material-symbols-outlined text-xs animate-spin">sync</span> 검색중...
                  </span>
                )}
              </label>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#434653]">
                  <span className="material-symbols-outlined text-base">search</span>
                </div>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onFocus={() => {
                    if (!searchQuery) setSearchResults(MASTER_STOCKS.slice(0, 8));
                    setIsDropdownOpen(true);
                  }}
                  onChange={handleSearchInputChange}
                  placeholder="예: 삼전, 애플, 테슬라, NVDA, ㅅㅅㅈㅈ, 005930"
                  className="w-full pl-10 pr-10 py-3 rounded-2xl border border-[#c3c6d5] text-xs font-bold text-[#1b1c1d] focus:outline-none focus:border-[#094cb2] focus:ring-2 focus:ring-[#094cb2]/20 transition-all shadow-xs"
                  required
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setTicker("");
                      setName("");
                      setLiveQuoteInfo(null);
                      searchInputRef.current?.focus();
                    }}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#434653] hover:text-[#1b1c1d]"
                  >
                    <span className="material-symbols-outlined text-base">cancel</span>
                  </button>
                )}
              </div>

              {/* 🔽 Auto-Complete Dropdown */}
              {isDropdownOpen && (
                <div
                  ref={dropdownRef}
                  className="absolute z-50 left-0 right-0 mt-1.5 bg-white rounded-2xl shadow-xl border border-[#c3c6d5]/60 max-h-60 overflow-y-auto divide-y divide-[#efedee] animate-fadeIn"
                >
                  <div className="p-2 bg-[#f5f3f4] text-[11px] font-bold text-[#434653] flex justify-between items-center">
                    <span>추천 및 검색 결과 ({searchResults.length}건)</span>
                    <span className="text-[10px] text-[#434653]/80">클릭 시 자동 완성</span>
                  </div>
                  {searchResults.length === 0 ? (
                    <div className="p-4 text-center text-xs text-[#434653]">
                      일치하는 종목이 없습니다. 티커를 직접 입력하실 수 있습니다.
                    </div>
                  ) : (
                    searchResults.map((item) => (
                      <div
                        key={item.ticker}
                        onClick={() => handleSelectStock(item)}
                        className="p-3 hover:bg-[#d9e2ff]/30 cursor-pointer flex items-center justify-between transition-colors group"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-base">
                            {item.market === "KR" ? "🇰🇷" : "🇺🇸"}
                          </span>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-xs text-[#1b1c1d] group-hover:text-[#094cb2]">
                                {item.name}
                              </span>
                              <span className="px-1.5 py-0.5 rounded-md bg-[#efedee] text-[10px] font-bold text-[#094cb2]">
                                {item.ticker}
                              </span>
                            </div>
                            {item.category && (
                              <div className="text-[10px] text-[#434653] mt-0.5">
                                {item.category} {item.nameEn ? `• ${item.nameEn}` : ""}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#efedee] text-[#434653]">
                            {item.currency}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Selected Stock Info Banner */}
              {ticker && (
                <div className="mt-2.5 p-3 bg-[#f5f3f4] rounded-2xl flex items-center justify-between border border-[#c3c6d5]/40 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{market === "KR" ? "🇰🇷" : "🇺🇸"}</span>
                    <div>
                      <span className="font-bold text-[#1b1c1d]">{name}</span>
                      <span className="text-[#094cb2] font-bold ml-1">({ticker})</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${currency === "USD" ? "bg-[#094cb2] text-white" : "bg-emerald-700 text-white"}`}>
                      {currency}
                    </span>
                    <span className="text-[10px] text-[#434653] font-semibold">
                      {market === "KR" ? "국내주식" : "미국주식"}
                    </span>
                  </div>
                </div>
              )}

              {/* Live Price Helper Badge */}
              {liveQuoteInfo && liveQuoteInfo.price > 0 && (
                <div className="mt-2 p-3 bg-[#d9e2ff]/40 border border-[#094cb2]/20 rounded-2xl flex items-center justify-between text-xs animate-fadeIn">
                  <div className="flex items-center gap-1.5 text-[#094cb2] font-semibold">
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>
                      {liveQuoteInfo.name} 현재 실시간 시세:{" "}
                      <strong>
                        {liveQuoteInfo.currency === "KRW"
                          ? `₩${liveQuoteInfo.price.toLocaleString()}`
                          : `$${liveQuoteInfo.price.toLocaleString()}`}
                      </strong>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleApplyLivePrice}
                    className="px-2.5 py-1 bg-[#094cb2] text-white rounded-lg font-bold text-[10px] hover:bg-[#003da5] active:scale-95 transition-all shadow-xs"
                  >
                    체결단가로 적용
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 수량 및 단가 (매수/매도 시) */}
          {(txType === "BUY" || txType === "SELL") && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#1b1c1d] mb-1">
                  {txType === "BUY" ? "매수 수량 (주) *" : "매도 수량 (주) *"}
                </label>
                <input
                  type="number"
                  step="any"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="예: 25"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#c3c6d5] text-xs font-semibold focus:outline-none focus:border-[#094cb2]"
                  required
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-[#1b1c1d]">체결 단가 *</label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setCurrency("USD")}
                      className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${currency === "USD" ? "bg-[#094cb2] text-white" : "bg-[#efedee] text-[#434653]"}`}
                    >
                      USD($)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrency("KRW")}
                      className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${currency === "KRW" ? "bg-[#094cb2] text-white" : "bg-[#efedee] text-[#434653]"}`}
                    >
                      KRW(₩)
                    </button>
                  </div>
                </div>
                <input
                  type="number"
                  step="any"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder={currency === "USD" ? "예: 180.50 ($)" : "예: 72000 (₩)"}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#c3c6d5] text-xs font-semibold focus:outline-none focus:border-[#094cb2]"
                  required
                />
              </div>
            </div>
          )}

          {/* 배당금 수령액 (배당 시) */}
          {txType === "DIVIDEND" && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-[#1b1c1d]">배당금 수령 총액 *</label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setCurrency("USD")}
                    className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${currency === "USD" ? "bg-[#6d5e00] text-white" : "bg-[#efedee] text-[#434653]"}`}
                  >
                    USD($)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrency("KRW")}
                    className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${currency === "KRW" ? "bg-[#6d5e00] text-white" : "bg-[#efedee] text-[#434653]"}`}
                  >
                    KRW(₩)
                  </button>
                </div>
              </div>
              <input
                type="number"
                step="any"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder={currency === "USD" ? "예: 45.20 ($)" : "예: 50000 (₩)"}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#c3c6d5] text-xs font-semibold focus:outline-none focus:border-[#6d5e00]"
                required
              />
            </div>
          )}

          {/* 입출금 금액 (입출금 시) */}
          {txType === "CASH" && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-[#1b1c1d]">
                  {cashSubtype === "DEPOSIT" ? "입금할 금액 *" : "출금할 금액 *"}
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setCurrency("KRW")}
                    className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${currency === "KRW" ? "bg-emerald-700 text-white" : "bg-[#efedee] text-[#434653]"}`}
                  >
                    KRW(₩)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrency("USD")}
                    className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${currency === "USD" ? "bg-emerald-700 text-white" : "bg-[#efedee] text-[#434653]"}`}
                  >
                    USD($)
                  </button>
                </div>
              </div>
              <input
                type="number"
                step="any"
                value={cashAmount}
                onChange={(e) => setCashAmount(e.target.value)}
                placeholder={currency === "KRW" ? "예: 1000000 (₩)" : "예: 1000 ($)"}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#c3c6d5] text-xs font-semibold focus:outline-none focus:border-emerald-700"
                required
              />
            </div>
          )}

          {/* 총 거래액 실시간 미리보기 (매수/매도 시) */}
          {(txType === "BUY" || txType === "SELL") && parseFloat(quantity) > 0 && parseFloat(price) > 0 && (
            <div className="p-3 bg-[#f5f3f4] rounded-2xl flex justify-between items-center text-xs">
              <span className="font-bold text-[#434653]">총 체결 금액</span>
              <span className="font-headline font-bold text-sm text-[#094cb2]">
                {currency === "USD"
                  ? `$${(parseFloat(quantity) * parseFloat(price)).toFixed(2)} (≈ ₩${Math.round(parseFloat(quantity) * parseFloat(price) * exchangeRate).toLocaleString()})`
                  : `₩${Math.round(parseFloat(quantity) * parseFloat(price)).toLocaleString()}`}
              </span>
            </div>
          )}

          {/* 거래 일자 & 메모 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#1b1c1d] mb-1">체결 / 거래 일자</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#c3c6d5] text-xs focus:outline-none focus:border-[#094cb2]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#1b1c1d] mb-1">메모 (선택)</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="예: 분할매수, 월급적립"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#c3c6d5] text-xs focus:outline-none focus:border-[#094cb2]"
              />
            </div>
          </div>

          {/* 버튼 영역 */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#efedee]">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClose();
              }}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-[#434653] hover:bg-[#efedee] active:scale-95 transition-all cursor-pointer"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white active:scale-95 transition-all shadow-md flex items-center gap-1.5 ${
                txType === "BUY"
                  ? "bg-[#094cb2] hover:bg-[#003da5]"
                  : txType === "SELL"
                  ? "bg-[#ba1a1a] hover:bg-[#93000a]"
                  : txType === "DIVIDEND"
                  ? "bg-[#6d5e00] hover:bg-[#524600]"
                  : "bg-emerald-700 hover:bg-emerald-800"
              }`}
            >
              {isSubmitting ? (
                <>
                  <span className="material-symbols-outlined text-xs animate-spin">refresh</span>
                  <span>기록 중...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-xs">check</span>
                  <span>{txType === "BUY" ? "매수 내역 등록" : txType === "SELL" ? "매도 내역 등록" : txType === "DIVIDEND" ? "배당금 등록" : "입출금 내역 등록"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
