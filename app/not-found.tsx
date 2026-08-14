import Link from "next/link";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
      <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-xl max-w-md w-full space-y-4">
        <h2 className="text-4xl font-black text-slate-900">404</h2>
        <p className="text-sm font-extrabold text-slate-700">페이지를 찾을 수 없습니다</p>
        <p className="text-xs text-slate-500">
          요청하신 페이지가 존재하지 않거나 주소가 변경되었습니다.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-2xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-all shadow-md"
        >
          <Home className="w-4 h-4" />
          <span>메인 대시보드로 돌아가기</span>
        </Link>
      </div>
    </div>
  );
}
