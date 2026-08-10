"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Building2, ChevronRight, Wallet, ShieldCheck, ArrowUpRight, Coins } from "lucide-react";

interface AccountSummaryItem {
  accountName: string;
  category: string;
  totalEvalKRW: number;
  holdingCount: number;
  color: string;
}

interface AccountsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedAccount: string;
  onSelectAccount: (accountName: string) => void;
  totalAssetKRW: number;
  hideAssetAmounts: boolean;
}

// Preset Account List (미래에셋, 키움, 메리츠, 피델리티, 업비트, 퇴직연금, 개인연금)
const ACCOUNT_PRESETS: AccountSummaryItem[] = [
  { accountName: "미래에셋", category: "위탁/주식", totalEvalKRW: 42500000, holdingCount: 8, color: "bg-[#3182F6]" },
  { accountName: "키움", category: "해외주식", totalEvalKRW: 38200000, holdingCount: 6, color: "bg-[#22C55E]" },
  { accountName: "메리츠", category: "국내주식", totalEvalKRW: 21400000, holdingCount: 4, color: "bg-[#F59E0B]" },
  { accountName: "피델리티", category: "해외펀드", totalEvalKRW: 14800000, holdingCount: 3, color: "bg-[#8B5CF6]" },
  { accountName: "업비트", category: "가상자산", totalEvalKRW: 6500000, holdingCount: 5, color: "bg-[#06B6D4]" },
  { accountName: "퇴직연금", category: "IRP/연금", totalEvalKRW: 18500000, holdingCount: 4, color: "bg-[#EC4899]" },
  { accountName: "개인연금", category: "연금저축", totalEvalKRW: 12400000, holdingCount: 3, color: "bg-[#10B981]" },
];

export const AccountsDrawer: React.FC<AccountsDrawerProps> = ({
  isOpen,
  onClose,
  selectedAccount,
  onSelectAccount,
  totalAssetKRW,
  hideAssetAmounts,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity"
          />

          {/* Left Sliding Drawer */}
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 26, stiffness: 280 }}
            className="fixed top-0 left-0 bottom-0 w-[85%] max-w-sm bg-white border-r border-[#E5E8EB] shadow-2xl z-50 flex flex-col overflow-hidden"
          >
            {/* Drawer Header */}
            <div className="p-6 bg-gradient-to-b from-[#F8F9FA] to-[#FFFFFF] border-b border-[#E5E8EB] space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-[#3182F6] flex items-center justify-center text-white font-extrabold text-base shadow-md shadow-[#3182F6]/20">
                    My
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-[#191F28]">내 계좌 관리</h3>
                    <p className="text-xs text-[#8B95A1]">연동된 증권사 & 연금 계좌 목록</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-white border border-[#E5E8EB] flex items-center justify-center text-[#8B95A1] hover:text-[#191F28]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Total Asset Summary Banner */}
              <div className="bg-white p-4 rounded-2xl border border-[#E5E8EB] shadow-2xs space-y-1">
                <div className="flex items-center justify-between text-xs text-[#8B95A1] font-bold">
                  <span className="flex items-center gap-1">
                    <Wallet className="w-3.5 h-3.5 text-[#3182F6]" />
                    전체 계좌 합계
                  </span>
                  <span className="text-[10px] bg-[#F8F9FA] text-[#3182F6] px-2 py-0.5 rounded-full border border-[#E5E8EB]">
                    7개 계좌 연동
                  </span>
                </div>
                <div className="text-xl font-black text-[#191F28]">
                  {hideAssetAmounts ? "••••••" : `₩${Math.round(totalAssetKRW || 154300000).toLocaleString("ko-KR")}`}
                </div>
              </div>
            </div>

            {/* Accounts List */}
            <div className="p-4 space-y-2 overflow-y-auto flex-1">
              <div className="flex items-center justify-between px-2 pb-1">
                <span className="text-xs font-bold text-[#8B95A1] uppercase tracking-wider">
                  증권사 & 계좌 선택
                </span>
                <button
                  onClick={() => {
                    onSelectAccount("all");
                    onClose();
                  }}
                  className="text-xs font-bold text-[#3182F6] hover:underline"
                >
                  전체보기
                </button>
              </div>

              {ACCOUNT_PRESETS.map((acc) => {
                const isSelected = selectedAccount === acc.accountName;

                return (
                  <div
                    key={acc.accountName}
                    onClick={() => {
                      onSelectAccount(acc.accountName);
                      onClose();
                    }}
                    className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between cursor-pointer group ${
                      isSelected
                        ? "bg-[#3182F6]/5 border-[#3182F6] shadow-2xs"
                        : "bg-[#F8F9FA] hover:bg-[#F1F3F5] border-[#E5E8EB]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl ${acc.color} text-white flex items-center justify-center font-bold text-xs shadow-xs`}>
                        {acc.accountName.substring(0, 2)}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-sm text-[#191F28]">{acc.accountName}</span>
                          <span className="text-[10px] font-bold bg-white text-[#8B95A1] border border-[#E5E8EB] px-1.5 py-0.2 rounded-md">
                            {acc.category}
                          </span>
                        </div>
                        <span className="text-xs text-[#8B95A1]">보유 {acc.holdingCount}개 종목</span>
                      </div>
                    </div>

                    <div className="text-right flex items-center gap-2">
                      <div>
                        <div className="font-bold text-xs text-[#191F28]">
                          {hideAssetAmounts ? "••••••" : `₩${acc.totalEvalKRW.toLocaleString("ko-KR")}`}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#8B95A1] group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-[#E5E8EB] bg-[#F8F9FA] text-center space-y-2">
              <div className="flex items-center justify-center gap-1 text-xs text-[#8B95A1]">
                <ShieldCheck className="w-4 h-4 text-[#3182F6]" />
                <span>Google Sheets DB (`mystockapp_db`) 동기화 중</span>
              </div>
              <button
                onClick={() => {
                  onSelectAccount("all");
                  onClose();
                }}
                className="w-full py-2.5 bg-white border border-[#E5E8EB] hover:bg-[#F2F4F6] text-[#191F28] font-bold rounded-xl text-xs shadow-2xs"
              >
                필터 해제 (전체 계좌 보기)
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
