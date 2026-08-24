import asyncio
import json
import logging
from typing import Set, Dict, Any, Optional
import httpx
import websockets
from app.core.config import settings

logger = logging.getLogger(__name__)

class KISWebSocketManager:
    """
    한국투자증권(KIS) 실시간 웹소켓 틱(Tick) 체결가 스트리밍 매니저
    - KIS 웹소켓 서버(ops.koreainvestment.com:21000) 연결
    - 국내(H0STCNT0) 및 미국(HDFSCNT0) 실시간 틱 체결 데이터 수신
    - Next.js 프론트엔드 클라이언트 웹소켓으로 0.01초 단위 밀리초 실시간 브로드캐스트
    - 자동 재연결(Auto-reconnect) 및 장애 회복
    """

    def __init__(self):
        self.app_key = getattr(settings, "KIS_APP_KEY", "")
        self.app_secret = getattr(settings, "KIS_APP_SECRET", "")
        self.is_virtual = getattr(settings, "KIS_IS_VIRTUAL", False)

        self.http_base_url = (
            "https://openapivts.koreainvestment.com:29443"
            if self.is_virtual
            else "https://openapi.koreainvestment.com:9443"
        )
        self.ws_url = (
            "ws://ops.koreainvestment.com:31000"
            if self.is_virtual
            else "ws://ops.koreainvestment.com:21000"
        )

        self.approval_key: Optional[str] = None
        self.active_clients: Set[Any] = set()
        self.subscribed_tickers: Set[str] = {"005930", "AAPL", "NVDA", "TSLA", "MSFT", "PLTR"}
        self.running = False
        self.kis_ws = None

    def is_configured(self) -> bool:
        return bool(self.app_key and self.app_secret and self.app_key != "YOUR_KIS_APP_KEY")

    async def get_approval_key(self) -> Optional[str]:
        """웹소켓 접속용 Approval Key 발급 (POST /oauth2/Approval)"""
        if not self.is_configured():
            return None
        if self.approval_key:
            return self.approval_key

        try:
            url = f"{self.http_base_url}/oauth2/Approval"
            payload = {
                "grant_type": "client_credentials",
                "appkey": self.app_key,
                "secretkey": self.app_secret
            }
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(url, json=payload)
                data = res.json()
                if res.status_code == 200 and "approval_key" in data:
                    self.approval_key = data["approval_key"]
                    logger.info("KIS WebSocket Approval Key 발급 성공!")
                    return self.approval_key
                else:
                    logger.error(f"Approval Key 발급 실패: {data}")
                    return None
        except Exception as e:
            logger.error(f"Approval Key 요청 중 오류: {e}")
            return None

    async def register_client(self, websocket: Any):
        """브라우저 프론트엔드 클라이언트 등록"""
        self.active_clients.add(websocket)
        logger.info(f"새 웹소켓 클라이언트 접속 (총 연결 수: {len(self.active_clients)})")

    async def unregister_client(self, websocket: Any):
        """브라우저 프론트엔드 클라이언트 해제"""
        self.active_clients.discard(websocket)
        logger.info(f"웹소켓 클라이언트 연결 종료 (남은 연결 수: {len(self.active_clients)})")

    async def broadcast_tick(self, tick_data: Dict[str, Any]):
        """모든 연결된 프론트엔드 웹소켓으로 틱 체결 데이터 전송"""
        if not self.active_clients:
            return

        msg = json.dumps({"type": "TICK", "data": tick_data})
        disconnected = set()
        for client in self.active_clients:
            try:
                await client.send_text(msg)
            except Exception:
                disconnected.add(client)

        for dc in disconnected:
            self.active_clients.discard(dc)

    def parse_kis_raw_tick(self, raw_data: str) -> Optional[Dict[str, Any]]:
        """
        KIS 실시간 틱 데이터 파싱
        Format: 암호화여부(0/1)|TR_ID|연속구분|TR_KEY^데이터1^데이터2^...
        """
        try:
            if raw_data.startswith("{"):
                # JSON 시스템 메시지(PINGPONG / 응답 등)
                data = json.loads(raw_data)
                tr_id = data.get("header", {}).get("tr_id")
                if tr_id == "PINGPONG":
                    return {"is_ping": True}
                return None

            parts = raw_data.split("|")
            if len(parts) < 4:
                return None

            tr_id = parts[1]
            body = parts[3]
            fields = body.split("^")

            # 1. 국내 주식 실시간 체결가 (H0STCNT0)
            if tr_id == "H0STCNT0" and len(fields) >= 13:
                ticker = fields[0]        # 유가증권단축종목코드
                time_str = fields[1]      # 체결시간 (HHMMSS)
                current_price = float(fields[2])  # 현재가
                sign = fields[3]          # 전일대비부호 (1:상한, 2:상승, 3:보합, 4:하한, 5:하락)
                change_amount = float(fields[4]) # 전일대비
                if sign in ("4", "5"):
                    change_amount = -change_amount
                change_pct = float(fields[5])    # 전일대비율
                volume = int(fields[12])         # 누적거래량

                return {
                    "ticker": ticker,
                    "market": "KR",
                    "currency": "KRW",
                    "currentPrice": current_price,
                    "changeAmount": change_amount,
                    "changePercent": change_pct,
                    "volume": volume,
                    "time": time_str,
                    "tickType": "UP" if sign in ("1", "2") else "DOWN" if sign in ("4", "5") else "FLAT"
                }

            # 2. 미국 주식 실시간 체결가 (HDFSCNT0)
            elif (tr_id in ("HDFSCNT0", "HDFSASP0")) and len(fields) >= 10:
                ticker_raw = fields[0]    # 종목코드 (예: DNASAAPL)
                ticker = ticker_raw[4:] if len(ticker_raw) > 4 else ticker_raw
                current_price = float(fields[11] if len(fields) > 11 else fields[1])
                change_amount = float(fields[12] if len(fields) > 12 else fields[2])
                change_pct = float(fields[13] if len(fields) > 13 else fields[3])
                sign = fields[14] if len(fields) > 14 else "2"

                return {
                    "ticker": ticker,
                    "market": "US",
                    "currency": "USD",
                    "currentPrice": current_price,
                    "changeAmount": change_amount,
                    "changePercent": change_pct,
                    "time": "",
                    "tickType": "UP" if change_amount >= 0 else "DOWN"
                }

        except Exception as e:
            logger.debug(f"틱 파싱 예외: {e}")
            return None

    async def subscribe_ticker(self, ws: Any, approval_key: str, ticker: str):
        """특정 종목 실시간 틱 구독 요청 전송"""
        is_kr = ticker.isdigit()
        tr_id = "H0STCNT0" if is_kr else "HDFSCNT0"
        tr_key = ticker if is_kr else f"DNAS{ticker.upper()}"

        req = {
            "header": {
                "approval_key": approval_key,
                "custtype": "P",
                "tr_type": "1",
                "content-type": "utf-8"
            },
            "body": {
                "input": {
                    "tr_id": tr_id,
                    "tr_key": tr_key
                }
            }
        }
        await ws.send(json.dumps(req))
        logger.info(f"KIS WebSocket 구독 요청 전송: {ticker} ({tr_id})")

    async def start_kis_stream(self):
        """KIS WebSocket 서버에 연결하고 실시간 틱 데이터 수신 및 브로드캐스트 루프"""
        self.running = True
        while self.running:
            try:
                approval_key = await self.get_approval_key()
                if not approval_key:
                    logger.warning("KIS WebSocket Approval Key 발급 대기 중... (5초 후 재시도)")
                    await asyncio.sleep(5)
                    continue

                logger.info(f"KIS 실시간 웹소켓 연결 시도 -> {self.ws_url}")
                async with websockets.connect(self.ws_url, ping_interval=20, ping_timeout=20) as ws:
                    self.kis_ws = ws
                    logger.info("🎉 KIS 실시간 틱(Tick) 웹소켓 연결 완료! 종목 구독 시작...")

                    # 관심 종목들 일괄 구독 등록
                    for ticker in self.subscribed_tickers:
                        await self.subscribe_ticker(ws, approval_key, ticker)
                        await asyncio.sleep(0.1)

                    # 실시간 틱 수신 루프
                    async for message in ws:
                        if not self.running:
                            break

                        parsed_tick = self.parse_kis_raw_tick(str(message))
                        if parsed_tick:
                            if parsed_tick.get("is_ping"):
                                # PINGPONG 수신 시 응답
                                await ws.send(message)
                            else:
                                # 브라우저 클라이언트로 0.01초 틱 브로드캐스트
                                await self.broadcast_tick(parsed_tick)

            except Exception as e:
                logger.warning(f"KIS WebSocket 연결 끊김 또는 오류: {e} (3초 후 자동 재연결)")
                await asyncio.sleep(3)

    def stop(self):
        self.running = False

kis_ws_manager = KISWebSocketManager()
