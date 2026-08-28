from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.database import get_db
from app.models.account import Account
from app.models.asset import Asset
from app.models.transaction import Transaction
from app.schemas.schemas import (
    AccountCreate, AccountResponse, AccountUpdate, HoldingResponse, PortfolioSummaryResponse, TransactionCreate
)
from app.services.portfolio_service import portfolio_service
from app.services.stock_service import stock_service
from app.services.transaction_service import transaction_service

router = APIRouter(prefix="/portfolio", tags=["Portfolio"])

@router.get("/summary", response_model=PortfolioSummaryResponse, summary="총 자산 포트폴리오 요약 조회")
async def get_portfolio_summary(db: AsyncSession = Depends(get_db)):
    """총 자산 평가액(KRW/USD), 매입원금, 총수익률, 일간 변동(±Δ) 집계 반환"""
    return await portfolio_service.get_portfolio_summary(db)

@router.get("/holdings", response_model=List[HoldingResponse], summary="다차원 필터링 보유 종목 리스트")
async def get_holdings(
    market: Optional[str] = Query(None, description="시장 구분 (KR, US)"),
    account_id: Optional[int] = Query(None, description="계좌 ID"),
    asset_type: Optional[str] = Query(None, description="자산 유형 (stock, crypto, cash, pension)"),
    currency: Optional[str] = Query(None, description="통화 (KRW, USD)"),
    db: AsyncSession = Depends(get_db)
):
    """시장, 계좌, 자산군, 통화 필터가 적용된 보유 종목 리스트 반환"""
    return await portfolio_service.get_holdings(
        db, market=market, account_id=account_id, asset_type=asset_type, currency=currency
    )

@router.get("/accounts", response_model=List[AccountResponse], summary="연동 계좌 목록 조회")
async def get_accounts(db: AsyncSession = Depends(get_db)):
    """등록된 연동 계좌 목록 반환"""
    stmt = select(Account).where(Account.is_active == True)
    res = await db.execute(stmt)
    return res.scalars().all()

@router.post("/accounts", response_model=AccountResponse, status_code=201, summary="계좌 등록")
async def create_account(data: AccountCreate, db: AsyncSession = Depends(get_db)):
    name = data.name.strip()
    existing = await db.execute(select(Account).where(Account.name == name))
    if existing.scalars().first():
        raise HTTPException(status_code=409, detail="같은 이름의 계좌가 이미 있습니다.")
    values = data.model_dump()
    values["name"] = name
    values["currency"] = data.currency.upper()
    account = Account(**values)
    db.add(account)
    await db.commit()
    await db.refresh(account)
    return account

@router.patch("/accounts/{account_id}", response_model=AccountResponse, summary="계좌 정보 수정")
async def update_account(account_id: int, data: AccountUpdate, db: AsyncSession = Depends(get_db)):
    account = await db.get(Account, account_id)
    if not account:
        raise HTTPException(status_code=404, detail="계좌를 찾을 수 없습니다.")
    changes = data.model_dump(exclude_unset=True)
    if "name" in changes and changes["name"]:
        changes["name"] = changes["name"].strip()
        duplicate = await db.execute(select(Account).where(Account.name == changes["name"], Account.id != account_id))
        if duplicate.scalars().first():
            raise HTTPException(status_code=409, detail="같은 이름의 계좌가 이미 있습니다.")
    if "currency" in changes and changes["currency"]:
        changes["currency"] = changes["currency"].upper()
    for field, value in changes.items():
        setattr(account, field, value)
    await db.commit()
    await db.refresh(account)
    return account

@router.delete("/accounts/{account_id}", summary="계좌 비활성화")
async def deactivate_account(account_id: int, db: AsyncSession = Depends(get_db)):
    account = await db.get(Account, account_id)
    if not account:
        raise HTTPException(status_code=404, detail="계좌를 찾을 수 없습니다.")
    account.is_active = False
    await db.commit()
    return {"success": True, "message": "계좌를 비활성화했습니다. 기존 거래 내역은 보존됩니다."}

@router.post("/assets/manual", summary="[Tab 1.1] 초기 자산 및 보유 종목 수동 직접 등록")
async def add_manual_asset(
    payload: dict,
    db: AsyncSession = Depends(get_db)
):
    """수동 입력을 거래 원장 또는 계좌 예수금에 반영합니다."""
    brokerage = str(payload.get("brokerage") or "기본 계좌").strip()
    tx_type = str(payload.get("type") or "BUY").upper()
    currency = str(payload.get("currency") or "USD").upper()
    amount = float(payload.get("amount") or 0)
    quantity = float(payload.get("quantity") or 0)
    price = float(payload.get("price") or payload.get("average_buy_price") or 0)

    account_result = await db.execute(select(Account).where(Account.name == brokerage))
    account = account_result.scalars().first()
    if not account:
        account = Account(name=brokerage, brokerage_code="MANUAL", currency=currency)
        db.add(account)
        await db.flush()

    if tx_type in {"DEPOSIT", "WITHDRAW"}:
        if amount <= 0:
            raise HTTPException(status_code=422, detail="입출금 금액을 올바르게 입력해주세요.")
        if tx_type == "WITHDRAW" and account.cash_balance + 1e-9 < amount:
            raise HTTPException(status_code=409, detail="예수금 잔액을 초과해 출금할 수 없습니다.")
        account.cash_balance += amount if tx_type == "DEPOSIT" else -amount
        tx = Transaction(
            account_id=account.id, asset_id=None, type=tx_type, quantity=1.0, price=amount,
            currency=currency, exchange_rate=stock_service.get_exchange_rate(), realized_pnl=0.0,
            notes=str(payload.get("notes") or "수동 예수금 등록"),
        )
        db.add(tx)
        await db.commit()
        return {"success": True, "message": "예수금 내역이 등록되었습니다.", "cash_balance": account.cash_balance}

    if tx_type not in {"BUY", "SELL", "DIVIDEND"}:
        raise HTTPException(status_code=422, detail="지원하지 않는 거래 구분입니다.")
    ticker = str(payload.get("ticker") or "").strip().upper()
    if not ticker or quantity <= 0 or price <= 0:
        raise HTTPException(status_code=422, detail="종목코드, 수량, 단가를 올바르게 입력해주세요.")
    asset_result = await db.execute(select(Asset).where(Asset.ticker == ticker))
    if not asset_result.scalars().first():
        db.add(Asset(
            ticker=ticker, name=str(payload.get("name") or ticker), market=str(payload.get("market") or "US").upper(),
            currency=currency, current_price=price,
        ))
        await db.flush()
    try:
        transaction = await transaction_service.create_transaction(db, TransactionCreate(
            account_id=account.id, ticker=ticker, type=tx_type, quantity=quantity, price=price,
            currency=currency, transacted_at=payload.get("transacted_at"), notes=str(payload.get("notes") or "수동 거래 등록"),
        ))
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc))
    return {"success": True, "message": "거래 내역이 등록되었습니다.", "data": transaction.model_dump()}
