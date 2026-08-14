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

// --------------------------------------------------------------------------
// 1. USD/KRW 실시간 환율 수집 (Primary: Open ER API ➡️ Fallback: Yahoo Finance)
// --------------------------------------------------------------------------
export async function fetchExchangeRate(): Promise<ExchangeRateInfo> {
  const nowStr = new Date().toISOString();

  // Primary: open.er-api.com 실시간 오픈 환율 API
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
    console.warn("[ExchangeRate Primary Error] Open ER API 실패, Fallback(Yahoo) 시도:", err);
  }

  // Fallback: Yahoo Finance Chart API KRW=X
  try {
    const res = await fetch("https://query1.finance.yahoo.com/v8/finance/chart/KRW=X?interval=1d", {
      headers: { "User-Agent": BROWSER_USER_AGENT },
      next: { revalidate: 300 },
    });
    if (res.ok) {
      const data = await res.json();
      const meta = data?.chart?.result?.[0]?.meta;
      const rate = meta?.regularMarketPrice;
      if (rate && typeof rate === "number") {
        return {
          pair: "USD/KRW",
          rate: Number(rate.toFixed(2)),
          updatedAt: nowStr,
        };
      }
    }
  } catch (err) {
    console.warn("[ExchangeRate Fallback 1 Error] Yahoo Chart API 실패, SDK 시도:", err);
  }

  // Fallback 2: Yahoo Finance SDK
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
    console.warn("[ExchangeRate Fallback 2 Error] Yahoo Finance SDK 실패, 기본값 사용:", error);
  }

  return {
    pair: "USD/KRW",
    rate: 1385.0,
    updatedAt: nowStr,
  };
}

// --------------------------------------------------------------------------
// 2. 미국 주식 (US Stock) 시세 수집
// Primary: Naver Overseas API ➡️ Fallback 1: FMP API ➡️ Fallback 2: Yahoo Chart API/SDK
// --------------------------------------------------------------------------

