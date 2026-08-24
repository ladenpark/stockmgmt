"use client";

import React, { useEffect, useState } from "react";
import { BottomNav } from "@/components/BottomNav";
import { Sparkles, Plus, TrendingUp, ArrowRight } from "lucide-react";

interface WhatIfItem {
  id: number;
  ticker: string;
  name: string;
  mode: string;
  target_date: string;
  quantity: number;
  entry_price: number;
  sell_price: number;
  current_price: number;
  diff_pct: number;
  foregone_gain: number;
  tag: string;
}

export default function WhatIfPage() {
  const [mode, setMode] = useState<"DIVESTED" | "VIRTUAL">("DIVESTED");
  const [divestedItems, setDivestedItems] = useState<WhatIfItem[]>([]);
  const [virtualItems, setVirtualItems] = useState<WhatIfItem[]>([]);
  const [totalForegoneKrw, setTotalForegoneKrw] = useState(6234750);

  useEffect(() => {
    fetch("http://localhost:8000/api/v1/what-if/summary")
      .then((res) => res.json())
      .then((data) => {
        if (data.divested_items) setDivestedItems(data.divested_items);
        if (data.virtual_items) setVirtualItems(data.virtual_items);
        if (data.total_foregone_krw) setTotalForegoneKrw(data.total_foregone_krw);
      })
      .catch((err) => {
        console.warn("Using fallback whatif data", err);
        setDivestedItems([
          { id: 1, ticker: "NVDA", name: "엔비디아", mode: "DIVESTED", target_date: "2023.10", quantity: 20, entry_price: 380, sell_price: 450, current_price: 945.50, diff_pct: 110.11, foregone_gain: 9910.00, tag: "최고 기회비용" },
          { id: 2, ticker: "AAPL", name: "애플", mode: "DIVESTED", target_date: "2023.01", quantity: 30, entry_price: 130, sell_price: 145, current_price: 192.42, diff_pct: 32.70, foregone_gain: 1422.60, tag: "지속 상승" },
          { id: 3, ticker: "LCID", name: "루시드", mode: "DIVESTED", target_date: "2023.04", quantity: 300, entry_price: 12, sell_price: 8.50, current_price: 3.15, diff_pct: -62.94, foregone_gain: -1605.00, tag: "손실 회피 성공 (잘 판 주식)" }
        ]);
        setVirtualItems([
          { id: 4, ticker: "PLTR", name: "팔란티어", mode: "VIRTUAL", target_date: "2024.01.05", quantity: 100, entry_price: 16.50, sell_price: 0, current_price: 25.80, diff_pct: 56.36, foregone_gain: 930.00, tag: "가상 보유" },
          { id: 5, ticker: "MU", name: "마이크론", mode: "VIRTUAL", target_date: "2024.02.15", quantity: 50, entry_price: 85.00, sell_price: 0, current_price: 128.50, diff_pct: 51.18, foregone_gain: 2175.00, tag: "가상 보유" }
        ]);
      });
  }, []);

  const currentList = mode === "DIVESTED" ? divestedItems : virtualItems;

  return (
    <main className="min-h-screen bg-[#FAFAFA] text-[#191F28] pb-28">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-[#E5E8EB] px-4 py-3.5">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#094cb2]" />
            <h1 className="text-lg font-extrabold tracking-tight">What-If 시뮬레이션</h1>
          </div>

          {/* Toggle */}
          <div className="flex bg-[#F2F4F6] p-1 rounded-full text-xs font-bold">
            <button
              onClick={() => setMode("DIVESTED")}
              className={`px-3.5 py-1.5 rounded-full transition-all ${
                mode === "DIVESTED" ? "bg-white text-[#094cb2] shadow-xs" : "text-[#8B95A1]"
              }`}
            >
              과거 매도 종목
            </button>
            <button
              onClick={() => setMode("VIRTUAL")}
              className={`px-3.5 py-1.5 rounded-full transition-all ${
                mode === "VIRTUAL" ? "bg-white text-[#094cb2] shadow-xs" : "text-[#8B95A1]"
              }`}
            >
              가상 보유 (모의)
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 pt-4 space-y-4">
        {/* Opportunity Cost Banner */}
        <div className="bg-gradient-to-br from-white to-[#F2F7FF] rounded-3xl p-6 border border-[#E5E8EB] shadow-xs space-y-2">
          <span className="text-xs font-bold text-[#6d5e00] uppercase tracking-wider">
            {mode === "DIVESTED" ? "기회비용 & 회피손실 분석" : "가상 모의투자 수익 추적"}
          </span>
          <h2 className="text-xl font-extrabold text-[#191F28]">
            {mode === "DIVESTED" ? '"만약 팔지 않았다면?"' : '"가상으로 담아둔 종목 성과"'}
          </h2>
          <div className="pt-2 flex justify-between items-end">
            <span className="text-xs text-[#8B95A1]">총 차액 환산</span>
            <div className="text-right">
              <div className="text-3xl font-extrabold text-[#094cb2]">
                +₩{totalForegoneKrw.toLocaleString()}
              </div>
              <span className="text-xs text-[#6d5e00] font-bold flex items-center justify-end gap-1 mt-0.5">
                <TrendingUp className="w-3.5 h-3.5" /> 놓친 수익 (Foregone Gain)
              </span>
            </div>
          </div>
        </div>

        {/* Cards Grid */}
        <div className="space-y-3">
          <div className="flex justify-between items-center px-1">
            <span className="text-xs font-bold text-[#8B95A1] uppercase tracking-wider">
              {mode === "DIVESTED" ? "과거 매도 종목 비교" : "가상 보유 리스트"}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {currentList.map((item) => {
              const isGain = item.foregone_gain >= 0;
              return (
                <div key={item.id} className="p-5 bg-white rounded-3xl border border-[#E5E8EB] shadow-xs space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-[#F2F4F6] text-[#4E5968]">
                        {item.tag}
                      </span>
                      <h3 className="font-extrabold text-base text-[#191F28] mt-1">
                        {item.name} ({item.ticker})
                      </h3>
                      <span className="text-xs text-[#8B95A1]">{item.target_date} • {item.quantity}주</span>
                    </div>
                    <div className="text-right">
                      <div className={`text-base font-extrabold ${isGain ? "text-[#094cb2]" : "text-[#EF4444]"}`}>
                        {isGain ? "+" : ""}${item.foregone_gain.toLocaleString()}
                      </div>
                      <span className="text-xs font-bold text-[#8B95A1]">
                        ({isGain ? "+" : ""}{item.diff_pct}%)
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-[#F9FAFB] rounded-2xl text-xs flex justify-between items-center border border-[#E5E8EB]">
                    <div>
                      <span className="text-[#8B95A1] block">{mode === "DIVESTED" ? "매도가" : "진입가"}</span>
                      <span className="font-bold text-[#191F28]">${mode === "DIVESTED" ? item.sell_price : item.entry_price}</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-[#8B95A1]" />
                    <div className="text-right">
                      <span className="text-[#8B95A1] block">현재가</span>
                      <span className="font-bold text-[#094cb2]">${item.current_price}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <BottomNav />
    </main>
  );
}
