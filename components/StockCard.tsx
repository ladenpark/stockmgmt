"use client";

import React from "react";
import { formatCurrency } from "@/lib/utils";
import { StatValue } from "@/components/ui/StatValue";

export interface StockCardItem {
  id: string;
  ticker: string;
  name: string;
  category: string;
  account: string;
  accountsList: string[];
  currency: "KRW" | "USD";
  market: "KR" | "US";
  quantity: number;
  averagePrice: number;
  currentUnitPrice: number;
  evalAmountCurrency: number;
  evalKRW: number;
  costAmountCurrency: number;
  costKRW: number;
  gainCurrency: number;
  gainKRW: number;
  gainPercent: number;
  dailyChangePercent: number;
  dailyGainCurrency: number;
  dailyGainKRW: number;
  marketStateLabel: string;
}

interface StockCardProps {
  item: StockCardItem;
  currencyView: "KRW" | "USD";
  profitViewMode: "total" | "daily";
  hideAssetAmounts: boolean;
  onClick?: () => void;
}

export function StockCard({
  item,
  currencyView,
  profitViewMode,
  hideAssetAmounts,
  onClick,
}: StockCardProps) {
  if (!item) return null;

  const isTotalMode = profitViewMode === "total";

  const gainKRW = item.gainKRW ?? 0;
  const dailyGainKRW = item.dailyGainKRW ?? 0;
  const gainCurrency = item.gainCurrency ?? 0;
  const dailyGainCurrency = item.dailyGainCurrency ?? 0;
  const gainPercent = item.gainPercent ?? 0;
  const dailyChangePercent = item.dailyChangePercent ?? 0;

  const profitAmount = isTotalMode ? gainKRW : dailyGainKRW;
  const profitAmountCurrency = isTotalMode ? gainCurrency : dailyGainCurrency;
  const profitPercent = isTotalMode ? gainPercent : dailyChangePercent;

  const displayEval = currencyView === "KRW" ? (item.evalKRW ?? 0) : (item.evalAmountCurrency ?? 0);
  const displayCost = currencyView === "KRW" ? (item.costKRW ?? 0) : (item.costAmountCurrency ?? 0);
  const displayProfit = currencyView === "KRW" ? profitAmount : profitAmountCurrency;
  const ticker = (item.ticker || "STOCK").toUpperCase();
  const name = item.name || ticker;
  const accountsList = Array.from(
    new Set(
      (item.accountsList && item.accountsList.length > 0 ? item.accountsList : [item.account || "일반"]).filter(Boolean)
    )
  );

  // Ticker badge color generator based on ticker
  const getBadgeBg = (sym: string) => {
    if (sym === "TSLA") return "bg-red-50 text-red-600 border-red-100";
    if (sym === "AAPL") return "bg-slate-100 text-slate-800 border-slate-200";
    if (sym === "NVDA") return "bg-emerald-50 text-emerald-700 border-emerald-100";
    if (sym === "MSFT") return "bg-blue-50 text-blue-700 border-blue-100";
    if (/^\d+$/.test(sym)) return "bg-indigo-50 text-indigo-700 border-indigo-100";
    return "bg-slate-100 text-slate-700 border-slate-200";
  };

  return (
    <div
      onClick={onClick}
      className="bg-white p-4 md:p-5 rounded-2xl border border-[#E2E8F0] shadow-xs hover:border-[#CBD5E1] transition-all cursor-pointer space-y-2.5 active:scale-[0.99]"
    >
      {/* Top Header: Logo, Ticker, Name, Brokerage */}
      <div className="flex items-center justify-between gap-3">
        {/* Left: Thumbnail Badge & Name */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div
            className={`w-9 h-9 rounded-xl border flex items-center justify-center font-black text-xs shrink-0 ${getBadgeBg(
              ticker
            )}`}
          >
            {ticker.slice(0, 3)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <h3 className="text-sm font-bold text-[#0F172A] truncate">{name}</h3>
              <span className="text-[11px] font-semibold text-[#64748B] shrink-0 uppercase">
                {ticker}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <div className="flex items-center gap-1 shrink-0 flex-wrap">
                {accountsList.map((acc, idx) => (
                  <span
                    key={idx}
                    className="text-[10px] font-medium bg-[#F1F5F9] text-[#475569] px-1.5 py-0.5 rounded-md truncate max-w-[110px]"
                  >
                    {acc}
                  </span>
                ))}
              </div>
              <span className="text-[11px] text-[#64748B] truncate">
                {(item.quantity ?? 0).toLocaleString()}주 · 평단 {formatCurrency(item.averagePrice ?? 0, item.currency || "KRW")}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Valuation Amount */}
        <div className="text-right shrink-0">
          <div className="text-sm md:text-base font-extrabold text-[#0F172A] tracking-tight">
            {hideAssetAmounts ? "••••••" : formatCurrency(displayEval, currencyView)}
          </div>
          <div className="text-[11px] text-[#64748B]">
            원금 {hideAssetAmounts ? "••••" : formatCurrency(displayCost, currencyView)}
          </div>
        </div>
      </div>

      {/* Bottom Row: Profit Gain / Loss Bar */}
      <div className="pt-2 border-t border-[#F1F5F9] flex items-center justify-between text-xs">
        <span className="text-[11px] font-medium text-[#64748B]">
          {isTotalMode ? "총 평가손익" : "오늘의 변동"}
        </span>
        {hideAssetAmounts ? (
          <span className="text-xs font-semibold text-[#64748B]">••••••</span>
        ) : (
          <StatValue
            amount={displayProfit}
            percent={profitPercent}
            currency={currencyView}
            size="sm"
          />
        )}
      </div>
    </div>
  );
}
