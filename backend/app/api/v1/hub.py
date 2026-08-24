from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.services.hub_service import hub_service

router = APIRouter(prefix="/hub", tags=["Data Hub"])

@router.post("/excel/upload", summary="[Tab 5.1] 가계부형 엑셀 파일 일괄 동기화")
async def upload_excel_file(
    file: UploadFile = File(..., description="Excel (.xlsx, .csv) 파일"),
    db: AsyncSession = Depends(get_db)
):
    """업로드된 엑셀 파일 내역을 파싱하여 DB에 일괄 등록"""
    if not file.filename.endswith(('.xlsx', '.xls', '.csv')):
        raise HTTPException(status_code=400, detail="지원되지 않는 파일 형식입니다. (.xlsx 파일 필요)")
    
    contents = await file.read()
    result = await hub_service.parse_and_import_excel(db, contents)
    return result

@router.post("/pdf/ocr", summary="[Tab 5.2] 증권사 잔고명세서 PDF AI 자동 인식")
async def analyze_pdf_file(
    file: UploadFile = File(..., description="증권사 잔고명세서 PDF 파일")
):
    """증권사 PDF를 파싱하여 종목, 보유수량, 매입단가를 자동 추출하는 시뮬레이션 결과 반환"""
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="PDF 파일만 업로드 가능합니다.")
    
    return await hub_service.simulate_pdf_analysis(file.filename)
