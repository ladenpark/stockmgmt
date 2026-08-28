from fastapi import APIRouter
from app.api.v1.portfolio import router as portfolio_router
from app.api.v1.stocks import router as stocks_router
from app.api.v1.transactions import router as transactions_router
from app.api.v1.daily import router as daily_router
from app.api.v1.what_if import router as whatif_router
from app.api.v1.analysis import router as analysis_router
from app.api.v1.hub import router as hub_router
from app.api.v1.ws_ticks import router as ws_ticks_router
from app.api.v1.stream import router as stream_router

api_v1_router = APIRouter()
api_v1_router.include_router(portfolio_router)
api_v1_router.include_router(stocks_router)
api_v1_router.include_router(transactions_router)
api_v1_router.include_router(daily_router)
api_v1_router.include_router(whatif_router)
api_v1_router.include_router(analysis_router)
api_v1_router.include_router(hub_router)
api_v1_router.include_router(ws_ticks_router)
api_v1_router.include_router(stream_router)
