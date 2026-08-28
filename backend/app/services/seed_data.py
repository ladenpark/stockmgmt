import logging
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.account import Account
from app.models.asset import Asset
from app.models.holding import Holding
from app.models.transaction import Transaction
from app.services.stock_service import stock_service

logger = logging.getLogger(__name__)

async def seed_initial_data(db: AsyncSession):
    """DB 초기 기동 시 기본 샘플 계좌, 종목, 보유 잔고 및 거래 내역 적재"""
    res = await db.execute(select(Account))
    if res.scalars().first():
        return  # 이미 데이터가 적재되어 있음

    logger.info("기본 포트폴리오 시드 데이터 적재 시작...")

    # 1. Accounts
    acc_fidelity = Account(name="Fidelity Investments", brokerage_code="FIDELITY", color="#094cb2")
    acc_toss = Account(name="토스증권", brokerage_code="TOSS", color="#3366cc")
    acc_kakao = Account(name="카카오페이증권", brokerage_code="KAKAO", color="#bfab49")
    db.add_all([acc_fidelity, acc_toss, acc_kakao])
    await db.flush()

    # 2. Assets
    asset_nvda = Asset(ticker="NVDA", name="NVIDIA Corporation", market="US", currency="USD", current_price=945.50, category="반도체 / AI", change_pct=3.42, change_amount=31.20)
    asset_aapl = Asset(ticker="AAPL", name="Apple Inc.", market="US", currency="USD", current_price=192.42, category="테크놀로지", change_pct=1.25, change_amount=2.38)
    asset_msft = Asset(ticker="MSFT", name="Microsoft Corporation", market="US", currency="USD", current_price=428.15, category="소프트웨어", change_pct=-0.45, change_amount=-1.95)
    asset_samsung = Asset(ticker="005930", name="삼성전자", market="KR", currency="KRW", current_price=78500.0, category="국내 대형주", change_pct=0.89, change_amount=700.0)
    asset_tsla = Asset(ticker="TSLA", name="Tesla, Inc.", market="US", currency="USD", current_price=178.50, category="전기차 / 신에너지", change_pct=2.15, change_amount=3.75)
    asset_o = Asset(ticker="O", name="Realty Income Corporation", market="US", currency="USD", current_price=54.20, category="월배당 리츠", change_pct=0.35, change_amount=0.19)
    
    db.add_all([asset_nvda, asset_aapl, asset_msft, asset_samsung, asset_tsla, asset_o])
    await db.flush()

    # 3. Holdings
    holdings = [
        Holding(account_id=acc_fidelity.id, asset_id=asset_nvda.id, quantity=45.0, average_buy_price=520.0, currency="USD"),
        Holding(account_id=acc_fidelity.id, asset_id=asset_aapl.id, quantity=50.0, average_buy_price=150.0, currency="USD"),
        Holding(account_id=acc_toss.id, asset_id=asset_aapl.id, quantity=30.0, average_buy_price=160.0, currency="USD"),
        Holding(account_id=acc_toss.id, asset_id=asset_msft.id, quantity=40.0, average_buy_price=330.0, currency="USD"),
        Holding(account_id=acc_kakao.id, asset_id=asset_tsla.id, quantity=35.0, average_buy_price=190.0, currency="USD"),
        Holding(account_id=acc_kakao.id, asset_id=asset_o.id, quantity=120.0, average_buy_price=52.0, currency="USD"),
        Holding(account_id=acc_toss.id, asset_id=asset_samsung.id, quantity=250.0, average_buy_price=68000.0, currency="KRW")
    ]
    db.add_all(holdings)
    await db.flush()

    # 4. Sample Transactions
    now = datetime.utcnow()
    txs = [
        Transaction(account_id=acc_fidelity.id, asset_id=asset_nvda.id, type="BUY", quantity=45.0, price=520.0, currency="USD", transacted_at=now - timedelta(days=90)),
        Transaction(account_id=acc_fidelity.id, asset_id=asset_aapl.id, type="BUY", quantity=50.0, price=150.0, currency="USD", transacted_at=now - timedelta(days=120)),
        Transaction(account_id=acc_toss.id, asset_id=asset_aapl.id, type="BUY", quantity=30.0, price=160.0, currency="USD", transacted_at=now - timedelta(days=60)),
        Transaction(account_id=acc_toss.id, asset_id=asset_msft.id, type="BUY", quantity=40.0, price=330.0, currency="USD", transacted_at=now - timedelta(days=45)),
        Transaction(account_id=acc_fidelity.id, asset_id=asset_aapl.id, type="SELL", quantity=20.0, price=185.0, currency="USD", realized_pnl=700.0, transacted_at=now - timedelta(days=15)),
        Transaction(account_id=acc_kakao.id, asset_id=asset_o.id, type="DIVIDEND", quantity=120.0, price=0.256, currency="USD", realized_pnl=30.72, transacted_at=now - timedelta(days=5))
    ]
    db.add_all(txs)
    await db.commit()
    logger.info("기본 시드 데이터 적재 완료!")

