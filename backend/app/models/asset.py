from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime
from sqlalchemy.orm import relationship
from app.core.database import Base

class Asset(Base):
    """주식 / 코인 / 현금 자산 마스터 테이블"""
    __tablename__ = "assets"
    __table_args__ = {"comment": "주식, ETF, 코인, 현금 등 기초 자산 마스터"}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, comment="자산 고유 ID")
    ticker = Column(String(30), unique=True, index=True, nullable=False, comment="종목 티커 또는 심볼 (예: AAPL, NVDA, 005930, BTC)")
    name = Column(String(100), nullable=False, comment="종목명 (한국어, 예: 애플, 삼성전자)")
    name_en = Column(String(150), nullable=True, comment="영문 종목명 (예: Apple Inc.)")
    market = Column(String(20), nullable=False, default="US", comment="시장 구분 (US: 미국, KR: 한국, CRYPTO: 가상자산)")
    asset_type = Column(String(30), nullable=False, default="stock", comment="자산 유형 (stock: 주식/ETF, crypto: 코인, cash: 현금, pension: 연금)")
    category = Column(String(50), nullable=True, comment="섹터/카테고리 (예: 테크놀로지, 반도체, 월배당 리츠)")
    currency = Column(String(10), nullable=False, default="USD", comment="기본 기준 통화 (USD, KRW)")
    
    # 실시간 시세 캐시 필드
    current_price = Column(Float, nullable=False, default=0.0, comment="최신 시장 현재가 (기준 통화)")
    change_pct = Column(Float, nullable=False, default=0.0, comment="당일 등락률 (%)")
    change_amount = Column(Float, nullable=False, default=0.0, comment="당일 등락액 (기준 통화)")
    
    created_at = Column(DateTime, default=datetime.utcnow, comment="자산 등록 일시")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, comment="시세 업데이트 일시")

    # Relationships
    holdings = relationship("Holding", back_populates="asset", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="asset", cascade="all, delete-orphan")
    whatif_items = relationship("WhatIfItem", back_populates="asset", cascade="all, delete-orphan")
