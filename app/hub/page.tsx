"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { BottomNav } from "@/components/BottomNav";
import {
  SlidersHorizontal,
  FileSpreadsheet,
  FileText,
  Upload,
  CheckCircle2,
  Download,
  Plus,
  Trash2,
  X,
  ChevronRight,
  Shield,
} from "lucide-react";
import { parseExcelFile, parsePdfFile, ParsedRowItem } from "@/lib/apiClient";
import BatchImportPreviewModal from "@/components/BatchImportPreviewModal";
import ManualAssetModal from "@/components/ManualAssetModal";
import { motion, AnimatePresence } from "framer-motion";

interface AccountItem {
  id: number;
  name: string;
  brokerage_code?: string | null;
  account_number?: string | null;
  currency: string;
  cash_balance: number;
  color?: string | null;
}

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
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [accountName, setAccountName] = useState("");
  const [brokerageCode, setBrokerageCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountCurrency, setAccountCurrency] = useState("KRW");
  const [isAccountSaving, setIsAccountSaving] = useState(false);

  const excelInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3000);
  };

  const loadAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/backend/portfolio/accounts");
      if (!res.ok) throw new Error("계좌 목록을 불러오지 못했습니다.");
      setAccounts(await res.json());
    } catch (err) {
      console.warn(err);
      showToast("계좌 목록을 불러오지 못했습니다.");
    }
  }, []);

  useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  const createAccount = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!accountName.trim()) return;
    setIsAccountSaving(true);
    try {
      const res = await fetch("/api/backend/portfolio/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: accountName.trim(),
          brokerage_code: brokerageCode.trim() || null,
          account_number: accountNumber.trim() || null,
          currency: accountCurrency,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "계좌 등록에 실패했습니다.");
      setAccountModalOpen(false);
      setAccountName("");
      setBrokerageCode("");
      setAccountNumber("");
      setAccountCurrency("KRW");
      await loadAccounts();
      showToast("계좌를 등록했습니다.");
    } catch (err: any) {
      showToast(err.message || "계좌 등록에 실패했습니다.");
    } finally {
      setIsAccountSaving(false);
    }
  };

  const deactivateAccount = async (account: AccountItem) => {
    if (!window.confirm(`${account.name} 계좌를 비활성화할까요? 거래 내역은 보존됩니다.`)) return;
    try {
      const res = await fetch(`/api/backend/portfolio/accounts/${account.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "계좌 비활성화에 실패했습니다.");
      await loadAccounts();
      showToast("계좌를 비활성화했습니다.");
    } catch (err: any) {
      showToast(err.message || "계좌 비활성화에 실패했습니다.");
    }
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
        setPreviewBrokerage(res.brokerage_detected || "엑셀 일괄 등록");
        setPreviewModalOpen(true);
      } else {
        showToast(res.error || "엑셀에서 유효한 종목 데이터를 찾지 못했습니다.");
      }
    } catch (err: any) {
      showToast(err.message || "엑셀 분석 중 오류 발생");
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
        setPreviewBrokerage(res.brokerage_detected || "증권사 PDF 분석");
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
    <div className="min-h-screen bg-[#F8FAFC] pb-24 text-[#0F172A] selection:bg-[#1366FF]/20 selection:text-[#1366FF]">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-[#0F172A] text-white px-4 py-2.5 rounded-xl shadow-modal text-xs font-semibold flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header (Screen 6 Reference) */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#E2E8F0] px-4 md:px-6 py-3">
        <div className="max-w-4xl mx-auto flex items-center gap-2">
          <Shield className="w-5 h-5 text-[#1366FF]" />
          <h1 className="text-base md:text-lg font-bold text-[#0F172A] tracking-tight">설정 & 데이터 허브</h1>
        </div>
      </header>

      {/* Hidden File Inputs */}
      <input ref={excelInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleExcelUpload} className="hidden" />
      <input ref={pdfInputRef} type="file" accept=".pdf" onChange={handlePdfUpload} className="hidden" />

      {/* Main Container (Screen 6 Reference) */}
      <main className="max-w-4xl mx-auto px-4 md:px-6 pt-4 space-y-4">
        {/* 1. Hero Card: 내 보유 주식 직접 입력하기 (Screen 6 Reference) */}
        <div className="bg-[#1366FF] rounded-2xl p-5 md:p-6 text-white shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-lg md:text-xl font-bold">내 보유 주식 직접 입력하기</h2>
            <p className="text-xs text-white/80 leading-relaxed">
              토스, 키움, 미래에셋 등 증권사별 보유 수량과 평단가를 직접 입력합니다.
            </p>
          </div>
          <button
            onClick={() => setManualModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-white text-[#1366FF] font-bold text-xs hover:bg-[#F8FAFC] active:scale-95 transition-all shadow-xs shrink-0 self-start md:self-auto"
          >
            직접 등록
          </button>
        </div>

        {/* 2. Action Card 1: 증권사 Excel 일괄 등록 */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-5 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EBF2FF] flex items-center justify-center text-[#1366FF] shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#0F172A]">증권사 Excel(.xlsx / .csv) 일괄 등록</h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                다음받은 잔고/거래 엑셀을 업로드하면 자동 분석하여 DB에 저장합니다.
              </p>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              disabled={isExcelLoading}
              onClick={() => excelInputRef.current?.click()}
              className="flex-1 py-2.5 rounded-xl bg-[#1366FF] text-white font-bold text-xs hover:bg-[#0D54DB] active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{isExcelLoading ? "분석 중..." : "엑셀 파일 업로드"}</span>
            </button>
            <a
              href="/api/hub/template"
              download
              className="px-3.5 py-2.5 rounded-xl bg-[#F1F5F9] text-[#475569] font-bold text-xs hover:bg-[#E2E8F0] active:scale-95 transition-all flex items-center gap-1.5 border border-[#E2E8F0]"
            >
              <Download className="w-3.5 h-3.5" />
              <span>양식 다운로드</span>
            </a>
          </div>
        </div>

        {/* 3. Action Card 2: 증권사 PDF 스마트 분석 */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-5 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F3E8FF] flex items-center justify-center text-[#8B5CF6] shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#0F172A]">증권사 잔고/거래명세서 PDF AI 자동 인식</h3>
              <p className="text-xs text-[#64748B] mt-0.5">PDF를 업로드하면 종목명, 수량, 매입단가를 자동 추출합니다.</p>
            </div>
          </div>
          <button
            disabled={isPdfLoading}
            onClick={() => pdfInputRef.current?.click()}
            className="w-full py-2.5 rounded-xl bg-[#F1F5F9] text-[#0F172A] font-bold text-xs hover:bg-[#E2E8F0] active:scale-95 transition-all flex items-center justify-center gap-1.5 border border-[#E2E8F0] shadow-xs disabled:opacity-50"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{isPdfLoading ? "PDF 분석 중..." : "PDF 업로드"}</span>
          </button>
        </div>

        {/* 4. Linked Accounts Section (Screen 6 Reference) */}
        <div className="space-y-2.5 pt-2">
          <div className="flex items-center justify-between px-0.5">
            <h2 className="text-sm font-bold text-[#0F172A]">연동 계좌 관리</h2>
            <button
              onClick={() => setAccountModalOpen(true)}
              className="text-xs font-bold text-[#1366FF] hover:underline flex items-center gap-0.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>계좌 추가</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs divide-y divide-[#F1F5F9] overflow-hidden">
            {accounts.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#94A3B8]">등록된 연동 계좌가 없습니다.</div>
            ) : (
              accounts.map((account) => (
                <div key={account.id} className="p-4 flex items-center justify-between hover:bg-[#F8FAFC] transition-colors">
                  <div>
                    <span className="font-bold text-sm text-[#0F172A] block">{account.name}</span>
                    <span className="text-[11px] text-[#64748B]">
                      {account.brokerage_code || "증권사"} · {account.currency} 예수금 ₩{account.cash_balance.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => deactivateAccount(account)}
                      className="p-1.5 text-[#94A3B8] hover:text-[#EF4444] rounded-lg transition-colors"
                      title="계좌 비활성화"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <ChevronRight className="w-4 h-4 text-[#CBD5E1]" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* Preview Modal for Batch Import */}
      {previewModalOpen && (
        <BatchImportPreviewModal
          isOpen={previewModalOpen}
          onClose={() => setPreviewModalOpen(false)}
          fileName={previewFileName}
          items={previewItems}
          brokerageDetected={previewBrokerage}
          onSuccess={() => {
            setPreviewModalOpen(false);
            showToast("데이터가 성공적으로 반영되었습니다.");
          }}
        />
      )}

      {/* Manual Asset Modal */}
      {manualModalOpen && (
        <ManualAssetModal
          isOpen={manualModalOpen}
          onClose={() => setManualModalOpen(false)}
          onSuccess={() => {
            setManualModalOpen(false);
            showToast("보유 주식이 등록되었습니다.");
          }}
        />
      )}

      {/* Create Account Modal */}
      <AnimatePresence>
        {accountModalOpen && (
          <div
            onClick={() => setAccountModalOpen(false)}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl border border-[#E2E8F0] shadow-modal max-w-sm w-full p-5 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
                <h3 className="text-base font-bold text-[#0F172A]">새 계좌 등록</h3>
                <button
                  onClick={() => setAccountModalOpen(false)}
                  className="p-1 rounded-lg text-[#64748B] hover:bg-[#F1F5F9]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={createAccount} className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-[#0F172A] block mb-1">계좌명 *</label>
                  <input
                    type="text"
                    required
                    placeholder="예: 토스증권, 키움 해외주식"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#E2E8F0] focus:outline-none focus:border-[#1366FF]"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#0F172A] block mb-1">증권사 코드 (선택)</label>
                  <input
                    type="text"
                    placeholder="예: TOSS, KIWOOM"
                    value={brokerageCode}
                    onChange={(e) => setBrokerageCode(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#E2E8F0] focus:outline-none focus:border-[#1366FF]"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#0F172A] block mb-1">기본 통화</label>
                  <select
                    value={accountCurrency}
                    onChange={(e) => setAccountCurrency(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#E2E8F0] focus:outline-none focus:border-[#1366FF]"
                  >
                    <option value="KRW">KRW (원화)</option>
                    <option value="USD">USD (달러)</option>
                  </select>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setAccountModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl bg-[#F1F5F9] text-[#475569] font-bold hover:bg-[#E2E8F0]"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={isAccountSaving}
                    className="flex-1 py-2.5 rounded-xl bg-[#1366FF] text-white font-bold hover:bg-[#0D54DB] disabled:opacity-50"
                  >
                    {isAccountSaving ? "저장 중..." : "등록하기"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}
