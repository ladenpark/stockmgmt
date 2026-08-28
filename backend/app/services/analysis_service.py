from collections import defaultdict
from datetime import date, timedelta
from typing import Dict, List

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.models.daily_snapshot import DailySnapshot
from app.models.holding import Holding
from app.models.transaction import Transaction
from app.schemas.schemas import (
    DividendAnalysisResponse, DividendTimelineItem, MonthlyDividendItem,
    ProfitAnalysisResponse, TaxAnalysisResponse, TrendAnalysisResponse,
    TrendPointItem, WeightAnalysisResponse, WeightItem,
)
from app.services.stock_service import stock_service

_COLORS = ["#094cb2", "#3366cc", "#bfab49", "#10B981", "#8B5CF6", "#EC4899"]


class AnalysisService:
    @staticmethod
    def _to_usd(amount: float, currency: str, rate: float) -> float:
        return amount / rate if currency.upper() == "KRW" else amount

    @staticmethod
    async def _holdings(db: AsyncSession) -> List[Holding]:
        result = await db.execute(select(Holding).options(
            selectinload(Holding.asset), selectinload(Holding.account)
        ).where(Holding.quantity > 0))
        return result.scalars().all()

    @staticmethod
    async def _transactions(db: AsyncSession) -> List[Transaction]:
        result = await db.execute(select(Transaction).options(selectinload(Transaction.asset)))
        return result.scalars().all()

    @staticmethod
    async def get_dividend_analysis(db: AsyncSession) -> DividendAnalysisResponse:
        """등록된 배당 거래를 기준으로 연간 배당 내역을 집계합니다."""
        rate = stock_service.get_exchange_rate()
        monthly_usd = [0.0] * 12
        timeline: List[DividendTimelineItem] = []
        for tx in await AnalysisService._transactions(db):
            if tx.type != "DIVIDEND":
                continue
            amount = float(tx.realized_pnl or tx.quantity * tx.price)
            amount_usd = AnalysisService._to_usd(amount, tx.currency, tx.exchange_rate or rate)
            monthly_usd[tx.transacted_at.month - 1] += amount_usd
            timeline.append(DividendTimelineItem(
                ticker=tx.asset.ticker if tx.asset else "CASH",
                name=tx.asset.name if tx.asset else "배당금",
                pay_date=tx.transacted_at.strftime("%Y-%m-%d"), ex_date=None,
                amount_usd=round(amount_usd, 2), amount_krw=round(amount_usd * rate, 0), status="지급완료",
            ))
        annual_usd = sum(monthly_usd)
        holdings = await AnalysisService._holdings(db)
        invested_usd = sum(AnalysisService._to_usd(h.quantity * h.average_buy_price, h.currency, rate) for h in holdings)
        return DividendAnalysisResponse(
            annual_dividend_usd=round(annual_usd, 2), annual_dividend_krw=round(annual_usd * rate, 0),
            dividend_yield_pct=round(annual_usd / invested_usd * 100, 2) if invested_usd else 0.0,
            monthly_dividends=[MonthlyDividendItem(month_name=f"{month}월", amount_usd=round(value, 2), amount_krw=round(value * rate, 0)) for month, value in enumerate(monthly_usd, 1)],
            timeline=sorted(timeline, key=lambda item: item.pay_date, reverse=True),
        )

    @staticmethod
    async def get_profit_analysis(db: AsyncSession) -> ProfitAnalysisResponse:
        """현재 보유 평가손익과 거래 원장의 실현손익·배당을 합산합니다."""
        rate = stock_service.get_exchange_rate()
        unrealized_usd = 0.0
        for holding in await AnalysisService._holdings(db):
            quote = stock_service.get_stock_price(holding.asset.ticker)
            unrealized_usd += AnalysisService._to_usd(
                holding.quantity * (quote["price"] - holding.average_buy_price), holding.currency, rate
            )
        realized_usd = dividend_usd = 0.0
        for tx in await AnalysisService._transactions(db):
            amount_usd = AnalysisService._to_usd(float(tx.realized_pnl or 0.0), tx.currency, tx.exchange_rate or rate)
            if tx.type == "SELL":
                realized_usd += amount_usd
            elif tx.type == "DIVIDEND":
                dividend_usd += amount_usd
        net_usd = unrealized_usd + realized_usd + dividend_usd
        return ProfitAnalysisResponse(
            net_profit_krw=round(net_usd * rate, 0), net_profit_usd=round(net_usd, 2),
            unrealized_pnl_krw=round(unrealized_usd * rate, 0), unrealized_pnl_usd=round(unrealized_usd, 2),
            realized_pnl_krw=round(realized_usd * rate, 0), realized_pnl_usd=round(realized_usd, 2),
            dividend_total_krw=round(dividend_usd * rate, 0), dividend_total_usd=round(dividend_usd, 2),
        )

    @staticmethod
    async def get_tax_analysis(db: AsyncSession, year: int = 2024) -> TaxAnalysisResponse:
        """해외(US) 주식 매도의 해당 연도 실현손익으로 양도소득세를 계산합니다."""
        rate = stock_service.get_exchange_rate()
        gain_krw = 0.0
        for tx in await AnalysisService._transactions(db):
            if tx.type != "SELL" or tx.transacted_at.year != year or not tx.asset or tx.asset.market.upper() != "US":
                continue
            gain_krw += float(tx.realized_pnl or 0.0) * (tx.exchange_rate or rate) if tx.currency.upper() == "USD" else float(tx.realized_pnl or 0.0)
        taxable = max(0.0, gain_krw - settings.OVERSEAS_TAX_DEDUCTION_KRW)
        return TaxAnalysisResponse(
            year=year, total_realized_gain_usd=round(gain_krw / rate, 2), total_realized_gain_krw=round(gain_krw, 0),
            deduction_krw=settings.OVERSEAS_TAX_DEDUCTION_KRW, taxable_income_krw=round(taxable, 0),
            tax_rate_pct=settings.OVERSEAS_TAX_RATE * 100, estimated_tax_krw=round(taxable * settings.OVERSEAS_TAX_RATE, 0),
        )

    @staticmethod
    async def get_trend_analysis(db: AsyncSession, period: str = "1Y") -> TrendAnalysisResponse:
        """저장된 데일리 스냅샷으로 원금 대비 평가액 추이를 반환합니다."""
        since = {"1M": date.today() - timedelta(days=31), "6M": date.today() - timedelta(days=183), "1Y": date.today() - timedelta(days=366)}.get(period.upper())
        stmt = select(DailySnapshot).order_by(DailySnapshot.snapshot_date)
        if since:
            stmt = stmt.where(DailySnapshot.snapshot_date >= since)
        result = await db.execute(stmt)
        snapshots = result.scalars().all()
        rate = stock_service.get_exchange_rate()
        return TrendAnalysisResponse(period=period, points=[TrendPointItem(
            label=snapshot.snapshot_date.strftime("%Y-%m-%d"), principal_usd=round(snapshot.total_invested_krw / rate, 2),
            valuation_usd=snapshot.total_valuation_usd, principal_krw=snapshot.total_invested_krw,
            valuation_krw=snapshot.total_valuation_krw,
        ) for snapshot in snapshots])

    @staticmethod
    async def get_weight_analysis(db: AsyncSession, category_type: str = "stocks") -> WeightAnalysisResponse:
        """현재 평가액을 종목·자산군·계좌 단위로 집계합니다."""
        rate = stock_service.get_exchange_rate()
        groups: Dict[str, Dict[str, object]] = {}
        for holding in await AnalysisService._holdings(db):
            quote = stock_service.get_stock_price(holding.asset.ticker)
            valuation_usd = AnalysisService._to_usd(holding.quantity * quote["price"], holding.currency, rate)
            if category_type == "accounts":
                key, name = str(holding.account_id), holding.account.name if holding.account else "계좌"
            elif category_type == "assets":
                key, name = holding.asset.asset_type, holding.asset.asset_type
            else:
                key, name = holding.asset.ticker, holding.asset.name
            if key not in groups:
                groups[key] = {"name": name, "valuation_usd": 0.0}
            groups[key]["valuation_usd"] = float(groups[key]["valuation_usd"]) + valuation_usd
        total = sum(float(group["valuation_usd"]) for group in groups.values())
        items = []
        for index, (key, group) in enumerate(sorted(groups.items(), key=lambda entry: float(entry[1]["valuation_usd"]), reverse=True)):
            valuation = float(group["valuation_usd"])
            items.append(WeightItem(
                name=str(group["name"]), ticker_or_code=key, valuation_usd=round(valuation, 2),
                valuation_krw=round(valuation * rate, 0), percentage=round(valuation / total * 100, 2) if total else 0.0,
                color=_COLORS[index % len(_COLORS)],
            ))
        return WeightAnalysisResponse(category=category_type, items=items)


analysis_service = AnalysisService()
