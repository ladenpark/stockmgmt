from typing import List, Optional
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
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
    async def create_transaction(db: AsyncSession, data: TransactionCreate) -> TransactionResponse:
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

        # 3. Check or create Holding
        stmt_holding = select(Holding).where(
            Holding.account_id == account.id,
            Holding.asset_id == asset.id
        )
        res_holding = await db.execute(stmt_holding)
        holding = res_holding.scalars().first()

        realized_pnl = 0.0
        tx_type = data.type.upper()

        if tx_type == "BUY":
            if not holding:
                holding = Holding(
                    account_id=account.id,
                    asset_id=asset.id,
                    quantity=data.quantity,
                    average_buy_price=data.price,
                    currency=data.currency
                )
                db.add(holding)
            else:
                # Weighted average calculation
                old_total_cost = holding.quantity * holding.average_buy_price
                new_cost = data.quantity * data.price
                new_quantity = holding.quantity + data.quantity
                holding.average_buy_price = (old_total_cost + new_cost) / new_quantity if new_quantity > 0 else data.price
                holding.quantity = new_quantity
        elif tx_type == "SELL":
            if holding:
                avg_price = holding.average_buy_price
                realized_pnl = data.quantity * (data.price - avg_price)
                holding.quantity = max(0.0, holding.quantity - data.quantity)
            else:
                realized_pnl = 0.0
        elif tx_type == "DIVIDEND":
            realized_pnl = data.quantity * data.price  # Dividend cash received

        # 4. Save Transaction
        tx = Transaction(
            account_id=account.id,
            asset_id=asset.id,
            type=tx_type,
            quantity=data.quantity,
            price=data.price,
            currency=data.currency,
            exchange_rate=data.exchange_rate or stock_service.get_exchange_rate(),
            realized_pnl=round(realized_pnl, 2),
            notes=data.notes,
            transacted_at=data.transacted_at or datetime.utcnow()
        )
        db.add(tx)
        await db.commit()
        await db.refresh(tx)

        return TransactionResponse(
            id=tx.id,
            account_id=tx.account_id,
            account_name=account.name,
            asset_id=tx.asset_id,
            ticker=asset.ticker,
            asset_name=asset.name,
            type=tx.type,
            quantity=tx.quantity,
            price=tx.price,
            currency=tx.currency,
            exchange_rate=tx.exchange_rate,
            realized_pnl=tx.realized_pnl,
            notes=tx.notes,
            transacted_at=tx.transacted_at,
            created_at=tx.created_at
        )

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
            if ticker and t.asset.ticker.upper() != ticker.upper().strip():
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
        await db.delete(tx)
        await db.commit()
        return True

transaction_service = TransactionService()
