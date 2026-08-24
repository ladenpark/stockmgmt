from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

class Transaction(Base):
    """매수 / 매도 / 배당 체결 이력 테이블"""
    __tablename__ = "transactions"
    __table_args__ = {"comment": "주식, 코인 매수/매도/배당 체결 기록 및 실현손익"}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, comment="거래 ID")
    account_id = Column(Integer, ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False, comment="체결 계좌 ID (accounts.id)")
    asset_id = Column(Integer, ForeignKey("assets.id", ondelete="SET NULL"), nullable=True, comment="체결 자산 ID (종목 거래 시, 입출금 시 NULL)")
    
    type = Column(String(20), nullable=False, comment="거래 구분 (BUY: 매수, SELL: 매도, DIVIDEND: 배당금, DEPOSIT: 입금, WITHDRAW: 출금)")
    quantity = Column(Float, nullable=False, default=0.0, comment="체결 수량 (주)")
    price = Column(Float, nullable=False, default=0.0, comment="체결 단가 (해당 거래 통화)")
    currency = Column(String(10), nullable=False, default="USD", comment="체결 통화 (USD, KRW)")
    exchange_rate = Column(Float, nullable=True, default=1385.50, comment="체결 시점 환율 (KRW/USD)")
    
    # 매도 시 확정 실현 손익
    realized_pnl = Column(Float, nullable=True, default=0.0, comment="확정 실현 손익 (해당 거래 통화)")
    
    notes = Column(Text, nullable=True, comment="거래 메모")
    transacted_at = Column(DateTime, nullable=False, default=datetime.utcnow, comment="실제 체결 일시")
    created_at = Column(DateTime, default=datetime.utcnow, comment="시스템 등록 일시")

    # Relationships
    account = relationship("Account", back_populates="transactions")
    asset = relationship("Asset", back_populates="transactions")
