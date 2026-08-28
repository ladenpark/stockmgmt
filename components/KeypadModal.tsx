"use client";

import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Delete, Check } from "lucide-react";
import { createTransaction, updateTransaction } from "@/lib/apiClient";

interface EditableTransaction {
  id: number;
  account_id: number;
  type: string;
  quantity: number;
  price: number;
  currency: string;
  transacted_at?: string;
}

interface AccountOption {
  id: number;
  name: string;
}

interface KeypadModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticker?: string;
  stockName?: string;
  defaultPrice?: number;
  currency?: "USD" | "KRW";
  initialType?: "BUY" | "SELL" | "DIVIDEND";
  defaultAccountId?: number | null;
  transaction?: EditableTransaction | null;
  onSuccess?: () => void;
}

export const KeypadModal: React.FC<KeypadModalProps> = ({
  isOpen,
  onClose,
  ticker = "AAPL",
  stockName = "애플",
  defaultPrice = 192.42,
  currency = "USD",
  initialType = "BUY",
  defaultAccountId = null,
  transaction = null,
  onSuccess,
}) => {
  const [txType, setTxType] = useState<"BUY" | "SELL" | "DIVIDEND">("BUY");
  const [activeField, setActiveField] = useState<"quantity" | "price">("quantity");
  const [quantity, setQuantity] = useState("10");
  const [price, setPrice] = useState(String(defaultPrice));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [accountId, setAccountId] = useState<number | null>(null);
  const [transactedAt, setTransactedAt] = useState(new Date().toISOString().slice(0, 10));

  const prevIsOpenRef = useRef(false);

  // 1. Initialize form only when modal opens or target transaction changes (preventing 1-sec polling resets)
  useEffect(() => {
    const justOpened = isOpen && !prevIsOpenRef.current;
    prevIsOpenRef.current = isOpen;

    if (!isOpen) return;

    if (transaction) {
      setTxType((transaction.type as "BUY" | "SELL" | "DIVIDEND") || "BUY");
      setQuantity(String(transaction.quantity));
      setPrice(String(transaction.price));
      setAccountId(transaction.account_id);
      setTransactedAt(
        transaction.transacted_at
          ? String(transaction.transacted_at).slice(0, 10)
          : new Date().toISOString().slice(0, 10)
      );
    } else if (justOpened) {
      setTxType(initialType);
      setQuantity("10");
      setPrice(String(defaultPrice || 100));
      setAccountId(defaultAccountId);
      setTransactedAt(new Date().toISOString().slice(0, 10));
    }
  }, [isOpen, transaction, initialType]);

  // 2. Fetch Accounts list & safely initialize accountId
  useEffect(() => {
    if (!isOpen) return;

    fetch("/api/backend/portfolio/accounts", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : []))
      .then((items: AccountOption[]) => {
        setAccounts(items);
        setAccountId((current) => {
          if (current && items.some((item) => item.id === current)) return current;
          if (defaultAccountId && items.some((item) => item.id === defaultAccountId)) return defaultAccountId;
          return items[0]?.id ?? null;
        });
      })
      .catch(() => setAccounts([]));
  }, [isOpen, defaultAccountId]);

  // Clean numeric sanitization
  const rawQty = String(quantity).replace(/[^0-9.]/g, "");
  const rawPrice = String(price).replace(/[^0-9.]/g, "");
  const numQty = parseFloat(rawQty) || 0;
  const numPrice = parseFloat(rawPrice) || 0;
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
    const effectiveAccountId = accountId || (accounts.length > 0 ? accounts[0].id : null);

    if (numQty <= 0 || numPrice <= 0 || !effectiveAccountId) {
      alert("계좌, 수량, 단가를 올바르게 입력해주세요.");
      return;
    }
    setIsSubmitting(true);
    try {
      if (transaction) {
        await updateTransaction(transaction.id, {
          account_id: effectiveAccountId,
          type: txType,
          quantity: numQty,
          price: numPrice,
          currency,
          transacted_at: transactedAt,
        });
      } else {
        await createTransaction({
          account_id: effectiveAccountId,
          ticker,
          type: txType,
          quantity: numQty,
          price: numPrice,
          currency,
          transacted_at: transactedAt,
        });
      }
      alert(`${stockName} 체결 내역이 ${transaction ? "수정" : "등록"}되었습니다!`);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      alert(`거래 ${transaction ? "수정" : "등록"} 실패: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-xs">
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 28, stiffness: 300 }}
          className="relative z-10 w-full max-w-lg bg-white rounded-t-3xl p-6 shadow-modal space-y-4 max-h-[92vh] overflow-y-auto"
        >
          {/* Top Handle */}
          <div className="w-10 h-1 bg-[#E2E8F0] rounded-full mx-auto" />

          {/* Header */}
          <div className="flex justify-between items-center pb-2 border-b border-[#F1F5F9]">
            <div>
              <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                거래 체결 {transaction ? "수정" : "등록"}
              </span>
              <h3 className="font-bold text-base md:text-lg text-[#0F172A]">
                {stockName} ({ticker})
              </h3>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-xl bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#64748B]">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Account Selector */}
          <label className="block text-xs font-bold text-[#0F172A]">
            거래 계좌
            <select
              value={accountId ?? (accounts[0]?.id || "")}
              onChange={(event) => setAccountId(Number(event.target.value))}
              className="mt-1.5 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2.5 text-sm text-[#0F172A] focus:outline-none focus:border-[#1366FF]"
            >
              {accounts.length === 0 ? (
                <option value="">등록된 계좌가 없습니다</option>
              ) : (
                accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))
              )}
            </select>
          </label>

          {/* Date Selector */}
          <label className="block text-xs font-bold text-[#0F172A]">
            거래일
            <input
              type="date"
              value={transactedAt}
              onChange={(event) => setTransactedAt(event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2.5 text-sm text-[#0F172A] focus:outline-none focus:border-[#1366FF]"
            />
          </label>

          {/* Buy / Sell / Dividend Switcher */}
          <div className="flex bg-[#F1F5F9] p-1 rounded-xl text-xs font-bold gap-1 border border-[#E2E8F0]">
            <button
              onClick={() => setTxType("BUY")}
              className={`flex-1 py-2 rounded-lg transition-all ${
                txType === "BUY" ? "bg-[#1366FF] text-white shadow-xs" : "text-[#64748B] hover:text-[#0F172A]"
              }`}
            >
              매수 (Buy)
            </button>
            <button
              onClick={() => setTxType("SELL")}
              className={`flex-1 py-2 rounded-lg transition-all ${
                txType === "SELL" ? "bg-[#EF4444] text-white shadow-xs" : "text-[#64748B] hover:text-[#0F172A]"
              }`}
            >
              매도 (Sell)
            </button>
            <button
              onClick={() => setTxType("DIVIDEND")}
              className={`flex-1 py-2 rounded-lg transition-all ${
                txType === "DIVIDEND" ? "bg-[#F59E0B] text-white shadow-xs" : "text-[#64748B] hover:text-[#0F172A]"
              }`}
            >
              배당금 (Dividend)
            </button>
          </div>

          {/* Input Values Display */}
          <div className="grid grid-cols-2 gap-2.5">
            <div
              onClick={() => setActiveField("quantity")}
              className={`p-3.5 rounded-xl cursor-pointer transition-all border ${
                activeField === "quantity"
                  ? "border-[#1366FF] bg-[#EBF2FF] ring-2 ring-[#1366FF]/20"
                  : "border-[#E2E8F0] bg-[#F8FAFC]"
              }`}
            >
              <span className="text-[11px] font-bold text-[#64748B] block">체결 수량 (주)</span>
              <div className="text-xl md:text-2xl font-bold text-[#0F172A] mt-0.5">{quantity}</div>
            </div>

            <div
              onClick={() => setActiveField("price")}
              className={`p-3.5 rounded-xl cursor-pointer transition-all border ${
                activeField === "price"
                  ? "border-[#1366FF] bg-[#EBF2FF] ring-2 ring-[#1366FF]/20"
                  : "border-[#E2E8F0] bg-[#F8FAFC]"
              }`}
            >
              <span className="text-[11px] font-bold text-[#64748B] block">
                체결 단가 ({currency === "KRW" ? "₩" : "$"})
              </span>
              <div className="text-xl md:text-2xl font-bold text-[#0F172A] mt-0.5">
                {currency === "KRW" ? "₩" : "$"}
                {price}
              </div>
            </div>

            <div className="col-span-2 p-3.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] flex justify-between items-center">
              <div>
                <span className="text-[11px] font-bold text-[#64748B] block">총 체결 예상액</span>
                <div className="text-lg font-bold text-[#1366FF]">
                  {currency === "KRW" ? "₩" : "$"}
                  {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <span className="text-xs font-semibold text-[#64748B]">
                {currency === "KRW" ? "원화 기준" : `≈ ₩${Math.round(totalAmount * 1385.5).toLocaleString()}`}
              </span>
            </div>
          </div>

          {/* Virtual Numeric Keypad */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "DEL"].map((k) => (
              <button
                key={k}
                onClick={() => handleKeyPress(k)}
                className="py-3 rounded-xl bg-[#F1F5F9] font-bold text-lg text-[#0F172A] hover:bg-[#E2E8F0] active:scale-95 transition-all flex items-center justify-center border border-[#E2E8F0]"
              >
                {k === "DEL" ? <Delete className="w-5 h-5 text-[#EF4444]" /> : k}
              </button>
            ))}
          </div>

          {/* Submit Button */}
          <button
            disabled={isSubmitting}
            onClick={handleSubmit}
            className="w-full py-3.5 rounded-xl bg-[#1366FF] hover:bg-[#0D54DB] text-white font-bold text-sm shadow-xs active:scale-98 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? "체결 처리 중..." : transaction ? "체결 내역 수정하기" : "체결 내역 등록하기"}
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
