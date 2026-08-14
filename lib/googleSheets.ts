import { google } from "googleapis";

export interface InitialAsset {
  id: string;
  date: string;
  category: string;
  ticker: string;
  account: string;
  currency: "KRW" | "USD";
  quantity: number;
  averagePrice: number;
  market: "KR" | "US";
  isCash: boolean;
}

export interface TradeRecord {
  id: string;
  date: string;
  category: string;
  ticker: string;
  account: string;
  currency: "KRW" | "USD";
  type: "매수" | "매도";
  quantity: number;
  price: number;
  realizedPnL: number;
  market: "KR" | "US";
}

export interface AssetHistoryRecord {
  date: string;
  category: string;
  account: string;
  valueKRW: number;
  ticker: string;
}

export interface PortfolioHolding {
  id: string;
  ticker: string;
  category: string;
  account: string;
  currency: "KRW" | "USD";
  market: "KR" | "US";
  quantity: number;
  averagePrice: number;
  totalCost: number;
}

export interface PortfolioCash {
  account: string;
  currency: "KRW" | "USD";
  amount: number;
}

export interface PortfolioData {
  holdings: PortfolioHolding[];
  cashHoldings: PortfolioCash[];
  summary: {
    totalInitialCostKRW: number;
    totalInitialCostUSD: number;
    totalRealizedPnLKRW: number;
    totalRealizedPnLUSD: number;
    holdingCount: number;
  };
  tradeHistory: TradeRecord[];
  assetHistory: AssetHistoryRecord[];
}

// 안전한 String trim 보조 함수 (숫자/문자열 모두 지원)
function safeTrim(val: any): string {
  if (val === null || val === undefined) return "";
  return String(val).trim();
}

// 시장 구분 자동 판별 보조 함수
function detectMarket(ticker: string, currency: string): "KR" | "US" {
  const cleanTicker = safeTrim(ticker).toUpperCase();
  if (currency === "KRW" || cleanTicker === "KRW") return "KR";
  if (!cleanTicker) return "KR";
  // 숫자로 시작하는 6자리 영문/숫자 티커 (예: 005930, 0173Y0, 0183J0) 또는 .KS/.KQ면 한국 주식/ETF
  if (/^[0-9][0-9A-Z]{5}$/i.test(cleanTicker) || /^\d{6}\.(KS|KQ)$/i.test(cleanTicker)) {
    return "KR";
  }
  return "US";
}

// 구글 시트 API 인증 클라이언트 생성
function getGoogleSheetsClient() {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!sheetId || !clientEmail || !privateKey) {
    return null;
  }

  // private key의 escape 개행문자 처리
  privateKey = privateKey.replace(/\\n/g, "\n");

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  const sheets = google.sheets({ version: "v4", auth });
  return { sheets, sheetId };
}

// 1. [초기자산] 탭 파싱
export async function fetchInitialAssets(): Promise<InitialAsset[]> {
  const client = getGoogleSheetsClient();
  if (!client) return getMockInitialAssets();

  try {
    const response = await client.sheets.spreadsheets.values.get({
      spreadsheetId: client.sheetId,
      range: "초기자산!A2:H",
      valueRenderOption: "UNFORMATTED_VALUE",
    });

    const rows = response.data.values || [];
    return rows.map((row, idx) => {
      const category = safeTrim(row[2]);
      const ticker = safeTrim(row[3]);
      const currency = safeTrim(row[5]).toUpperCase() === "USD" ? "USD" : "KRW";
      const cleanTicker = ticker.toUpperCase();
      const isCash = category === "예수금" || category === "현금" || cleanTicker === "KRW" || cleanTicker === "USD" || !ticker;
      const market = detectMarket(ticker, currency);

      return {
        id: safeTrim(row[0]) || `init-${idx}`,
        date: safeTrim(row[1]),
        category: category || "기타",
        ticker: ticker,
        account: safeTrim(row[4]) || "기본계좌",
        currency: currency,
        quantity: parseFloat(String(row[6] || "0")) || 0,
        averagePrice: parseFloat(String(row[7] || "0")) || 0,
        market: market,
        isCash: isCash,
      };
    });
  } catch (error) {
    console.warn("Google Sheets 초기자산 파싱 실패, Fallback 데이터 사용:", error);
    return getMockInitialAssets();
  }
}

