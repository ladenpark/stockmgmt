from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.models.account import Account
from app.models.asset import Asset
from app.models.holding import Holding
from app.models.transaction import Transaction
from app.schemas.schemas import (
    PortfolioSummaryResponse, HoldingResponse, StockDetailResponse, StockHoldingItem,
    TransactionResponse, AssetResponse
)
from app.services.stock_service import stock_service

class PortfolioService:
    @staticmethod
    async def get_portfolio_summary(db: AsyncSession) -> PortfolioSummaryResponse:
        """총 자산 평가금, 매입원금, 누적 수익률, 당일 변동 집계"""
        rate = stock_service.get_exchange_rate()
        
        # Load all holdings with assets and accounts
        stmt = select(Holding).options(selectinload(Holding.asset), selectinload(Holding.account))
        result = await db.execute(stmt)
        holdings = result.scalars().all()
        
        total_valuation_usd = 0.0
        total_invested_usd = 0.0
        today_change_usd = 0.0
        
        for h in holdings:
            asset_info = stock_service.get_stock_price(h.asset.ticker)
            current_price = asset_info["price"]
            change_amount = asset_info["change_amount"]
            
            # Asset valuation
            val_usd = h.quantity * current_price if h.currency == "USD" else (h.quantity * current_price) / rate
            invested_usd = h.quantity * h.average_buy_price if h.currency == "USD" else (h.quantity * h.average_buy_price) / rate
            day_gain_usd = h.quantity * change_amount if h.currency == "USD" else (h.quantity * change_amount) / rate
            
            total_valuation_usd += val_usd
            total_invested_usd += invested_usd
            today_change_usd += day_gain_usd
        
        total_valuation_krw = total_valuation_usd * rate
        total_invested_krw = total_invested_usd * rate
        total_return_usd = total_valuation_usd - total_invested_usd
        total_return_krw = total_return_usd * rate
        total_return_pct = (total_return_usd / total_invested_usd * 100) if total_invested_usd > 0 else 0.0
        
        prev_val_usd = total_valuation_usd - today_change_usd
        today_change_pct = (today_change_usd / prev_val_usd * 100) if prev_val_usd > 0 else 0.0
        today_change_krw = today_change_usd * rate

        return PortfolioSummaryResponse(
            total_valuation_krw=round(total_valuation_krw, 0),
            total_valuation_usd=round(total_valuation_usd, 2),
            total_invested_krw=round(total_invested_krw, 0),
            total_invested_usd=round(total_invested_usd, 2),
            total_return_krw=round(total_return_krw, 0),
            total_return_usd=round(total_return_usd, 2),
            total_return_pct=round(total_return_pct, 2),
            today_change_krw=round(today_change_krw, 0),
            today_change_usd=round(today_change_usd, 2),
            today_change_pct=round(today_change_pct, 2),
            exchange_rate=rate,
            holding_count=len(holdings)
        )

    @staticmethod
    async def get_holdings(
        db: AsyncSession,
        market: Optional[str] = None,
        account_id: Optional[int] = None,
        asset_type: Optional[str] = None,
        currency: Optional[str] = None
    ) -> List[HoldingResponse]:
        """다차원 필터가 적용된 보유 종목 리스트 반환"""
        stmt = select(Holding).options(selectinload(Holding.asset), selectinload(Holding.account))
        
        if account_id:
            stmt = stmt.where(Holding.account_id == account_id)
            
        result = await db.execute(stmt)
        holdings = result.scalars().all()
        
        responses = []
        for h in holdings:
            if market and h.asset.market.upper() != market.upper():
                continue
            if asset_type and h.asset.asset_type.lower() != asset_type.lower():
                continue
            if currency and h.currency.upper() != currency.upper():
                continue
                
            asset_info = stock_service.get_stock_price(h.asset.ticker)
            current_price = asset_info["price"]
            display_name = asset_info.get("name") if h.asset.name.strip().upper() == h.asset.ticker.upper() else h.asset.name
            valuation = h.quantity * current_price
            invested_cost = h.quantity * h.average_buy_price
            unrealized_pnl = valuation - invested_cost
            return_pct = (unrealized_pnl / invested_cost * 100) if invested_cost > 0 else 0.0
            
            responses.append(HoldingResponse(
                id=h.id,
                account_id=h.account_id,
                account_name=h.account.name if h.account else "",
                asset_id=h.asset_id,
                ticker=h.asset.ticker,
                asset_name=display_name,
                market=h.asset.market,
                asset_type=h.asset.asset_type,
                quantity=h.quantity,
                average_buy_price=h.average_buy_price,
                currency=h.currency,
                current_price=current_price,
                previous_close=asset_info.get("previous_close") or current_price - asset_info["change_amount"],
                change_amount=asset_info["change_amount"],
                change_pct=asset_info["change_pct"],
                valuation=round(valuation, 2),
                invested_cost=round(invested_cost, 2),
                unrealized_pnl=round(unrealized_pnl, 2),
                return_pct=round(return_pct, 2)
            ))
            
        return responses

    @staticmethod
    async def get_stock_detail(db: AsyncSession, ticker: str) -> Optional[StockDetailResponse]:
        """P-101 종목 상세 통합 페이지 데이터 조회"""
        stmt = select(Asset).where(Asset.ticker == ticker.upper()).options(
            selectinload(Asset.holdings).selectinload(Holding.account),
            selectinload(Asset.transactions).selectinload(Transaction.account)
        )
        result = await db.execute(stmt)
        asset = result.scalars().first()
        
        if not asset:
            return None
            
        asset_info = stock_service.get_stock_price(asset.ticker)
        if asset.name.strip().upper() == asset.ticker.upper() and asset_info.get("name"):
            asset.name = asset_info["name"]
        current_price = asset_info["price"]
        asset.current_price = current_price
        asset.change_pct = asset_info["change_pct"]
        asset.change_amount = asset_info["change_amount"]
        
        total_shares = sum(h.quantity for h in asset.holdings)
        total_principal = sum(h.quantity * h.average_buy_price for h in asset.holdings)
        total_valuation = total_shares * current_price
        total_return_amount = total_valuation - total_principal
        total_return_pct = (total_return_amount / total_principal * 100) if total_principal > 0 else 0.0
        
        # Realized profit from sell transactions
        realized_profit_total = sum(t.realized_pnl or 0.0 for t in asset.transactions if t.type == "SELL")
        
        # Holdings by brokerage
        holding_items = []
        for h in asset.holdings:
            h_cost = h.quantity * h.average_buy_price
            h_val = h.quantity * current_price
            h_ret = ((h_val - h_cost) / h_cost * 100) if h_cost > 0 else 0.0
            holding_items.append(StockHoldingItem(
                holding_id=h.id,
                account_id=h.account_id,
                brokerage_name=h.account.name if h.account else "계좌",
                shares=h.quantity,
                avg_price=h.average_buy_price,
                currency=h.currency,
                return_pct=round(h_ret, 2)
            ))
            
        # Transactions list
        tx_items = []
        for t in sorted(asset.transactions, key=lambda x: x.transacted_at, reverse=True):
            tx_items.append(TransactionResponse(
                id=t.id,
                account_id=t.account_id,
                account_name=t.account.name if t.account else "",
                asset_id=t.asset_id,
                ticker=asset.ticker,
                asset_name=asset.name,
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

        return StockDetailResponse(
            asset=AssetResponse.model_validate(asset),
            total_shares=total_shares,
            total_valuation=round(total_valuation, 2),
            total_principal=round(total_principal, 2),
            total_return_amount=round(total_return_amount, 2),
            total_return_pct=round(total_return_pct, 2),
            realized_profit_total=round(realized_profit_total, 2),
            holdings=holding_items,
            transactions=tx_items
        )

    @staticmethod
    async def add_manual_asset(
        db: AsyncSession,
        brokerage: str,
        ticker: str,
        name: str,
        market: str,
        quantity: float,
        average_buy_price: float,
        currency: str,
        transacted_at: Optional[str] = None
    ) -> Dict[str, Any]:
        """사용자가 직접 초기자산(계좌, 종목, 수량, 평단가)을 등록"""
        clean_ticker = ticker.strip().upper()
        clean_name = name.strip() or clean_ticker
        clean_brokerage = brokerage.strip() or "기본 계좌"

        # 1. 계좌 확인/생성
        stmt_acc = select(Account).where(Account.name == clean_brokerage)
        res_acc = await db.execute(stmt_acc)
        account = res_acc.scalar_one_or_none()
        if not account:
            account = Account(
                name=clean_brokerage,
                brokerage_code="MANUAL",
                account_number="MANUAL",
                currency=currency,
                is_active=True
            )
            db.add(account)
            await db.flush()

        # 2. 자산(Asset) 확인/생성
        stmt_asset = select(Asset).where(Asset.ticker == clean_ticker)
        res_asset = await db.execute(stmt_asset)
        asset = res_asset.scalar_one_or_none()
        if not asset:
            asset = Asset(
                ticker=clean_ticker,
                name=clean_name,
                market=market.upper(),
                asset_type="stock",
                currency=currency,
                current_price=average_buy_price
            )
            db.add(asset)
            await db.flush()

        # 3. Holding(보유잔고) 확인/생성
        stmt_holding = select(Holding).where(
            Holding.account_id == account.id,
            Holding.asset_id == asset.id
        )
        res_holding = await db.execute(stmt_holding)
        holding = res_holding.scalar_one_or_none()

        if holding:
            # 기존 보유 수량 및 평단가 가중평균 갱신
            total_qty = holding.quantity + quantity
            if total_qty > 0:
                holding.average_buy_price = (
                    (holding.quantity * holding.average_buy_price) + (quantity * average_buy_price)
                ) / total_qty
                holding.quantity = total_qty
        else:
            holding = Holding(
                account_id=account.id,
                asset_id=asset.id,
                quantity=quantity,
                average_buy_price=average_buy_price,
                currency=currency
            )
            db.add(holding)

        # 4. 초기 매수 체결 Transaction 기록
        tx_date = datetime.utcnow()
        if transacted_at:
            try:
                tx_date = datetime.strptime(transacted_at[:10], "%Y-%m-%d")
            except ValueError:
                pass

        tx = Transaction(
            account_id=account.id,
            asset_id=asset.id,
            type="BUY",
            quantity=quantity,
            price=average_buy_price,
            currency=currency,
            notes="초기 자산 직접 등록",
            transacted_at=tx_date
        )
        db.add(tx)
        await db.commit()

        return {
            "success": True,
            "message": f"[{clean_name}] {quantity}주가 {clean_brokerage}에 성공적으로 등록되었습니다.",
            "holding_id": holding.id,
            "ticker": clean_ticker,
            "quantity": holding.quantity,
            "average_buy_price": holding.average_buy_price
        }

portfolio_service = PortfolioService()
