"use client";

import React, { useState, useRef } from "react";
import { BottomNav } from "@/components/BottomNav";
import { Sliders, FileSpreadsheet, FileText, Upload, CheckCircle2, Download, PlusCircle } from "lucide-react";
import { parseExcelFile, parsePdfFile, ParsedRowItem } from "@/lib/apiClient";
import BatchImportPreviewModal from "@/components/BatchImportPreviewModal";
import ManualAssetModal from "@/components/ManualAssetModal";

export default function HubPage() {
  const [isExcelLoading, setIsExcelLoading] = useState(false);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // Preview Modal States
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewFileName, setPreviewFileName] = useState("");
  const [previewItems, setPreviewItems] = useState<ParsedRowItem[]>([]);
  const [previewBrokerage, setPreviewBrokerage] = useState<string | undefined>(undefined);

  // Manual Asset Modal State
  const [manualModalOpen, setManualModalOpen] = useState(false);

  const excelInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3000);
  };

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsExcelLoading(true);
    try {
      const res = await parseExcelFile(file);
      if (res.success && res.data && res.data.length > 0) {
        setPreviewFileName(file.name);
        setPreviewItems(res.data);
        setPreviewBrokerage(undefined);
        setPreviewModalOpen(true);
      } else {
        showToast(res.error || "엑셀 파일에서 유효한 데이터를 찾지 못했습니다.");
      }
    } catch (err: any) {
      showToast(err.message || "파일 업로드 중 오류 발생");
    } finally {
      setIsExcelLoading(false);
      if (excelInputRef.current) excelInputRef.current.value = "";
    }
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsPdfLoading(true);
    try {
      const res = await parsePdfFile(file);
      if (res.success && res.data && res.data.length > 0) {
        setPreviewFileName(file.name);
        setPreviewItems(res.data);
        setPreviewBrokerage(res.brokerage_detected || "증권사 잔고증명서");
        setPreviewModalOpen(true);
      } else {
        showToast(res.error || "PDF에서 종목 내역을 인식하지 못했습니다.");
      }
    } catch (err: any) {
      showToast(err.message || "PDF 분석 중 오류 발생");
    } finally {
      setIsPdfLoading(false);
      if (pdfInputRef.current) pdfInputRef.current.value = "";
    }
  };

  return (
    <main className="min-h-screen bg-[#FAFAFA] text-[#191F28] pb-28">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 bg-[#1b1c1d] text-white text-xs font-semibold rounded-full shadow-lg flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-[#E5E8EB] px-4 py-3.5">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-[#094cb2]" />
            <h1 className="text-lg font-extrabold tracking-tight">설정 & 데이터 허브</h1>
          </div>
          <button
            onClick={() => setManualModalOpen(true)}
            className="px-3.5 py-1.5 rounded-full bg-[#094cb2] text-white text-xs font-bold flex items-center gap-1 hover:bg-[#003da5] active:scale-95 transition-all shadow-xs"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>종목 직접 등록</span>
          </button>
        </div>
      </header>

      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={excelInputRef}
        onChange={handleExcelUpload}
        accept=".xlsx,.xls,.csv"
        className="hidden"
      />
      <input
        type="file"
        ref={pdfInputRef}
        onChange={handlePdfUpload}
        accept=".pdf"
        className="hidden"
      />

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 pt-4 space-y-4">
        {/* 1. Direct Manual Registration Banner */}
        <div className="bg-gradient-to-r from-[#094cb2] to-[#3366cc] rounded-3xl p-6 text-white shadow-md flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-white/20 uppercase tracking-wider">초기 자산 관리</span>
            <h2 className="text-lg font-extrabold">내 보유 주식 직접 입력하기</h2>
            <p className="text-xs text-white/80">토스, 키움, 미래에셋 등 증권사별 보유 수량과 평단가를 직접 입력합니다.</p>
          </div>
          <button
            onClick={() => setManualModalOpen(true)}
            className="px-4 py-2.5 rounded-2xl bg-white text-[#094cb2] font-bold text-xs hover:bg-[#f5f3f4] active:scale-95 transition-all shadow-xs shrink-0"
          >
            직접 등록
          </button>
        </div>

        {/* 2. Excel Sync Card */}
        <div className="bg-white rounded-3xl p-6 border border-[#E5E8EB] shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#D9E2FF] flex items-center justify-center text-[#094cb2]">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-extrabold text-base text-[#191F28]">증권사 Excel(.xlsx / .csv) 일괄 등록</h2>
              <p className="text-xs text-[#8B95A1]">
                증권사(키움, 토스, 미래에셋 등)에서 다운받은 잔고/거래 엑셀을 업로드하면 자동 분석하여 DB에 적재합니다.
              </p>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              disabled={isExcelLoading}
              onClick={() => excelInputRef.current?.click()}
              className="flex-1 py-3 rounded-2xl bg-[#094cb2] text-white font-bold text-xs shadow-xs hover:bg-[#003da5] active:scale-95 transition-all flex items-center justify-center gap-1.5"
            >
              <Upload className="w-4 h-4" />
              <span>{isExcelLoading ? "엑셀 분석 중..." : "엑셀 파일 업로드 (.xlsx, .csv)"}</span>
            </button>
            <a
              href="/api/hub/template"
              download
              className="px-4 py-3 rounded-2xl bg-[#F2F4F6] text-[#191F28] font-bold text-xs hover:bg-[#E5E8EB] active:scale-95 transition-all flex items-center gap-1.5"
            >
              <Download className="w-4 h-4 text-[#434653]" />
              <span>표준 양식 다운로드</span>
            </a>
          </div>
        </div>

        {/* 3. PDF OCR Smart Parser */}
        <div className="bg-white rounded-3xl p-6 border border-[#E5E8EB] shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#FEF3C7] flex items-center justify-center text-[#6d5e00]">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-extrabold text-base text-[#191F28]">증권사 잔고/거래명세서 PDF AI 자동 인식</h2>
              <p className="text-xs text-[#8B95A1]">증권사 잔고명세서 PDF를 업로드하면 종목명, 수량, 매입단가를 자동 추출합니다.</p>
            </div>
          </div>

          <button
            disabled={isPdfLoading}
            onClick={() => pdfInputRef.current?.click()}
            className="w-full py-3.5 rounded-2xl bg-[#F2F4F6] text-[#191F28] font-bold text-xs hover:bg-[#E5E8EB] active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Upload className="w-4 h-4 text-[#094cb2]" />
            <span>{isPdfLoading ? "PDF 스마트 분석 중..." : "증권사 잔고명세서 PDF 업로드 (.pdf)"}</span>
          </button>
        </div>

        {/* 4. Brokerage Accounts */}
        <div className="bg-white rounded-3xl p-6 border border-[#E5E8EB] shadow-xs space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="font-extrabold text-base text-[#191F28]">연동 계좌 관리</h2>
            <button onClick={() => setManualModalOpen(true)} className="text-xs font-bold text-[#094cb2] hover:underline">
              + 계좌/종목 추가
            </button>
          </div>

          <div className="space-y-2 text-xs">
            <div className="p-3.5 bg-[#F9FAFB] rounded-2xl flex justify-between items-center border border-[#E5E8EB]">
              <div>
                <div className="font-bold text-sm text-[#191F28]">토스증권 / 카카오페이증권</div>
                <span className="text-[#8B95A1]">미국 성장주 & 국내 배당주 계좌 • 실시간 연동</span>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                정상 연동
              </span>
            </div>

            <div className="p-3.5 bg-[#F9FAFB] rounded-2xl flex justify-between items-center border border-[#E5E8EB]">
              <div>
                <div className="font-bold text-sm text-[#191F28]">키움증권 / 미래에셋</div>
                <span className="text-[#8B95A1]">국내 및 해외 주식 포트폴리오</span>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                정상 연동
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Manual Asset Modal */}
      <ManualAssetModal
        isOpen={manualModalOpen}
        onClose={() => setManualModalOpen(false)}
        onSuccess={(newAsset) => {
          showToast(`[${newAsset.ticker || newAsset.name}] 종목이 성공적으로 등록되었습니다.`);
        }}
      />

      {/* Batch Import Preview Modal */}
      <BatchImportPreviewModal
        isOpen={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        fileName={previewFileName}
        initialItems={previewItems}
        detectedBrokerage={previewBrokerage}
        onSuccess={(count) => {
          showToast(`총 ${count}건의 종목이 포트폴리오에 성공적으로 반영되었습니다.`);
        }}
      />

      <BottomNav />
    </main>
  );
}
