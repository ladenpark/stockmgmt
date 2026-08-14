"use client";

import React from "react";
import {
  Wallet,
  Eye,
  EyeOff,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Building2,
  DollarSign,
  Coins,
  ChevronRight,
} from "lucide-react";
import { formatCurrency, formatPercent } from "@/lib/utils";

interface DashboardHeaderProps {
  totalAssetKRW: number;
  totalAssetUSD: number;
  totalGainKRW: number;
  totalGainUSD: number;
  totalGainPercent: number;
  totalDailyGainKRW: number;
  totalDailyGainUSD: number;
  totalDailyGainPercent: number;
  totalInitialCostKRW: number;
  totalInitialCostUSD: number;
  cashKRW: number;
  cashUSD: number;
  exchangeRate: number;
  currencyView: "KRW" | "USD";
  profitViewMode: "total" | "daily";
  hideAssetAmounts: boolean;
  onToggleCurrency: () => void;
  onToggleProfitMode: (mode: "total" | "daily") => void;
  onToggleHideAmounts: () => void;
  onOpenAccountsDrawer: () => void;
  onRefresh: () => void;
}

export function DashboardHeader({
  totalAssetKRW,
  totalAssetUSD,
  totalGainKRW,
  totalGainUSD,
  totalGainPercent,
  totalDailyGainKRW,
  totalDailyGainUSD,
  totalDailyGainPercent,
  totalInitialCostKRW,
  totalInitialCostUSD,
  cashKRW,
  cashUSD,
  exchangeRate,
  currencyView,
  profitViewMode,
  hideAssetAmounts,
  onToggleCurrency,
  onToggleProfitMode,
  onToggleHideAmounts,
  onOpenAccountsDrawer,
  onRefresh,
}: DashboardHeaderProps) {
  const isTotalMode = profitViewMode === "total";
  const displayGainKRW = isTotalMode ? totalGainKRW : totalDailyGainKRW;
  const displayGainUSD = isTotalMode ? totalGainUSD : totalDailyGainUSD;
  const displayGainPercent = isTotalMode ? totalGainPercent : totalDailyGainPercent;
  const isPositive = displayGainKRW >= 0;

  const displayAsset = currencyView === "KRW" ? totalAssetKRW : totalAssetUSD;
  const displayGain = currencyView === "KRW" ? displayGainKRW : displayGainUSD;
  const displayCash = currencyView === "KRW" ? cashKRW : cashUSD;

  return (
    <div className="space-y-4">
      {/* 1. 상단 브랜딩 & 글로벌 컨트롤 바 */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-sm shadow-md">
            S
          </div>
          <div>
            <h1 className="text-base font-extrabold text-slate-900 tracking-tight leading-none">
              mystockapp
            </h1>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              실시간 종합 포트폴리오
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenAccountsDrawer}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/70 text-slate-700 text-xs font-semibold transition-all"
          >
            <Building2 className="w-3.5 h-3.5 text-slate-500" />
            <span>계좌 관리</span>
            <ChevronRight className="w-3 h-3 text-slate-400" />
          </button>
        </div>
      </div>

      {/* 2. 메인 자산 요약 카카오/토스 핀테크 스타일 카드 */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-3xl p-6 shadow-xl border border-slate-700/40 space-y-6">
        {/* 장식용 은은한 글로우 빛 효과 */}
        <div className="absolute -top-24 -right-24 w-60 h-60 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header Row: Title & Action Buttons */}
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 tracking-wide uppercase flex items-center gap-1.5">
              <Wallet className="w-4 h-4 text-blue-400" /> 총 자산 평가액
            </span>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-800/80 text-slate-300 border border-slate-700/60">
              환율 ₩{exchangeRate.toLocaleString()}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={onToggleCurrency}
              className="px-2.5 py-1 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 transition-all flex items-center gap-1"
            >
              {currencyView === "KRW" ? "원화 (₩)" : "달러 ($)"}
            </button>
            <button
              onClick={onToggleHideAmounts}
              className="p-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all"
              title={hideAssetAmounts ? "금액 표시" : "금액 숨기기"}
            >
              {hideAssetAmounts ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={onRefresh}
              className="p-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all"
              title="새로고침"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Center Row: Total Amount & Gain Badge */}
        <div className="space-y-3 relative z-10">
          <div className="text-4xl md:text-5xl font-black tracking-tight text-white leading-none">
            {hideAssetAmounts
              ? "•••••••• ₩"
              : formatCurrency(displayAsset, currencyView)}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border transition-all ${
                isPositive
                  ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                  : "bg-rose-500/15 text-rose-400 border-rose-500/30"
              }`}
            >
              {isPositive ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5" />
              )}
              <span>
                {hideAssetAmounts
                  ? "•••%"
                  : `${formatCurrency(displayGain, currencyView)} (${formatPercent(
                      displayGainPercent
                    )})`}
              </span>
            </div>

            {/* 수익 보기 토글 버튼 (전체 vs 일간) */}
            <div className="bg-slate-800/80 p-0.5 rounded-xl border border-slate-700/60 inline-flex items-center text-[11px]">
              <button
                onClick={() => onToggleProfitMode("total")}
                className={`px-2.5 py-0.5 rounded-lg font-bold transition-all ${
                  isTotalMode
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                전체 수익
              </button>
              <button
                onClick={() => onToggleProfitMode("daily")}
                className={`px-2.5 py-0.5 rounded-lg font-bold transition-all ${
                  !isTotalMode
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                일간 수익
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Sub-Card: 예수금 독립 분리 카드 */}
        <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-300">
              <Coins className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-200">전체 계좌 예수금 (현금 잔고)</p>
              <p className="text-[11px] text-slate-400 font-medium">증권사 앱과 1:1 대조용</p>
            </div>
          </div>

          <div className="text-right font-extrabold text-sm text-white">
            {hideAssetAmounts ? "•••• ₩" : formatCurrency(displayCash, currencyView)}
          </div>
        </div>
      </div>
    </div>
  );
}
