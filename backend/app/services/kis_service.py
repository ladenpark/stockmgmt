import logging
import httpx
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from app.core.config import settings

logger = logging.getLogger(__name__)

class KISService:
    """
    한국투자증권 (KIS Developers) Open API 자동화 서비스
    - OAuth2 접근 토큰(24시간) 만료 전 자동 발급 및 갱신 (Zero-Maintenance)
    - 국내 주식(KRX) 실시간 현재가 / 등락률 조회
    - 미국 주식(NASDAQ, NYSE, AMEX) 실시간 현재가 / 등락률 조회
    - 장애 시 Yahoo Finance로 무중단 자동 폴백
    """

    def __init__(self):
        self.app_key = getattr(settings, "KIS_APP_KEY", "")
        self.app_secret = getattr(settings, "KIS_APP_SECRET", "")
        self.is_virtual = getattr(settings, "KIS_IS_VIRTUAL", False)
        
        self.base_url = (
            "https://openapivts.koreainvestment.com:29443"
            if self.is_virtual
            else "https://openapi.koreainvestment.com:9443"
        )
        
        # Token in-memory cache
        self.access_token: Optional[str] = None
        self.token_expires_at: Optional[datetime] = None

    def is_configured(self) -> bool:
        """KIS API Key 및 Secret이 정상 설정되어 있는지 확인"""
        return bool(self.app_key and self.app_secret and self.app_key != "YOUR_KIS_APP_KEY")

    async def get_valid_token(self) -> Optional[str]:
        """
        유효한 Access Token 반환.
        만료되었거나 만료 10분 전이면 자동으로 KIS 서버에 새 토큰을 요청하여 갱신합니다.
        """
        if not self.is_configured():
            return None

        # 이미 유효한 토큰이 있는 경우 반환 (만료 10분 전까지 재사용)
        now = datetime.utcnow()
        if self.access_token and self.token_expires_at and now < (self.token_expires_at - timedelta(minutes=10)):
            return self.access_token

        # 토큰 새로 발급
        logger.info("한국투자증권(KIS) OAuth2 Access Token 자동 발급 요청 중...")
        try:
            url = f"{self.base_url}/oauth2/tokenP"
            payload = {
                "grant_type": "client_credentials",
                "appkey": self.app_key,
                "appsecret": self.app_secret
            }
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(url, json=payload)
                data = res.json()

                if res.status_code == 200 and "access_token" in data:
                    self.access_token = data["access_token"]
                    expires_in_sec = int(data.get("expires_in", 86400))
                    self.token_expires_at = now + timedelta(seconds=expires_in_sec)
                    logger.info(f"KIS 토큰 자동 발급 성공! (유효기간: {expires_in_sec}초 / ~{self.token_expires_at} UTC)")
                    return self.access_token
                else:
                    logger.error(f"KIS 토큰 발급 실패: {data}")
                    return None
        except Exception as e:
            logger.error(f"KIS 토큰 발급 중 네트워크 오류: {e}")
            return None

    async def get_kr_stock_price(self, iscd: str) -> Optional[Dict[str, Any]]:
        """국내 주식 실시간 시세 조회 (tr_id: FHKST01010100)"""
        token = await self.get_valid_token()
        if not token:
            return None

        try:
            url = f"{self.base_url}/uapi/domestic-stock/v1/quotations/inquire-price"
            headers = {
                "content-type": "application/json; charset=utf-8",
                "authorization": f"Bearer {token}",
                "appkey": self.app_key,
                "appsecret": self.app_secret,
                "tr_id": "FHKST01010100"
            }
            params = {
                "FID_COND_MRKT_DIV_CODE": "J",
                "FID_INPUT_ISCD": iscd.strip()
            }
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.get(url, headers=headers, params=params)
                data = res.json()

                if res.status_code == 200 and data.get("rt_cd") == "0":
                    output = data.get("output", {})
                    current_price = float(output.get("stck_prpr", 0))
                    change_amount = float(output.get("prdy_vrss", 0))
                    change_pct = float(output.get("prdy_ctrt", 0))
                    name = output.get("rprs_mrkt_kor_name", iscd)

                    return {
                        "price": current_price,
                        "change_pct": change_pct,
                        "change_amount": change_amount,
                        "name": name,
                        "market": "KR",
                        "currency": "KRW",
                        "source": "KIS_REALTIME"
                    }
                else:
                    logger.warning(f"KIS 국내 시세 조회 실패 ({iscd}): {data.get('msg1')}")
                    return None
        except Exception as e:
            logger.warning(f"KIS 국내 시세 API 호출 오류 ({iscd}): {e}")
            return None

    async def get_us_stock_price(self, ticker: str, excd: str = "NAS") -> Optional[Dict[str, Any]]:
        """해외(미국) 주식 실시간 시세 조회 (tr_id: HHDFS00000300)"""
        token = await self.get_valid_token()
        if not token:
            return None

        try:
            url = f"{self.base_url}/uapi/overseas-price/v1/quotations/price"
            headers = {
                "content-type": "application/json; charset=utf-8",
                "authorization": f"Bearer {token}",
                "appkey": self.app_key,
                "appsecret": self.app_secret,
                "tr_id": "HHDFS00000300"
            }
            params = {
                "AUTH": "",
                "EXCD": excd,
                "SYMB": ticker.upper().strip()
            }
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.get(url, headers=headers, params=params)
                data = res.json()

                if res.status_code == 200 and data.get("rt_cd") == "0":
                    output = data.get("output", {})
                    current_price = float(output.get("last", 0))
                    change_amount = float(output.get("diff", 0))
                    change_pct = float(output.get("rate", 0))

                    return {
                        "price": current_price,
                        "change_pct": change_pct,
                        "change_amount": change_amount,
                        "name": ticker.upper(),
                        "market": "US",
                        "currency": "USD",
                        "source": "KIS_REALTIME"
                    }
                else:
                    logger.warning(f"KIS 미국 시세 조회 실패 ({ticker}): {data.get('msg1')}")
                    return None
        except Exception as e:
            logger.warning(f"KIS 미국 시세 API 호출 오류 ({ticker}): {e}")
            return None

kis_service = KISService()
