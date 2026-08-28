from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel

from app.services.stock_service import stock_service
from app.services.kis_service import kis_service

router = APIRouter(prefix="/stream", tags=["Realtime stream"])


class TickIngestRequest(BaseModel):
    ticker: str
    market: Literal["KR", "US"]
    currency: Literal["KRW", "USD"]
    currentPrice: float
    # 최초 틱에서만 전일 종가를 확정한다. 이후 틱에서는 이 값을 유지해
    # 현재가 변화만으로 당일 변동을 재계산한다.
    previousClose: float | None = None
    forcePreviousClose: bool = False
    changeAmount: float = 0
    changePercent: float = 0


@router.post("/ticks", status_code=204)
async def ingest_tick(tick: TickIngestRequest) -> None:
    """Node KIS 릴레이가 수신한 틱을 포트폴리오 시세 캐시에 즉시 반영한다."""
    payload = tick.model_dump()
    ticker = tick.ticker.upper().strip()
    # 해외 체결 틱의 등락률은 장외 기준이 섞일 수 있다. 서버 실행 뒤 첫 틱에서
    # KIS 단건 시세가 제공하는 정규장 전일 종가를 기준값으로 확정한다.
    if tick.market == "US" and not stock_service.has_canonical_previous_close(ticker):
        canonical_quote = await kis_service.get_us_stock_price(ticker)
        canonical_previous_close = (canonical_quote or {}).get("previous_close")
        if canonical_previous_close and canonical_previous_close > 0:
            payload["previousClose"] = canonical_previous_close
            payload["forcePreviousClose"] = True
    stock_service.apply_realtime_tick(payload)
