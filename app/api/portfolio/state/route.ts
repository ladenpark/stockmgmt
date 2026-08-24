import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DATA_FILE = path.join(process.cwd(), "data", "portfolioStore.json");

// 기본 초기 샘플 포트폴리오
const DEFAULT_PORTFOLIO = [
  {
    id: "s_aapl",
    ticker: "AAPL",
    name: "애플",
    category: "Technology",
    market: "US",
    currency: "USD",
    currentPriceUsd: 192.42,
    changePct: 1.25,
    changeAmountUsd: 2.38,
    shares: 80,
    avgPriceUsd: 153.75,
    realizedGainUsd: 3200.0,
    holdings: [
      { id: "h1", brokerage: "Fidelity Investments", shares: 50, avgPriceUsd: 150.0 },
      { id: "h2", brokerage: "토스증권", shares: 30, avgPriceUsd: 160.0 },
    ],
    transactions: [
      { id: "t1", type: "매수", date: "2024.05.10", shares: 10, priceUsd: 182.5, brokerage: "토스증권" },
      { id: "t2", type: "매도", date: "2024.04.15", shares: 20, priceUsd: 175.0, brokerage: "Fidelity" },
      { id: "t3", type: "매수", date: "2024.02.01", shares: 50, priceUsd: 150.0, brokerage: "Fidelity" },
    ],
  },
  {
    id: "s_nvda",
    ticker: "NVDA",
    name: "엔비디아",
    category: "Semiconductors",
    market: "US",
    currency: "USD",
    currentPriceUsd: 945.5,
    changePct: 3.42,
    changeAmountUsd: 31.2,
    shares: 45,
    avgPriceUsd: 520.0,
    realizedGainUsd: 8500.0,
    holdings: [
      { id: "h3", brokerage: "Fidelity Investments", shares: 45, avgPriceUsd: 520.0 },
    ],
    transactions: [
      { id: "t4", type: "매수", date: "2024.01.15", shares: 45, priceUsd: 520.0, brokerage: "Fidelity" },
    ],
  },
  {
    id: "s_msft",
    ticker: "MSFT",
    name: "마이크로소프트",
    category: "Software",
    market: "US",
    currency: "USD",
    currentPriceUsd: 428.15,
    changePct: -0.45,
    changeAmountUsd: -1.95,
    shares: 30,
    avgPriceUsd: 380.0,
    realizedGainUsd: 1200.0,
    holdings: [
      { id: "h4", brokerage: "키움증권", shares: 30, avgPriceUsd: 380.0 },
    ],
    transactions: [
      { id: "t5", type: "매수", date: "2024.03.20", shares: 30, priceUsd: 380.0, brokerage: "키움증권" },
    ],
  },
  {
    id: "s_005930",
    ticker: "005930",
    name: "삼성전자",
    category: "국내 대형주",
    market: "KR",
    currency: "KRW",
    currentPriceUsd: 56.66,
    changePct: 0.89,
    changeAmountUsd: 0.51,
    shares: 120,
    avgPriceUsd: 51.39,
    realizedGainUsd: 450.0,
    holdings: [
      { id: "h5", brokerage: "키움증권", shares: 120, avgPriceUsd: 51.39 },
    ],
    transactions: [
      { id: "t6", type: "매수", date: "2024.04.02", shares: 120, priceUsd: 51.39, brokerage: "키움증권" },
    ],
  },
  {
    id: "s_tsla",
    ticker: "TSLA",
    name: "테슬라",
    category: "Electric Vehicles",
    market: "US",
    currency: "USD",
    currentPriceUsd: 178.5,
    changePct: 2.15,
    changeAmountUsd: 3.75,
    shares: 60,
    avgPriceUsd: 210.0,
    realizedGainUsd: -1800.0,
    holdings: [
      { id: "h6", brokerage: "미래에셋증권", shares: 60, avgPriceUsd: 210.0 },
    ],
    transactions: [
      { id: "t7", type: "매수", date: "2024.02.14", shares: 60, priceUsd: 210.0, brokerage: "미래에셋" },
    ],
  },
  {
    id: "s_o",
    ticker: "O",
    name: "리얼티 인컴",
    category: "Real Estate (월배당)",
    market: "US",
    currency: "USD",
    currentPriceUsd: 54.2,
    changePct: 0.35,
    changeAmountUsd: 0.19,
    shares: 120,
    avgPriceUsd: 52.0,
    realizedGainUsd: 260.0,
    holdings: [
      { id: "h7", brokerage: "카카오페이증권", shares: 120, avgPriceUsd: 52.0 },
    ],
    transactions: [
      { id: "t8", type: "배당", date: "2024.05.15", shares: 120, priceUsd: 0.256, brokerage: "카카오페이" },
    ],
  },
];

export async function GET() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return NextResponse.json({ success: true, data: parsed });
      }
    }
  } catch (err: any) {
    console.error("Error reading portfolioStore.json:", err);
  }

  // 기본값 저장 및 반환
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(DEFAULT_PORTFOLIO, null, 2), "utf-8");
  } catch {}

  return NextResponse.json({ success: true, data: DEFAULT_PORTFOLIO });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { stocks } = body;

    if (!Array.isArray(stocks)) {
      return NextResponse.json({ success: false, error: "Invalid stocks array" }, { status: 400 });
    }

    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    // Atomically write to server storage
    const tempFile = `${DATA_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(stocks, null, 2), "utf-8");
    fs.renameSync(tempFile, DATA_FILE);

    return NextResponse.json({
      success: true,
      message: "Portfolio state synced successfully to server",
      count: stocks.length,
    });
  } catch (err: any) {
    console.error("Error saving portfolioStore.json:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