async def normalize_asset_names(db: AsyncSession):
    """미국 종목은 영어, 한국 종목은 한국어로 기존 DB의 표기를 보정합니다."""
    result = await db.execute(select(Asset))
    changed = False
    for asset in result.scalars().all():
        current_name = (asset.name or "").strip()
        metadata = stock_service.get_stock_price(asset.ticker)
        resolved_name = str(metadata.get("name") or "").strip()
        should_normalize = asset.market.upper() == "US" or not current_name or current_name.upper() == asset.ticker.upper()
        if should_normalize and resolved_name and resolved_name.upper() != asset.ticker.upper() and current_name != resolved_name:
            asset.name = resolved_name
            changed = True
    if changed:
        await db.commit()
        logger.info("기존 종목명 언어 표기 보정을 완료했습니다.")

async def repair_default_seed_holdings(db: AsyncSession):
    """과거 재계산 로직으로 누락될 수 있었던 기본 삼성전자 초기 잔고를 복구합니다."""
    asset_result = await db.execute(select(Asset).where(Asset.ticker == "005930"))
    asset = asset_result.scalars().first()
    account_result = await db.execute(select(Account).where(Account.name == "토스증권"))
    account = account_result.scalars().first()
    if not asset or not account:
        return
    holding_result = await db.execute(select(Holding).where(Holding.account_id == account.id, Holding.asset_id == asset.id))
    transaction_result = await db.execute(select(Transaction).where(Transaction.account_id == account.id, Transaction.asset_id == asset.id))
    if not holding_result.scalars().first() and not transaction_result.scalars().first():
        db.add(Holding(account_id=account.id, asset_id=asset.id, quantity=250.0, average_buy_price=68000.0, currency="KRW"))
        await db.commit()
        logger.info("기본 삼성전자 초기 잔고를 복구했습니다.")

async def repair_missing_opening_transactions(db: AsyncSession):
    """잔고는 있으나 매수 원장이 없는 초기 데이터에 기준 매수 이력을 복구한다.

    종목 상세에서 증권사 카드를 눌렀을 때 보유 잔고의 근거가 되는 거래가 반드시
    보이도록 한다. 이미 매수/매도 원장이 있는 사용자의 거래는 절대 건드리지 않는다.
    """
    holdings_result = await db.execute(select(Holding))
    repaired = 0
    for holding in holdings_result.scalars().all():
        transaction_result = await db.execute(
            select(Transaction).where(
                Transaction.account_id == holding.account_id,
                Transaction.asset_id == holding.asset_id,
                Transaction.type.in_(("BUY", "SELL")),
            )
        )
        if transaction_result.scalars().first() or holding.quantity <= 0:
            continue
        db.add(Transaction(
            account_id=holding.account_id,
            asset_id=holding.asset_id,
            type="BUY",
            quantity=holding.quantity,
            price=holding.average_buy_price,
            currency=holding.currency,
            exchange_rate=stock_service.get_exchange_rate(),
            realized_pnl=0.0,
            notes="초기 보유 잔고 복구",
            transacted_at=holding.created_at or datetime.utcnow(),
        ))
        repaired += 1
    if repaired:
        await db.commit()
        logger.info("누락된 초기 매수 거래 %d건을 복구했습니다.", repaired)
