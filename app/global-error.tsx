"use client";

import { useEffect } from "react";
import { RefreshCw, AlertCircle } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Next.js Global Error caught:", error);
  }, [error]);

  return (
    <html lang="ko">
      <body className="bg-slate-50 flex items-center justify-center min-h-screen p-6 text-center">
        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-xl max-w-md w-full space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 text-rose-500 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-black text-slate-900">시스템 오류가 발생했습니다</h2>
            <p className="text-xs text-slate-500 font-medium">
              페이지를 새로고침하거나 다시 시도해 주세요.
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
      </body>
    </html>
  );
}
