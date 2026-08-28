from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.schemas.schemas import StockDetailResponse
from app.services.portfolio_service import portfolio_service
from app.services.stock_service import stock_service

router = APIRouter(prefix="/stocks", tags=["Stocks"])

@router.get("/search", summary="외부 종목 검색")
async def search_stocks(q: str = Query(..., min_length=1), limit: int = Query(10, ge=1, le=20)):
    """Yahoo Finance 검색 API를 통한 종목명·티커 자동완성 데이터입니다."""
    return {"success": True, "data": await stock_service.search_stocks(q.strip(), limit), "source": "yahoo_finance"}

@router.get("/quote/{ticker}", summary="실시간 시세 단건 조회")
async def get_stock_quote(ticker: str):
    """특정 티커의 실시간/캐시 현재가 및 당일 등락률 반환"""
    return stock_service.get_stock_price(ticker)

@router.get("/{ticker}", response_model=StockDetailResponse, summary="[P-101] 종목 상세 페이지 데이터 조회")
async def get_stock_detail(ticker: str, db: AsyncSession = Depends(get_db)):
    """P-101 종목 상세 화면 (현재가, 계좌별 분할 보유량, 거래 체결 이력 타임라인) 반환"""
    data = await portfolio_service.get_stock_detail(db, ticker)
    if not data:
        raise HTTPException(status_code=404, detail=f"종목 '{ticker}'을(를) 찾을 수 없습니다.")
    return data
