from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.schemas.schemas import WhatIfCreate, WhatIfItemResponse, WhatIfSummaryResponse
from app.services.whatif_service import whatif_service

router = APIRouter(prefix="/what-if", tags=["What-If Simulation"])

@router.get("/summary", response_model=WhatIfSummaryResponse, summary="[Tab 3] What-If 기회비용 및 가상 포트폴리오 요약")
async def get_whatif_summary(db: AsyncSession = Depends(get_db)):
    """'만약 팔지 않았다면?' 과거 매도 종목의 놓친 수익과 가상 보유 종목 시뮬레이션 결과 반환"""
    return await whatif_service.get_whatif_summary(db)

@router.post("", response_model=WhatIfItemResponse, summary="가상 보유 / 과거 매도 What-If 종목 등록")
async def create_whatif_item(data: WhatIfCreate, db: AsyncSession = Depends(get_db)):
    """새로운 가상 보유 종목 또는 과거 매도 종목 등록"""
    return await whatif_service.create_whatif_item(db, data)

@router.delete("/{item_id}", summary="What-If 항목 삭제")
async def delete_whatif_item(item_id: int, db: AsyncSession = Depends(get_db)):
    if not await whatif_service.delete_whatif_item(db, item_id):
        raise HTTPException(status_code=404, detail="해당 What-If 항목을 찾을 수 없습니다.")
    return {"success": True}
