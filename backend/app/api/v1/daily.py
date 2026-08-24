from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.schemas.schemas import DailyMatrixResponse
from app.services.daily_service import daily_service

router = APIRouter(prefix="/daily", tags=["Daily Performance"])

@router.get("/matrix", response_model=DailyMatrixResponse, summary="[Tab 2] 데일리 손익 매트릭스 그리드 데이터")
async def get_daily_matrix(
    year_month: Optional[str] = Query(None, description="조회 년월 (예: 2024-05)"),
    db: AsyncSession = Depends(get_db)
):
    """일자별 총 자산 평가금, 전일비 증감액(±Δ), 일간 수익률(±%) 및 마감 종목 상세 리스트 반환"""
    return await daily_service.get_daily_matrix(db, year_month)
