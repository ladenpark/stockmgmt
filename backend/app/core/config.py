import os
from typing import List
from pydantic_settings import BaseSettings
from pydantic import AnyHttpUrl, field_validator

class Settings(BaseSettings):
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
    
    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()
