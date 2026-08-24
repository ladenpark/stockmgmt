from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Body
from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.services.hub_service import hub_service

router = APIRouter(prefix="/hub", tags=["Data Hub"])

@router.post("/parse-excel", summary="[Tab 5.1] 엑셀/CSV 파일 파싱 및 미리보기")
async def parse_excel_preview(
    file: UploadFile = File(..., description="Excel (.xlsx, .xls, .csv) 파일")
):
    """업로드된 엑셀/CSV 파일을 파싱하여 화면에 미리보기 그리드로 표시할 데이터를 반환합니다."""
    if not file.filename.lower().endswith(('.xlsx', '.xls', '.csv')):
        raise HTTPException(status_code=400, detail="지원되지 않는 파일 형식입니다. (.xlsx, .xls, .csv 필요)")

    contents = await file.read()
    result = hub_service.parse_excel_preview(contents, file.filename)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "엑셀 파싱 오류"))
    return result

@router.post("/parse-pdf", summary="[Tab 5.2] 증권사 거래명세서/잔고 PDF 파싱 및 미리보기")
async def parse_pdf_preview(
    file: UploadFile = File(..., description="증권사 PDF 파일")
):
    """증권사 PDF를 분석하여 종목, 보유수량, 단가를 추출하여 미리보기 데이터를 반환합니다."""
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="PDF 파일만 업로드 가능합니다.")

    contents = await file.read()
    result = hub_service.parse_pdf_preview(contents, file.filename)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "PDF 파싱 오류"))
    return result

@router.post("/commit-batch", summary="[Tab 5.3] 미리보기에서 승인된 종목/체결 내역 DB 일괄 저장")
async def commit_batch_import(
    items: List[Dict[str, Any]] = Body(..., description="미리보기에서 선택된 항목 목록"),
    db: AsyncSession = Depends(get_db)
):
    """사용자가 확인하고 승인한 거래/잔고 내역을 DB에 일괄 적재합니다."""
    if not items:
        raise HTTPException(status_code=400, detail="저장할 항목이 없습니다.")

    result = await hub_service.commit_batch_import(db, items)
    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("error", "DB 저장 오류"))
    return result
