import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import engine, Base, AsyncSessionLocal
from app.api.v1 import api_v1_router
from app.services.seed_data import seed_initial_data

import asyncio
from app.services.kis_websocket import kis_ws_manager

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("alexandria_api")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application Startup and Shutdown Lifecycle"""
    logger.info("Initializing database tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Seed sample data if empty
    async with AsyncSessionLocal() as session:
        await seed_initial_data(session)
        
    logger.info(f"{settings.PROJECT_NAME} v{settings.VERSION} started successfully!")

    # Start KIS WebSocket Stream in background if configured
    ws_task = None
    if kis_ws_manager.is_configured():
        logger.info("Starting KIS 실시간 틱(Tick) WebSocket background stream...")
        ws_task = asyncio.create_task(kis_ws_manager.start_kis_stream())

    yield

    logger.info("Shutting down application...")
    if ws_task:
        kis_ws_manager.stop()
        ws_task.cancel()

# FastAPI Application Factory
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Alexandria (알렉산드리아) 스마트 주식 자산관리 백엔드 API (조합 A: Next.js + FastAPI + PostgreSQL)",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(api_v1_router, prefix=settings.API_V1_STR)

@app.get("/health", tags=["Health"])
async def health_check():
    """Server health and status check"""
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
