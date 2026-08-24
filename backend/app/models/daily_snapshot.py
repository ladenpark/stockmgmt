from datetime import datetime, date
from sqlalchemy import Column, Integer, String, Float, DateTime, Date, JSON
from app.core.database import Base

class DailySnapshot(Base):
    """일자별 포트폴리오 평가금액 스냅샷 타임시리즈 테이블"""
    __tablename__ = "daily_snapshots"
    __table_args__ = {"comment": "일자별 총 자산 평가금 및 일간 증감액(±Δ)/수익률(±%) 스냅샷"}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, comment="스냅샷 ID")
    snapshot_date = Column(Date, unique=True, index=True, nullable=False, default=date.today, comment="스냅샷 기준일자 (YYYY-MM-DD)")
    
    total_valuation_krw = Column(Float, nullable=False, default=0.0, comment="해당 일자 총 평가금액 (KRW 환산)")
    total_valuation_usd = Column(Float, nullable=False, default=0.0, comment="해당 일자 총 평가금액 (USD 환산)")
    total_invested_krw = Column(Float, nullable=False, default=0.0, comment="총 투자 원금 (KRW 환산)")
    
    daily_change_krw = Column(Float, nullable=False, default=0.0, comment="전일 대비 변동금액 (±Δ KRW)")
    daily_change_pct = Column(Float, nullable=False, default=0.0, comment="전일 대비 일간 수익률 (±%)")
    
    summary_tag = Column(String(150), nullable=True, comment="당일 주요 시장 등락 요약 태그 (예: NVDA 실적 랠리)")
    details_json = Column(JSON, nullable=True, comment="해당 일자 종목별 마감 종가 및 손익 상세 JSON 데이터")
    
    created_at = Column(DateTime, default=datetime.utcnow, comment="스냅샷 생성 일시")
