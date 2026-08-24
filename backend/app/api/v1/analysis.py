from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.schemas.schemas import (
    DividendAnalysisResponse, ProfitAnalysisResponse, TaxAnalysisResponse,
    TrendAnalysisResponse, WeightAnalysisResponse
)
from app.services.analysis_service import analysis_service

router = APIRouter(prefix="/analysis", tags=["Analysis Reports"])

@router.get("/dividend", response_model=DividendAnalysisResponse, summary="[Tab 4.1] 배당 캘린더 및 지급 예정 타임라인")
async def get_dividend_analysis(db: AsyncSession = Depends(get_db)):
    """연간 예상 배당금 총액, 월별 배당금 바 차트 및 당월 지급 예정 타임라인 반환"""
    return await analysis_service.get_dividend_analysis(db)

@router.get("/profit", response_model=ProfitAnalysisResponse, summary="[Tab 4.2] 기간별 수익 분해 분석")
async def get_profit_analysis(db: AsyncSession = Depends(get_db)):
    """미실현 평가익, 확정 실현손익, 누적 배당금 분해 집계 반환"""
    return await analysis_service.get_profit_analysis(db)

@router.get("/tax", response_model=TaxAnalysisResponse, summary="[Tab 4.3] 해외주식 양도소득세 22% 시뮬레이터")
async def get_tax_analysis(
    year: int = Query(2024, description="과세 연도"),
    db: AsyncSession = Depends(get_db)
):
    """연간 확정 실현손익에서 기본공제 250만원을 차감한 과세표준 및 예상 납부세액(22%) 산출"""
    return await analysis_service.get_tax_analysis(db, year)

@router.get("/trend", response_model=TrendAnalysisResponse, summary="[Tab 4.4] 총 자산 vs 원금 누적 추이")
async def get_trend_analysis(
    period: str = Query("1Y", description="기간 (1M, 6M, 1Y, ALL)"),
    db: AsyncSession = Depends(get_db)
):
    """투자 원금 대비 자산 평가금 성장 곡선 시계열 데이터 반환"""
    return await analysis_service.get_trend_analysis(db, period)

@router.get("/weight", response_model=WeightAnalysisResponse, summary="[Tab 4.5] 포트폴리오 비중 분석")
async def get_weight_analysis(
    category: str = Query("stocks", description="비중 기준 (stocks: 종목별, assets: 자산군별, accounts: 계좌별)"),
    db: AsyncSession = Depends(get_db)
):
    """종목별, 자산군별, 계좌별 포트폴리오 비중 도넛 차트 및 랭킹 데이터 반환"""
    return await analysis_service.get_weight_analysis(db, category)
