from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

class WhatIfItem(Base):
    """What-If 시뮬레이션 데이터 테이블 (미매도 기회비용 추적 및 가상 보유)"""
    __tablename__ = "whatif_items"
    __table_args__ = {"comment": "과거 매도 종목 미매도 가정 기회비용 및 가상 보유 모의투자 종목"}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, comment="What-If ID")
    asset_id = Column(Integer, ForeignKey("assets.id", ondelete="CASCADE"), nullable=False, comment="자산 ID (assets.id)")
    
    mode = Column(String(20), nullable=False, default="DIVESTED", comment="시뮬레이션 모드 (DIVESTED: 과거 매도 종목 미매도 추적, VIRTUAL: 가상 보유 모의투자)")
    target_date = Column(String(20), nullable=False, comment="기준일 (매도일 또는 모의 매수일, 예: 2023.10)")
    
    quantity = Column(Float, nullable=False, default=0.0, comment="대상 수량 (주)")
    entry_price = Column(Float, nullable=False, default=0.0, comment="과거 매수가 또는 모의 진입가 (USD)")
    sell_price = Column(Float, nullable=True, default=0.0, comment="실제 매도가 (DIVESTED 모드용, USD)")
    
    foregone_gain = Column(Float, nullable=True, default=0.0, comment="미매도 시 현재 평가액 차액 (기회비용/회피손실, USD)")
    tag = Column(String(100), nullable=True, comment="분석 태그 (예: 최고 기회비용, 손실 회피 성공)")
    notes = Column(Text, nullable=True, comment="메모")
    
    created_at = Column(DateTime, default=datetime.utcnow, comment="등록 일시")

    # Relationships
    asset = relationship("Asset", back_populates="whatif_items")
