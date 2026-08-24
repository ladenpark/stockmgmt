"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Star, TrendingUp, TrendingDown, CheckCircle2 } from "lucide-react";
import { KeypadModal } from "@/components/KeypadModal";

interface StockDetailData {
  asset: {
    ticker: string;
    name: string;
    market: string;
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
  }>;
}

export default function StockDetailPage() {
  const params = useParams();
  const router = useRouter();
  const ticker = String(params.ticker || "AAPL").toUpperCase();

  const [data, setData] = useState<StockDetailData | null>(null);
  const [subTab, setSubTab] = useState<"assets" | "transactions">("assets");
  const [isKeypadOpen, setIsKeypadOpen] = useState(false);

  const loadData = () => {
    fetch(`http://localhost:8000/api/v1/stocks/${ticker}`)
      .then((res) => res.json())
      .then((resData) => {
        if (resData.asset) setData(resData);
      })
      .catch((err) => {
        console.warn("Fallback stock detail", err);
        setData({
          asset: {
            ticker,
            name: ticker === "NVDA" ? "엔비디아" : "애플",
            market: "US",
            current_price: ticker === "NVDA" ? 945.50 : 192.42,
            change_pct: ticker === "NVDA" ? 3.42 : 1.25,
            change_amount: ticker === "NVDA" ? 31.20 : 2.38,
            category: "테크놀로지"
          },
          total_shares: 80,
          total_valuation: 15393.60,
          total_principal: 12300.00,
          total_return_amount: 3093.60,
          total_return_pct: 25.15,
          realized_profit_total: 3200.00,
          holdings: [
            { holding_id: 1, brokerage_name: "Fidelity Investments", shares: 50, avg_price: 150, return_pct: 28.28 },
            { holding_id: 2, brokerage_name: "토스증권", shares: 30, avg_price: 160, return_pct: 20.26 }
          ],
          transactions: [
            { id: 1, type: "BUY", quantity: 50, price: 150, transacted_at: "2024-02-10", account_name: "Fidelity" },
            { id: 2, type: "BUY", quantity: 30, price: 160, transacted_at: "2024-03-15", account_name: "토스증권" },
            { id: 3, type: "SELL", quantity: 20, price: 185, transacted_at: "2024-05-01", account_name: "Fidelity" }
          ]
        });
      });
  };

  useEffect(() => {
    loadData();
  }, [ticker]);

  if (!data) {
    return <div className="p-8 text-center text-xs text-[#8B95A1]">로딩 중...</div>;
  }

  const isPos = data.asset.change_pct >= 0;

  return (
    <main className="min-h-screen bg-[#FAFAFA] text-[#191F28] pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-[#E5E8EB] px-4 py-3.5">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button onClick={() => router.back()} className="p-1 text-[#4E5968] hover:text-[#191F28]">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <span className="text-xs font-bold text-[#8B95A1] uppercase tracking-wider">종목 상세 정보</span>
          <button onClick={() => alert("관심 종목으로 등록되었습니다.")} className="p-1 text-[#8B95A1] hover:text-[#094cb2]">
            <Star className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-4xl mx-auto px-4 pt-4 space-y-5">
        {/* Profile */}
        <div className="text-center space-y-1">
          <span className="text-[11px] font-bold text-[#8B95A1] px-3 py-0.5 rounded-full bg-[#F2F4F6]">
            {data.asset.category}
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#191F28] mt-1">
            {data.asset.name} ({data.asset.ticker})
          </h1>
          <div className="text-3xl md:text-4xl font-extrabold text-[#191F28] mt-1">
            ${data.asset.current_price.toLocaleString()}
          </div>
          <div className={`text-sm font-bold flex items-center justify-center gap-1 ${isPos ? "text-[#094cb2]" : "text-[#EF4444]"}`}>
            {isPos ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {isPos ? "+" : ""}{data.asset.change_pct}% (${isPos ? "+" : ""}{data.asset.change_amount})
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-3 gap-2 bg-white rounded-3xl p-5 border border-[#E5E8EB] shadow-xs text-center">
          <div>
            <span className="text-[11px] font-bold text-[#8B95A1] block">총 평가금</span>
            <div className="text-lg md:text-xl font-extrabold text-[#191F28] mt-1">${data.total_valuation.toLocaleString()}</div>
          </div>
          <div className="border-x border-[#E5E8EB]">
            <span className="text-[11px] font-bold text-[#8B95A1] block">매입 원금</span>
            <div className="text-lg md:text-xl font-extrabold text-[#8B95A1] mt-1">${data.total_principal.toLocaleString()}</div>
          </div>
          <div>
            <span className="text-[11px] font-bold text-[#8B95A1] block">총 수익률</span>
            <div className="text-lg md:text-xl font-extrabold text-[#094cb2] mt-1">+{data.total_return_pct}%</div>
          </div>
        </div>

        {/* Realized Profit Banner */}
        <div className="p-4 bg-white rounded-2xl border border-[#E5E8EB] flex justify-between items-center shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-[#6d5e00]" />
            <span className="text-xs font-bold text-[#191F28]">누적 확정 실현손익</span>
          </div>
          <span className="text-base font-extrabold text-[#6d5e00]">${data.realized_profit_total.toLocaleString()}</span>
        </div>

        {/* Sub-Tabs: Holdings vs Transactions */}
        <div className="space-y-3">
          <div className="flex border-b border-[#E5E8EB] text-xs font-bold">
            <button
              onClick={() => setSubTab("assets")}
              className={`flex-1 pb-3 text-center transition-all ${
                subTab === "assets" ? "border-b-2 border-[#094cb2] text-[#094cb2]" : "text-[#8B95A1]"
              }`}
            >
              자산 분할 보유 ({data.holdings.length})
            </button>
            <button
              onClick={() => setSubTab("transactions")}
              className={`flex-1 pb-3 text-center transition-all ${
                subTab === "transactions" ? "border-b-2 border-[#094cb2] text-[#094cb2]" : "text-[#8B95A1]"
              }`}
            >
              체결 이력 타임라인 ({data.transactions.length})
            </button>
          </div>

          {subTab === "assets" ? (
            <div className="space-y-2">
              {data.holdings.map((h, i) => (
                <div key={i} className="p-4 bg-white rounded-2xl border border-[#E5E8EB] flex justify-between items-center">
                  <div>
                    <div className="font-bold text-sm text-[#191F28]">{h.brokerage_name}</div>
                    <span className="text-xs text-[#8B95A1]">{h.shares}주 • 평단 ${h.avg_price}</span>
                  </div>
                  <div className="text-right font-extrabold text-sm text-[#094cb2]">
                    +{h.return_pct}%
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {data.transactions.map((t, i) => (
                <div key={i} className="p-4 bg-white rounded-2xl border border-[#E5E8EB] flex justify-between items-center">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
                        t.type === "BUY" ? "bg-[#D9E2FF] text-[#094cb2]" : "bg-[#FFDAD6] text-[#EF4444]"
                      }`}>
                        {t.type === "BUY" ? "매수" : "매도"}
                      </span>
                      <span className="font-bold text-sm text-[#191F28]">{t.account_name}</span>
                    </div>
                    <span className="text-xs text-[#8B95A1] mt-0.5 block">{t.transacted_at}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-extrabold text-sm text-[#191F28]">{t.quantity}주</div>
                    <span className="text-xs text-[#8B95A1]">${t.price}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Floating Bottom Bar (Sell / Buy) */}
        <div className="pt-3 flex gap-3">
          <button
            onClick={() => setIsKeypadOpen(true)}
            className="flex-1 py-3.5 rounded-2xl bg-[#FFDAD6] text-[#EF4444] font-bold text-xs shadow-xs hover:bg-[#FFDAD6]/80"
          >
            매도 (Sell)
          </button>
          <button
            onClick={() => setIsKeypadOpen(true)}
            className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-[#094cb2] to-[#3366cc] text-white font-bold text-xs shadow-md hover:opacity-95"
          >
            매수 (Buy)
          </button>
        </div>
      </div>

      <KeypadModal
        isOpen={isKeypadOpen}
        onClose={() => setIsKeypadOpen(false)}
        ticker={data.asset.ticker}
        stockName={data.asset.name}
        defaultPrice={data.asset.current_price}
        onSuccess={loadData}
      />
    </main>
  );
}
