from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.schemas.schemas import TransactionCreate, TransactionResponse, TransactionUpdate
from app.services.transaction_service import transaction_service

router = APIRouter(prefix="/transactions", tags=["Transactions"])

@router.post("", response_model=TransactionResponse, summary="[P-102] 키패드 체결 내역 등록")
async def create_transaction(data: TransactionCreate, db: AsyncSession = Depends(get_db)):
    """P-102 가상 키패드로 입력한 매수/매도/배당 체결 등록 및 평단가/실현손익 자동 계산"""
    return await transaction_service.create_transaction(db, data)

@router.get("", response_model=List[TransactionResponse], summary="체결 내역 이력 목록 조회")
async def get_transactions(
    ticker: Optional[str] = Query(None, description="종목 티커"),
    account_id: Optional[int] = Query(None, description="계좌 ID"),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db)
):
    """체결 이력 목록 조회"""
    return await transaction_service.get_transactions(db, ticker=ticker, account_id=account_id, limit=limit)

@router.delete("/{tx_id}", summary="체결 내역 삭제")
async def delete_transaction(tx_id: int, db: AsyncSession = Depends(get_db)):
    """체결 내역 단건 삭제"""
    try:
        deleted = await transaction_service.delete_transaction(db, tx_id)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc))
    if not deleted:
        raise HTTPException(status_code=404, detail="해당 체결 내역을 찾을 수 없습니다.")
    return {"success": True, "message": "체결 내역이 삭제되었습니다."}

@router.patch("/{tx_id}", response_model=TransactionResponse, summary="체결 내역 수정")
async def update_transaction(tx_id: int, data: TransactionUpdate, db: AsyncSession = Depends(get_db)):
    """체결 단가·수량·거래일 등을 수정하고 잔고와 실현손익을 재계산합니다."""
    try:
        return await transaction_service.update_transaction(db, tx_id, data)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc))
