from typing import List, Optional
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import delete
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.models.account import Account
from app.models.asset import Asset
from app.models.holding import Holding
from app.models.transaction import Transaction
from app.schemas.schemas import TransactionCreate, TransactionUpdate, TransactionResponse
from app.services.stock_service import stock_service

class TransactionService:
    @staticmethod
    async def _get_holding(db: AsyncSession, account_id: int, asset_id: int) -> Optional[Holding]:
        result = await db.execute(select(Holding).where(
            Holding.account_id == account_id,
            Holding.asset_id == asset_id
        ))
        return result.scalars().first()

    @staticmethod
    def _response(tx: Transaction, account: Account, asset: Asset) -> TransactionResponse:
        return TransactionResponse(
            id=tx.id, account_id=tx.account_id, account_name=account.name,
            asset_id=tx.asset_id, ticker=asset.ticker, asset_name=asset.name,
            type=tx.type, quantity=tx.quantity, price=tx.price, currency=tx.currency,
            exchange_rate=tx.exchange_rate, realized_pnl=tx.realized_pnl,
            notes=tx.notes, transacted_at=tx.transacted_at, created_at=tx.created_at
        )

    @staticmethod
    async def _reverse_holding_effect(db: AsyncSession, tx: Transaction) -> None:
        """이미 반영된 거래 1건의 잔고 영향을 되돌립니다."""
        if tx.type == "DIVIDEND":
            return
        if tx.type in {"DEPOSIT", "WITHDRAW"}:
            account = await db.get(Account, tx.account_id)
            if account:
                account.cash_balance += -tx.price if tx.type == "DEPOSIT" else tx.price
            return
        holding = await TransactionService._get_holding(db, tx.account_id, tx.asset_id)
        if not holding:
            raise ValueError("연결된 보유 잔고를 찾을 수 없습니다.")
        if tx.type == "BUY":
            if holding.quantity + 1e-9 < tx.quantity:
                raise ValueError("현재 보유 수량이 거래 수량보다 적어 안전하게 되돌릴 수 없습니다.")
            remaining_quantity = holding.quantity - tx.quantity
            remaining_cost = holding.quantity * holding.average_buy_price - tx.quantity * tx.price
            holding.quantity = max(0.0, remaining_quantity)
            holding.average_buy_price = max(0.0, remaining_cost / remaining_quantity) if remaining_quantity > 0 else 0.0
        elif tx.type == "SELL":
            holding.quantity += tx.quantity

    @staticmethod
    async def _apply_holding_effect(db: AsyncSession, tx: Transaction) -> None:
        """거래 1건을 보유 잔고에 반영하고 매도 실현손익을 계산합니다."""
        if tx.type == "DIVIDEND":
            tx.realized_pnl = round(tx.quantity * tx.price, 2)
            return

        holding = await TransactionService._get_holding(db, tx.account_id, tx.asset_id)
        if tx.type == "BUY":
            if not holding:
                holding = Holding(account_id=tx.account_id, asset_id=tx.asset_id, quantity=0.0,
                                  average_buy_price=0.0, currency=tx.currency)
                db.add(holding)
                await db.flush()
            total_quantity = holding.quantity + tx.quantity
            holding.average_buy_price = (
                (holding.quantity * holding.average_buy_price + tx.quantity * tx.price) / total_quantity
            ) if total_quantity else 0.0
            holding.quantity = total_quantity
            holding.currency = tx.currency
            tx.realized_pnl = 0.0
        elif tx.type == "SELL":
            if not holding or holding.quantity + 1e-9 < tx.quantity:
                raise ValueError("보유 수량을 초과해 매도할 수 없습니다.")
            tx.realized_pnl = round(tx.quantity * (tx.price - holding.average_buy_price), 2)
            holding.quantity -= tx.quantity

    @staticmethod
    async def _rebuild_account_holdings(db: AsyncSession, account_id: int) -> None:
        """거래 원장을 기준으로 계좌의 보유수량·평단·실현손익을 다시 계산합니다.

        과거 거래를 수정하거나 삭제할 때는 현재 잔고를 역산하면 이후 매도 거래 때문에
        평단이 틀어질 수 있으므로, 시간순 원장을 신뢰 가능한 기준으로 사용합니다.
        """
        result = await db.execute(
            select(Transaction)
            .where(Transaction.account_id == account_id, Transaction.asset_id.is_not(None))
            .order_by(Transaction.transacted_at.asc(), Transaction.id.asc())
        )
        transactions = result.scalars().all()
        existing_result = await db.execute(select(Holding).where(Holding.account_id == account_id))
        existing_holdings = existing_result.scalars().all()
        balances: dict[int, dict[str, float | str]] = {}
        transaction_asset_ids = {tx.asset_id for tx in transactions if tx.asset_id is not None}

        for tx in transactions:
            if tx.type == "DIVIDEND":
                tx.realized_pnl = round(tx.quantity * tx.price, 2)
                continue
            if tx.type not in {"BUY", "SELL"}:
                continue
            balance = balances.setdefault(tx.asset_id, {"quantity": 0.0, "average": 0.0, "currency": tx.currency})
            quantity = float(balance["quantity"])
            average = float(balance["average"])
            if tx.type == "BUY":
                total = quantity + tx.quantity
                balance["average"] = ((quantity * average) + (tx.quantity * tx.price)) / total if total else 0.0
                balance["quantity"] = total
                balance["currency"] = tx.currency
                tx.realized_pnl = 0.0
            else:
                if quantity + 1e-9 < tx.quantity:
                    raise ValueError("수정 결과가 이전 매수 수량을 초과하는 매도가 됩니다.")
                tx.realized_pnl = round(tx.quantity * (tx.price - average), 2)
                balance["quantity"] = quantity - tx.quantity

        await db.execute(delete(Holding).where(Holding.account_id == account_id))
        for asset_id, balance in balances.items():
            if float(balance["quantity"]) > 1e-9:
                db.add(Holding(
                    account_id=account_id,
                    asset_id=asset_id,
                    quantity=float(balance["quantity"]),
                    average_buy_price=float(balance["average"]),
                    currency=str(balance["currency"]),
                ))
        # 거래 원장이 전혀 없는 초기 잔고는 기준 잔고로 보존한다.
        # 다른 종목 거래를 수정하면서 해당 잔고가 사라지는 것을 방지한다.
        for holding in existing_holdings:
            if holding.asset_id not in transaction_asset_ids:
                db.add(Holding(
                    account_id=holding.account_id,
                    asset_id=holding.asset_id,
                    quantity=holding.quantity,
                    average_buy_price=holding.average_buy_price,
                    currency=holding.currency,
                ))
        await db.flush()

    @staticmethod
    async def create_transaction(
        db: AsyncSession, data: TransactionCreate, *, commit: bool = True
    ) -> TransactionResponse:
        """P-102 키패드 거래 등록 및 잔고/평단가/실현손익 자동 계산"""
        # 1. Check or create Asset
        stmt_asset = select(Asset).where(Asset.ticker == data.ticker.upper().strip())
        res_asset = await db.execute(stmt_asset)
        asset = res_asset.scalars().first()
        
        if not asset:
            price_info = stock_service.get_stock_price(data.ticker)
            asset = Asset(
                ticker=data.ticker.upper().strip(),
                name=price_info.get("name", data.ticker),
                market=price_info.get("market", "US"),
                currency=data.currency,
                current_price=price_info.get("price", data.price),
                category=price_info.get("category", "일반 주식")
            )
            db.add(asset)
            await db.flush()

        # 2. Check Account
        account = await db.get(Account, data.account_id)
        if not account:
            account = Account(name="기본 계좌", brokerage_code="DEFAULT")
            db.add(account)
            await db.flush()

        tx_type = data.type.upper()
        if tx_type not in {"BUY", "SELL", "DIVIDEND"}:
            raise ValueError("지원하지 않는 거래 구분입니다.")

        # 4. Save Transaction
        tx = Transaction(
            account_id=account.id,
            asset_id=asset.id,
            type=tx_type,
            quantity=data.quantity,
            price=data.price,
            currency=data.currency,
            exchange_rate=data.exchange_rate or stock_service.get_exchange_rate(),
            realized_pnl=0.0,
            # NULL은 기존 초기 시드 거래(안전 잠금) 표시로 사용한다.
            notes=data.notes or "",
            transacted_at=data.transacted_at or datetime.utcnow()
        )
        db.add(tx)
        await db.flush()
        await TransactionService._apply_holding_effect(db, tx)
        if commit:
            await db.commit()
            await db.refresh(tx)
        return TransactionService._response(tx, account, asset)

    @staticmethod
    async def get_transactions(
        db: AsyncSession,
        ticker: Optional[str] = None,
        account_id: Optional[int] = None,
        limit: int = 50
    ) -> List[TransactionResponse]:
        """체결 이력 목록 조회"""
        stmt = select(Transaction).options(
            selectinload(Transaction.asset),
            selectinload(Transaction.account)
        ).order_by(Transaction.transacted_at.desc()).limit(limit)

        if account_id:
            stmt = stmt.where(Transaction.account_id == account_id)

        result = await db.execute(stmt)
        txs = result.scalars().all()

        responses = []
        for t in txs:
            if ticker and (not t.asset or t.asset.ticker.upper() != ticker.upper().strip()):
                continue
            responses.append(TransactionResponse(
                id=t.id,
                account_id=t.account_id,
                account_name=t.account.name if t.account else "",
                asset_id=t.asset_id,
                ticker=t.asset.ticker if t.asset else "",
                asset_name=t.asset.name if t.asset else "",
                type=t.type,
                quantity=t.quantity,
                price=t.price,
                currency=t.currency,
                exchange_rate=t.exchange_rate,
                realized_pnl=t.realized_pnl,
                notes=t.notes,
                transacted_at=t.transacted_at,
                created_at=t.created_at
            ))

        return responses

    @staticmethod
    async def delete_transaction(db: AsyncSession, tx_id: int) -> bool:
        """체결 내역 삭제"""
        tx = await db.get(Transaction, tx_id)
        if not tx:
            return False
        try:
            account_id = tx.account_id
            asset_id = tx.asset_id
            await db.delete(tx)
            await db.flush()
            if asset_id is None:
                await TransactionService._reverse_holding_effect(db, tx)
            else:
                await TransactionService._rebuild_account_holdings(db, account_id)
            await db.commit()
        except Exception:
            await db.rollback()
            raise
        return True

    @staticmethod
    async def update_transaction(db: AsyncSession, tx_id: int, data: TransactionUpdate) -> TransactionResponse:
        """등록 후 거래를 수정하고 잔고·평단·실현손익을 다시 반영합니다."""
        tx = await db.get(Transaction, tx_id)
        if not tx:
            raise LookupError("해당 체결 내역을 찾을 수 없습니다.")
        previous_account_id = tx.account_id
        try:
            changes = data.model_dump(exclude_unset=True)
            for field, value in changes.items():
                if value is not None:
                    setattr(tx, field, value.upper() if field == "type" else value)
            if tx.type not in {"BUY", "SELL", "DIVIDEND"}:
                raise ValueError("지원하지 않는 거래 구분입니다.")
            account = await db.get(Account, tx.account_id)
            asset = await db.get(Asset, tx.asset_id)
            if not account or not asset:
                raise ValueError("거래의 계좌 또는 종목을 찾을 수 없습니다.")
            await db.flush()
            await TransactionService._rebuild_account_holdings(db, previous_account_id)
            if tx.account_id != previous_account_id:
                await TransactionService._rebuild_account_holdings(db, tx.account_id)
            await db.commit()
            await db.refresh(tx)
            return TransactionService._response(tx, account, asset)
        except Exception:
            await db.rollback()
            raise

transaction_service = TransactionService()
