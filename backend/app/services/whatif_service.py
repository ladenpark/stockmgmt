from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.models.asset import Asset
from app.models.whatif import WhatIfItem
from app.schemas.schemas import (
    WhatIfCreate, WhatIfItemResponse, WhatIfSummaryResponse
)
from app.services.stock_service import stock_service

# Default Sample What-If Items
SAMPLE_WHATIF_DIVESTED = [
    {
        "ticker": "NVDA",
        "name": "엔비디아",
        "mode": "DIVESTED",
        "target_date": "2023.10",
        "quantity": 20.0,
        "entry_price": 380.0,
        "sell_price": 450.0,
        "tag": "최고 기회비용"
    },
    {
        "ticker": "AAPL",
        "name": "애플",
        "mode": "DIVESTED",
        "target_date": "2023.01",
        "quantity": 30.0,
        "entry_price": 130.0,
        "sell_price": 145.0,
        "tag": "지속 상승"
    },
    {
        "ticker": "LCID",
        "name": "루시드",
        "mode": "DIVESTED",
        "target_date": "2023.04",
        "quantity": 300.0,
        "entry_price": 12.0,
        "sell_price": 8.50,
        "tag": "손실 회피 성공 (잘 판 주식)"
    }
]

SAMPLE_WHATIF_VIRTUAL = [
    {
        "ticker": "PLTR",
        "name": "팔란티어",
        "mode": "VIRTUAL",
        "target_date": "2024.01.05",
        "quantity": 100.0,
        "entry_price": 16.50,
        "sell_price": 0.0,
        "tag": "가상 보유"
    },
    {
        "ticker": "MU",
        "name": "마이크론",
        "mode": "VIRTUAL",
        "target_date": "2024.02.15",
        "quantity": 50.0,
        "entry_price": 85.00,
        "sell_price": 0.0,
        "tag": "가상 보유"
    }
]

