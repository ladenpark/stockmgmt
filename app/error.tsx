"use client";

import { useEffect } from "react";
import { RefreshCw, AlertCircle } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Next.js App Error caught:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
      <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-xl max-w-md w-full space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 text-rose-500 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-black text-slate-900">화면을 불러오는 중 오류가 발생했습니다</h2>
          <p className="text-xs text-slate-500 font-medium">
            일시적인 데이터 연결 또는 컴포넌트 렌더링 오류입니다.
          </p>
        </div>
        <button
          onClick={() => reset()}
          className="w-full py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-md"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>다시 시도하기</span>
        </button>
      </div>
    </div>
  );
}
