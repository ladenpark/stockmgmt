from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.orm import relationship
from app.core.database import Base

class Account(Base):
    """증권사 및 연동 계좌 테이블"""
    __tablename__ = "accounts"
    __table_args__ = {"comment": "증권사 및 포트폴리오 연동 계좌"}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, comment="계좌 고유 ID")
    name = Column(String(100), nullable=False, comment="계좌명 또는 증권사명 (예: Fidelity, 토스증권, 카카오페이)")
    brokerage_code = Column(String(50), nullable=True, comment="증권사 코드 (예: FIDELITY, TOSS, KAKAO, MIRAE)")
    account_number = Column(String(50), nullable=True, comment="마스킹된 계좌번호")
    color = Column(String(20), nullable=True, default="#094cb2", comment="계좌 대표 테마 색상 (HEX)")
    cash_balance = Column(Float, nullable=False, default=0.0, comment="계좌별 예수금 현금 잔고")
    currency = Column(String(10), nullable=False, default="KRW", comment="기본 통화 (KRW, USD)")
    is_active = Column(Boolean, default=True, comment="계좌 활성화 여부 (True: 활성, False: 비활성)")
    created_at = Column(DateTime, default=datetime.utcnow, comment="계좌 등록 일시")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, comment="계좌 수정 일시")

    # Relationships
    holdings = relationship("Holding", back_populates="account", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="account", cascade="all, delete-orphan")
