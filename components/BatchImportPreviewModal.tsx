"use client";

import React, { useState } from "react";
import { commitBatchImport, ParsedRowItem } from "@/lib/apiClient";

interface BatchImportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (importedCount: number, items: ParsedRowItem[]) => void;
  fileName: string;
  initialItems: ParsedRowItem[];
  detectedBrokerage?: string;
}

export default function BatchImportPreviewModal({
  isOpen,
  onClose,
  onSuccess,
  fileName,
  initialItems,
  detectedBrokerage,
}: BatchImportPreviewModalProps) {
  const [items, setItems] = useState<ParsedRowItem[]>(initialItems);
  const [isCommitting, setIsCommitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  if (!isOpen) return null;

  const toggleSelectAll = (checked: boolean) => {
    setItems((prev) => prev.map((item) => ({ ...item, selected: checked })));
  };

  const toggleItemSelect = (index: number) => {
    setItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, selected: !item.selected } : item))
    );
  };

  const handleCommit = async () => {
    const selectedItems = items.filter((item) => item.selected);
    if (selectedItems.length === 0) {
      setErrorMessage("등록할 항목을 1개 이상 선택해주세요.");
      return;
    }

    setIsCommitting(true);
    setErrorMessage("");

    try {
      const res = await commitBatchImport(selectedItems);
      if (res.success) {
        onSuccess(selectedItems.length, selectedItems);
        onClose();
      } else {
        setErrorMessage(res.error || "DB 일괄 등록 실패");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "통신 오류 발생");
    } finally {
      setIsCommitting(false);
    }
  };

  const selectedCount = items.filter((i) => i.selected).length;
  const isAllSelected = items.length > 0 && selectedCount === items.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-4xl rounded-3xl p-6 shadow-2xl border border-[#c3c6d5]/40 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#efedee]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-700">
              <span className="material-symbols-outlined text-xl">table_chart</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-headline font-bold text-lg text-[#1b1c1d]">파일 분석 결과 미리보기</h3>
                {detectedBrokerage && (
                  <span className="px-2 py-0.5 rounded-md bg-[#d9e2ff] text-[#094cb2] text-[11px] font-bold">
                    {detectedBrokerage} 감지됨
                  </span>
                )}
              </div>
              <p className="font-body text-xs text-[#434653]">
                파일명: <span className="font-semibold text-[#1b1c1d]">{fileName}</span> (총 {items.length}건 중 {selectedCount}건 선택됨)
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#efedee] text-[#434653]">
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {errorMessage && (
          <div className="mt-3 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">error</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Table View */}
        <div className="mt-4 flex-1 overflow-auto border border-[#c3c6d5]/40 rounded-2xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-[#f5f3f4] sticky top-0 border-b border-[#c3c6d5]/40">
              <tr>
                <th className="p-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={(e) => toggleSelectAll(e.target.checked)}
                    className="rounded border-[#c3c6d5] text-[#094cb2] focus:ring-[#094cb2]"
                  />
                </th>
                <th className="p-3 font-bold text-[#434653]">계좌</th>
                <th className="p-3 font-bold text-[#434653]">일자</th>
                <th className="p-3 font-bold text-[#434653]">종목명 (코드)</th>
                <th className="p-3 font-bold text-[#434653]">구분</th>
                <th className="p-3 font-bold text-[#434653] text-right">수량</th>
                <th className="p-3 font-bold text-[#434653] text-right">단가</th>
                <th className="p-3 font-bold text-[#434653] text-right">체결금액</th>
                <th className="p-3 font-bold text-[#434653] text-center">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#efedee]">
              {items.map((item, idx) => (
                <tr
                  key={idx}
                  className={`hover:bg-[#f8f9fa] transition-colors ${item.selected ? "bg-white" : "bg-[#f5f3f4]/50 opacity-60"}`}
                >
                  <td className="p-3 text-center">
                    <input
                      type="checkbox"
                      checked={!!item.selected}
                      onChange={() => toggleItemSelect(idx)}
                      className="rounded border-[#c3c6d5] text-[#094cb2] focus:ring-[#094cb2]"
                    />
                  </td>
                  <td className="p-3 font-medium text-[#1b1c1d]">{item.account}</td>
                  <td className="p-3 text-[#434653]">{item.date}</td>
                  <td className="p-3 font-bold text-[#1b1c1d]">
                    {item.name} <span className="text-[#434653] font-normal">({item.ticker})</span>
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        item.type === "BUY" ? "bg-[#d9e2ff] text-[#094cb2]" : "bg-[#ffdad6] text-[#ba1a1a]"
                      }`}
                    >
                      {item.type === "BUY" ? "매수" : "매도"}
                    </span>
                  </td>
                  <td className="p-3 text-right font-semibold text-[#1b1c1d]">{item.quantity.toLocaleString()}주</td>
                  <td className="p-3 text-right font-semibold text-[#1b1c1d]">
                    {item.currency === "KRW" ? `₩${item.price.toLocaleString()}` : `$${item.price.toLocaleString()}`}
                  </td>
                  <td className="p-3 text-right font-bold text-[#094cb2]">
                    {item.currency === "KRW" ? `₩${item.total_amount.toLocaleString()}` : `$${item.total_amount.toLocaleString()}`}
                  </td>
                  <td className="p-3 text-center">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      정상
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-[#efedee] mt-4">
          <span className="text-xs text-[#434653]">
            선택된 <strong className="text-[#094cb2]">{selectedCount}건</strong>을 내 포트폴리오 및 DB에 일괄 저장합니다.
          </span>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#434653] hover:bg-[#efedee] transition-all"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleCommit}
              disabled={isCommitting || selectedCount === 0}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#094cb2] text-white hover:bg-[#003da5] active:scale-95 transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50"
            >
              {isCommitting ? (
                <>
                  <span className="material-symbols-outlined text-xs animate-spin">refresh</span>
                  <span>DB에 일괄 저장 중...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-xs">cloud_upload</span>
                  <span>{selectedCount}건 최종 DB 반영</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
