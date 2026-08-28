// API Client for Alexandria Backend & Next.js API Routes

// 브라우저는 항상 Next.js 프록시를 호출한다. FastAPI의 실제 주소는 서버 환경변수로만 관리한다.
const API_BASE_URL = "/api/backend";

export interface PortfolioSummary {
  total_valuation_krw: number;
  total_valuation_usd: number;
  total_invested_krw: number;
  total_invested_usd: number;
  total_return_krw: number;
  total_return_usd: number;
  total_return_pct: number;
  today_change_krw: number;
  today_change_usd: number;
  today_change_pct: number;
  exchange_rate: number;
  holding_count: number;
}

export interface HoldingItem {
  id: number;
  account_id: number;
  account_name: string;
  asset_id: number;
  ticker: string;
  asset_name: string;
  market: string;
  asset_type: string;
  quantity: number;
  average_buy_price: number;
  currency: string;
  current_price: number;
  valuation: number;
  invested_cost: number;
  unrealized_pnl: number;
  return_pct: number;
}

export interface TransactionPayload {
  account_id: number;
  ticker: string;
  type: "BUY" | "SELL" | "DIVIDEND";
  quantity: number;
  price: number;
  currency?: string;
  exchange_rate?: number;
  notes?: string;
  transacted_at?: string;
}

export interface ManualAssetPayload {
  type?: "BUY" | "SELL" | "DIVIDEND" | "DEPOSIT" | "WITHDRAW" | "매수" | "매도" | "배당금" | "입금" | "출금";
  brokerage: string;
  ticker?: string;
  name?: string;
  market?: "US" | "KR";
  quantity?: number;
  price?: number;
  average_buy_price?: number;
  amount?: number;
  currency?: "USD" | "KRW";
  transacted_at?: string;
  notes?: string;
}

export interface ParsedRowItem {
  row_index: number;
  account: string;
  date: string;
  ticker: string;
  name: string;
  type: "BUY" | "SELL" | "DIVIDEND";
  quantity: number;
  price: number;
  currency: "USD" | "KRW";
  total_amount: number;
  status: "VALID" | "WARNING" | "INVALID";
  warning?: string;
  selected?: boolean;
}

export async function fetchPortfolioSummary(): Promise<PortfolioSummary> {
  try {
    const res = await fetch(`${API_BASE_URL}/portfolio/summary`, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch portfolio summary");
    return await res.json();
  } catch (err) {
    return {
      total_valuation_krw: 172540000,
      total_valuation_usd: 124500,
      total_invested_krw: 138000000,
      total_invested_usd: 99600,
      total_return_krw: 34540000,
      total_return_usd: 24900,
      total_return_pct: 25.03,
      today_change_krw: 1662000,
      today_change_usd: 1200,
      today_change_pct: 0.97,
      exchange_rate: 1385.50,
      holding_count: 7
    };
  }
}

export async function fetchHoldings(filters?: { market?: string; account_id?: number }): Promise<HoldingItem[]> {
  try {
    const params = new URLSearchParams();
    if (filters?.market && filters.market !== "all") params.append("market", filters.market);
    if (filters?.account_id) params.append("account_id", String(filters.account_id));
    
    const res = await fetch(`${API_BASE_URL}/portfolio/holdings?${params.toString()}`, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch holdings");
    return await res.json();
  } catch (err) {
    return [
      { id: 1, account_id: 1, account_name: "Fidelity", asset_id: 1, ticker: "NVDA", asset_name: "엔비디아", market: "US", asset_type: "stock", quantity: 45, average_buy_price: 520, currency: "USD", current_price: 945.50, valuation: 42547.50, invested_cost: 23400.00, unrealized_pnl: 19147.50, return_pct: 81.83 },
      { id: 2, account_id: 1, account_name: "Fidelity", asset_id: 2, ticker: "AAPL", asset_name: "애플", market: "US", asset_type: "stock", quantity: 50, average_buy_price: 150, currency: "USD", current_price: 192.42, valuation: 9621.00, invested_cost: 7500.00, unrealized_pnl: 2121.00, return_pct: 28.28 },
      { id: 3, account_id: 2, account_name: "토스증권", asset_id: 2, ticker: "AAPL", asset_name: "애플", market: "US", asset_type: "stock", quantity: 30, average_buy_price: 160, currency: "USD", current_price: 192.42, valuation: 5772.60, invested_cost: 4800.00, unrealized_pnl: 972.60, return_pct: 20.26 },
      { id: 4, account_id: 2, account_name: "토스증권", asset_id: 3, ticker: "MSFT", asset_name: "마이크로소프트", market: "US", asset_type: "stock", quantity: 40, average_buy_price: 330, currency: "USD", current_price: 428.15, valuation: 17126.00, invested_cost: 13200.00, unrealized_pnl: 3926.00, return_pct: 29.74 },
      { id: 5, account_id: 3, account_name: "카카오페이증권", asset_id: 5, ticker: "TSLA", asset_name: "테슬라", market: "US", asset_type: "stock", quantity: 35, average_buy_price: 190, currency: "USD", current_price: 178.50, valuation: 6247.50, invested_cost: 6650.00, unrealized_pnl: -402.50, return_pct: -6.05 },
      { id: 6, account_id: 3, account_name: "카카오페이증권", asset_id: 6, ticker: "O", asset_name: "리얼티 인컴", market: "US", asset_type: "stock", quantity: 120, average_buy_price: 52, currency: "USD", current_price: 54.20, valuation: 6504.00, invested_cost: 6240.00, unrealized_pnl: 264.00, return_pct: 4.23 }
    ];
  }
}

export async function createTransaction(payload: TransactionPayload) {
  const res = await fetch(`${API_BASE_URL}/transactions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error("체결 등록 실패");
  return await res.json();
}

export async function updateTransaction(id: number, payload: Partial<Omit<TransactionPayload, "ticker">>) {
  const res = await fetch(`${API_BASE_URL}/transactions/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || "체결 수정 실패");
  return await res.json();
}

export async function deleteTransaction(id: number) {
  const res = await fetch(`${API_BASE_URL}/transactions/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || "체결 삭제 실패");
  return await res.json();
}

export async function addManualAsset(payload: ManualAssetPayload) {
  const res = await fetch(`${API_BASE_URL}/portfolio/assets/manual`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error("수동 자산 등록 실패");
  return await res.json();
}

export async function parseExcelFile(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE_URL}/hub/parse-excel`, {
    method: "POST",
    body: formData
  });
  if (!res.ok) throw new Error("엑셀 파일 분석 실패");
  return await res.json();
}

export async function parsePdfFile(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE_URL}/hub/parse-pdf`, {
    method: "POST",
    body: formData
  });
  if (!res.ok) throw new Error("PDF 파일 분석 실패");
  return await res.json();
}

export async function commitBatchImport(items: ParsedRowItem[]) {
  const res = await fetch(`${API_BASE_URL}/hub/commit-batch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items })
  });
  if (!res.ok) throw new Error("일괄 반영 실패");
  return await res.json();
}
