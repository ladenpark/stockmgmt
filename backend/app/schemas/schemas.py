from typing import Optional, List
from datetime import datetime, date
from pydantic import BaseModel, ConfigDict, Field

# ==========================================
# 1. Account Schemas
# ==========================================
class AccountBase(BaseModel):
    name: str = Field(..., description="계좌/증권사명")
    brokerage_code: Optional[str] = Field(None, description="증권사 코드")
    account_number: Optional[str] = Field(None, description="계좌번호")
    color: Optional[str] = Field("#094cb2", description="테마 색상")
    is_active: bool = Field(True, description="활성 상태")
    currency: str = Field("KRW", description="기본 통화")

class AccountCreate(AccountBase):
    pass

class AccountUpdate(BaseModel):
    name: Optional[str] = None
    brokerage_code: Optional[str] = None
    account_number: Optional[str] = None
    color: Optional[str] = None
    is_active: Optional[bool] = None
    currency: Optional[str] = None

class AccountResponse(AccountBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    cash_balance: float
    created_at: datetime
    updated_at: datetime

# ==========================================
# 2. Asset Schemas
# ==========================================
class AssetBase(BaseModel):
    ticker: str = Field(..., description="티커/심볼")
    name: str = Field(..., description="종목명")
    name_en: Optional[str] = Field(None, description="영문 종목명")
    market: str = Field("US", description="시장 구분 (KR/US/CRYPTO)")
    asset_type: str = Field("stock", description="자산 유형 (stock/crypto/cash/pension)")
    category: Optional[str] = Field(None, description="카테고리/섹터")
    currency: str = Field("USD", description="기준 통화 (USD/KRW)")

class AssetCreate(AssetBase):
    current_price: Optional[float] = 0.0

class AssetResponse(AssetBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    current_price: float
    change_pct: float
    change_amount: float
    updated_at: datetime

# ==========================================
# 3. Holding Schemas
# ==========================================
class HoldingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    account_id: int
    account_name: str
    asset_id: int
    ticker: str
    asset_name: str
    market: str
    asset_type: str
    quantity: float
    average_buy_price: float
    currency: str
    current_price: float
    previous_close: float
    change_amount: float
    change_pct: float
    valuation: float
    invested_cost: float
    unrealized_pnl: float
    return_pct: float

# ==========================================
# 4. Transaction Schemas (P-102 Keypad)
# ==========================================
class TransactionCreate(BaseModel):
    account_id: int = Field(..., description="계좌 ID")
    ticker: str = Field(..., description="종목 티커 (예: AAPL)")
    type: str = Field(..., description="거래 구분 (BUY, SELL, DIVIDEND)")
    quantity: float = Field(..., gt=0, description="수량")
    price: float = Field(..., gt=0, description="체결 단가")
    currency: str = Field("USD", description="체결 통화 (USD, KRW)")
    exchange_rate: Optional[float] = Field(1385.50, description="적용 환율")
    transacted_at: Optional[datetime] = Field(default_factory=datetime.utcnow, description="체결 일시")
    notes: Optional[str] = Field(None, description="메모")

class TransactionUpdate(BaseModel):
    account_id: Optional[int] = None
    type: Optional[str] = None
    quantity: Optional[float] = None
    price: Optional[float] = None
    currency: Optional[str] = None
    exchange_rate: Optional[float] = None
    transacted_at: Optional[datetime] = None
    notes: Optional[str] = None

class TransactionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    account_id: int
    account_name: str
    asset_id: Optional[int]
    ticker: str
    asset_name: str
    type: str
    quantity: float
    price: float
    currency: str
    exchange_rate: Optional[float]
    realized_pnl: Optional[float]
    notes: Optional[str]
    transacted_at: datetime
    created_at: datetime

# ==========================================
# 5. Portfolio Summary & Detail Schemas
# ==========================================
class PortfolioSummaryResponse(BaseModel):
    total_valuation_krw: float
    total_valuation_usd: float
    total_invested_krw: float
    total_invested_usd: float
    total_return_krw: float
    total_return_usd: float
    total_return_pct: float
    today_change_krw: float
    today_change_usd: float
    today_change_pct: float
    exchange_rate: float
    holding_count: int


# ==========================================
# 6. Stock Detail Response (P-101)
# ==========================================
class StockHoldingItem(BaseModel):
    holding_id: int
    account_id: int
    brokerage_name: str
    shares: float
    avg_price: float
    currency: str
    return_pct: float

class StockDetailResponse(BaseModel):
    asset: AssetResponse
    total_shares: float
    total_valuation: float
    total_principal: float
    total_return_amount: float
    total_return_pct: float
    realized_profit_total: float
    holdings: List[StockHoldingItem]
    transactions: List[TransactionResponse]


# ==========================================
# 7. Daily Performance Schemas (Tab 2)
# ==========================================
class DailyDetailItem(BaseModel):
    name: str
    ticker: str
    price: float
    diff_amount: float
    diff_pct: float
    shares: float
    gain_amount: float

class DailySnapshotItem(BaseModel):
    id: int
    date: str
    date_full: str
    total_valuation_usd: float
    total_valuation_krw: float
    daily_change_usd: float
    daily_change_krw: float
    daily_change_pct: float
    summary_tag: Optional[str]
    details: List[DailyDetailItem]

class DailyMatrixResponse(BaseModel):
    snapshots: List[DailySnapshotItem]
    total_count: int


# ==========================================
# 8. What-If Schemas (Tab 3)
# ==========================================
class WhatIfCreate(BaseModel):
    ticker: str
    name: Optional[str] = None
    target_date: str
    quantity: float
    entry_price: float
    sell_price: Optional[float] = None
    mode: str = "VIRTUAL"  # DIVESTED or VIRTUAL

class WhatIfItemResponse(BaseModel):
    id: int
    ticker: str
    name: str
    mode: str
    target_date: str
    quantity: float
    entry_price: float
    sell_price: Optional[float]
    current_price: float
    diff_pct: float
    foregone_gain: float
    tag: Optional[str]

class WhatIfSummaryResponse(BaseModel):
    total_foregone_usd: float
    total_foregone_krw: float
    divested_items: List[WhatIfItemResponse]
    virtual_items: List[WhatIfItemResponse]


# ==========================================
# 9. Analysis Report Schemas (Tab 4)
# ==========================================
class MonthlyDividendItem(BaseModel):
    month_name: str
    amount_usd: float
    amount_krw: float

class DividendTimelineItem(BaseModel):
    ticker: str
    name: str
    pay_date: str
    ex_date: Optional[str]
    amount_usd: float
    amount_krw: float
    status: str

class DividendAnalysisResponse(BaseModel):
    annual_dividend_usd: float
    annual_dividend_krw: float
    dividend_yield_pct: float
    monthly_dividends: List[MonthlyDividendItem]
    timeline: List[DividendTimelineItem]

class ProfitAnalysisResponse(BaseModel):
    net_profit_krw: float
    net_profit_usd: float
    unrealized_pnl_krw: float
    unrealized_pnl_usd: float
    realized_pnl_krw: float
    realized_pnl_usd: float
    dividend_total_krw: float
    dividend_total_usd: float

class TaxAnalysisResponse(BaseModel):
    year: int
    total_realized_gain_usd: float
    total_realized_gain_krw: float
    deduction_krw: float
    taxable_income_krw: float
    tax_rate_pct: float
    estimated_tax_krw: float

class TrendPointItem(BaseModel):
    label: str
    principal_usd: float
    valuation_usd: float
    principal_krw: float
    valuation_krw: float

class TrendAnalysisResponse(BaseModel):
    period: str
    points: List[TrendPointItem]

class WeightItem(BaseModel):
    name: str
    ticker_or_code: str
    valuation_usd: float
    valuation_krw: float
    percentage: float
    color: str

class WeightAnalysisResponse(BaseModel):
    category: str
    items: List[WeightItem]
