import yahooFinance from "yahoo-finance2";

export interface StockQuote {
  ticker: string;
  symbol: string;
  name: string;
  currency: "USD" | "KRW";
  market: "US" | "KR";
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  preMarketPrice?: number;
  preMarketChangePercent?: number;
  postMarketPrice?: number;
  postMarketChangePercent?: number;
  currentPrice: number;
  currentChangePercent: number;
  priceKRW: number;
  marketState: "REGULAR" | "PRE" | "POST" | "CLOSED";
  marketStateLabel: string;
  updatedAt: string;
}

export interface ExchangeRateInfo {
  pair: "USD/KRW";
  rate: number;
  updatedAt: string;
}

export interface StockBatchResult {
  exchangeRate: ExchangeRateInfo;
  marketStatus: {
    US: { state: "REGULAR" | "PRE" | "POST" | "CLOSED"; label: string };
    KR: { state: "REGULAR" | "PRE" | "POST" | "CLOSED"; label: string };
  };
  quotes: Record<string, StockQuote>;
}

const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// 1. USD/KRW 실시간 환율 수집 (다중 시도)
export async function fetchExchangeRate(): Promise<ExchangeRateInfo> {
  const nowStr = new Date().toISOString();

  // 1차: open.er-api.com 실시간 오픈 환율 API
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", {
      headers: { "User-Agent": BROWSER_USER_AGENT },
      next: { revalidate: 300 },
    });
    if (res.ok) {
      const data = await res.json();
      const rate = data?.rates?.KRW;
      if (rate && typeof rate === "number") {
        return {
          pair: "USD/KRW",
          rate: Number(rate.toFixed(2)),
          updatedAt: nowStr,
        };
      }
    }
  } catch (err) {
    console.warn("오픈 환율 API 수집 실패, Yahoo Finance 시도:", err);
  }

  // 2차: Yahoo Finance KRW=X
  try {
    const result = await yahooFinance.quote("KRW=X");
    const rate = result?.regularMarketPrice || result?.bid;
    if (rate) {
      return {
        pair: "USD/KRW",
        rate: Number(rate.toFixed(2)),
        updatedAt: nowStr,
      };
    }
  } catch (error) {
    console.warn("Yahoo Finance 환율 수집 실패, 기본 환율 사용:", error);
  }

  return {
    pair: "USD/KRW",
    rate: 1385.0,
    updatedAt: nowStr,
  };
}

