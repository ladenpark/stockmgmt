from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class Holding(Base):
    """계좌별 보유 잔고 테이블"""
    __tablename__ = "holdings"
    __table_args__ = {"comment": "계좌별 종목 보유 수량 및 평균 매입단가"}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, comment="보유 잔고 ID")
    account_id = Column(Integer, ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False, comment="계좌 ID (accounts.id)")
    asset_id = Column(Integer, ForeignKey("assets.id", ondelete="CASCADE"), nullable=False, comment="자산 ID (assets.id)")
    quantity = Column(Float, nullable=False, default=0.0, comment="보유 수량 (주/코인)")
    average_buy_price = Column(Float, nullable=False, default=0.0, comment="평균 매입단가 (해당 자산 기준 통화)")
    currency = Column(String(10), nullable=False, default="USD", comment="거래/평단 통화 (USD, KRW)")
    created_at = Column(DateTime, default=datetime.utcnow, comment="보유 생성 일시")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, comment="보유 갱신 일시")

    # Relationships
    account = relationship("Account", back_populates="holdings")
    asset = relationship("Asset", back_populates="holdings")
