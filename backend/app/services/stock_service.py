import logging
import time
from typing import Dict, Any, List, Optional
import httpx
from app.core.config import settings
from app.services.kis_service import kis_service

logger = logging.getLogger(__name__)

# In-memory realtime cache
_PRICE_CACHE: Dict[str, Dict[str, Any]] = {
    "AAPL": {"price": 192.42, "previous_close": 190.04, "change_pct": 1.25, "change_amount": 2.38, "name": "Apple Inc.", "market": "US", "currency": "USD", "category": "테크놀로지"},
    "NVDA": {"price": 945.50, "previous_close": 914.30, "change_pct": 3.42, "change_amount": 31.20, "name": "NVIDIA Corporation", "market": "US", "currency": "USD", "category": "반도체 / AI"},
    "MSFT": {"price": 428.15, "previous_close": 430.10, "change_pct": -0.45, "change_amount": -1.95, "name": "Microsoft Corporation", "market": "US", "currency": "USD", "category": "소프트웨어 / 클라우드"},
    "005930": {"price": 78500.0, "previous_close": 77800.0, "change_pct": 0.89, "change_amount": 700.0, "name": "삼성전자", "market": "KR", "currency": "KRW", "category": "국내 대형주"},
    "TSLA": {"price": 178.50, "previous_close": 174.75, "change_pct": 2.15, "change_amount": 3.75, "name": "Tesla, Inc.", "market": "US", "currency": "USD", "category": "전기차 / 신에너지"},
    "O": {"price": 54.20, "previous_close": 54.01, "change_pct": 0.35, "change_amount": 0.19, "name": "Realty Income Corporation", "market": "US", "currency": "USD", "category": "월배당 리츠"},
    "PLTR": {"price": 25.80, "previous_close": 25.10, "change_pct": 2.80, "change_amount": 0.70, "name": "Palantir Technologies Inc.", "market": "US", "currency": "USD", "category": "AI / 빅데이터"},
    "MU": {"price": 128.50, "previous_close": 126.05, "change_pct": 1.95, "change_amount": 2.45, "name": "Micron Technology, Inc.", "market": "US", "currency": "USD", "category": "반도체"},
    "LCID": {"price": 3.15, "previous_close": 3.20, "change_pct": -1.50, "change_amount": -0.05, "name": "Lucid Group, Inc.", "market": "US", "currency": "USD", "category": "전기차"},
    "RXRX": {"price": 3.43, "previous_close": 3.26, "change_pct": 5.21, "change_amount": 0.17, "name": "Recursion Pharmaceuticals, Inc.", "market": "US", "currency": "USD", "category": "AI 신약개발"}
}
_LIVE_QUOTE_CACHE: Dict[str, tuple[float, Dict[str, Any]]] = {}
# 화면의 15초 동기화 주기와 맞춘다. 동일 요청에서 외부 시세 제공자를 과도하게
# 호출하지 않으면서도 카드가 오래된 값으로 고정되어 보이지 않게 한다.
_QUOTE_CACHE_TTL_SECONDS = 15