// 2. [거래내역] 탭 파싱
export async function fetchTradeHistory(): Promise<TradeRecord[]> {
  const client = getGoogleSheetsClient();
  if (!client) return getMockTradeHistory();

  try {
    const response = await client.sheets.spreadsheets.values.get({
      spreadsheetId: client.sheetId,
      range: "거래내역!A2:J",
      valueRenderOption: "UNFORMATTED_VALUE",
    });

    const rows = response.data.values || [];
    return rows.map((row, idx) => {
      const ticker = safeTrim(row[3]);
      const currency = safeTrim(row[5]).toUpperCase() === "USD" ? "USD" : "KRW";
      const typeStr = safeTrim(row[6]);
      const type = typeStr.includes("매도") || typeStr.toUpperCase() === "SELL" ? "매도" : "매수";

      return {
        id: safeTrim(row[0]) || `trade-${idx}`,
        date: safeTrim(row[1]),
        category: safeTrim(row[2]) || "주식",
        ticker: ticker,
        account: safeTrim(row[4]) || "기본계좌",
        currency: currency,
        type: type,
        quantity: Math.abs(parseFloat(String(row[7] || "0"))) || 0,
        price: parseFloat(String(row[8] || "0")) || 0,
        realizedPnL: parseFloat(String(row[9] || "0")) || 0,
        market: detectMarket(ticker, currency),
      };
    });
  } catch (error) {
    console.warn("Google Sheets 거래내역 파싱 실패, Fallback 데이터 사용:", error);
    return getMockTradeHistory();
  }
}

// 3. [History] 탭 파싱
export async function fetchAssetHistory(): Promise<AssetHistoryRecord[]> {
  const client = getGoogleSheetsClient();
  if (!client) return getMockAssetHistory();

  try {
    const response = await client.sheets.spreadsheets.values.get({
      spreadsheetId: client.sheetId,
      range: "History!A2:E",
      valueRenderOption: "UNFORMATTED_VALUE",
    });

    const rows = response.data.values || [];
    return rows.map((row) => ({
      date: safeTrim(row[0]),
      category: safeTrim(row[1]) || "전체",
      account: safeTrim(row[2]) || "전체계좌",
      valueKRW: parseFloat(String(row[3] || "0")) || 0,
      ticker: safeTrim(row[4]),
    }));
  } catch (error) {
    console.warn("Google Sheets History 파싱 실패, Fallback 데이터 사용:", error);
    return getMockAssetHistory();
  }
}

// --------------------------------------------------------------------------
// Server In-Memory Cache (TTL: 30 seconds)
// --------------------------------------------------------------------------
let cachedPortfolioData: { data: PortfolioData; timestamp: number } | null = null;
const PORTFOLIO_CACHE_TTL_MS = 30 * 1000;

// 4. 초기자산 + 거래내역 합성 종합 포트폴리오 산출
export async function getPortfolioData(): Promise<PortfolioData> {
  const now = Date.now();
  if (cachedPortfolioData && now - cachedPortfolioData.timestamp < PORTFOLIO_CACHE_TTL_MS) {
    return cachedPortfolioData.data;
  }

  const timeoutPromise = new Promise<PortfolioData>((resolve) => {
    setTimeout(() => {
      console.warn("[Google Sheets Timeout] 2.5초 지연으로 즉시 Fallback 포트폴리오 적용");
      resolve(computePortfolioData(getMockInitialAssets(), getMockTradeHistory(), getMockAssetHistory()));
    }, 2500);
  });

  const fetchPromise = (async () => {
    const [initialAssets, tradeHistory, assetHistory] = await Promise.all([
      fetchInitialAssets(),
      fetchTradeHistory(),
      fetchAssetHistory(),
    ]);
    return computePortfolioData(initialAssets, tradeHistory, assetHistory);
  })();

  const result = await Promise.race([fetchPromise, timeoutPromise]);
  cachedPortfolioData = { data: result, timestamp: Date.now() };
  return result;
}