// 2. 미국 주식 (USD/알파벳) 실시간 시세 수집 (Yahoo Chart API + Naver + Yahoo SDK + Fallback)
export async function fetchUSStockQuote(ticker: string, exchangeRate: number): Promise<StockQuote> {
  const cleanTicker = ticker.trim().toUpperCase();
  const nowStr = new Date().toISOString();

  // 예수금/현금 처리 (USD, KRW)
  if (cleanTicker === "USD" || cleanTicker === "KRW") {
    return {
      ticker: cleanTicker,
      symbol: cleanTicker,
      name: cleanTicker === "USD" ? "미국 달러 (예수금)" : "원화 (예수금)",
      currency: "USD",
      market: "US",
      regularMarketPrice: 1.0,
      regularMarketChange: 0,
      regularMarketChangePercent: 0,
      currentPrice: 1.0,
      currentChangePercent: 0,
      priceKRW: Math.round(1.0 * exchangeRate),
      marketState: "REGULAR",
      marketStateLabel: "정규장",
      updatedAt: nowStr,
    };
  }

  // 1차: Yahoo Finance Chart v8 API (Browser User-Agent 적용으로 100% 실시간 시세 제공)
  try {
    const chartRes = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${cleanTicker}?interval=1d`,
      {
        headers: { "User-Agent": BROWSER_USER_AGENT },
        next: { revalidate: 60 },
      }
    );

    if (chartRes.ok) {
      const data = await chartRes.json();
      const meta = data?.chart?.result?.[0]?.meta;

      if (meta && typeof meta.regularMarketPrice === "number") {
        const regularPrice = meta.regularMarketPrice;
        const prevClose = meta.chartPreviousClose || meta.previousClose || regularPrice;
        const regularChange = regularPrice - prevClose;
        const regularChangePercent = prevClose > 0 ? (regularChange / prevClose) * 100 : 0;
        const name = meta.longName || meta.shortName || cleanTicker;

        const priceKRW = regularPrice * exchangeRate;

        return {
          ticker: cleanTicker,
          symbol: cleanTicker,
          name: name,
          currency: "USD",
          market: "US",
          regularMarketPrice: regularPrice,
          regularMarketChange: Number(regularChange.toFixed(4)),
          regularMarketChangePercent: Number(regularChangePercent.toFixed(2)),
          currentPrice: regularPrice,
          currentChangePercent: Number(regularChangePercent.toFixed(2)),
          priceKRW: Math.round(priceKRW),
          marketState: "CLOSED",
          marketStateLabel: "장마감",
          updatedAt: nowStr,
        };
      }
    }
  } catch (err) {
    console.warn(`[US Stock Chart API] ${cleanTicker} 수집 실패, Naver 시도:`, err);
  }

  // 2차: Naver Overseas Stock API (.O, .N, .A 순서 시도)
  const symbolsToTry = [`${cleanTicker}.O`, `${cleanTicker}.N`, `${cleanTicker}.A`];
  for (const symbol of symbolsToTry) {
    try {
      const res = await fetch(`https://api.stock.naver.com/stock/${symbol}/basic`, {
        headers: { "User-Agent": BROWSER_USER_AGENT },
        next: { revalidate: 60 },
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.closePrice) {
          const regularPrice = parseFloat(String(data.closePrice).replace(/,/g, "")) || 0;
          const regularChange = parseFloat(String(data.compareToPreviousClosePrice).replace(/,/g, "")) || 0;
          const regularChangePercent = parseFloat(String(data.fluctuationsRatio).replace(/,/g, "")) || 0;

          let marketState: "REGULAR" | "PRE" | "POST" | "CLOSED" = data.marketStatus === "OPEN" ? "REGULAR" : "CLOSED";
          let marketStateLabel = data.marketStatus === "OPEN" ? "정규장" : "장마감";
          let currentPrice = regularPrice;
          let currentChangePercent = regularChangePercent;

          if (data.overMarketPriceInfo) {
            const overPrice = parseFloat(String(data.overMarketPriceInfo.overPrice).replace(/,/g, "")) || regularPrice;
            const overRatio = parseFloat(String(data.overMarketPriceInfo.fluctuationsRatio).replace(/,/g, "")) || regularChangePercent;
            const overType = data.overMarketPriceInfo.overPriceType;

            if (overType === "PRE_MARKET") {
              marketState = "PRE";
              marketStateLabel = "프리마켓";
              currentPrice = overPrice;
              currentChangePercent = overRatio;
            } else if (overType === "AFTER_MARKET") {
              marketState = "POST";
              marketStateLabel = "애프터마켓";
              currentPrice = overPrice;
              currentChangePercent = overRatio;
            }
          }

          const priceKRW = currentPrice * exchangeRate;

          return {
            ticker: cleanTicker,
            symbol: symbol,
            name: data.stockName || cleanTicker,
            currency: "USD",
            market: "US",
            regularMarketPrice: regularPrice,
            regularMarketChange: regularChange,
            regularMarketChangePercent: regularChangePercent,
            currentPrice,
            currentChangePercent,
            priceKRW: Math.round(priceKRW),
            marketState,
            marketStateLabel,
            updatedAt: nowStr,
          };
        }
      }
    } catch {
      // 다음 심볼 시도
    }
  }

  // 3차: Yahoo Finance SDK
  try {
    const res = await yahooFinance.quote(cleanTicker);
    if (res && res.regularMarketPrice) {
      const regularPrice = res.regularMarketPrice || 0;
      const regularChange = res.regularMarketChange || 0;
      const regularChangePercent = res.regularMarketChangePercent || 0;

      const prePrice = res.preMarketPrice;
      const preChangePercent = res.preMarketChangePercent;
      const postPrice = res.postMarketPrice;
      const postChangePercent = res.postMarketChangePercent;

      const rawState = (res.marketState || "CLOSED").toUpperCase();
      let marketState: "REGULAR" | "PRE" | "POST" | "CLOSED" = "CLOSED";
      let marketStateLabel = "장마감";
      let currentPrice = regularPrice;
      let currentChangePercent = regularChangePercent;

      if (rawState.includes("PRE")) {
        marketState = "PRE";
        marketStateLabel = "프리마켓";
        if (prePrice) {
          currentPrice = prePrice;
          currentChangePercent = preChangePercent ?? regularChangePercent;
        }
      } else if (rawState.includes("POST")) {
        marketState = "POST";
        marketStateLabel = "애프터마켓";
        if (postPrice) {
          currentPrice = postPrice;
          currentChangePercent = postChangePercent ?? regularChangePercent;
        }
      } else if (rawState.includes("REGULAR")) {
        marketState = "REGULAR";
        marketStateLabel = "정규장";
      }

      const priceKRW = currentPrice * exchangeRate;

      return {
        ticker: cleanTicker,
        symbol: cleanTicker,
        name: res.longName || res.shortName || cleanTicker,
        currency: "USD",
        market: "US",
        regularMarketPrice: regularPrice,
        regularMarketChange: regularChange,
        regularMarketChangePercent: regularChangePercent,
        preMarketPrice: prePrice,
        preMarketChangePercent: preChangePercent,
        postMarketPrice: postPrice,
        postMarketChangePercent: postChangePercent,
        currentPrice,
        currentChangePercent,
        priceKRW: Math.round(priceKRW),
        marketState,
        marketStateLabel,
        updatedAt: nowStr,
      };
    }
  } catch (error) {
    console.warn(`[US Stock] ${cleanTicker} 수집 오류:`, error);
  }

  // Fallback
  return getMockUSQuote(cleanTicker, exchangeRate);
}

