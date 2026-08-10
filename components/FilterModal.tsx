"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Eye, EyeOff, Check, SlidersHorizontal, RefreshCw } from "lucide-react";

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  hideAssetAmounts: boolean;
  setHideAssetAmounts: (val: boolean) => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  categories: string[];
  onResetFilters: () => void;
}

export const FilterModal: React.FC<FilterModalProps> = ({
  isOpen,
  onClose,
  hideAssetAmounts,
  setHideAssetAmounts,
  selectedCategory,
  setSelectedCategory,
  categories,
  onResetFilters,
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
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 transition-opacity"
          />

          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 280 }}
            className="fixed bottom-0 left-0 right-0 max-w-md md:max-w-4xl mx-auto bg-white rounded-t-3xl border-t border-[#E5E8EB] shadow-2xl z-50 overflow-hidden flex flex-col max-h-[85vh]"
          >
            {/* Sheet Handle */}
            <div className="w-12 h-1.5 bg-[#E5E8EB] rounded-full mx-auto mt-3 mb-1" />

            {/* Header */}
            <div className="px-6 py-4 border-b border-[#E5E8EB] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-[#3182F6]" />
                <h3 className="text-lg font-bold text-[#191F28]">상세 포트폴리오 설정</h3>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-[#F8F9FA] border border-[#E5E8EB] flex items-center justify-center text-[#8B95A1] hover:text-[#191F28]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* 1. Asset Hiding Toggle */}
              <div className="bg-[#F8F9FA] rounded-2xl p-4 border border-[#E5E8EB] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white border border-[#E5E8EB] flex items-center justify-center text-[#3182F6]">
                    {hideAssetAmounts ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="font-bold text-[#191F28] text-sm">자산 금액 숨기기</div>
                    <div className="text-xs text-[#8B95A1]">대시보드의 모든 금액을 보안 처리합니다</div>
                  </div>
                </div>

                <button
                  onClick={() => setHideAssetAmounts(!hideAssetAmounts)}
                  className={`w-12 h-7 rounded-full p-1 transition-colors duration-200 ease-in-out ${
                    hideAssetAmounts ? "bg-[#3182F6]" : "bg-[#E5E8EB]"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out ${
                      hideAssetAmounts ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* 2. Category Filter */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-[#8B95A1] uppercase tracking-wider block">
                  자산 유형별 필터
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setSelectedCategory("all")}
                    className={`p-3 rounded-xl border text-sm font-semibold flex items-center justify-between transition-all ${
                      selectedCategory === "all"
                        ? "bg-[#3182F6]/5 border-[#3182F6] text-[#3182F6]"
                        : "bg-white border-[#E5E8EB] text-[#191F28] hover:bg-[#F8F9FA]"
                    }`}
                  >
                    <span>전체 자산</span>
                    {selectedCategory === "all" && <Check className="w-4 h-4 text-[#3182F6]" />}
                  </button>

                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`p-3 rounded-xl border text-sm font-semibold flex items-center justify-between transition-all ${
                        selectedCategory === cat
                          ? "bg-[#3182F6]/5 border-[#3182F6] text-[#3182F6]"
                          : "bg-white border-[#E5E8EB] text-[#191F28] hover:bg-[#F8F9FA]"
                      }`}
                    >
                      <span>{cat}</span>
                      {selectedCategory === cat && <Check className="w-4 h-4 text-[#3182F6]" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-[#E5E8EB] bg-[#F8F9FA] flex gap-3">
              <button
                onClick={onResetFilters}
                className="flex-1 py-3 bg-white border border-[#E5E8EB] rounded-xl text-sm font-bold text-[#6B7684] hover:bg-[#F2F4F6] flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-4 h-4" />
                초기화
              </button>
              <button
                onClick={onClose}
                className="flex-[2] py-3 bg-[#3182F6] hover:bg-[#2b71d9] text-white rounded-xl text-sm font-bold shadow-md shadow-[#3182F6]/20 transition-all"
              >
                적용 완료
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
