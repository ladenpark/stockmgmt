from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.kis_websocket import kis_ws_manager
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

@router.websocket("/ws/ticks")
async def websocket_ticks_endpoint(websocket: WebSocket):
    """
    Next.js 프론트엔드용 실시간 틱(Tick) 체결가 스트리밍 웹소켓 엔드포인트
    - 0.01초 단위 한국투자증권 실시간 체결 데이터를 프론트엔드로 실시간 Push
    """
    await websocket.accept()
    await kis_ws_manager.register_client(websocket)
    try:
        while True:
            # 클라이언트로부터 메시지 수신 (필요 시 종목 추가 구독 요청 등)
            data = await websocket.receive_text()
            logger.debug(f"웹소켓 수신 메시지: {data}")
    except WebSocketDisconnect:
        await kis_ws_manager.unregister_client(websocket)
    except Exception as e:
        logger.warning(f"웹소켓 클라이언트 오류: {e}")
        await kis_ws_manager.unregister_client(websocket)
