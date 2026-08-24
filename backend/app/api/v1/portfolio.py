from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.database import get_db
from app.models.account import Account
from app.schemas.schemas import (
    PortfolioSummaryResponse, HoldingResponse, AccountResponse
)
from app.services.portfolio_service import portfolio_service

router = APIRouter(prefix="/portfolio", tags=["Portfolio"])

@router.get("/summary", response_model=PortfolioSummaryResponse, summary="총 자산 포트폴리오 요약 조회")
async def get_portfolio_summary(db: AsyncSession = Depends(get_db)):
    """총 자산 평가액(KRW/USD), 매입원금, 총수익률, 일간 변동(±Δ) 집계 반환"""
    return await portfolio_service.get_portfolio_summary(db)

@router.get("/holdings", response_model=List[HoldingResponse], summary="다차원 필터링 보유 종목 리스트")
async def get_holdings(
    market: Optional[str] = Query(None, description="시장 구분 (KR, US)"),
    account_id: Optional[int] = Query(None, description="계좌 ID"),
    asset_type: Optional[str] = Query(None, description="자산 유형 (stock, crypto, cash, pension)"),
    currency: Optional[str] = Query(None, description="통화 (KRW, USD)"),
    db: AsyncSession = Depends(get_db)
):
    """시장, 계좌, 자산군, 통화 필터가 적용된 보유 종목 리스트 반환"""
    return await portfolio_service.get_holdings(
        db, market=market, account_id=account_id, asset_type=asset_type, currency=currency
    )

@router.get("/accounts", response_model=List[AccountResponse], summary="연동 계좌 목록 조회")
async def get_accounts(db: AsyncSession = Depends(get_db)):
    """등록된 연동 계좌 목록 반환"""
    stmt = select(Account).where(Account.is_active == True)
    res = await db.execute(stmt)
    return res.scalars().all()

@router.post("/assets/manual", summary="[Tab 1.1] 초기 자산 및 보유 종목 수동 직접 등록")
async def add_manual_asset(
    payload: dict,
    db: AsyncSession = Depends(get_db)
):
    """사용자가 직접 계좌, 종목, 수량, 평단가를 입력하여 DB에 등록합니다."""
    brokerage = payload.get("brokerage", "기본 계좌")
    ticker = payload.get("ticker", "")
    name = payload.get("name", ticker)
    market = payload.get("market", "US")
    quantity = float(payload.get("quantity", 0))
    average_buy_price = float(payload.get("average_buy_price", 0))
    currency = payload.get("currency", "USD")
    transacted_at = payload.get("transacted_at")

    if not ticker or quantity <= 0 or average_buy_price <= 0:
        return {"success": False, "error": "종목코드, 수량, 매입단가를 올바르게 입력해주세요."}

    return await portfolio_service.add_manual_asset(
        db,
        brokerage=brokerage,
        ticker=ticker,
        name=name,
        market=market,
        quantity=quantity,
        average_buy_price=average_buy_price,
        currency=currency,
        transacted_at=transacted_at
    )