function computePortfolioData(
  initialAssets: InitialAsset[],
  tradeHistory: TradeRecord[],
  assetHistory: AssetHistoryRecord[]
): PortfolioData {
  const holdingsMap = new Map<string, PortfolioHolding>();
  const cashMap = new Map<string, PortfolioCash>();

  let totalInitialCostKRW = 0;
  let totalInitialCostUSD = 0;
  let totalRealizedPnLKRW = 0;
  let totalRealizedPnLUSD = 0;

  // 초기자산 반영
  for (const item of initialAssets) {
    const cleanTicker = item.ticker.toUpperCase();
    const isCashAsset = item.isCash || cleanTicker === "KRW" || cleanTicker === "USD" || item.category === "예수금";

    if (isCashAsset) {
      const key = `${item.account}-${item.currency}`;
      const current = cashMap.get(key) || { account: item.account, currency: item.currency, amount: 0 };
      current.amount += item.quantity * (item.averagePrice || 1);
      cashMap.set(key, current);
    } else {
      const key = `${item.account}-${item.ticker}`;
      const totalCost = item.quantity * item.averagePrice;
      holdingsMap.set(key, {
        id: item.id,
        ticker: item.ticker,
        category: item.category,
        account: item.account,
        currency: item.currency,
        market: item.market,
        quantity: item.quantity,
        averagePrice: item.averagePrice,
        totalCost: totalCost,
      });

      if (item.currency === "USD") {
        totalInitialCostUSD += totalCost;
      } else {
        totalInitialCostKRW += totalCost;
      }
    }
  }

  // 거래내역 반영 (매수/매도 수량 및 단가 재계산, 계좌별 예수금 차감/증가)
  for (const trade of tradeHistory) {
    if (trade.currency === "USD") {
      totalRealizedPnLUSD += trade.realizedPnL || 0;
    } else {
      totalRealizedPnLKRW += trade.realizedPnL || 0;
    }

    const cleanTicker = trade.ticker.toUpperCase();
    const isCashTrade = trade.category === "예수금" || trade.category === "현금" || cleanTicker === "KRW" || cleanTicker === "USD";
    const cashKey = `${trade.account}-${trade.currency}`;
    const currentCash = cashMap.get(cashKey) || {
      account: trade.account,
      currency: trade.currency,
      amount: 0,
    };
    const tradeTotalAmount = trade.quantity * trade.price;

    if (isCashTrade) {
      // 순수 예수금 입출금 거래
      if (trade.type === "매수") {
        currentCash.amount += tradeTotalAmount;
      } else {
        currentCash.amount -= tradeTotalAmount;
      }
      cashMap.set(cashKey, currentCash);
    } else {
      // 주식 매수/매도 거래 ➡️ 계좌 예수금 차감/증가 처리
      if (trade.type === "매수") {
        currentCash.amount -= tradeTotalAmount;
      } else if (trade.type === "매도") {
        currentCash.amount += tradeTotalAmount;
      }
      cashMap.set(cashKey, currentCash);

      // 종목 보유량 및 매수원금 업데이트
      const key = `${trade.account}-${trade.ticker}`;
      const existing = holdingsMap.get(key);

      if (trade.type === "매수") {
        if (existing) {
          const newQty = existing.quantity + trade.quantity;
          const newTotalCost = existing.totalCost + tradeTotalAmount;
          const newAvg = newQty > 0 ? newTotalCost / newQty : 0;
          existing.quantity = newQty;
          existing.totalCost = newTotalCost;
          existing.averagePrice = newAvg;
        } else {
          holdingsMap.set(key, {
            id: trade.id,
            ticker: trade.ticker,
            category: trade.category,
            account: trade.account,
            currency: trade.currency,
            market: trade.market,
            quantity: trade.quantity,
            averagePrice: trade.price,
            totalCost: tradeTotalAmount,
          });
        }
      } else if (trade.type === "매도" && existing) {
        const newQty = Math.max(0, existing.quantity - trade.quantity);
        existing.quantity = newQty;
        existing.totalCost = newQty * existing.averagePrice;
        if (newQty === 0) {
          holdingsMap.delete(key);
        }
      }
    }
  }

  const holdings = Array.from(holdingsMap.values()).filter((h) => h.quantity > 0);
  const cashHoldings = Array.from(cashMap.values());

  const result: PortfolioData = {
    holdings,
    cashHoldings,
    summary: {
      totalInitialCostKRW,
      totalInitialCostUSD,
      totalRealizedPnLKRW,
      totalRealizedPnLUSD,
      holdingCount: holdings.length,
    },
    tradeHistory,
    assetHistory,
  };

  cachedPortfolioData = { data: result, timestamp: Date.now() };
  return result;
}