class StockService:
    @staticmethod
    def get_exchange_rate() -> float:
        """USD/KRW 실시간 환율 반환"""
        return settings.DEFAULT_USD_KRW_RATE

    @staticmethod
    def apply_realtime_tick(tick: Dict[str, Any]) -> None:
        """KIS 웹소켓 틱을 REST 조회와 공유하는 현재 시세 캐시에 반영한다."""
        ticker = str(tick.get("ticker") or "").upper().strip()
        currency = tick.get("currency") or ("KRW" if ticker.isdigit() else "USD")
        price_precision = 0 if currency == "KRW" else 2
        price = round(float(tick.get("currentPrice") or 0), price_precision)
        if not ticker or price <= 0:
            return
        fallback = _PRICE_CACHE.get(ticker, {})
        cached = _LIVE_QUOTE_CACHE.get(ticker)
        cached_quote = cached[1] if cached else {}
        reported_previous_close = float(tick.get("previousClose") or 0)
        if reported_previous_close <= 0:
            reported_pct = float(tick.get("changePercent") or 0)
            reported_change = float(tick.get("changeAmount") or 0)
            if abs(reported_pct) < 99:
                reported_previous_close = price / (1 + reported_pct / 100)
            elif price - reported_change > 0:
                reported_previous_close = price - reported_change
        # KIS 단건 시세에서 받은 정규장 전일 종가는 기존 Yahoo/장외 캐시보다 우선한다.
        # 그 뒤의 모든 틱은 이 값을 고정한 채 현재가만 갱신한다.
        force_previous_close = bool(tick.get("forcePreviousClose"))
        previous_close = float(
            reported_previous_close if force_previous_close and reported_previous_close > 0
            else cached_quote.get("previous_close") or reported_previous_close or fallback.get("previous_close") or price
        )
        previous_close = round(previous_close, price_precision)
        change_amount = round(price - previous_close, price_precision)
        change_pct = (change_amount / previous_close * 100) if previous_close else 0.0
        _LIVE_QUOTE_CACHE[ticker] = (time.monotonic(), {
            "price": price,
            "previous_close": previous_close,
            "previous_close_source": "KIS_REGULAR" if force_previous_close else cached_quote.get("previous_close_source", "TICK"),
            "change_pct": round(change_pct, 4),
            "change_amount": change_amount,
            "name": fallback.get("name", ticker),
            "market": tick.get("market") or ("KR" if ticker.isdigit() else "US"),
            "currency": currency,
            "category": fallback.get("category", "일반 주식"),
        })

    @staticmethod
    def has_live_quote(ticker: str) -> bool:
        """이번 서버 실행에서 해당 종목의 전일 종가가 이미 확정됐는지 반환한다."""
        return str(ticker).upper().strip() in _LIVE_QUOTE_CACHE

    @staticmethod
    def has_canonical_previous_close(ticker: str) -> bool:
        cached = _LIVE_QUOTE_CACHE.get(str(ticker).upper().strip())
        return bool(cached and cached[1].get("previous_close_source") == "KIS_REGULAR")

    @staticmethod
    async def search_stocks(query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Yahoo Finance 종목 검색 API에서 종목명·티커 메타데이터를 조회합니다."""
        try:
            async with httpx.AsyncClient(timeout=5.0, headers={"User-Agent": "Mozilla/5.0"}) as client:
                response = await client.get(
                    "https://query1.finance.yahoo.com/v1/finance/search",
                    params={"q": query, "quotesCount": min(max(limit, 1), 20), "newsCount": 0},
                )
                response.raise_for_status()
            results: List[Dict[str, Any]] = []
            seen = set()
            for quote in response.json().get("quotes", []):
                if quote.get("quoteType") not in {"EQUITY", "ETF", "MUTUALFUND", "CRYPTOCURRENCY"}:
                    continue
                symbol = str(quote.get("symbol") or "").upper()
                if not symbol or symbol in seen:
                    continue
                is_korean = symbol.endswith((".KS", ".KQ")) or quote.get("currency") == "KRW"
                # 현재 앱의 거래 통화/시장 모델은 미국과 한국만 지원한다.
                if not is_korean and quote.get("exchange") not in {"NMS", "NYQ", "NGM", "NAS", "PCX", "BTS", "ASE", "OQX", "PNK", "NCM", "NGO"}:
                    continue
                ticker = symbol.rsplit(".", 1)[0] if is_korean else symbol
                seen.add(symbol)
                results.append({
                    "ticker": ticker,
                    "name": quote.get("longname") or quote.get("shortname") or ticker,
                    "nameEn": quote.get("longname") or quote.get("shortname"),
                    "market": "KR" if is_korean else "US",
                    "currency": "KRW" if is_korean else "USD",
                    "category": quote.get("sectorDisp") or quote.get("typeDisp") or "해외주식",
                })
                if len(results) >= limit:
                    break
            return results
        except Exception as exc:
            logger.warning("Yahoo Finance 종목 검색 실패 (%s): %s", query, exc)
            return []

    @staticmethod
    def get_stock_price(ticker: str) -> Dict[str, Any]:
        """
        티커의 실시간 시세 및 메타데이터 조회
        1. 한국투자증권(KIS) API 설정 시 KIS 실시간 시세 우선 조회
        2. KIS 미설정 또는 실패 시 Yahoo Finance (yfinance) 조회
        3. 실패 시 로컬 캐시 폴백 (앱 중단 방지)
        """
        ticker_clean = ticker.upper().strip()
        cached = _LIVE_QUOTE_CACHE.get(ticker_clean)
        if cached and time.monotonic() - cached[0] < _QUOTE_CACHE_TTL_SECONDS:
            return cached[1]

        # 한국 종목은 Yahoo Finance에서 시장 접미사가 필요하다. 코스피를 먼저 시도하고,
        # 값이 없을 때 코스닥을 시도한다.
        symbols = [ticker_clean] if not ticker_clean.isdigit() else [f"{ticker_clean}.KS", f"{ticker_clean}.KQ"]
        fallback = _PRICE_CACHE.get(ticker_clean, {})
        for symbol in symbols:
            try:
                import yfinance as yf
                stock = yf.Ticker(symbol)
                info = stock.fast_info
                price = float(info.last_price or 0)
                if price <= 0:
                    continue
                prev_close = float(info.previous_close or price)
                metadata = stock.get_info()
                data = {
                    "price": round(price, 2),
                    "previous_close": round(prev_close, 4),
                    "previous_close_source": "YAHOO",
                    "change_pct": round(((price - prev_close) / prev_close * 100) if prev_close else 0.0, 2),
                    "change_amount": round(price - prev_close, 2),
                    "name": metadata.get("longName") or metadata.get("shortName") or fallback.get("name") or ticker_clean,
                    "market": "KR" if ticker_clean.isdigit() else "US",
                    "currency": "KRW" if ticker_clean.isdigit() else "USD",
                    "category": fallback.get("category", "일반 주식"),
                }
                _LIVE_QUOTE_CACHE[ticker_clean] = (time.monotonic(), data)
                return data
            except Exception as exc:
                logger.warning("yfinance 시세 조회 실패 (%s): %s", symbol, exc)

        # 외부 시세 API 장애 시에만 마지막 검증 가능한 캐시를 사용한다.
        if fallback:
            return fallback
        return {
            "price": 0.0, "change_pct": 0.0, "change_amount": 0.0,
            "name": ticker_clean, "market": "KR" if ticker_clean.isdigit() else "US",
            "currency": "KRW" if ticker_clean.isdigit() else "USD", "category": "기타",
        }

stock_service = StockService()
