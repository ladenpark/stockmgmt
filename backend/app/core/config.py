import os
from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


BACKEND_DIR = Path(__file__).resolve().parents[2]
PROJECT_ROOT = BACKEND_DIR.parent


class Settings(BaseSettings):
    # 개발 서버를 backend/에서 실행해도 프로젝트 루트의 .env(KIS 키 포함)를 읽는다.
    # backend/.env가 존재할 경우에는 해당 값으로 개별 설정을 덮어쓸 수 있다.
    model_config = SettingsConfigDict(
        case_sensitive=True,
        env_file=(PROJECT_ROOT / ".env", BACKEND_DIR / ".env"),
    )
    PROJECT_NAME: str = "Alexandria Stock Management API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Database Configuration (PostgreSQL with SQLite fallback for instant local testing)
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "sqlite+aiosqlite:///./stockmgmt.db"
    )
    
    # Redis Configuration
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    
    # CORS Configuration
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:8080",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8080",
        "*"
    ]
    
    # Market & Currency Defaults
    DEFAULT_USD_KRW_RATE: float = 1385.50
    OVERSEAS_TAX_DEDUCTION_KRW: float = 2500000.0  # 250만원 기본공제
    OVERSEAS_TAX_RATE: float = 0.22  # 양도소득세 20% + 지방소득세 2%

    # Korea Investment & Securities (KIS) Open API Configuration
    KIS_APP_KEY: str = os.getenv("KIS_APP_KEY", "")
    KIS_APP_SECRET: str = os.getenv("KIS_APP_SECRET", "")
    KIS_CANO: str = os.getenv("KIS_CANO", "")  # 계좌번호 앞 8자리
    KIS_ACNT_PRDT_CD: str = os.getenv("KIS_ACNT_PRDT_CD", "01")  # 계좌번호 뒤 2자리 (종합계좌: 01)
    KIS_IS_VIRTUAL: bool = os.getenv("KIS_IS_VIRTUAL", "false").lower() == "true"  # 모의투자 여부
    # 기본 틱 공급자는 기존 Node 릴레이(8001)다. 동일 앱키의 중복 웹소켓 접속을 막는다.
    KIS_WEBSOCKET_ENABLED: bool = os.getenv("KIS_WEBSOCKET_ENABLED", "false").lower() == "true"
    
settings = Settings()
