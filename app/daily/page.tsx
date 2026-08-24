"use client";

import React, { useEffect, useState } from "react";
import { BottomNav } from "@/components/BottomNav";
import { TrendingUp, TrendingDown, ChevronDown, Calendar, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface DailyDetailItem {
  name: string;
  ticker: string;
  price: number;
  diff_amount: number;
  diff_pct: number;
  shares: number;
  gain_amount: number;
}

interface DailyRow {
  date: string;
  date_full: string;
  total_valuation_usd: number;
  total_valuation_krw: number;
  daily_change_usd: number;
  daily_change_krw: number;
  daily_change_pct: number;
  summary_tag: string;
  details: DailyDetailItem[];
}

export default function DailyPage() {
  const [rows, setRows] = useState<DailyRow[]>([]);
  const [selectedDay, setSelectedDay] = useState<DailyRow | null>(null);

  useEffect(() => {
    fetch("http://localhost:8000/api/v1/daily/matrix")
      .then((res) => res.json())
      .then((data) => {
        if (data.snapshots) setRows(data.snapshots);
      })
      .catch((err) => {
        console.warn("Using fallback daily data", err);
        setRows([
          {
            date: "05.24",
            date_full: "2024-05-24",
            total_valuation_usd: 124500,
            total_valuation_krw: 172540000,
            daily_change_usd: 1200,
            daily_change_krw: 1662000,
            daily_change_pct: 0.97,
            summary_tag: "AAPL, TSLA 상승",
            details: [
              { name: "Apple (AAPL)", ticker: "AAPL", price: 192.42, diff_amount: 2.38, diff_pct: 1.25, shares: 80, gain_amount: 190.40 },
              { name: "NVIDIA (NVDA)", ticker: "NVDA", price: 945.50, diff_amount: 18.50, diff_pct: 2.00, shares: 45, gain_amount: 832.50 }
            ]
          },
          {
            date: "05.23",
            date_full: "2024-05-23",
            total_valuation_usd: 123300,
            total_valuation_krw: 170878000,
            daily_change_usd: -450,
            daily_change_krw: -623000,
            daily_change_pct: -0.36,
            summary_tag: "MSFT 조정",
            details: [
              { name: "Microsoft (MSFT)", ticker: "MSFT", price: 425.10, diff_amount: -5.20, diff_pct: -1.21, shares: 40, gain_amount: -208.00 }
            ]
          },
          {
            date: "05.22",
            date_full: "2024-05-22",
            total_valuation_usd: 123750,
            total_valuation_krw: 171500000,
            daily_change_usd: 800,
            daily_change_krw: 1108000,
            daily_change_pct: 0.65,
            summary_tag: "NVDA 실적 랠리",
            details: [
              { name: "NVIDIA (NVDA)", ticker: "NVDA", price: 927.00, diff_amount: 22.00, diff_pct: 2.43, shares: 45, gain_amount: 990.00 }
            ]
          }
        ]);
      });
  }, []);

  return (
    <main className="min-h-screen bg-[#FAFAFA] text-[#191F28] pb-28">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-[#E5E8EB] px-4 py-3.5">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#094cb2]" />
            <h1 className="text-lg font-extrabold tracking-tight">데일리 손익 퍼포먼스</h1>
          </div>
          <div className="flex items-center gap-1 bg-[#F2F4F6] px-3 py-1.5 rounded-full text-xs font-bold text-[#4E5968]">
            <span>2024년 5월</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-4xl mx-auto px-4 pt-4 space-y-4">
        {/* Banner */}
        <div className="bg-white rounded-3xl p-5 border border-[#E5E8EB] shadow-xs">
          <span className="text-xs font-bold text-[#8B95A1] uppercase tracking-wider block">월간 누적 자산 변동</span>
          <div className="text-3xl font-extrabold text-[#094cb2] mt-1">+₩6,240,000 (+3.75%)</div>
          <p className="text-xs text-[#8B95A1] mt-1">일자별 행을 터치하면 종목별 마감 상세 내역을 확인할 수 있습니다.</p>
        </div>

        {/* Matrix Grid Table */}
        <div className="bg-white rounded-3xl border border-[#E5E8EB] overflow-hidden shadow-xs">
          <table className="w-full text-left border-collapse text-xs md:text-sm">
            <thead className="bg-[#F9FAFB] border-b border-[#E5E8EB] text-[#8B95A1] font-bold">
              <tr>
                <th className="py-3.5 px-4">일자</th>
                <th className="py-3.5 px-4 text-right">총 자산 평가액</th>
                <th className="py-3.5 px-4 text-right">일간 변동 (±Δ)</th>
                <th className="py-3.5 px-4 text-right">수익률</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F2F4F6]">
              {rows.map((row, idx) => {
                const isPos = row.daily_change_usd >= 0;
                return (
                  <tr
                    key={idx}
                    onClick={() => setSelectedDay(row)}
                    className="hover:bg-[#F9FAFB] cursor-pointer transition-colors"
                  >
                    <td className="py-4 px-4 font-bold text-[#191F28]">{row.date}</td>
                    <td className="py-4 px-4 text-right font-extrabold text-[#191F28]">
                      ${row.total_valuation_usd.toLocaleString()}
                    </td>
                    <td className={`py-4 px-4 text-right font-bold ${isPos ? "text-[#094cb2]" : "text-[#EF4444]"}`}>
                      {isPos ? "+" : ""}${row.daily_change_usd.toLocaleString()}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md font-extrabold text-[11px] ${
                          isPos ? "bg-[#D9E2FF] text-[#094cb2]" : "bg-[#FFDAD6] text-[#EF4444]"
                        }`}
                      >
                        {isPos ? "+" : ""}{row.daily_change_pct.toFixed(2)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* P-202 Daily Detail BottomSheet */}
      <AnimatePresence>
        {selectedDay && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="relative w-full max-w-lg bg-white rounded-t-[32px] p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto"
            >
              <div className="w-10 h-1 bg-[#E5E8EB] rounded-full mx-auto" />
              <div className="flex justify-between items-center pb-2 border-b border-[#E5E8EB]">
                <div>
                  <span className="text-xs font-bold text-[#8B95A1]">일자별 마감 요약</span>
                  <h3 className="font-extrabold text-lg text-[#191F28]">{selectedDay.date_full}</h3>
                </div>
                <button onClick={() => setSelectedDay(null)} className="p-1 text-[#8B95A1]">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 bg-[#F9FAFB] rounded-2xl border border-[#E5E8EB] flex justify-between items-center">
                <div>
                  <span className="text-xs text-[#8B95A1] block">총 자산 평가액</span>
                  <div className="text-xl font-bold text-[#191F28]">${selectedDay.total_valuation_usd.toLocaleString()}</div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-[#8B95A1] block">일간 변동</span>
                  <div className={`text-xl font-bold ${selectedDay.daily_change_usd >= 0 ? "text-[#094cb2]" : "text-[#EF4444]"}`}>
                    {selectedDay.daily_change_usd >= 0 ? "+" : ""}${selectedDay.daily_change_usd.toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-bold text-[#8B95A1] uppercase">종목별 마감 변동</span>
                {selectedDay.details.map((d, i) => (
                  <div key={i} className="p-3.5 bg-white rounded-2xl border border-[#E5E8EB] flex justify-between items-center">
                    <div>
                      <div className="font-bold text-sm text-[#191F28]">{d.name}</div>
                      <div className="text-xs text-[#8B95A1]">${d.price} • {d.shares}주</div>
                    </div>
                    <div className="text-right">
                      <div className={`font-extrabold text-sm ${d.diff_amount >= 0 ? "text-[#094cb2]" : "text-[#EF4444]"}`}>
                        {d.diff_amount >= 0 ? "+" : ""}${d.gain_amount.toFixed(2)}
                      </div>
                      <span className="text-[11px] font-bold text-[#8B95A1]">
                        ({d.diff_pct >= 0 ? "+" : ""}{d.diff_pct}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <BottomNav />
    </main>
  );
}
