"""Tests for analytics_service.py.

Pure-function tests (parse_range, compute_risk_metrics) need no DB.
DB tests use the shared ``db`` fixture and autouse mocks from conftest.py.
"""

import json
import pytest
from datetime import date, datetime, timedelta

from backend import models, schemas
from backend.repositories.asset_repo import AssetRepository
from backend.services import analytics_service


# ── Helpers ───────────────────────────────────────────────────────────────────

def _history(values: list[float], start: str = "2024-01-01") -> list[dict]:
    d = datetime.strptime(start, "%Y-%m-%d").date()
    result = []
    for v in values:
        result.append({"date": d.strftime("%Y-%m-%d"), "value": v})
        d += timedelta(days=1)
    return result


def _fluid_asset(db, name: str, amount: float) -> models.Asset:
    repo = AssetRepository(db)
    asset = repo.create(schemas.AssetCreate(name=name, category="Fluid", current_price=1.0))
    repo.create_transaction(
        schemas.TransactionCreate(amount=amount, buy_price=1.0, date=datetime(2025, 1, 1)),
        asset.id,
    )
    return asset


def _set_target_allocation(db, targets: dict) -> None:
    db.add(models.SystemSetting(key="target_allocation", value=json.dumps(targets)))
    db.commit()


def _insert_snapshots(db, n_days: int, start_value: float = 1_000_000.0) -> None:
    today = date.today()
    for i in range(n_days):
        d = (today - timedelta(days=n_days - 1 - i)).strftime("%Y-%m-%d")
        db.add(models.NetWorthHistory(
            date=d,
            value=start_value + i * 1_000,
            breakdown=json.dumps({"Fluid": start_value + i * 1_000}),
        ))
    db.commit()


# ── parse_range ───────────────────────────────────────────────────────────────

def test_parse_range_30d():
    assert (date.today() - analytics_service.parse_range("30d")).days == 30


def test_parse_range_ytd():
    assert analytics_service.parse_range("ytd") == date(date.today().year, 1, 1)


def test_parse_range_all():
    assert analytics_service.parse_range("all") == date(2020, 1, 1)


def test_parse_range_unknown_defaults_to_1y():
    assert (date.today() - analytics_service.parse_range("banana")).days == 365


# ── compute_risk_metrics ──────────────────────────────────────────────────────

def test_risk_metrics_empty_returns_na():
    m = analytics_service.compute_risk_metrics([])
    assert m["cagr"]["status"] == "N/A"
    assert m["maxDrawdown"]["status"] == "N/A"
    assert m["volatility"]["status"] == "N/A"


def test_risk_metrics_single_item_returns_na():
    assert analytics_service.compute_risk_metrics(_history([100_000]))["cagr"]["status"] == "N/A"


def test_risk_metrics_all_zeros_returns_na():
    assert analytics_service.compute_risk_metrics(_history([0, 0, 0]))["cagr"]["status"] == "N/A"


def test_risk_metrics_steady_growth_positive_cagr():
    values = [100_000 + i * 1_000 for i in range(100)]
    m = analytics_service.compute_risk_metrics(_history(values))
    assert m["cagr"]["value"] > 0
    assert m["maxDrawdown"]["value"] == pytest.approx(0.0)


def test_risk_metrics_drawdown_correct():
    # peak=150k, trough=80k → drawdown=46.7%
    values = [100_000, 120_000, 150_000, 80_000, 90_000]
    m = analytics_service.compute_risk_metrics(_history(values))
    expected_dd = (150_000 - 80_000) / 150_000 * 100
    assert m["maxDrawdown"]["value"] == pytest.approx(expected_dd, rel=0.01)
    assert m["maxDrawdown"]["status"] == "Heavy Loss"


def test_risk_metrics_declining_cagr_status():
    values = [100_000 - i * 500 for i in range(100)]
    m = analytics_service.compute_risk_metrics(_history(values))
    assert m["cagr"]["status"] == "Declining"


def test_risk_metrics_volatility_stable_for_flat():
    # Perfectly flat → zero volatility
    values = [100_000] * 50
    m = analytics_service.compute_risk_metrics(_history(values))
    assert m["volatility"]["value"] == pytest.approx(0.0)
    assert m["volatility"]["status"] == "Stable"


