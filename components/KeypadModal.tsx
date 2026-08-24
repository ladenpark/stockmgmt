"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Delete, Check } from "lucide-react";
import { createTransaction } from "@/lib/apiClient";

interface KeypadModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticker?: string;
  stockName?: string;
  defaultPrice?: number;
  onSuccess?: () => void;
}

export const KeypadModal: React.FC<KeypadModalProps> = ({
  isOpen,
  onClose,
  ticker = "AAPL",
  stockName = "애플",
  defaultPrice = 192.42,
  onSuccess
}) => {
  const [txType, setTxType] = useState<"BUY" | "SELL" | "DIVIDEND">("BUY");
  const [activeField, setActiveField] = useState<"quantity" | "price">("quantity");
  const [quantity, setQuantity] = useState("10");
  const [price, setPrice] = useState(String(defaultPrice));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const numQty = parseFloat(quantity) || 0;
  const numPrice = parseFloat(price) || 0;
  const totalAmount = numQty * numPrice;

  const handleKeyPress = (val: string) => {
    const currentVal = activeField === "quantity" ? quantity : price;
    const setter = activeField === "quantity" ? setQuantity : setPrice;

    if (val === "DEL") {
      if (currentVal.length <= 1) {
        setter("0");
      } else {
        setter(currentVal.slice(0, -1));
      }
    } else if (val === ".") {
      if (!currentVal.includes(".")) {
        setter(currentVal + ".");
      }
    } else {
      if (currentVal === "0") {
        setter(val);
      } else {
        setter(currentVal + val);
      }
    }
  };

  const handleSubmit = async () => {
    if (numQty <= 0 || numPrice <= 0) {
      alert("수량과 단가를 올바르게 입력해주세요.");
      return;
    }
    setIsSubmitting(true);
    try {
      await createTransaction({
        account_id: 1,
        ticker,
        type: txType,
        quantity: numQty,
        price: numPrice,
        currency: "USD"
      });
      alert(`${stockName} ${txType === "BUY" ? "매수" : txType === "SELL" ? "매도" : "배당"} 체결이 등록되었습니다!`);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      alert("거래 등록 실패: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 28, stiffness: 300 }}
          className="relative z-10 w-full max-w-lg bg-white rounded-t-[32px] p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto"
        >
          {/* Top Handle */}
          <div className="w-10 h-1 bg-[#E5E8EB] rounded-full mx-auto" />

          {/* Header */}
          <div className="flex justify-between items-center pb-2 border-b border-[#E5E8EB]">
            <div>
              <span className="text-xs font-bold text-[#8B95A1] uppercase tracking-wider">거래 체결 등록</span>
              <h3 className="font-bold text-lg text-[#191F28]">{stockName} ({ticker})</h3>
            </div>
            <button onClick={onClose} className="p-2 text-[#8B95A1] hover:text-[#191F28]">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Buy / Sell / Dividend Switcher */}
          <div className="flex bg-[#F2F4F6] p-1 rounded-full text-xs font-bold">
            <button
              onClick={() => setTxType("BUY")}
              className={`flex-1 py-2 rounded-full transition-all ${
                txType === "BUY" ? "bg-[#094cb2] text-white shadow-xs" : "text-[#6B7684]"
              }`}
            >
              매수 (Buy)
            </button>
            <button
              onClick={() => setTxType("SELL")}
              className={`flex-1 py-2 rounded-full transition-all ${
                txType === "SELL" ? "bg-[#EF4444] text-white shadow-xs" : "text-[#6B7684]"
              }`}
            >
              매도 (Sell)
            </button>
            <button
              onClick={() => setTxType("DIVIDEND")}
              className={`flex-1 py-2 rounded-full transition-all ${
                txType === "DIVIDEND" ? "bg-[#6d5e00] text-white shadow-xs" : "text-[#6B7684]"
              }`}
            >
              배당금 (Dividend)
            </button>
          </div>

          {/* Input Values Display */}
          <div className="grid grid-cols-2 gap-2.5">
            <div
              onClick={() => setActiveField("quantity")}
              className={`p-3.5 rounded-2xl cursor-pointer transition-all border ${
                activeField === "quantity" ? "border-[#094cb2] bg-[#F2F7FF] ring-2 ring-[#094cb2]/20" : "border-[#E5E8EB] bg-[#F9FAFB]"
              }`}
            >
              <span className="text-[11px] font-bold text-[#8B95A1] block">체결 수량 (주)</span>
              <div className="text-2xl font-bold text-[#191F28] mt-0.5">{quantity}</div>
            </div>

            <div
              onClick={() => setActiveField("price")}
              className={`p-3.5 rounded-2xl cursor-pointer transition-all border ${
                activeField === "price" ? "border-[#094cb2] bg-[#F2F7FF] ring-2 ring-[#094cb2]/20" : "border-[#E5E8EB] bg-[#F9FAFB]"
              }`}
            >
              <span className="text-[11px] font-bold text-[#8B95A1] block">체결 단가 ($)</span>
              <div className="text-2xl font-bold text-[#191F28] mt-0.5">${price}</div>
            </div>

            <div className="col-span-2 p-3.5 bg-[#F9FAFB] rounded-2xl border border-[#E5E8EB] flex justify-between items-center">
              <div>
                <span className="text-[11px] font-bold text-[#8B95A1] block">총 체결 예상액</span>
                <div className="text-xl font-bold text-[#094cb2]">${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>
              <span className="text-xs font-semibold text-[#8B95A1]">
                ≈ ₩{Math.round(totalAmount * 1385.50).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Virtual Numeric Keypad */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "DEL"].map((k) => (
              <button
                key={k}
                onClick={() => handleKeyPress(k)}
                className="py-3.5 rounded-2xl bg-[#F2F4F6] font-bold text-xl text-[#191F28] hover:bg-[#E5E8EB] active:scale-95 transition-all flex items-center justify-center"
              >
                {k === "DEL" ? <Delete className="w-6 h-6 text-[#EF4444]" /> : k}
              </button>
            ))}
          </div>

          {/* Submit Button */}
          <button
            disabled={isSubmitting}
            onClick={handleSubmit}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#094cb2] to-[#3366cc] text-white font-bold text-sm shadow-md hover:opacity-95 active:scale-98 transition-all flex items-center justify-center gap-2"
          >
            {isSubmitting ? "체결 처리 중..." : "체결 내역 등록하기"}
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
