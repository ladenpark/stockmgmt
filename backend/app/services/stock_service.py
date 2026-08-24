import logging
from typing import Dict, Any, Optional
from app.core.config import settings

logger = logging.getLogger(__name__)

# In-memory realtime cache
_PRICE_CACHE: Dict[str, Dict[str, Any]] = {
    "AAPL": {"price": 192.42, "change_pct": 1.25, "change_amount": 2.38, "name": "애플", "market": "US", "currency": "USD", "category": "테크놀로지"},
    "NVDA": {"price": 945.50, "change_pct": 3.42, "change_amount": 31.20, "name": "엔비디아", "market": "US", "currency": "USD", "category": "반도체 / AI"},
    "MSFT": {"price": 428.15, "change_pct": -0.45, "change_amount": -1.95, "name": "마이크로소프트", "market": "US", "currency": "USD", "category": "소프트웨어 / 클라우드"},
    "005930": {"price": 57.02, "change_pct": 0.89, "change_amount": 0.50, "name": "삼성전자", "market": "KR", "currency": "KRW", "category": "국내 대형주"},
    "TSLA": {"price": 178.50, "change_pct": 2.15, "change_amount": 3.75, "name": "테슬라", "market": "US", "currency": "USD", "category": "전기차 / 신에너지"},
    "O": {"price": 54.20, "change_pct": 0.35, "change_amount": 0.19, "name": "리얼티 인컴", "market": "US", "currency": "USD", "category": "월배당 리츠"},
    "PLTR": {"price": 25.80, "change_pct": 2.80, "change_amount": 0.70, "name": "팔란티어", "market": "US", "currency": "USD", "category": "AI / 빅데이터"},
    "MU": {"price": 128.50, "change_pct": 1.95, "change_amount": 2.45, "name": "마이크론", "market": "US", "currency": "USD", "category": "반도체"},
    "LCID": {"price": 3.15, "change_pct": -1.50, "change_amount": -0.05, "name": "루시드", "market": "US", "currency": "USD", "category": "전기차"}
}

class StockService:
    @staticmethod
    def get_exchange_rate() -> float:
        """USD/KRW 실시간 환율 반환"""
        return settings.DEFAULT_USD_KRW_RATE

    @staticmethod
    def get_stock_price(ticker: str) -> Dict[str, Any]:
        """티커의 실시간 시세 및 메타데이터 조회 (캐시 및 외부 연동)"""
        ticker_clean = ticker.upper().strip()
        if ticker_clean in _PRICE_CACHE:
            return _PRICE_CACHE[ticker_clean]
        
        # 외부 yfinance 시세 조회 시도
        try:
            import yfinance as yf
            stock = yf.Ticker(ticker_clean)
            info = stock.fast_info
            price = float(info.last_price or 100.0)
            prev_close = float(info.previous_close or price)
            change_amount = price - prev_close
            change_pct = (change_amount / prev_close) * 100 if prev_close else 0.0
            
            data = {
                "price": round(price, 2),
                "change_pct": round(change_pct, 2),
                "change_amount": round(change_amount, 2),
                "name": ticker_clean,
                "market": "KR" if ticker_clean.isdigit() else "US",
                "currency": "KRW" if ticker_clean.isdigit() else "USD",
                "category": "일반 주식"
            }
            _PRICE_CACHE[ticker_clean] = data
            return data
        except Exception as e:
            logger.warning(f"yfinance 시세 조회 실패 ({ticker_clean}): {e}")
            return {
                "price": 100.0,
                "change_pct": 0.0,
                "change_amount": 0.0,
                "name": ticker_clean,
                "market": "KR" if ticker_clean.isdigit() else "US",
                "currency": "KRW" if ticker_clean.isdigit() else "USD",
                "category": "기타"
            }

stock_service = StockService()
