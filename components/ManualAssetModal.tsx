"use client";

import React, { useState } from "react";
import { addManualAsset, ManualAssetPayload } from "@/lib/apiClient";

interface ManualAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (txData: any) => void;
  exchangeRate?: number;
}

type TxType = "BUY" | "SELL" | "DIVIDEND" | "CASH";

const COMMON_TICKERS = [
  { ticker: "AAPL", name: "애플", market: "US", currency: "USD" },
  { ticker: "NVDA", name: "엔비디아", market: "US", currency: "USD" },
  { ticker: "TSLA", name: "테슬라", market: "US", currency: "USD" },
  { ticker: "MSFT", name: "마이크로소프트", market: "US", currency: "USD" },
  { ticker: "PLTR", name: "팔란티어", market: "US", currency: "USD" },
  { ticker: "005930", name: "삼성전자", market: "KR", currency: "KRW" },
  { ticker: "000660", name: "SK하이닉스", market: "KR", currency: "KRW" },
];

const BROKERAGES = ["토스증권", "키움증권", "미래에셋증권", "카카오페이증권", "한국투자증권", "KB증권", "직접입력"];

export default function ManualAssetModal({ isOpen, onClose, onSuccess, exchangeRate = 1385.5 }: ManualAssetModalProps) {
  const [txType, setTxType] = useState<TxType>("BUY");
  const [cashSubtype, setCashSubtype] = useState<"DEPOSIT" | "WITHDRAW">("DEPOSIT");

  const [brokerage, setBrokerage] = useState("토스증권");
  const [customBrokerage, setCustomBrokerage] = useState("");
  const [ticker, setTicker] = useState("");
  const [name, setName] = useState("");
  const [market, setMarket] = useState<"US" | "KR">("US");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [cashAmount, setCashAmount] = useState("");
  const [currency, setCurrency] = useState<"USD" | "KRW">("USD");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  if (!isOpen) return null;

  const handleSelectCommonTicker = (item: (typeof COMMON_TICKERS)[0]) => {
    setTicker(item.ticker);
    setName(item.name);
    setMarket(item.market as "US" | "KR");
    setCurrency(item.currency as "USD" | "KRW");
  };

  const handleTickerChange = (val: string) => {
    const upper = val.toUpperCase();
    setTicker(upper);
    const matched = COMMON_TICKERS.find((t) => t.ticker === upper);
    if (matched) {
      setName(matched.name);
      setMarket(matched.market as "US" | "KR");
      setCurrency(matched.currency as "USD" | "KRW");
    } else {
      if (/^\d{6}$/.test(upper)) {
        setMarket("KR");
        setCurrency("KRW");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    const finalBrokerage = brokerage === "직접입력" ? customBrokerage.trim() : brokerage;
    const cleanTicker = ticker.trim().toUpperCase();
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
        setErrorMessage("종목코드(티커)를 입력해주세요.");
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
        setErrorMessage("배당을 지급한 종목코드를 입력해주세요.");
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-[#c3c6d5]/40 max-h-[90vh] overflow-y-auto">
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
              <p className="font-body text-xs text-[#434653]">매수, 매도, 배당금 및 예수금 입출금을 기록합니다.</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#efedee] text-[#434653]">
            <span className="material-symbols-outlined text-lg">close</span>
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

          {/* 종목 입력 (주식 거래 & 배당 시) */}
          {txType !== "CASH" && (
            <>
              <div>
                <label className="block text-xs font-bold text-[#1b1c1d] mb-1.5">인기 종목 빠른 선택</label>
                <div className="flex flex-wrap gap-1.5">
                  {COMMON_TICKERS.map((item) => (
                    <button
                      type="button"
                      key={item.ticker}
                      onClick={() => handleSelectCommonTicker(item)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                        ticker === item.ticker ? "bg-[#d9e2ff] text-[#094cb2] border-[#094cb2]" : "bg-white text-[#434653] border-[#c3c6d5] hover:bg-[#efedee]"
                      }`}
                    >
                      {item.name} ({item.ticker})
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#1b1c1d] mb-1">종목 코드 (티커) *</label>
                  <input
                    type="text"
                    value={ticker}
                    onChange={(e) => handleTickerChange(e.target.value)}
                    placeholder="예: AAPL, NVDA, 005930"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#c3c6d5] text-xs font-semibold focus:outline-none focus:border-[#094cb2]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#1b1c1d] mb-1">종목명</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="예: 애플"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#c3c6d5] text-xs focus:outline-none focus:border-[#094cb2]"
                  />
                </div>
              </div>
            </>
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
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#434653] hover:bg-[#efedee] transition-all"
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