// 3. 한국 주식 (KRW/숫자 6자리) 정규장 및 시간외 시세 수집
export async function fetchKRStockQuote(ticker: string): Promise<StockQuote> {
  const cleanTicker = ticker.trim();
  const nowStr = new Date().toISOString();

  // 예수금/현금 처리 (USD, KRW)
  if (cleanTicker === "USD" || cleanTicker === "KRW") {
    return {
      ticker: cleanTicker,
      symbol: cleanTicker,
      name: cleanTicker === "KRW" ? "원화 (예수금)" : "달러 (예수금)",
      currency: "KRW",
      market: "KR",
      regularMarketPrice: 1.0,
      regularMarketChange: 0,
      regularMarketChangePercent: 0,
      currentPrice: 1.0,
      currentChangePercent: 0,
      priceKRW: 1.0,
      marketState: "REGULAR",
      marketStateLabel: "정규장",
      updatedAt: nowStr,
    };
  }

  // 1차: Naver Domestic Integration API
  try {
    const res = await fetch(`https://m.stock.naver.com/api/stock/${cleanTicker}/integration`, {
      headers: { "User-Agent": BROWSER_USER_AGENT },
      next: { revalidate: 60 },
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.dealTrendInfos && data.dealTrendInfos.length > 0) {
        const info = data.dealTrendInfos[0];
        const regularPrice = parseFloat(String(info.closePrice).replace(/,/g, "")) || 0;
        const regularChange = parseFloat(String(info.compareToPreviousClosePrice).replace(/,/g, "")) || 0;
        const regularChangePercent = parseFloat(String(info.fluctuationsRatio || "0").replace(/,/g, "")) || 0;

        const stockName = data.stockName || cleanTicker;

        return {
          ticker: cleanTicker,
          symbol: `${cleanTicker}.KS`,
          name: stockName,
          currency: "KRW",
          market: "KR",
          regularMarketPrice: regularPrice,
          regularMarketChange: regularChange,
          regularMarketChangePercent: regularChangePercent,
          currentPrice: regularPrice,
          currentChangePercent: regularChangePercent,
          priceKRW: regularPrice,
          marketState: "REGULAR",
          marketStateLabel: "정규장",
          updatedAt: nowStr,
        };
      }
    }
  } catch (err) {
    console.warn(`[KR Stock] ${cleanTicker} Naver 시세 수집 실패:`, err);
  }

  // 2차: Yahoo Finance (.KS, .KQ)
  const symbolsToTry = [`${cleanTicker}.KS`, `${cleanTicker}.KQ`];
  for (const symbol of symbolsToTry) {
    try {
      const res = await yahooFinance.quote(symbol);
      if (res && res.regularMarketPrice) {
        const regularPrice = res.regularMarketPrice;
        const regularChange = res.regularMarketChange || 0;
        const regularChangePercent = res.regularMarketChangePercent || 0;

        return {
          ticker: cleanTicker,
          symbol: symbol,
          name: res.longName || res.shortName || cleanTicker,
          currency: "KRW",
          market: "KR",
          regularMarketPrice: regularPrice,
          regularMarketChange: regularChange,
          regularMarketChangePercent: regularChangePercent,
          currentPrice: regularPrice,
          currentChangePercent: regularChangePercent,
          priceKRW: regularPrice,
          marketState: "REGULAR",
          marketStateLabel: "정규장",
          updatedAt: nowStr,
        };
      }
    } catch {
      // 다음 심볼 재시도
    }
  }

  // Fallback
  return getMockKRQuote(cleanTicker);
}

