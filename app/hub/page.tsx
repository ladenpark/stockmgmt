"use client";

import React, { useState } from "react";
import { BottomNav } from "@/components/BottomNav";
import { Sliders, FileSpreadsheet, FileText, Upload, CheckCircle2, ShieldCheck } from "lucide-react";

export default function HubPage() {
  const [pdfResult, setPdfResult] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleSimulatePdf = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      setPdfResult({
        brokerage: "토스증권 (Toss Securities)",
        date: "2024-05-31",
        extracted: [
          { ticker: "NVDA", name: "엔비디아", shares: 15, avg_usd: 850.00, cur_usd: 945.50 },
          { ticker: "AAPL", name: "애플", shares: 25, avg_usd: 180.00, cur_usd: 192.42 },
          { ticker: "005930", name: "삼성전자", shares: 100, avg_krw: 72000, cur_krw: 78500 }
        ],
        totalValuationKrw: 48650000
      });
      setIsAnalyzing(false);
    }, 1000);
  };

  return (
    <main className="min-h-screen bg-[#FAFAFA] text-[#191F28] pb-28">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-[#E5E8EB] px-4 py-3.5">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-[#094cb2]" />
            <h1 className="text-lg font-extrabold tracking-tight">설정 & 데이터 허브</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 pt-4 space-y-4">
        {/* Excel Sync Card */}
        <div className="bg-white rounded-3xl p-6 border border-[#E5E8EB] shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#D9E2FF] flex items-center justify-center text-[#094cb2]">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-extrabold text-base text-[#191F28]">Excel 데이터 일괄 동기화</h2>
              <p className="text-xs text-[#8B95A1]">가계부형 엑셀 파일(.xlsx)로 거래 내역을 일괄 불러오거나 백업합니다.</p>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={() => alert("엑셀 업로드 파일 선택 다이얼로그")}
              className="flex-1 py-3 rounded-2xl bg-[#094cb2] text-white font-bold text-xs shadow-xs hover:opacity-95"
            >
              엑셀 불러오기 (.xlsx)
            </button>
            <button
              onClick={() => alert("alexandria_portfolio_2024.xlsx 파일이 다운로드되었습니다.")}
              className="px-5 py-3 rounded-2xl bg-[#F2F4F6] text-[#191F28] font-bold text-xs hover:bg-[#E5E8EB]"
            >
              내보내기
            </button>
          </div>
        </div>

        {/* PDF OCR Smart Parser */}
        <div className="bg-white rounded-3xl p-6 border border-[#E5E8EB] shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#FEF3C7] flex items-center justify-center text-[#6d5e00]">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-extrabold text-base text-[#191F28]">증권사 PDF 스마트 분석</h2>
              <p className="text-xs text-[#8B95A1]">증권사 잔고명세서 PDF를 AI가 분석하여 보유 내역을 자동 인식합니다.</p>
            </div>
          </div>

          <button
            disabled={isAnalyzing}
            onClick={handleSimulatePdf}
            className="w-full py-3.5 rounded-2xl bg-[#F2F4F6] text-[#191F28] font-bold text-xs hover:bg-[#E5E8EB] transition-all flex items-center justify-center gap-2"
          >
            <Upload className="w-4 h-4 text-[#094cb2]" />
            {isAnalyzing ? "AI 스마트 분석 중..." : "증권사 잔고 PDF 스마트 분석 시뮬레이션"}
          </button>

          {pdfResult && (
            <div className="p-4 bg-[#F9FAFB] rounded-2xl border border-[#094cb2]/20 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-[#094cb2] flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> {pdfResult.brokerage} 인식 완료
                </span>
                <span className="text-[#8B95A1]">기준일: {pdfResult.date}</span>
              </div>
              <div className="space-y-1.5 text-xs">
                {pdfResult.extracted.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center py-1 border-b border-[#E5E8EB] last:border-0">
                    <span className="font-bold text-[#191F28]">{item.name} ({item.ticker})</span>
                    <span className="text-[#8B95A1]">{item.shares}주</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Brokerage Accounts */}
        <div className="bg-white rounded-3xl p-6 border border-[#E5E8EB] shadow-xs space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="font-extrabold text-base text-[#191F28]">연동 계좌 관리</h2>
            <button onClick={() => alert("새 증권사 계좌 연동 모달")} className="text-xs font-bold text-[#094cb2]">
              + 계좌 추가
            </button>
          </div>

          <div className="space-y-2 text-xs">
            <div className="p-3.5 bg-[#F9FAFB] rounded-2xl flex justify-between items-center border border-[#E5E8EB]">
              <div>
                <div className="font-bold text-sm text-[#191F28]">Fidelity Investments</div>
                <span className="text-[#8B95A1]">미국 메인 계좌 • 2개 종목</span>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-[#D9E2FF] text-[#094cb2] font-bold text-[11px]">
                연동됨
              </span>
            </div>

            <div className="p-3.5 bg-[#F9FAFB] rounded-2xl flex justify-between items-center border border-[#E5E8EB]">
              <div>
                <div className="font-bold text-sm text-[#191F28]">토스증권 / 카카오페이</div>
                <span className="text-[#8B95A1]">성장주 & 배당주 계좌 • 5개 종목</span>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-[#D9E2FF] text-[#094cb2] font-bold text-[11px]">
                연동됨
              </span>
            </div>
          </div>
        </div>
      </div>

      <BottomNav />
    </main>
  );
}
