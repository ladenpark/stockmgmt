from typing import List, Optional
from datetime import date, datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.daily_snapshot import DailySnapshot
from app.schemas.schemas import DailyMatrixResponse, DailySnapshotItem, DailyDetailItem
from app.services.stock_service import stock_service

# Default Sample Historical Snapshots if DB empty
SAMPLE_DAILY_SNAPSHOTS = [
    {
        "date": "05.24",
        "date_full": "2024-05-24",
        "total_usd": 124500.00,
        "diff_usd": 1200.00,
        "diff_pct": 0.97,
        "summary_tag": "AAPL, TSLA 상승",
        "details": [
            {"name": "Apple (AAPL)", "ticker": "AAPL", "price": 192.42, "diff_amount": 2.38, "diff_pct": 1.25, "shares": 80, "gain_amount": 190.40},
            {"name": "NVIDIA (NVDA)", "ticker": "NVDA", "price": 945.50, "diff_amount": 18.50, "diff_pct": 2.00, "shares": 45, "gain_amount": 832.50},
            {"name": "Tesla (TSLA)", "ticker": "TSLA", "price": 178.50, "diff_amount": 3.75, "diff_pct": 2.15, "shares": 35, "gain_amount": 131.25}
        ]
    },
    {
        "date": "05.23",
        "date_full": "2024-05-23",
        "total_usd": 123300.00,
        "diff_usd": -450.00,
        "diff_pct": -0.36,
        "summary_tag": "MSFT 조정",
        "details": [
            {"name": "Microsoft (MSFT)", "ticker": "MSFT", "price": 425.10, "diff_amount": -5.20, "diff_pct": -1.21, "shares": 40, "gain_amount": -208.00},
            {"name": "Samsung Elec (005930)", "ticker": "005930", "price": 56.50, "diff_amount": -0.80, "diff_pct": -1.40, "shares": 200, "gain_amount": -160.00}
        ]
    },
    {
        "date": "05.22",
        "date_full": "2024-05-22",
        "total_usd": 123750.00,
        "diff_usd": 800.00,
        "diff_pct": 0.65,
        "summary_tag": "NVDA 실적 랠리",
        "details": [
            {"name": "NVIDIA (NVDA)", "ticker": "NVDA", "price": 927.00, "diff_amount": 22.00, "diff_pct": 2.43, "shares": 45, "gain_amount": 990.00}
        ]
    },
    {
        "date": "05.21",
        "date_full": "2024-05-21",
        "total_usd": 122950.00,
        "diff_usd": 150.00,
        "diff_pct": 0.12,
        "summary_tag": "보합세 마감",
        "details": [
            {"name": "Apple (AAPL)", "ticker": "AAPL", "price": 190.04, "diff_amount": 0.80, "diff_pct": 0.42, "shares": 80, "gain_amount": 64.00}
        ]
    },
    {
        "date": "05.20",
        "date_full": "2024-05-20",
        "total_usd": 122800.00,
        "diff_usd": -1100.00,
        "diff_pct": -0.88,
        "summary_tag": "기술주 전반 하락",
        "details": [
            {"name": "Tesla (TSLA)", "ticker": "TSLA", "price": 174.75, "diff_amount": -6.50, "diff_pct": -3.58, "shares": 35, "gain_amount": -227.50},
            {"name": "NVIDIA (NVDA)", "ticker": "NVDA", "price": 905.00, "diff_amount": -15.00, "diff_pct": -1.63, "shares": 45, "gain_amount": -675.00}
        ]
    }
]

class DailyService:
    @staticmethod
    async def get_daily_matrix(db: AsyncSession, year_month: Optional[str] = None) -> DailyMatrixResponse:
        """일자별 손익 매트릭스 그리드 데이터 조회"""
        rate = stock_service.get_exchange_rate()
        stmt = select(DailySnapshot).order_by(DailySnapshot.snapshot_date.desc()).limit(30)
        result = await db.execute(stmt)
        snapshots = result.scalars().all()

        items: List[DailySnapshotItem] = []

        if not snapshots:
            # Fallback to rich sample snapshots
            for s in SAMPLE_DAILY_SNAPSHOTS:
                details = [DailyDetailItem(**d) for d in s["details"]]
                items.append(DailySnapshotItem(
                    id=0,
                    date=s["date"],
                    date_full=s["date_full"],
                    total_valuation_usd=s["total_usd"],
                    total_valuation_krw=round(s["total_usd"] * rate, 0),
                    daily_change_usd=s["diff_usd"],
                    daily_change_krw=round(s["diff_usd"] * rate, 0),
                    daily_change_pct=s["diff_pct"],
                    summary_tag=s["summary_tag"],
                    details=details
                ))
        else:
            for s in snapshots:
                details_data = s.details_json or []
                details = [DailyDetailItem(**d) for d in details_data]
                items.append(DailySnapshotItem(
                    id=s.id,
                    date=s.snapshot_date.strftime("%m.%d"),
                    date_full=s.snapshot_date.strftime("%Y-%m-%d"),
                    total_valuation_usd=s.total_valuation_usd,
                    total_valuation_krw=s.total_valuation_krw,
                    daily_change_usd=round(s.daily_change_krw / rate, 2),
                    daily_change_krw=s.daily_change_krw,
                    daily_change_pct=s.daily_change_pct,
                    summary_tag=s.summary_tag,
                    details=details
                ))

        return DailyMatrixResponse(snapshots=items, total_count=len(items))

daily_service = DailyService()
