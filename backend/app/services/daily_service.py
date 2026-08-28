from typing import List, Optional, Dict, Tuple
from datetime import date, datetime, timedelta
import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.models.daily_snapshot import DailySnapshot
from app.models.holding import Holding
from app.models.transaction import Transaction
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
    async def _close_history(ticker: str, start: date, end: date) -> Dict[date, float]:
        """Yahoo 일봉 종가를 날짜별로 가져온다. 실패해도 데일리 화면은 계속 표시한다."""
        symbol = f"{ticker}.KS" if ticker.isdigit() else ticker

        def load() -> Dict[date, float]:
            try:
                import yfinance as yf
                history = yf.Ticker(symbol).history(
                    start=start.isoformat(), end=(end + timedelta(days=1)).isoformat(),
                    auto_adjust=False,
                )
                return {
                    index.date(): float(row["Close"])
                    for index, row in history.iterrows()
                    if row.get("Close") is not None
                }
            except Exception:
                return {}

        try:
            return await asyncio.wait_for(asyncio.to_thread(load), timeout=12)
        except asyncio.TimeoutError:
            return {}

    @staticmethod
    async def _close_histories(assets: List, start: date, end: date) -> Dict[int, Dict[date, float]]:
        """여러 종목의 종가를 한 번의 Yahoo 요청으로 받아 초기 데일리 로딩을 단축한다."""
        symbols = [f"{asset.ticker}.KS" if asset.ticker.isdigit() else asset.ticker for asset in assets]

        def load() -> Dict[int, Dict[date, float]]:
            try:
                import yfinance as yf
                data = yf.download(
                    symbols, start=start.isoformat(), end=(end + timedelta(days=1)).isoformat(),
                    auto_adjust=False, group_by="ticker", progress=False, threads=False, timeout=8,
                )
                result: Dict[int, Dict[date, float]] = {}
                for asset, symbol in zip(assets, symbols):
                    try:
                        close = data[symbol]["Close"] if len(symbols) > 1 else data["Close"]
                        result[asset.id] = {
                            index.date(): float(value)
                            for index, value in close.dropna().items()
                        }
                    except Exception:
                        result[asset.id] = {}
                return result
            except Exception:
                return {asset.id: {} for asset in assets}

        try:
            return await asyncio.wait_for(asyncio.to_thread(load), timeout=15)
        except asyncio.TimeoutError:
            return {asset.id: {} for asset in assets}

    @staticmethod
    async def _build_transaction_timeline(db: AsyncSession) -> List[DailySnapshotItem]:
        """거래 시작일부터 일별 보유수량과 종가를 결합해 실제 포트폴리오 타임라인을 만든다."""
        result = await db.execute(
            select(Transaction)
            .options(selectinload(Transaction.asset))
            .where(Transaction.asset_id.is_not(None), Transaction.type.in_(("BUY", "SELL")))
            .order_by(Transaction.transacted_at.asc(), Transaction.id.asc())
        )
        transactions = result.scalars().all()
        if not transactions:
            return []

        # 화면 표시를 위해 복구한 '초기 보유 잔고' 매수는 실제 신규 매수가 아니다.
        # 이 기록을 최근 날짜 거래로 취급하면 해당 날짜에 자산이 갑자기 증가해 보이므로,
        # 원장이 있는 포트폴리오의 시작일에 이미 보유했던 것으로 배치한다.
        genuine_dates = [
            transaction.transacted_at.date()
            for transaction in transactions
            if transaction.notes != "초기 보유 잔고 복구"
        ]
        start = min(genuine_dates or [transaction.transacted_at.date() for transaction in transactions])
        timeline_transactions = sorted(
            [
                (
                    transaction,
                    start if transaction.notes == "초기 보유 잔고 복구" else transaction.transacted_at.date(),
                )
                for transaction in transactions
            ],
            key=lambda item: (item[1], item[0].id),
        )
        today = date.today()
        asset_by_id = {transaction.asset_id: transaction.asset for transaction in transactions if transaction.asset}
        history_by_asset = await DailyService._close_histories(list(asset_by_id.values()), start, today)
        histories = list(history_by_asset.values())

        # 종가가 존재하는 날짜만 표기한다. 오늘은 장중에도 최신 평가를 보여주기 위해 포함한다.
        trading_days = sorted({day for history in histories for day in history if start <= day <= today})
        if today not in trading_days:
            trading_days.append(today)
        if not trading_days:
            trading_days = [today]

        rate = stock_service.get_exchange_rate()
        balances: Dict[int, Tuple[float, float, str]] = {}
        transaction_index = 0
        last_close: Dict[int, float] = {}
        rows: List[DailySnapshotItem] = []
        previous_valuation_usd: Optional[float] = None

        for day in trading_days:
            while transaction_index < len(timeline_transactions) and timeline_transactions[transaction_index][1] <= day:
                transaction = timeline_transactions[transaction_index][0]
                quantity, average, currency = balances.get(transaction.asset_id, (0.0, 0.0, transaction.currency))
                if transaction.type == "BUY":
                    new_quantity = quantity + transaction.quantity
                    average = ((quantity * average) + (transaction.quantity * transaction.price)) / new_quantity if new_quantity else 0.0
                    balances[transaction.asset_id] = (new_quantity, average, transaction.currency)
                elif transaction.type == "SELL":
                    balances[transaction.asset_id] = (max(0.0, quantity - transaction.quantity), average, currency)
                transaction_index += 1

            details = []
            total_usd = 0.0
            for asset_id, (quantity, _average, currency) in balances.items():
                if quantity <= 0:
                    continue
                asset = asset_by_id[asset_id]
                history = history_by_asset.get(asset_id, {})
                if day == today:
                    # 장 마감 전에는 최신 틱, 마감 뒤에는 최종 현재가(종가)를 사용한다.
                    quote = stock_service.get_stock_price(asset.ticker)
                    price = float(quote["price"])
                    diff_amount = float(quote["change_amount"])
                    diff_pct = float(quote["change_pct"])
                else:
                    if day in history:
                        last_close[asset_id] = history[day]
                    price = last_close.get(asset_id)
                    if price is None:
                        continue
                    prior_dates = [history_day for history_day in history if history_day < day]
                    prior_close = history[max(prior_dates)] if prior_dates else price
                    diff_amount = price - prior_close
                    diff_pct = (diff_amount / prior_close * 100) if prior_close else 0.0
                value_usd = quantity * price / rate if currency.upper() == "KRW" else quantity * price
                total_usd += value_usd
                details.append({
                    "name": asset.name,
                    "ticker": asset.ticker,
                    "price": round(price, 0 if currency.upper() == "KRW" else 2),
                    "diff_amount": round(diff_amount, 0 if currency.upper() == "KRW" else 2),
                    "diff_pct": round(diff_pct, 2),
                    "shares": quantity,
                    "gain_amount": round(quantity * diff_amount, 2),
                })

            change_usd = total_usd - previous_valuation_usd if previous_valuation_usd is not None else 0.0
            change_pct = (change_usd / previous_valuation_usd * 100) if previous_valuation_usd else 0.0
            basis = "현재가 기준" if day == today else "종가 기준"
            rows.append(DailySnapshotItem(
                id=0,
                date=day.strftime("%m.%d"),
                date_full=day.isoformat(),
                total_valuation_usd=round(total_usd, 2),
                total_valuation_krw=round(total_usd * rate, 0),
                daily_change_usd=round(change_usd, 2),
                daily_change_krw=round(change_usd * rate, 0),
                daily_change_pct=round(change_pct, 2),
                summary_tag=basis,
                details=[DailyDetailItem(**detail) for detail in details],
            ))
            previous_valuation_usd = total_usd

        return list(reversed(rows))

    @staticmethod
    async def capture_snapshot(db: AsyncSession, snapshot_date: Optional[date] = None) -> DailySnapshot:
        """현재 보유 자산을 기준으로 해당 일자의 평가 스냅샷을 생성하거나 갱신합니다."""
        target_date = snapshot_date or date.today()
        rate = stock_service.get_exchange_rate()
        holdings_result = await db.execute(
            select(Holding).options(selectinload(Holding.asset)).where(Holding.quantity > 0)
        )
        holdings = holdings_result.scalars().all()

        details = []
        total_usd = 0.0
        total_invested_krw = 0.0
        for holding in holdings:
            quote = stock_service.get_stock_price(holding.asset.ticker)
            price = float(quote["price"])
            change_amount = float(quote["change_amount"])
            is_krw = holding.currency.upper() == "KRW"
            valuation_usd = holding.quantity * price / rate if is_krw else holding.quantity * price
            invested_krw = holding.quantity * holding.average_buy_price if is_krw else holding.quantity * holding.average_buy_price * rate
            total_usd += valuation_usd
            total_invested_krw += invested_krw
            details.append({
                "name": holding.asset.name,
                "ticker": holding.asset.ticker,
                "price": price,
                "diff_amount": change_amount,
                "diff_pct": float(quote["change_pct"]),
                "shares": holding.quantity,
                "gain_amount": holding.quantity * change_amount,
            })

        previous_result = await db.execute(
            select(DailySnapshot)
            .where(DailySnapshot.snapshot_date < target_date)
            .order_by(DailySnapshot.snapshot_date.desc())
            .limit(1)
        )
        previous = previous_result.scalars().first()
        total_krw = total_usd * rate
        daily_change_krw = total_krw - previous.total_valuation_krw if previous else 0.0
        daily_change_pct = (daily_change_krw / previous.total_valuation_krw * 100) if previous and previous.total_valuation_krw else 0.0

        snapshot_result = await db.execute(select(DailySnapshot).where(DailySnapshot.snapshot_date == target_date))
        snapshot = snapshot_result.scalars().first()
        if not snapshot:
            snapshot = DailySnapshot(snapshot_date=target_date)
            db.add(snapshot)
        snapshot.total_valuation_usd = round(total_usd, 2)
        snapshot.total_valuation_krw = round(total_krw, 0)
        snapshot.total_invested_krw = round(total_invested_krw, 0)
        snapshot.daily_change_krw = round(daily_change_krw, 0)
        snapshot.daily_change_pct = round(daily_change_pct, 2)
        snapshot.summary_tag = ", ".join(item["ticker"] for item in sorted(details, key=lambda item: abs(item["gain_amount"]), reverse=True)[:2]) or "보유 자산 없음"
        snapshot.details_json = details
        await db.commit()
        await db.refresh(snapshot)
        return snapshot

    @staticmethod
    async def get_daily_matrix(db: AsyncSession, year_month: Optional[str] = None) -> DailyMatrixResponse:
        """일자별 손익 매트릭스 그리드 데이터 조회"""
        timeline = await DailyService._build_transaction_timeline(db)
        if timeline:
            if year_month:
                timeline = [item for item in timeline if item.date_full.startswith(year_month)]
            return DailyMatrixResponse(snapshots=timeline, total_count=len(timeline))

        rate = stock_service.get_exchange_rate()
        if year_month:
            try:
                start = datetime.strptime(year_month, "%Y-%m").date().replace(day=1)
                end = date(start.year + (start.month == 12), 1 if start.month == 12 else start.month + 1, 1)
                stmt = select(DailySnapshot).where(DailySnapshot.snapshot_date >= start, DailySnapshot.snapshot_date < end)
            except ValueError:
                stmt = select(DailySnapshot)
        else:
            stmt = select(DailySnapshot)
        stmt = stmt.order_by(DailySnapshot.snapshot_date.desc()).limit(30)
        result = await db.execute(stmt)
        snapshots = result.scalars().all()

        items: List[DailySnapshotItem] = []

        if not snapshots and not year_month:
            await DailyService.capture_snapshot(db)
            result = await db.execute(stmt)
            snapshots = result.scalars().all()

        if snapshots:
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