class WhatIfService:
    @staticmethod
    async def get_whatif_summary(db: AsyncSession) -> WhatIfSummaryResponse:
        """What-If 시뮬레이션 종합 기회비용 및 종목 리스트 반환"""
        rate = stock_service.get_exchange_rate()
        
        stmt = select(WhatIfItem).options(selectinload(WhatIfItem.asset))
        result = await db.execute(stmt)
        items = result.scalars().all()

        divested_responses = []
        virtual_responses = []
        total_foregone_usd = 0.0

        if not items:
            # Process sample items
            for s in SAMPLE_WHATIF_DIVESTED:
                price_info = stock_service.get_stock_price(s["ticker"])
                curr_price = price_info["price"]
                diff_pct = ((curr_price - s["sell_price"]) / s["sell_price"] * 100) if s["sell_price"] else 0.0
                foregone_gain = s["quantity"] * (curr_price - s["sell_price"])
                total_foregone_usd += foregone_gain

                divested_responses.append(WhatIfItemResponse(
                    id=0,
                    ticker=s["ticker"],
                    name=s["name"],
                    mode="DIVESTED",
                    target_date=s["target_date"],
                    quantity=s["quantity"],
                    entry_price=s["entry_price"],
                    sell_price=s["sell_price"],
                    current_price=curr_price,
                    diff_pct=round(diff_pct, 2),
                    foregone_gain=round(foregone_gain, 2),
                    tag=s["tag"]
                ))

            for s in SAMPLE_WHATIF_VIRTUAL:
                price_info = stock_service.get_stock_price(s["ticker"])
                curr_price = price_info["price"]
                diff_pct = ((curr_price - s["entry_price"]) / s["entry_price"] * 100) if s["entry_price"] else 0.0
                unrealized_gain = s["quantity"] * (curr_price - s["entry_price"])

                virtual_responses.append(WhatIfItemResponse(
                    id=0,
                    ticker=s["ticker"],
                    name=s["name"],
                    mode="VIRTUAL",
                    target_date=s["target_date"],
                    quantity=s["quantity"],
                    entry_price=s["entry_price"],
                    sell_price=s["sell_price"],
                    current_price=curr_price,
                    diff_pct=round(diff_pct, 2),
                    foregone_gain=round(unrealized_gain, 2),
                    tag=s["tag"]
                ))
        else:
            for item in items:
                price_info = stock_service.get_stock_price(item.asset.ticker)
                curr_price = price_info["price"]
                
                if item.mode == "DIVESTED":
                    diff_pct = ((curr_price - item.sell_price) / item.sell_price * 100) if item.sell_price else 0.0
                    foregone_gain = item.quantity * (curr_price - item.sell_price)
                    total_foregone_usd += foregone_gain
                    divested_responses.append(WhatIfItemResponse(
                        id=item.id,
                        ticker=item.asset.ticker,
                        name=item.asset.name,
                        mode="DIVESTED",
                        target_date=item.target_date,
                        quantity=item.quantity,
                        entry_price=item.entry_price,
                        sell_price=item.sell_price,
                        current_price=curr_price,
                        diff_pct=round(diff_pct, 2),
                        foregone_gain=round(foregone_gain, 2),
                        tag=item.tag
                    ))
                else:
                    diff_pct = ((curr_price - item.entry_price) / item.entry_price * 100) if item.entry_price else 0.0
                    gain = item.quantity * (curr_price - item.entry_price)
                    virtual_responses.append(WhatIfItemResponse(
                        id=item.id,
                        ticker=item.asset.ticker,
                        name=item.asset.name,
                        mode="VIRTUAL",
                        target_date=item.target_date,
                        quantity=item.quantity,
                        entry_price=item.entry_price,
                        sell_price=item.sell_price,
                        current_price=curr_price,
                        diff_pct=round(diff_pct, 2),
                        foregone_gain=round(gain, 2),
                        tag=item.tag
                    ))

        return WhatIfSummaryResponse(
            total_foregone_usd=round(total_foregone_usd, 2),
            total_foregone_krw=round(total_foregone_usd * rate, 0),
            divested_items=divested_responses,
            virtual_items=virtual_responses
        )

    @staticmethod
    async def create_whatif_item(db: AsyncSession, data: WhatIfCreate) -> WhatIfItemResponse:
        """가상 보유 또는 과거 매도 What-If 종목 등록"""
        stmt_asset = select(Asset).where(Asset.ticker == data.ticker.upper().strip())
        res_asset = await db.execute(stmt_asset)
        asset = res_asset.scalars().first()

        if not asset:
            price_info = stock_service.get_stock_price(data.ticker)
            asset = Asset(
                ticker=data.ticker.upper().strip(),
                name=data.name or price_info.get("name", data.ticker),
                current_price=price_info.get("price", data.entry_price)
            )
            db.add(asset)
            await db.flush()

        item = WhatIfItem(
            asset_id=asset.id,
            mode=data.mode.upper(),
            target_date=data.target_date,
            quantity=data.quantity,
            entry_price=data.entry_price,
            sell_price=data.sell_price or 0.0,
            tag="가상 보유" if data.mode.upper() == "VIRTUAL" else "과거 매도"
        )
        db.add(item)
        await db.commit()
        await db.refresh(item)

        price_info = stock_service.get_stock_price(asset.ticker)
        curr_price = price_info["price"]
        base_price = item.sell_price if item.mode == "DIVESTED" else item.entry_price
        diff_pct = ((curr_price - base_price) / base_price * 100) if base_price else 0.0
        foregone_gain = item.quantity * (curr_price - base_price)

        return WhatIfItemResponse(
            id=item.id,
            ticker=asset.ticker,
            name=asset.name,
            mode=item.mode,
            target_date=item.target_date,
            quantity=item.quantity,
            entry_price=item.entry_price,
            sell_price=item.sell_price,
            current_price=curr_price,
            diff_pct=round(diff_pct, 2),
            foregone_gain=round(foregone_gain, 2),
            tag=item.tag
        )

whatif_service = WhatIfService()
