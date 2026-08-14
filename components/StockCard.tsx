"use client";

import React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { formatCurrency, formatPercent } from "@/lib/utils";

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

  const isPositive = profitAmount >= 0;

  const displayEval = currencyView === "KRW" ? (item.evalKRW ?? 0) : (item.evalAmountCurrency ?? 0);
  const displayProfit = currencyView === "KRW" ? profitAmount : profitAmountCurrency;
  const accountsList = item.accountsList && item.accountsList.length > 0 ? item.accountsList : [item.account || "계좌"];
  const ticker = item.ticker || "STOCK";
  const name = item.name || ticker;

  const isUp = profitPercent >= 0;
  const sparklineColor = isUp ? "#10B981" : "#F43F5E";
  const sparklinePath = isUp
    ? "M 0,22 Q 15,18 30,12 T 60,4"
    : "M 0,4 Q 15,8 30,16 T 60,22";

  return (
    <div
      onClick={onClick}
      className="bg-white hover:bg-slate-50/80 transition-all p-4 rounded-2xl border border-slate-100 shadow-2xs hover:shadow-md hover:-translate-y-0.5 duration-200 cursor-pointer space-y-3"
    >
      {/* Top Row: Symbol Icon, Stock Info, Sparkline & Prices */}
      <div className="flex items-center justify-between gap-3">
        {/* Left: Logo Badge & Stock Names */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-slate-100 border border-slate-200/80 flex items-center justify-center font-extrabold text-xs text-slate-800 shrink-0 shadow-xs">
            {ticker.substring(0, 4)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-extrabold text-slate-900 truncate">
                {name}
              </h3>
              <span className="text-[10px] font-bold text-slate-500 uppercase">
                {ticker}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5 truncate">
              {(item.quantity ?? 0).toLocaleString()}주 · 평단 {formatCurrency(item.averagePrice ?? 0, item.currency || "KRW")}
            </p>
          </div>
        </div>

        {/* Center: Sparkline Mini Chart (Visible on sm/md screens) */}
        <div className="hidden sm:block shrink-0 px-2">
          <svg width="64" height="26" viewBox="0 0 64 26" fill="none">
            <path
              d={sparklinePath}
              stroke={sparklineColor}
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
        </div>

        {/* Right: Evaluation & Profit Badge */}
        <div className="text-right shrink-0">
          <p className="text-sm font-black text-slate-900 tracking-tight">
            {hideAssetAmounts
              ? "••••••"
              : formatCurrency(displayEval, currencyView)}
          </p>
          <div className="mt-0.5 inline-flex items-center justify-end gap-1">
            <span
              className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg text-xs font-extrabold border ${
                isPositive
                  ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                  : "bg-rose-50 text-rose-600 border-rose-100"
              }`}
            >
              {isPositive ? (
                <TrendingUp className="w-3 h-3 stroke-[2.5]" />
              ) : (
                <TrendingDown className="w-3 h-3 stroke-[2.5]" />
              )}
              {hideAssetAmounts
                ? "••%"
                : `${formatPercent(profitPercent)} (${formatCurrency(
                    displayProfit,
                    currencyView
                  )})`}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Row: Account Badges & Market Status Chips */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
        {/* Account Badges */}
        <div className="flex flex-wrap items-center gap-1">
          {accountsList.map((acc) => (
            <span
              key={acc}
              className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-semibold border border-slate-200/60"
            >
              {acc}
            </span>
          ))}
          <span className="px-2 py-0.5 rounded-md bg-slate-50 text-slate-500 font-medium">
            {item.category || "주식"}
          </span>
        </div>

        {/* Market State Chip */}
        <span
          className={`font-bold px-2 py-0.5 rounded-md ${
            item.marketStateLabel === "프리마켓"
              ? "bg-amber-50 text-amber-600 border border-amber-200/60"
              : item.marketStateLabel === "애프터마켓"
              ? "bg-purple-50 text-purple-600 border border-purple-200/60"
              : item.marketStateLabel === "정규장"
              ? "bg-emerald-50 text-emerald-600 border border-emerald-200/60"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          {item.marketStateLabel || "장마감"}
        </span>
      </div>
    </div>
  );
}
