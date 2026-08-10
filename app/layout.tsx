import type { Metadata } from "next";
import "./globals.css";
import { BottomNav } from "@/components/BottomNav";

export const metadata: Metadata = {
  title: "mystockapp - 실시간 주식 포트폴리오 관리",
  description: "Google Sheets 연동 실시간 주식 포트폴리오 및 대시보드",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="bg-[#FFFFFF] text-[#191F28] min-h-screen antialiased selection:bg-[#3182F6]/10 selection:text-[#3182F6]">
        <div className="max-w-md md:max-w-4xl mx-auto min-h-screen bg-white flex flex-col shadow-sm border-x border-[#E5E8EB]">
          <div className="flex-1">{children}</div>
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
