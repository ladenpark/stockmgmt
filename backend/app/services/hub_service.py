import io
import pandas as pd
from typing import Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.holding import Holding
from app.models.transaction import Transaction
from app.schemas.schemas import TransactionCreate
from app.services.transaction_service import transaction_service

class HubService:
    @staticmethod
    async def parse_and_import_excel(db: AsyncSession, file_bytes: bytes) -> Dict[str, Any]:
        """가계부형 Excel(.xlsx) 파일을 파싱하여 DB에 일괄 등록"""
        try:
            df = pd.read_excel(io.BytesIO(file_bytes))
            # Expected columns: 계좌, 종목코드, 종목명, 거래구분, 수량, 체결단가, 통화
            imported_count = 0
            for _, row in df.iterrows():
                account_id = 1
                ticker = str(row.get("종목코드", row.get("ticker", "AAPL"))).strip()
                tx_type = str(row.get("거래구분", row.get("type", "BUY"))).strip().upper()
                quantity = float(row.get("수량", row.get("quantity", 10)))
                price = float(row.get("체결단가", row.get("price", 100.0)))
                currency = str(row.get("통화", row.get("currency", "USD"))).strip().upper()

                tx_data = TransactionCreate(
                    account_id=account_id,
                    ticker=ticker,
                    type=tx_type,
                    quantity=quantity,
                    price=price,
                    currency=currency,
                    notes="Excel 일괄 동기화"
                )
                await transaction_service.create_transaction(db, tx_data)
                imported_count += 1

            return {
                "success": True,
                "message": f"총 {imported_count}건의 거래 내역이 성공적으로 동기화되었습니다.",
                "imported_count": imported_count
            }
        except Exception as e:
            return {
                "success": False,
                "error": f"엑셀 파일 처리 중 오류가 발생했습니다: {str(e)}"
            }

    @staticmethod
    async def simulate_pdf_analysis(file_name: str) -> Dict[str, Any]:
        """증권사 PDF 스마트 OCR/LLM 분석 시뮬레이션 결과 반환"""
        return {
            "success": True,
            "document_name": file_name,
            "brokerage_detected": "토스증권 (Toss Securities)",
            "statement_date": "2024-05-31",
            "extracted_holdings": [
                {"ticker": "NVDA", "name": "엔비디아", "shares": 15, "avg_price_usd": 850.00, "current_price_usd": 945.50},
                {"ticker": "AAPL", "name": "애플", "shares": 25, "avg_price_usd": 180.00, "current_price_usd": 192.42},
                {"ticker": "005930", "name": "삼성전자", "shares": 100, "avg_price_krw": 72000, "current_price_krw": 78000}
            ],
            "total_valuation_extracted_krw": 48650000,
            "confidence_score": 0.985
        }

hub_service = HubService()
