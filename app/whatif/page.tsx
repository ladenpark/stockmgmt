"use client";

import React, { useEffect, useState } from "react";
import { BottomNav } from "@/components/BottomNav";
import { Sparkles, Plus, TrendingUp, ArrowRight, Trash2, X } from "lucide-react";

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
  const [totalForegoneKrw, setTotalForegoneKrw] = useState(0);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [ticker, setTicker] = useState("");
  const [quantity, setQuantity] = useState("");
  const [entryPrice, setEntryPrice] = useState("");
  const [sellPrice, setSellPrice] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const loadData = () => {
    fetch("/api/backend/what-if/summary")
      .then((res) => res.json())
      .then((data) => {
        setDivestedItems(data.divested_items || []);
        setVirtualItems(data.virtual_items || []);
        setTotalForegoneKrw(data.total_foregone_krw || 0);
      })
      .catch((err) => console.warn("What-If 데이터 로드 실패", err));
  };

  useEffect(() => {
    loadData();
  }, []);

  const submitItem = async () => {
    if (!ticker.trim() || Number(quantity) <= 0 || Number(entryPrice) <= 0 || (mode === "DIVESTED" && Number(sellPrice) <= 0)) return;
    setIsSaving(true);
    try {
      const response = await fetch("/api/backend/what-if", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ticker: ticker.trim().toUpperCase(), target_date: new Date().toISOString().slice(0, 10), quantity: Number(quantity), entry_price: Number(entryPrice), sell_price: mode === "DIVESTED" ? Number(sellPrice) : 0, mode }) });
      if (!response.ok) throw new Error();
      setIsAddOpen(false); setTicker(""); setQuantity(""); setEntryPrice(""); setSellPrice(""); loadData();
    } catch { alert("What-If 항목을 저장하지 못했습니다."); }
    finally { setIsSaving(false); }
  };

  const removeItem = async (id: number) => {
    if (!window.confirm("이 항목을 삭제할까요?")) return;
    const response = await fetch(`/api/backend/what-if/${id}`, { method: "DELETE" });
    if (response.ok) loadData(); else alert("항목 삭제에 실패했습니다.");
  };

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
                    <button onClick={() => removeItem(item.id)} aria-label="What-If 항목 삭제" className="ml-1 p-1 text-[#8B95A1] hover:text-[#EF4444]"><Trash2 className="w-4 h-4" /></button>
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

      <button onClick={() => setIsAddOpen(true)} aria-label="What-If 항목 추가" className="fixed bottom-24 right-5 z-20 rounded-full bg-[#094cb2] p-4 text-white shadow-lg"><Plus className="w-5 h-5" /></button>
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg space-y-3 rounded-3xl bg-white p-6">
            <div className="flex items-center justify-between"><h2 className="font-bold">{mode === "DIVESTED" ? "과거 매도 종목" : "가상 보유 종목"} 추가</h2><button onClick={() => setIsAddOpen(false)} aria-label="닫기"><X className="w-5 h-5" /></button></div>
            <input value={ticker} onChange={(event) => setTicker(event.target.value)} placeholder="티커 (예: AAPL)" className="w-full rounded-xl border p-3" />
            <input value={quantity} onChange={(event) => setQuantity(event.target.value)} inputMode="decimal" placeholder="수량" className="w-full rounded-xl border p-3" />
            <input value={entryPrice} onChange={(event) => setEntryPrice(event.target.value)} inputMode="decimal" placeholder="진입가" className="w-full rounded-xl border p-3" />
            {mode === "DIVESTED" && <input value={sellPrice} onChange={(event) => setSellPrice(event.target.value)} inputMode="decimal" placeholder="매도가" className="w-full rounded-xl border p-3" />}
            <button disabled={isSaving} onClick={submitItem} className="w-full rounded-xl bg-[#094cb2] py-3 font-bold text-white">{isSaving ? "저장 중..." : "저장"}</button>
          </div>
        </div>
      )}

      <BottomNav />
    </main>
  );
}