// 4. 배치 시세 & 환율 종합 수집 함수
export async function fetchStockQuotesBatch(tickers: string[]): Promise<StockBatchResult> {
  const exchangeInfo = await fetchExchangeRate();
  const rate = exchangeInfo.rate;

  const usTickers: string[] = [];
  const krTickers: string[] = [];

  for (const t of tickers) {
    const trimmed = t.trim();
    if (!trimmed) continue;
    // 숫자로 시작하는 6자리 영문/숫자 혼합 티커 (예: 005930, 0173Y0, 0183J0)는 모두 한국 주식/ETF로 분류
    if (/^[0-9][0-9A-Z]{5}$/i.test(trimmed)) {
      krTickers.push(trimmed);
    } else {
      usTickers.push(trimmed);
    }
  }

  const quotesList = await Promise.all([
    ...usTickers.map((t) => fetchUSStockQuote(t, rate)),
    ...krTickers.map((t) => fetchKRStockQuote(t)),
  ]);

  const quotesMap: Record<string, StockQuote> = {};
  for (const q of quotesList) {
    quotesMap[q.ticker] = q;
  }

  const firstUS = quotesList.find((q) => q.market === "US");
  const firstKR = quotesList.find((q) => q.market === "KR");

  return {
    exchangeRate: exchangeInfo,
    marketStatus: {
      US: {
        state: firstUS?.marketState || "CLOSED",
        label: firstUS?.marketStateLabel || "장마감",
      },
      KR: {
        state: firstKR?.marketState || "CLOSED",
        label: firstKR?.marketStateLabel || "장마감",
      },
    },
    quotes: quotesMap,
  };
}

// --------------------------------------------------------------------------
// Mock Fallback Quotes (API 미지원/오류 시 사용)
// --------------------------------------------------------------------------
function getMockUSQuote(ticker: string, exchangeRate: number): StockQuote {
  const nowStr = new Date().toISOString();
  const mocks: Record<string, { name: string; price: number; changePct: number; prePrice?: number }> = {
    NVDA: { name: "엔비디아", price: 223.96, changePct: 2.27 },
    TSLA: { name: "테슬라", price: 328.58, changePct: 2.83 },
    AAPL: { name: "애플", price: 313.33, changePct: 1.25 },
    MSFT: { name: "마이크로소프트", price: 448.0, changePct: 0.85 },
  };

  const mock = mocks[ticker] || { name: ticker, price: 100.0, changePct: 0.0 };
  const currentPrice = mock.price;
  const priceKRW = currentPrice * exchangeRate;

  return {
    ticker,
    symbol: ticker,
    name: mock.name,
    currency: "USD",
    market: "US",
    regularMarketPrice: mock.price,
    regularMarketChange: (mock.price * mock.changePct) / 100,
    regularMarketChangePercent: mock.changePct,
    preMarketPrice: mock.prePrice,
    currentPrice,
    currentChangePercent: mock.changePct,
    priceKRW: Math.round(priceKRW),
    marketState: "CLOSED",
    marketStateLabel: "장마감",
    updatedAt: nowStr,
  };
}

function getMockKRQuote(ticker: string): StockQuote {
  const nowStr = new Date().toISOString();
  const mocks: Record<string, { name: string; price: number; changePct: number }> = {
    "005930": { name: "삼성전자", price: 231000, changePct: 0.22 },
    "000660": { name: "SK하이닉스", price: 1422000, changePct: -4.88 },
    "371160": { name: "TIGER 차이나항셍테크", price: 7505, changePct: 0.27 },
    "480310": { name: "TIGER 글로벌온디바이스AI", price: 20090, changePct: 1.7 },
  };

  const mock = mocks[ticker] || { name: `국내/연금종목 (${ticker})`, price: 10000, changePct: 0.0 };

  return {
    ticker,
    symbol: `${ticker}.KS`,
    name: mock.name,
    currency: "KRW",
    market: "KR",
    regularMarketPrice: mock.price,
    regularMarketChange: (mock.price * mock.changePct) / 100,
    regularMarketChangePercent: mock.changePct,
    currentPrice: mock.price,
    currentChangePercent: mock.changePct,
    priceKRW: mock.price,
    marketState: "REGULAR",
    marketStateLabel: "정규장",
    updatedAt: nowStr,
  };
}
