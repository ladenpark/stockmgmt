import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_health_check():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"

@pytest.mark.asyncio
async def test_portfolio_summary():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/v1/portfolio/summary")
    assert response.status_code == 200
    data = response.json()
    assert "total_valuation_krw" in data
    assert "total_valuation_usd" in data
    assert "exchange_rate" in data

@pytest.mark.asyncio
async def test_holdings_list():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/v1/portfolio/holdings")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    if data:
        assert "ticker" in data[0]
        assert "valuation" in data[0]

@pytest.mark.asyncio
async def test_analysis_endpoints():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Dividend
        res_div = await ac.get("/api/v1/analysis/dividend")
        assert res_div.status_code == 200
        assert "annual_dividend_krw" in res_div.json()

        # Tax (250만원 공제 22%)
        res_tax = await ac.get("/api/v1/analysis/tax?year=2024")
        assert res_tax.status_code == 200
        tax_data = res_tax.json()
        assert tax_data["deduction_krw"] == 2500000.0
        assert tax_data["tax_rate_pct"] == 22.0

        # Weight
        res_weight = await ac.get("/api/v1/analysis/weight?category=stocks")
        assert res_weight.status_code == 200
        assert len(res_weight.json()["items"]) > 0
