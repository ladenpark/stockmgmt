import logging
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.account import Account
from app.models.asset import Asset
from app.models.holding import Holding
from app.models.transaction import Transaction

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
    asset_nvda = Asset(ticker="NVDA", name="엔비디아", market="US", currency="USD", current_price=945.50, category="반도체 / AI", change_pct=3.42, change_amount=31.20)
    asset_aapl = Asset(ticker="AAPL", name="애플", market="US", currency="USD", current_price=192.42, category="테크놀로지", change_pct=1.25, change_amount=2.38)
    asset_msft = Asset(ticker="MSFT", name="마이크로소프트", market="US", currency="USD", current_price=428.15, category="소프트웨어", change_pct=-0.45, change_amount=-1.95)
    asset_samsung = Asset(ticker="005930", name="삼성전자", market="KR", currency="KRW", current_price=78500.0, category="국내 대형주", change_pct=0.89, change_amount=700.0)
    asset_tsla = Asset(ticker="TSLA", name="테슬라", market="US", currency="USD", current_price=178.50, category="전기차 / 신에너지", change_pct=2.15, change_amount=3.75)
    asset_o = Asset(ticker="O", name="리얼티 인컴", market="US", currency="USD", current_price=54.20, category="월배당 리츠", change_pct=0.35, change_amount=0.19)
    
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
