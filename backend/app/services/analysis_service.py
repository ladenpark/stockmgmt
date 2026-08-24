from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.core.config import settings
from app.models.holding import Holding
from app.models.transaction import Transaction
from app.schemas.schemas import (
    DividendAnalysisResponse, MonthlyDividendItem, DividendTimelineItem,
    ProfitAnalysisResponse, TaxAnalysisResponse, TrendAnalysisResponse,
    TrendPointItem, WeightAnalysisResponse, WeightItem
)
from app.services.stock_service import stock_service

class AnalysisService:
    @staticmethod
    async def get_dividend_analysis(db: AsyncSession) -> DividendAnalysisResponse:
        """1. 배당 분석 (연간 예상 배당금, 월별 캘린더, 지급 예정 타임라인)"""
        rate = stock_service.get_exchange_rate()
        
        # Monthly dividend estimates
        monthly_estimates = [
            ("1월", 185.0), ("2월", 120.0), ("3월", 295.0),
            ("4월", 190.0), ("5월", 220.0), ("6월", 310.0),
            ("7월", 185.0), ("8월", 140.0), ("9월", 295.0),
            ("10월", 190.0), ("11월", 210.0), ("12월", 320.0)
        ]
        
        monthly_items = [
            MonthlyDividendItem(
                month_name=m,
                amount_usd=val,
                amount_krw=round(val * rate, 0)
            ) for m, val in monthly_estimates
        ]
        
        annual_usd = sum(val for _, val in monthly_estimates)
        annual_krw = annual_usd * rate
        
        timeline = [
            DividendTimelineItem(
                ticker="AAPL", name="Apple Inc.", pay_date="2024.05.16",
                ex_date="2024.05.10", amount_usd=25.0, amount_krw=round(25.0 * rate, 0), status="지급완료"
            ),
            DividendTimelineItem(
                ticker="MSFT", name="Microsoft Corp", pay_date="2024.06.13",
                ex_date="2024.05.15", amount_usd=30.0, amount_krw=round(30.0 * rate, 0), status="지급예정"
            ),
            DividendTimelineItem(
                ticker="O", name="Realty Income", pay_date="2024.05.15",
                ex_date="2024.04.30", amount_usd=18.50, amount_krw=round(18.50 * rate, 0), status="지급완료"
            )
        ]

        return DividendAnalysisResponse(
            annual_dividend_usd=round(annual_usd, 2),
            annual_dividend_krw=round(annual_krw, 0),
            dividend_yield_pct=3.52,
            monthly_dividends=monthly_items,
            timeline=timeline
        )

    @staticmethod
    async def get_profit_analysis(db: AsyncSession) -> ProfitAnalysisResponse:
        """2. 수익 분해 분석 (미실현 평가익, 확정 실현손익, 누적 배당금)"""
        rate = stock_service.get_exchange_rate()
        
        stmt = select(Holding).options(selectinload(Holding.asset))
        result = await db.execute(stmt)
        holdings = result.scalars().all()

        unrealized_usd = 0.0
        for h in holdings:
            price_info = stock_service.get_stock_price(h.asset.ticker)
            val = h.quantity * price_info["price"]
            cost = h.quantity * h.average_buy_price
            unrealized_usd += (val - cost)

        realized_usd = 4635.00
        dividend_usd = 2400.00
        net_profit_usd = unrealized_usd + realized_usd + dividend_usd

        return ProfitAnalysisResponse(
            net_profit_krw=round(net_profit_usd * rate, 0),
            net_profit_usd=round(net_profit_usd, 2),
            unrealized_pnl_krw=round(unrealized_usd * rate, 0),
            unrealized_pnl_usd=round(unrealized_usd, 2),
            realized_pnl_krw=round(realized_usd * rate, 0),
            realized_pnl_usd=round(realized_usd, 2),
            dividend_total_krw=round(dividend_usd * rate, 0),
            dividend_total_usd=round(dividend_usd, 2)
        )

    @staticmethod
    async def get_tax_analysis(db: AsyncSession, year: int = 2024) -> TaxAnalysisResponse:
        """3. 해외주식 양도소득세 22% 시뮬레이터 (연간 기본공제 250만원 적용)"""
        rate = stock_service.get_exchange_rate()
        
        # In a real app, query Transaction where type == 'SELL' and extract year
        total_realized_usd = 12700.00
        total_realized_krw = total_realized_usd * rate
        
        deduction_krw = settings.OVERSEAS_TAX_DEDUCTION_KRW  # 2,500,000 KRW
        taxable_krw = max(0.0, total_realized_krw - deduction_krw)
        estimated_tax_krw = taxable_krw * settings.OVERSEAS_TAX_RATE  # 22%

        return TaxAnalysisResponse(
            year=year,
            total_realized_gain_usd=round(total_realized_usd, 2),
            total_realized_gain_krw=round(total_realized_krw, 0),
            deduction_krw=round(deduction_krw, 0),
            taxable_income_krw=round(taxable_krw, 0),
            tax_rate_pct=round(settings.OVERSEAS_TAX_RATE * 100, 1),
            estimated_tax_krw=round(estimated_tax_krw, 0)
        )

    @staticmethod
    async def get_trend_analysis(db: AsyncSession, period: str = "1Y") -> TrendAnalysisResponse:
        """4. 자산 vs 원금 누적 추이 분석"""
        rate = stock_service.get_exchange_rate()
        
        points_data = [
            ("2023.06", 80000, 83000),
            ("2023.08", 85000, 92000),
            ("2023.10", 90000, 95000),
            ("2023.12", 95000, 106000),
            ("2024.02", 98000, 114000),
            ("2024.04", 100000, 121000),
            ("2024.05", 100000, 124500)
        ]
        
        points = [
            TrendPointItem(
                label=lbl,
                principal_usd=p,
                valuation_usd=v,
                principal_krw=round(p * rate, 0),
                valuation_krw=round(v * rate, 0)
            ) for lbl, p, v in points_data
        ]

        return TrendAnalysisResponse(period=period, points=points)

    @staticmethod
    async def get_weight_analysis(db: AsyncSession, category_type: str = "stocks") -> WeightAnalysisResponse:
        """5. 비중 분석 (종목별 / 자산군별 / 계좌별)"""
        rate = stock_service.get_exchange_rate()
        
        if category_type == "assets":
            items_data = [
                ("미국 주식/ETF", "US_EQUITY", 98500.0, 79.1, "#094cb2"),
                ("국내 주식", "KR_EQUITY", 18000.0, 14.5, "#3366cc"),
                ("현금 (USD/KRW)", "CASH", 8000.0, 6.4, "#6d5e00")
            ]
        elif category_type == "accounts":
            items_data = [
                ("Fidelity Investments", "FIDELITY", 65420.0, 52.5, "#094cb2"),
                ("토스증권", "TOSS", 34615.0, 27.8, "#3366cc"),
                ("카카오페이증권", "KAKAO", 24465.0, 19.7, "#6d5e00")
            ]
        else:  # stocks
            items_data = [
                ("NVIDIA", "NVDA", 42547.5, 34.2, "#094cb2"),
                ("Apple Inc.", "AAPL", 25400.0, 20.4, "#3366cc"),
                ("Microsoft", "MSFT", 17126.0, 13.8, "#bfab49"),
                ("Tesla", "TSLA", 6247.5, 5.0, "#ba1a1a"),
                ("기타 종목", "OTHERS", 33179.0, 26.6, "#737784")
            ]

        items = [
            WeightItem(
                name=name,
                ticker_or_code=code,
                valuation_usd=val,
                valuation_krw=round(val * rate, 0),
                percentage=pct,
                color=color
            ) for name, code, val, pct, color in items_data
        ]

        return WeightAnalysisResponse(category=category_type, items=items)

analysis_service = AnalysisService()