# ── compute_rebalance_suggestions ─────────────────────────────────────────────

def test_rebalance_no_assets_no_suggestions(db):
    result = analytics_service.compute_rebalance_suggestions(db)
    assert result["suggestions"] == []
    assert result["total_value"] == pytest.approx(0.0)


def test_rebalance_no_target_setting_no_suggestions(db):
    _fluid_asset(db, "Cash", 100_000)
    result = analytics_service.compute_rebalance_suggestions(db)
    assert result["suggestions"] == []


def test_rebalance_within_threshold_no_suggestion(db):
    # Fluid=100%, target=99% → diff=1% < 2% threshold
    _fluid_asset(db, "Cash", 100_000)
    _set_target_allocation(db, {"Fluid": 99})
    assert analytics_service.compute_rebalance_suggestions(db)["suggestions"] == []


def test_rebalance_over_allocated_suggests_sell(db):
    _fluid_asset(db, "Cash", 100_000)
    _set_target_allocation(db, {"Fluid": 50})
    result = analytics_service.compute_rebalance_suggestions(db)
    assert len(result["suggestions"]) == 1
    s = result["suggestions"][0]
    assert s["action"] == "Sell"
    assert s["category"] == "Fluid"


def test_rebalance_under_allocated_suggests_buy(db):
    _fluid_asset(db, "Cash", 100_000)
    _set_target_allocation(db, {"Fluid": 80, "Stock": 20})
    result = analytics_service.compute_rebalance_suggestions(db)
    stock_sug = next((s for s in result["suggestions"] if s["category"] == "Stock"), None)
    assert stock_sug is not None
    assert stock_sug["action"] == "Buy"


def test_rebalance_diff_value_correct(db):
    # 100% Fluid, target 60% → 40% over = 40,000 TWD to sell
    _fluid_asset(db, "Cash", 100_000)
    _set_target_allocation(db, {"Fluid": 60})
    s = analytics_service.compute_rebalance_suggestions(db)["suggestions"][0]
    assert s["diff_val"] == pytest.approx(40_000.0)


def test_rebalance_excludes_assets_not_in_net_worth(db):
    repo = AssetRepository(db)
    asset = repo.create(schemas.AssetCreate(
        name="Hidden", category="Fluid", current_price=1.0, include_in_net_worth=False
    ))
    repo.create_transaction(
        schemas.TransactionCreate(amount=100_000, buy_price=1.0, date=datetime(2025, 1, 1)),
        asset.id,
    )
    _set_target_allocation(db, {"Fluid": 50})
    result = analytics_service.compute_rebalance_suggestions(db)
    assert result["total_value"] == pytest.approx(0.0)
    assert result["suggestions"] == []


# ── get_net_worth_history — fast path ─────────────────────────────────────────

def test_net_worth_history_fast_path_returns_snapshots(db):
    _insert_snapshots(db, n_days=30)
    result = analytics_service.get_net_worth_history(db, range_str="30d")
    assert len(result) == 30
    assert all("date" in r and "value" in r and "breakdown" in r for r in result)


def test_net_worth_history_fast_path_values_correct(db):
    _insert_snapshots(db, n_days=30, start_value=500_000.0)
    result = analytics_service.get_net_worth_history(db, range_str="30d")
    assert result[0]["value"] == pytest.approx(500_000.0)
    assert result[-1]["value"] == pytest.approx(500_000.0 + 29 * 1_000)


def test_net_worth_history_breakdown_parsed(db):
    _insert_snapshots(db, n_days=30)
    result = analytics_service.get_net_worth_history(db, range_str="30d")
    assert isinstance(result[0]["breakdown"], dict)
    assert "Fluid" in result[0]["breakdown"]


def test_net_worth_history_slow_path_no_assets_returns_empty_series(db):
    # No snapshots, no assets → slow path runs but produces zero-value entries
    result = analytics_service.get_net_worth_history(db, range_str="30d")
    assert isinstance(result, list)
    assert len(result) == 31  # 30d range = 31 days inclusive
    assert all(r["value"] == 0.0 for r in result)
