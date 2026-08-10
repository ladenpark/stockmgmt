"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, Calculator, CircleDollarSign, LineChart, PieChart, X } from "lucide-react";

interface QuickNavButtonsProps {
  summary: {
    totalInitialCostKRW: number;
    totalInitialCostUSD: number;
    totalRealizedPnLKRW: number;
    totalRealizedPnLUSD: number;
  };
  exchangeRate: number;
  hideAssetAmounts: boolean;
}

export const QuickNavButtons: React.FC<QuickNavButtonsProps> = ({
  summary,
  exchangeRate,
  hideAssetAmounts,
}) => {
  const [activeModal, setActiveModal] = useState<string | null>(null);

  const buttons = [
    { id: "profit", label: "수익", icon: TrendingUp, color: "text-[#22C55E]", bg: "bg-[#22C55E]/10" },
    { id: "tax", label: "세금", icon: Calculator, color: "text-[#3182F6]", bg: "bg-[#3182F6]/10" },
    { id: "dividend", label: "배당", icon: CircleDollarSign, color: "text-[#F59E0B]", bg: "bg-[#F59E0B]/10" },
    { id: "trend", label: "추이", icon: LineChart, color: "text-[#8B5CF6]", bg: "bg-[#8B5CF6]/10" },
    { id: "portfolio", label: "비중", icon: PieChart, color: "text-[#EC4899]", bg: "bg-[#EC4899]/10" },
  ];

  const formatAmount = (krw: number, hide: boolean) => {
    if (hide) return "••••••";
    return `₩${krw.toLocaleString("ko-KR")}`;
  };

  const totalPnLKRW = summary.totalRealizedPnLKRW + summary.totalRealizedPnLUSD * exchangeRate;

  return (
    <>
      {/* 5 Button Grid Bar */}
      <div className="grid grid-cols-5 gap-2 my-4">
        {buttons.map((b) => {
          const Icon = b.icon;
          return (
            <button
              key={b.id}
              onClick={() => setActiveModal(b.id)}
              className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#F8F9FA] hover:bg-[#F1F3F5] border border-[#E5E8EB] transition-all active:scale-95 group"
            >
              <div className={`w-10 h-10 rounded-xl ${b.bg} flex items-center justify-center ${b.color} mb-1.5 transition-transform group-hover:scale-110`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-[#191F28]">{b.label}</span>
            </button>
          );
        })}
      </div>

      {/* Modal Popup */}
      <AnimatePresence>
        {activeModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveModal(null)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm bg-white rounded-3xl p-6 border border-[#E5E8EB] shadow-2xl z-50 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-[#E5E8EB] pb-3">
                <h4 className="text-lg font-bold text-[#191F28]">
                  {buttons.find((b) => b.id === activeModal)?.label} 상세 분석
                </h4>
                <button
                  onClick={() => setActiveModal(null)}
                  className="w-7 h-7 rounded-full bg-[#F8F9FA] border border-[#E5E8EB] flex items-center justify-center text-[#8B95A1]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {activeModal === "profit" && (
                <div className="space-y-3">
                  <div className="p-4 rounded-2xl bg-[#F8F9FA] border border-[#E5E8EB]">
                    <span className="text-xs text-[#8B95A1] block">총 실현 손익 (매도 수익)</span>
                    <span className={`text-xl font-extrabold ${totalPnLKRW >= 0 ? "text-[#22C55E]" : "text-[#EF4444]"}`}>
                      {totalPnLKRW >= 0 ? "+" : ""}{formatAmount(totalPnLKRW, hideAssetAmounts)}
                    </span>
                  </div>
                  <div className="text-xs text-[#8B95A1] space-y-1">
                    <div className="flex justify-between">
                      <span>원화 매도 실현 손익</span>
                      <span className="font-semibold text-[#191F28]">{formatAmount(summary.totalRealizedPnLKRW, hideAssetAmounts)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>달러 매도 실현 손익</span>
                      <span className="font-semibold text-[#191F28]">${summary.totalRealizedPnLUSD.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}

              {activeModal === "tax" && (
                <div className="space-y-3 text-sm">
                  <p className="text-[#8B95A1] text-xs">해외주식 양도소득세 (연간 250만원 공제) 예상</p>
                  <div className="p-4 rounded-2xl bg-[#F8F9FA] border border-[#E5E8EB]">
                    <span className="text-xs text-[#8B95A1] block">예상 양도소득세 (22%)</span>
                    <span className="text-xl font-extrabold text-[#3182F6]">
                      {formatAmount(Math.max(0, (summary.totalRealizedPnLUSD * exchangeRate - 2500000) * 0.22), hideAssetAmounts)}
                    </span>
                  </div>
                </div>
              )}

              {activeModal === "dividend" && (
                <div className="space-y-3 text-sm">
                  <p className="text-[#8B95A1] text-xs">예상 연간 배당금 수령액</p>
                  <div className="p-4 rounded-2xl bg-[#F8F9FA] border border-[#E5E8EB]">
                    <span className="text-xs text-[#8B95A1] block">연 배당 예상액</span>
                    <span className="text-xl font-extrabold text-[#F59E0B]">
                      {formatAmount(1420000, hideAssetAmounts)}
                    </span>
                  </div>
                </div>
              )}

              {activeModal === "trend" && (
                <div className="space-y-3 text-sm">
                  <p className="text-[#8B95A1] text-xs">월별 원화 총자산 스냅샷 추이</p>
                  <div className="p-4 rounded-2xl bg-[#F8F9FA] border border-[#E5E8EB] text-center">
                    <span className="text-xs text-[#8B95A1]">우상향 스냅샷 기록 중</span>
                    <div className="text-lg font-bold text-[#191F28] mt-1">월평균 +4.2% 성장</div>
                  </div>
                </div>
              )}

              {activeModal === "portfolio" && (
                <div className="space-y-3 text-sm">
                  <p className="text-[#8B95A1] text-xs">자산 비중 (해외주식 vs 국내주식)</p>
                  <div className="p-4 rounded-2xl bg-[#F8F9FA] border border-[#E5E8EB] space-y-2">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-[#3182F6]">해외주식 (68%)</span>
                      <span className="text-[#22C55E]">국내주식 (32%)</span>
                    </div>
                    <div className="w-full h-3 bg-[#E5E8EB] rounded-full overflow-hidden flex">
                      <div className="bg-[#3182F6] h-full" style={{ width: "68%" }} />
                      <div className="bg-[#22C55E] h-full" style={{ width: "32%" }} />
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={() => setActiveModal(null)}
                className="w-full py-2.5 bg-[#F8F9FA] hover:bg-[#F1F3F5] border border-[#E5E8EB] text-[#191F28] font-bold rounded-xl text-xs"
              >
                닫기
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