// --------------------------------------------------------------------------
// Mock Fallback Data (구글 시트 미설정 / 에러 시 사용)
// --------------------------------------------------------------------------
function getMockInitialAssets(): InitialAsset[] {
  return [
    {
      id: "init-1",
      date: "2024-01-01",
      category: "주식",
      ticker: "NVDA",
      account: "키움",
      currency: "USD",
      quantity: 55,
      averagePrice: 118.7727,
      market: "US",
      isCash: false,
    },
    {
      id: "init-2",
      date: "2024-01-01",
      category: "주식",
      ticker: "TSLA",
      account: "메리츠",
      currency: "USD",
      quantity: 45,
      averagePrice: 201.9777,
      market: "US",
      isCash: false,
    },
    {
      id: "init-3",
      date: "2024-01-01",
      category: "주식",
      ticker: "005930",
      account: "키움",
      currency: "KRW",
      quantity: 120,
      averagePrice: 71200,
      market: "KR",
      isCash: false,
    },
    {
      id: "init-4",
      date: "2024-01-01",
      category: "연금",
      ticker: "069500",
      account: "퇴직연금",
      currency: "KRW",
      quantity: 90,
      averagePrice: 34500,
      market: "KR",
      isCash: false,
    },
    {
      id: "init-5",
      date: "2024-01-01",
      category: "주식",
      ticker: "AAPL",
      account: "메리츠",
      currency: "USD",
      quantity: 30,
      averagePrice: 185.5,
      market: "US",
      isCash: false,
    },
  ];
}

function getMockTradeHistory(): TradeRecord[] {
  return [
    {
      id: "trade-1",
      date: "2024-03-15",
      category: "주식",
      ticker: "NVDA",
      account: "키움",
      currency: "USD",
      type: "매수",
      quantity: 10,
      price: 125.4,
      realizedPnL: 0,
      market: "US",
    },
  ];
}

function getMockAssetHistory(): AssetHistoryRecord[] {
  return [
    { date: "2024-01-01", category: "전체", account: "전체계좌", valueKRW: 120000000, ticker: "" },
    { date: "2024-02-01", category: "전체", account: "전체계좌", valueKRW: 124500000, ticker: "" },
    { date: "2024-03-01", category: "전체", account: "전체계좌", valueKRW: 129000000, ticker: "" },
    { date: "2024-04-01", category: "전체", account: "전체계좌", valueKRW: 133500000, ticker: "" },
    { date: "2024-05-01", category: "전체", account: "전체계좌", valueKRW: 138000000, ticker: "" },
    { date: "2024-06-01", category: "전체", account: "전체계좌", valueKRW: 142500000, ticker: "" },
  ];
}
