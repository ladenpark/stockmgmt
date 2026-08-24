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
