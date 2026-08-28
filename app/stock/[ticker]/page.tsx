"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Star, Trash2, TrendingDown, TrendingUp, X } from "lucide-react";
import { KeypadModal } from "@/components/KeypadModal";
import { BottomNav } from "@/components/BottomNav";
import { StatValue } from "@/components/ui/StatValue";
import { deleteTransaction } from "@/lib/apiClient";
import { formatCurrency } from "@/lib/utils";

interface StockDetailData {
  asset: {
    ticker: string;
    name: string;
    market: string;
    currency: "USD" | "KRW";
    current_price: number;
    change_pct: number;
    change_amount: number;
    category: string;
  };
  total_shares: number;
  total_valuation: number;
  total_principal: number;
  total_return_amount: number;
  total_return_pct: number;
  realized_profit_total: number;
  holdings: Array<{
    holding_id: number;
    account_id: number;
    brokerage_name: string;
    shares: number;
    avg_price: number;
    return_pct: number;
  }>;
  transactions: Array<{
    id: number;
    type: string;
    quantity: number;
    price: number;
    transacted_at: string;
    account_name: string;
    account_id: number;
    currency: string;
    realized_pnl: number;
  }>;
}

export default function StockDetailPage() {
  const params = useParams();
  const router = useRouter();
  const ticker = String(params.ticker || "AAPL").toUpperCase();

  const [data, setData] = useState<StockDetailData | null>(null);
  const [subTab, setSubTab] = useState<"assets" | "transactions">("assets");
  const [isKeypadOpen, setIsKeypadOpen] = useState(false);
  const [initialType, setInitialType] = useState<"BUY" | "SELL" | "DIVIDEND">("BUY");
  const [editingTransaction, setEditingTransaction] = useState<StockDetailData["transactions"][number] | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [isRealizedProfitOpen, setIsRealizedProfitOpen] = useState(false);

  const loadData = useCallback(() => {
    fetch(`/api/backend/stocks/${ticker}`)
      .then((res) => {
        if (!res.ok) throw new Error("종목 상세 시세 조회 실패");
        return res.json();
      })
      .then((resData) => {
        if (resData.asset) setData(resData);
      })
      .catch((err) => {
        console.warn("Fallback stock detail", err);
        setData((existing) => existing ?? {
          asset: {
            ticker,
            name: ticker === "NVDA" ? "엔비디아" : ticker === "TSLA" ? "테슬라" : "애플",
            market: "US",
            currency: "USD",
            current_price: ticker === "NVDA" ? 945.5 : ticker === "TSLA" ? 345.9 : 192.42,
            change_pct: ticker === "NVDA" ? 3.42 : ticker === "TSLA" ? 0.02 : 1.25,
            change_amount: ticker === "NVDA" ? 31.2 : ticker === "TSLA" ? 0.08 : 2.38,
            category: "테크놀로지",
          },
          total_shares: 80,
          total_valuation: 15393.6,
          total_principal: 12300.0,
          total_return_amount: 3093.6,
          total_return_pct: 25.15,
          realized_profit_total: 3200.0,
          holdings: [
            { holding_id: 1, account_id: 1, brokerage_name: "Fidelity Investments", shares: 50, avg_price: 150, return_pct: 28.28 },
            { holding_id: 2, account_id: 2, brokerage_name: "토스증권", shares: 30, avg_price: 160, return_pct: 20.26 },
          ],
          transactions: [
            { id: 1, type: "BUY", quantity: 50, price: 150, transacted_at: "2024-02-10", account_name: "Fidelity", account_id: 1, currency: "USD", realized_pnl: 0 },
            { id: 2, type: "BUY", quantity: 30, price: 160, transacted_at: "2024-03-15", account_name: "토스증권", account_id: 2, currency: "USD", realized_pnl: 0 },
            { id: 3, type: "SELL", quantity: 20, price: 185, transacted_at: "2024-05-01", account_name: "Fidelity", account_id: 1, currency: "USD", realized_pnl: 700 },
          ],
        });
      });
  }, [ticker]);

  useEffect(() => {
    void loadData();
    const interval = window.setInterval(() => void loadData(), 1000);
    return () => window.clearInterval(interval);
  }, [loadData]);

  const openNewTransaction = (type: "BUY" | "SELL") => {
    setEditingTransaction(null);
    setInitialType(type);
    setIsKeypadOpen(true);
  };

  const handleDeleteTransaction = async (id: number) => {
    if (!window.confirm("이 체결 내역을 삭제할까요? 보유 수량과 평단도 다시 계산됩니다.")) return;
    try {
      await deleteTransaction(id);
      loadData();
    } catch (error: any) {
      alert(error.message || "체결 삭제에 실패했습니다.");
    }
  };

  if (!data) {
    return <div className="p-8 text-center text-xs text-[#94A3B8]">로딩 중...</div>;
  }

  const isPos = data.asset.change_pct >= 0;
  const formatAssetMoney = (amount: number) =>
    `${data.asset.currency === "KRW" ? "₩" : "$"}${amount.toLocaleString(undefined, {
      maximumFractionDigits: data.asset.currency === "KRW" ? 0 : 2,
    })}`;

  const selectedAccount = data.holdings.find((holding) => holding.account_id === selectedAccountId);
  const visibleTransactions = selectedAccountId
    ? data.transactions.filter((transaction) => transaction.account_id === selectedAccountId)
    : data.transactions;
  const realizedTransactions = data.transactions.filter((transaction) => transaction.type === "SELL");

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-[#0F172A] pb-24 selection:bg-[#1366FF]/20 selection:text-[#1366FF]">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#E2E8F0] px-4 md:px-6 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-xl bg-[#F1F5F9] hover:bg-[#E2E8F0] flex items-center justify-center text-[#0F172A] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">종목 상세 정보</span>
          <button
            onClick={() => alert("관심 종목으로 등록되었습니다.")}
            className="w-9 h-9 rounded-xl bg-[#F1F5F9] hover:bg-[#E2E8F0] flex items-center justify-center text-[#64748B] hover:text-[#F59E0B] transition-colors"
          >
            <Star className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-4xl mx-auto px-4 md:px-6 pt-4 space-y-4">
        {/* Profile Card */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-5 md:p-6 text-center space-y-2">
          <span className="text-[11px] font-bold text-[#1366FF] px-2.5 py-0.5 rounded-full bg-[#EBF2FF]">
            {data.asset.category}
          </span>
          <h1 className="text-2xl md:text-3xl font-black text-[#0F172A] mt-1">
            {data.asset.name}{" "}
            <span className="text-base font-semibold text-[#64748B] uppercase">({data.asset.ticker})</span>
          </h1>
          <div className="text-3xl md:text-4xl font-extrabold text-[#0F172A] tracking-tight">
            ${data.asset.current_price.toLocaleString()}
          </div>
          <div className="pt-1">
            <StatValue
              amount={data.asset.change_amount}
              percent={data.asset.change_pct}
              currency="USD"
              size="md"
            />
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-3 gap-2 pt-4 mt-4 border-t border-[#F1F5F9]">
            <div>
              <span className="text-[11px] font-medium text-[#64748B] block">총 평가금</span>
              <div className="text-base md:text-lg font-bold text-[#0F172A] mt-0.5">
                ${data.total_valuation.toLocaleString()}
              </div>
            </div>
            <div className="border-x border-[#F1F5F9]">
              <span className="text-[11px] font-medium text-[#64748B] block">매입 원금</span>
              <div className="text-base md:text-lg font-bold text-[#64748B] mt-0.5">
                ${data.total_principal.toLocaleString()}
              </div>
            </div>
            <div>
              <span className="text-[11px] font-medium text-[#64748B] block">총 수익률</span>
              <div className="mt-0.5">
                <StatValue
                  amount={data.total_return_amount}
                  percent={data.total_return_pct}
                  currency="USD"
                  size="sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Realized Profit Banner */}
        <div
          onClick={() => setIsRealizedProfitOpen(true)}
          className="p-4 bg-white rounded-2xl border border-[#E2E8F0] shadow-xs flex justify-between items-center cursor-pointer hover:bg-[#F8FAFC] transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-[#16A34A]" />
            <div>
              <span className="text-xs font-bold text-[#0F172A] block">누적 확정 실현손익</span>
              <span className="text-[11px] text-[#64748B]">매도 체결 기준</span>
            </div>
          </div>
          <StatValue amount={data.realized_profit_total} currency="USD" size="md" />
        </div>

        {/* Sub-Tabs: Assets & Transactions */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-4 space-y-3">
          <div className="flex gap-2 p-1 bg-[#F1F5F9] rounded-xl">
            <button
              onClick={() => setSubTab("assets")}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                subTab === "assets" ? "bg-white text-[#1366FF] shadow-xs" : "text-[#64748B]"
              }`}
            >
              계좌별 보유 ({data.holdings.length})
            </button>
            <button
              onClick={() => setSubTab("transactions")}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                subTab === "transactions" ? "bg-white text-[#1366FF] shadow-xs" : "text-[#64748B]"
              }`}
            >
              체결 이력 ({visibleTransactions.length})
            </button>
          </div>

          {subTab === "assets" ? (
            <div className="space-y-2">
              {data.holdings.map((h) => (
                <div
                  key={h.holding_id}
                  className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] flex justify-between items-center text-xs"
                >
                  <div>
                    <span className="font-bold text-[#0F172A] block">{h.brokerage_name}</span>
                    <span className="text-[#64748B]">
                      {h.shares}주 · 평단 ${h.avg_price.toLocaleString()}
                    </span>
                  </div>
                  <StatValue
                    amount={(data.asset.current_price - h.avg_price) * h.shares}
                    percent={h.return_pct}
                    currency="USD"
                    size="sm"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {visibleTransactions.map((t) => (
                <div
                  key={t.id}
                  onClick={() => {
                    setEditingTransaction(t);
                    setIsKeypadOpen(true);
                  }}
                  className="p-3 bg-[#F8FAFC] hover:bg-[#F1F5F9] rounded-xl border border-[#E2E8F0] flex justify-between items-center cursor-pointer transition-colors text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                        t.type === "BUY"
                          ? "bg-blue-50 text-[#1366FF] border border-blue-100"
                          : t.type === "SELL"
                          ? "bg-red-50 text-[#EF4444] border border-red-100"
                          : "bg-amber-50 text-amber-600 border border-amber-100"
                      }`}
                    >
                      {t.type === "BUY" ? "매수" : t.type === "SELL" ? "매도" : "배당"}
                    </span>
                    <div>
                      <span className="font-bold text-[#0F172A]">{t.account_name}</span>
                      <span className="text-[11px] text-[#64748B] block">{t.transacted_at}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <span className="font-bold text-[#0F172A] block">{t.quantity}주</span>
                      <span className="text-[11px] text-[#64748B]">{formatAssetMoney(t.price)}</span>
                    </div>
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleDeleteTransaction(t.id);
                      }}
                      aria-label="체결 삭제"
                      className="p-1.5 text-[#94A3B8] hover:text-[#EF4444] rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Floating Bottom Bar (Sell / Buy) */}
        <div className="pt-2 flex gap-3">
          <button
            onClick={() => openNewTransaction("SELL")}
            className="flex-1 py-3 rounded-xl bg-red-50 border border-red-100 text-[#EF4444] font-bold text-xs shadow-xs hover:bg-red-100 transition-colors"
          >
            매도 (Sell)
          </button>
          <button
            onClick={() => openNewTransaction("BUY")}
            className="flex-1 py-3 rounded-xl bg-[#1366FF] text-white font-bold text-xs shadow-xs hover:bg-[#0D54DB] transition-colors"
          >
            매수 (Buy)
          </button>
        </div>
      </div>

      {/* Realized Profit Modal */}
      {isRealizedProfitOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4"
          onClick={() => setIsRealizedProfitOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-5 border border-[#E2E8F0] shadow-modal space-y-3 max-h-[80vh] overflow-y-auto"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-[#F1F5F9] pb-3">
              <div>
                <h2 className="text-base font-bold text-[#0F172A]">확정 실현손익 내역</h2>
                <p className="text-xs text-[#64748B]">
                  매도 체결 기준 · 합계 {formatAssetMoney(data.realized_profit_total)}
                </p>
              </div>
              <button
                onClick={() => setIsRealizedProfitOpen(false)}
                className="p-1 rounded-lg text-[#64748B] hover:bg-[#F1F5F9]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2">
              {realizedTransactions.length === 0 ? (
                <p className="py-8 text-center text-xs text-[#94A3B8]">확정 실현손익이 있는 매도 거래가 없습니다.</p>
              ) : (
                realizedTransactions.map((transaction) => {
                  const pnl = Number(transaction.realized_pnl || 0);
                  return (
                    <div
                      key={transaction.id}
                      className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-[#0F172A] block">
                          {transaction.account_name} · 매도 {transaction.quantity.toLocaleString()}주
                        </span>
                        <span className="text-[11px] text-[#64748B]">
                          {String(transaction.transacted_at).slice(0, 10)} · 체결가 {formatAssetMoney(transaction.price)}
                        </span>
                      </div>
                      <StatValue amount={pnl} currency="USD" size="sm" />
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Keypad Modal */}
      <KeypadModal
        isOpen={isKeypadOpen}
        onClose={() => setIsKeypadOpen(false)}
        ticker={data.asset.ticker}
        stockName={data.asset.name}
        defaultPrice={data.asset.current_price}
        currency={data.asset.currency}
        initialType={initialType}
        defaultAccountId={selectedAccountId}
        transaction={editingTransaction}
        onSuccess={loadData}
      />

      <BottomNav />
    </main>
  );
}
