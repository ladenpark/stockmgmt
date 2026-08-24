"use client";

import React, { useState } from "react";
import { addManualAsset, ManualAssetPayload } from "@/lib/apiClient";

interface ManualAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newStock: any) => void;
  exchangeRate?: number;
}

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
  const [brokerage, setBrokerage] = useState("토스증권");
  const [customBrokerage, setCustomBrokerage] = useState("");
  const [ticker, setTicker] = useState("");
  const [name, setName] = useState("");
  const [market, setMarket] = useState<"US" | "KR">("US");
  const [quantity, setQuantity] = useState("");
  const [averageBuyPrice, setAverageBuyPrice] = useState("");
  const [currency, setCurrency] = useState<"USD" | "KRW">("USD");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
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
    const numPrice = parseFloat(averageBuyPrice);

    if (!cleanTicker) {
      setErrorMessage("종목코드(티커)를 입력해주세요.");
      return;
    }
    if (isNaN(numQty) || numQty <= 0) {
      setErrorMessage("올바른 보유 수량을 입력해주세요.");
      return;
    }
    if (isNaN(numPrice) || numPrice <= 0) {
      setErrorMessage("올바른 평균 매입단가를 입력해주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: ManualAssetPayload = {
        brokerage: finalBrokerage || "기본 계좌",
        ticker: cleanTicker,
        name: cleanName,
        market,
        quantity: numQty,
        average_buy_price: numPrice,
        currency,
        transacted_at: date,
      };

      const result = await addManualAsset(payload);
      if (result.success) {
        onSuccess(result.data || payload);
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
        <div className="flex items-center justify-between pb-4 border-b border-[#efedee]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#d9e2ff] flex items-center justify-center text-[#094cb2]">
              <span className="material-symbols-outlined text-xl">add_card</span>
            </div>
            <div>
              <h3 className="font-headline font-bold text-lg text-[#1b1c1d]">초기 자산 및 종목 직접 등록</h3>
              <p className="font-body text-xs text-[#434653]">계좌별 보유 주식과 매입 평단가를 직접 입력합니다.</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#efedee] text-[#434653]">
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {errorMessage && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">error</span>
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* 계좌 선택 */}
          <div>
            <label className="block text-xs font-bold text-[#1b1c1d] mb-1.5">보유 증권사 / 계좌</label>
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
                placeholder="증권사/계좌명 입력 (예: 해외주식 직투계좌)"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#c3c6d5] text-xs focus:outline-none focus:border-[#094cb2]"
              />
            )}
          </div>

          {/* 종목 빠른 선택 */}
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

          {/* 종목코드 & 이름 */}
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

          {/* 보유 수량 & 평균 매입단가 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#1b1c1d] mb-1">보유 수량 (주) *</label>
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
                <label className="block text-xs font-bold text-[#1b1c1d]">평균 매입단가 *</label>
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
                value={averageBuyPrice}
                onChange={(e) => setAverageBuyPrice(e.target.value)}
                placeholder={currency === "USD" ? "예: 180.50 ($)" : "예: 72000 (₩)"}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#c3c6d5] text-xs font-semibold focus:outline-none focus:border-[#094cb2]"
                required
              />
            </div>
          </div>

          {/* 최초 매수일 */}
          <div>
            <label className="block text-xs font-bold text-[#1b1c1d] mb-1">매수 일자</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#c3c6d5] text-xs focus:outline-none focus:border-[#094cb2]"
            />
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
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#094cb2] text-white hover:bg-[#003da5] active:scale-95 transition-all shadow-md flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <span className="material-symbols-outlined text-xs animate-spin">refresh</span>
                  <span>등록 중...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-xs">check</span>
                  <span>포트폴리오에 저장</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