// Fallback 1 Helper: Financial Modeling Prep (FMP) API
async function fetchFMPStockQuote(ticker: string, exchangeRate: number): Promise<StockQuote | null> {
  const fmpApiKey = process.env.FMP_API_KEY || process.env.VITE_FMP_API_KEY;
  if (!fmpApiKey) return null;

  const nowStr = new Date().toISOString();
  try {
    const res = await fetch(`https://financialmodelingprep.com/api/v3/quote/${ticker}?apikey=${fmpApiKey}`, {
      headers: { "User-Agent": BROWSER_USER_AGENT },
      next: { revalidate: 60 },
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const item = data[0];
        const regularPrice = item.price || 0;
        const change = item.change || 0;
        const changePercent = item.changesPercentage || 0;
        const priceKRW = regularPrice * exchangeRate;

        return {
          ticker: ticker,
          symbol: item.symbol || ticker,
          name: item.name || ticker,
          currency: "USD",
          market: "US",
          regularMarketPrice: regularPrice,
          regularMarketChange: Number(change.toFixed(4)),
          regularMarketChangePercent: Number(changePercent.toFixed(2)),
          currentPrice: regularPrice,
          currentChangePercent: Number(changePercent.toFixed(2)),
          priceKRW: Math.round(priceKRW),
          marketState: "CLOSED",
          marketStateLabel: "장마감",
          updatedAt: nowStr,
        };
      }
    }
  } catch (err) {
    console.warn(`[US Stock Fallback FMP Error] ${ticker}:`, err);
  }
  return null;
}

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

  // 1. Primary: Naver Overseas Stock API (.O, .N, .A 순서 시도 - 프리마켓/애프터마켓 지원)
  const symbolsToTry = [`${cleanTicker}.O`, `${cleanTicker}.N`, `${cleanTicker}.A`];
  for (const symbol of symbolsToTry) {
    try {
      const res = await fetch(`https://api.stock.naver.com/stock/${symbol}/basic`, {
        headers: { "User-Agent": BROWSER_USER_AGENT },
        next: { revalidate: 30 },
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
            const overInfo = data.overMarketPriceInfo;
            const overPrice = parseFloat(String(overInfo.overPrice || overInfo.overPriceRaw).replace(/,/g, "")) || regularPrice;
            const overRatio = parseFloat(String(overInfo.fluctuationsRatio || overInfo.fluctuationsRatioRaw).replace(/,/g, "")) || regularChangePercent;
            const sessionType = overInfo.tradingSessionType || overInfo.overPriceType;

            if (sessionType === "PRE_MARKET" || overInfo.overMarketStatus === "OPEN") {
              marketState = "PRE";
              marketStateLabel = "프리마켓";
              currentPrice = overPrice;
              currentChangePercent = overRatio;
            } else if (sessionType === "AFTER_MARKET") {
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

  // 2. Fallback 1: FMP API (Financial Modeling Prep)
  const fmpQuote = await fetchFMPStockQuote(cleanTicker, exchangeRate);
  if (fmpQuote) {
    return fmpQuote;
  }

  // 3. Fallback 2: Yahoo Finance Chart API / SDK
  try {
    const chartRes = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${cleanTicker}?interval=1d&includePrePost=true`,
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
    console.warn(`[US Stock Fallback Yahoo Chart Error] ${cleanTicker}:`, err);
  }

  // Yahoo Finance SDK
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
    console.warn(`[US Stock Fallback Yahoo SDK Error] ${cleanTicker}:`, error);
  }

  // Final Mock Fallback
  return getMockUSQuote(cleanTicker, exchangeRate);
}

// --------------------------------------------------------------------------
// 3. 한국 주식 및 연금 ETF (KR Stock) 시세 수집
// Primary: Naver Domestic API ➡️ Fallback 1: KIS Open API ➡️ Fallback 2: Yahoo Finance (.KS/.KQ)
// --------------------------------------------------------------------------

// Fallback 1 Helper: 한국투자증권 (KIS) Open API
async function fetchKISStockQuote(ticker: string): Promise<StockQuote | null> {
  const kisAppKey = process.env.KIS_APPKEY;
  const kisAppSecret = process.env.KIS_APPSECRET;
  if (!kisAppKey || !kisAppSecret) return null;

  const nowStr = new Date().toISOString();

  try {
    // 1. KIS OAuth Access Token 발급
    const tokenRes = await fetch("https://openapi.koreainvestment.com:9443/oauth2/tokenP", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "client_credentials",
        appkey: kisAppKey,
        appsecret: kisAppSecret,
      }),
    });

    if (tokenRes.ok) {
      const tokenData = await tokenRes.json();
      const accessToken = tokenData.access_token;

      if (accessToken) {
        // 2. 국내 주식 시세 조회 API
        const priceRes = await fetch(
          `https://openapi.koreainvestment.com:9443/uapi/domestic-stock/v1/quotations/inquire-price?FID_COND_MRKT_DIV_CODE=J&FID_INPUT_ISCD=${ticker}`,
          {
            headers: {
              "Content-Type": "application/json",
              authorization: `Bearer ${accessToken}`,
              appkey: kisAppKey,
              appsecret: kisAppSecret,
              tr_id: "FHKST01010100",
            },
          }
        );

        if (priceRes.ok) {
          const priceData = await priceRes.json();
          const output = priceData.output;

          if (output && output.stck_prpr) {
            const currentPrice = parseFloat(output.stck_prpr) || 0;
            const change = parseFloat(output.prdy_vrss) || 0;
            const changePercent = parseFloat(output.prdy_ctrt) || 0;

            return {
              ticker: ticker,
              symbol: `${ticker}.KS`,
              name: `국내종목 (${ticker})`,
              currency: "KRW",
              market: "KR",
              regularMarketPrice: currentPrice,
              regularMarketChange: change,
              regularMarketChangePercent: changePercent,
              currentPrice: currentPrice,
              currentChangePercent: changePercent,
              priceKRW: currentPrice,
              marketState: "REGULAR",
              marketStateLabel: "정규장",
              updatedAt: nowStr,
            };
          }
        }
      }
    }
  } catch (err) {
    console.warn(`[KR Stock Fallback KIS Error] ${ticker}:`, err);
  }
  return null;
}

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

  // 1. Primary: Naver Domestic Integration API
  try {
    const res = await fetch(`https://m.stock.naver.com/api/stock/${cleanTicker}/integration`, {
      headers: { "User-Agent": BROWSER_USER_AGENT },
      next: { revalidate: 30 },
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
    console.warn(`[KR Stock Primary Naver Error] ${cleanTicker}:`, err);
  }

  // 2. Fallback 1: 한국투자증권 (KIS) Open API
  const kisQuote = await fetchKISStockQuote(cleanTicker);
  if (kisQuote) {
    return kisQuote;
  }

  // 3. Fallback 2: Yahoo Finance (.KS, .KQ)
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

  // Final Mock Fallback
  return getMockKRQuote(cleanTicker);
}

// --------------------------------------------------------------------------
// Stock Quote In-Memory Cache (TTL: 30 seconds)
// --------------------------------------------------------------------------
const quoteCacheMap = new Map<string, { data: StockQuote; timestamp: number }>();
const QUOTE_CACHE_TTL_MS = 30 * 1000;

async function getCachedUSQuote(ticker: string, rate: number): Promise<StockQuote> {
  const now = Date.now();
  const cached = quoteCacheMap.get(ticker.toUpperCase());
  if (cached && now - cached.timestamp < QUOTE_CACHE_TTL_MS) {
    return cached.data;
  }
  const quote = await fetchUSStockQuote(ticker, rate);
  quoteCacheMap.set(ticker.toUpperCase(), { data: quote, timestamp: now });
  return quote;
}

async function getCachedKRQuote(ticker: string): Promise<StockQuote> {
  const now = Date.now();
  const cached = quoteCacheMap.get(ticker.toUpperCase());
  if (cached && now - cached.timestamp < QUOTE_CACHE_TTL_MS) {
    return cached.data;
  }
  const quote = await fetchKRStockQuote(ticker);
  quoteCacheMap.set(ticker.toUpperCase(), { data: quote, timestamp: now });
  return quote;
}

// --------------------------------------------------------------------------
// 4. 배치 시세 & 환율 종합 수집 함수
// --------------------------------------------------------------------------
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
    ...usTickers.map((t) => getCachedUSQuote(t, rate)),
    ...krTickers.map((t) => getCachedKRQuote(t)),
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
// Mock Fallback Quotes (API 미지원/오류 시 최종 보완)
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
