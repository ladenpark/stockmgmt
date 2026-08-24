import { NextResponse } from "next/server";

export async function GET() {
  const csvContent =
    "\uFEFF" + // UTF-8 BOM for Excel in Korean
    "계좌,거래일자,종목코드,종목명,거래구분,수량,체결단가,통화\n" +
    "토스증권,2024-05-15,AAPL,애플,BUY,25,185.50,USD\n" +
    "키움증권,2024-05-20,NVDA,엔비디아,BUY,10,850.00,USD\n" +
    "미래에셋증권,2024-05-22,005930,삼성전자,BUY,100,72000,KRW\n" +
    "카카오페이증권,2024-05-28,TSLA,테슬라,BUY,15,180.00,USD\n";

  return new NextResponse(csvContent, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="alexandria_stock_template.csv"',
    },
  });
}
