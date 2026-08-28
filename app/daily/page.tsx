"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { BottomNav } from "@/components/BottomNav";
import { ChevronDown, Calendar, X, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { StatValue } from "@/components/ui/StatValue";
import { useRouter } from "next/navigation";

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
  const router = useRouter();
  const [rows, setRows] = useState<DailyRow[]>([]);
  const [selectedDay, setSelectedDay] = useState<DailyRow | null>(null);
  const [error, setError] = useState("");

  const loadSnapshots = useCallback(async () => {
    try {
      setError("");
      const res = await fetch("/api/backend/daily/matrix");
      if (!res.ok) throw new Error("스냅샷을 불러오지 못했습니다.");
      const data = await res.json();
      setRows(data.snapshots || []);
    } catch (err: any) {
      setError(err.message || "스냅샷을 불러오지 못했습니다.");
    }
  }, []);

  useEffect(() => {
    void loadSnapshots();
  }, [loadSnapshots]);

  const monthLabel = useMemo(
    () =>
      rows[0]?.date_full
        ? `${rows[0].date_full.slice(0, 4)}년 ${Number(rows[0].date_full.slice(5, 7))}월`
        : "2026년 8월",
    [rows]
  );

  const monthlyChange =
    rows.length > 1 ? rows[0].total_valuation_krw - rows[rows.length - 1].total_valuation_krw : 0;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 text-[#0F172A] selection:bg-[#1366FF]/20 selection:text-[#1366FF]">
      {/* Header (Screen 4 Reference) */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#E2E8F0] px-4 md:px-6 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => router.push("/")}
              className="w-9 h-9 rounded-xl bg-[#F1F5F9] hover:bg-[#E2E8F0] flex items-center justify-center text-[#0F172A] transition-colors"
              aria-label="홈으로 이동"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-base md:text-lg font-bold text-[#0F172A] tracking-tight">데일리 손익 퍼포먼스</h1>
          </div>
          <div className="flex items-center gap-1 bg-[#F1F5F9] px-3 py-1.5 rounded-xl text-xs font-bold text-[#475569] border border-[#E2E8F0]">
            <span>{monthLabel}</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 md:px-6 pt-4 space-y-4">
        {/* Top Banner Card (Screen 4 Reference) */}
        <div className="bg-white rounded-2xl p-5 md:p-6 border border-[#E2E8F0] shadow-xs space-y-1">
          <span className="text-xs font-medium text-[#64748B] block">거래 시작일부터의 자산 변동</span>
          <div className="text-2xl md:text-3xl font-black text-[#1366FF] tracking-tight">
            {monthlyChange >= 0 ? "+" : ""}₩{Math.abs(monthlyChange).toLocaleString("ko-KR")}
          </div>
          <p className="pt-2 text-[11px] text-[#94A3B8]">
            과거 거래일은 종가, 오늘은 장중 최신 시세 기준입니다. 행을 누르면 종목별 상세를 볼 수 있습니다.
          </p>
        </div>

        {error && (
          <p className="rounded-xl bg-red-50 border border-red-100 px-3 py-2 text-xs font-semibold text-[#EF4444]">
            {error}
          </p>
        )}

        {/* Matrix Grid Table (Screen 4 Reference) */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] font-bold">
                <tr>
                  <th className="py-3 px-4">일자</th>
                  <th className="py-3 px-4 text-right">총 자산 평가액</th>
                  <th className="py-3 px-4 text-right">일간 변동 (±Δ)</th>
                  <th className="py-3 px-4 text-right">수익률</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-xs text-[#94A3B8]">
                      스냅샷 기록을 불러오는 중입니다.
                    </td>
                  </tr>
                ) : (
                  rows.map((row, idx) => {
                    const isPos = row.daily_change_krw >= 0;
                    return (
                      <tr
                        key={idx}
                        onClick={() => setSelectedDay(row)}
                        className="hover:bg-[#F8FAFC] cursor-pointer transition-colors"
                      >
                        <td className="py-3.5 px-4 font-bold text-[#0F172A]">{row.date}</td>
                        <td className="py-3.5 px-4 text-right font-extrabold text-[#0F172A]">
                          ₩{Math.round(row.total_valuation_krw).toLocaleString("ko-KR")}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold">
                          <span className={isPos ? "text-[#16A34A]" : "text-[#EF4444]"}>
                            {isPos ? "+" : "-"}₩{Math.abs(Math.round(row.daily_change_krw)).toLocaleString("ko-KR")}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold">
                          <span className={isPos ? "text-[#16A34A]" : "text-[#EF4444]"}>
                            {isPos ? "+" : ""}{row.daily_change_pct.toFixed(2)}%
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Selected Day Detail Modal */}
      <AnimatePresence>
        {selectedDay && (
          <div
            onClick={() => setSelectedDay(null)}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl border border-[#E2E8F0] shadow-modal max-w-lg w-full p-5 space-y-4 max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
                <div>
                  <h3 className="text-base font-bold text-[#0F172A]">{selectedDay.date_full} 자산 상세</h3>
                  <span className="text-xs text-[#64748B]">
                    총 평가 ₩{Math.round(selectedDay.total_valuation_krw).toLocaleString()}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedDay(null)}
                  className="p-1.5 rounded-xl bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#64748B]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                {selectedDay.details && selectedDay.details.length > 0 ? (
                  selectedDay.details.map((d, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex justify-between items-center text-xs"
                    >
                      <div>
                        <span className="font-bold text-[#0F172A] block">{d.name} ({d.ticker})</span>
                        <span className="text-[11px] text-[#64748B]">{d.shares}주 · ${d.price}</span>
                      </div>
                      <div className="text-right">
                        <StatValue amount={d.gain_amount} percent={d.diff_pct} currency="USD" size="sm" />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-center text-[#94A3B8] py-4">상세 종목 내역이 없습니다.</p>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}
