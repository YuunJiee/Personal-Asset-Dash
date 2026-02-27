"""Unit tests for backend/service.py.

External I/O (yfinance, ccxt, exchange rate DB queries) is fully mocked so
the tests are fast and deterministic — no internet access required.
"""

import pandas as pd
import pytest
from datetime import datetime
from unittest.mock import MagicMock, patch

from backend import crud, schemas, service


# ── Helpers ──────────────────────────────────────────────────────────────────

def _make_history(close_price: float) -> pd.DataFrame:
    """Return a minimal one-row DataFrame that yfinance would produce."""
    return pd.DataFrame({"Close": [close_price]})


# ── fetch_stock_price ─────────────────────────────────────────────────────────

def test_fetch_stock_price_returns_close(mocker):
    ticker_mock = MagicMock()
    ticker_mock.history.return_value = _make_history(850.0)
    mocker.patch("backend.service.yf.Ticker", return_value=ticker_mock)

    price = service.fetch_stock_price("2330.TW")
    assert price == pytest.approx(850.0)


def test_fetch_stock_price_4digit_appends_tw(mocker):
    """4-digit pure-numeric ticker (TWSE) should be looked up as XXXX.TW."""
    ticker_mock = MagicMock()
    ticker_mock.history.return_value = _make_history(600.0)
    yf_mock = mocker.patch("backend.service.yf.Ticker", return_value=ticker_mock)

    price = service.fetch_stock_price("2317")
    assert price == pytest.approx(600.0)
    yf_mock.assert_called_once_with("2317.TW")


def test_fetch_stock_price_empty_history_returns_zero(mocker):
    ticker_mock = MagicMock()
    ticker_mock.history.return_value = pd.DataFrame()  # empty
    mocker.patch("backend.service.yf.Ticker", return_value=ticker_mock)

    price = service.fetch_stock_price("FAKE")
    assert price == 0.0


def test_fetch_stock_price_exception_returns_zero(mocker):
    mocker.patch("backend.service.yf.Ticker", side_effect=Exception("network error"))
    price = service.fetch_stock_price("AAPL")
    assert price == 0.0


# ── fetch_crypto_price ────────────────────────────────────────────────────────

def test_fetch_crypto_price_stablecoin_usdt():
    """USDT is hardcoded to 1.0 — no exchange call should be made."""
    price = service.fetch_crypto_price("USDT")
    assert price == pytest.approx(1.0)


def test_fetch_crypto_price_stablecoin_usdc():
    price = service.fetch_crypto_price("USDC")
    assert price == pytest.approx(1.0)


def test_fetch_crypto_price_btc(mocker):
    exchange_mock = MagicMock()
    exchange_mock.fetch_ticker.return_value = {"last": 3_000_000.0}
    mocker.patch("backend.service.ccxt.binance", return_value=exchange_mock)

    price = service.fetch_crypto_price("BTC")
    assert price == pytest.approx(3_000_000.0)
    exchange_mock.fetch_ticker.assert_called_once_with("BTC/USDT")


def test_fetch_crypto_price_eth(mocker):
    exchange_mock = MagicMock()
    exchange_mock.fetch_ticker.return_value = {"last": 120_000.0}
    mocker.patch("backend.service.ccxt.binance", return_value=exchange_mock)

    price = service.fetch_crypto_price("ETH")
    assert price == pytest.approx(120_000.0)


def test_fetch_crypto_price_weth_normalised_to_eth(mocker):
    """WETH should be looked up as ETH/USDT."""
    exchange_mock = MagicMock()
    exchange_mock.fetch_ticker.return_value = {"last": 120_000.0}
    mocker.patch("backend.service.ccxt.binance", return_value=exchange_mock)

    service.fetch_crypto_price("WETH")
    exchange_mock.fetch_ticker.assert_called_once_with("ETH/USDT")


def test_fetch_crypto_price_exception_returns_zero(mocker):
    mocker.patch("backend.service.ccxt.binance", side_effect=Exception("api error"))
    price = service.fetch_crypto_price("SOL")
    assert price == 0.0


# ── check_alerts ─────────────────────────────────────────────────────────────

@pytest.fixture
def db_with_asset(db):
    """Return a (db, asset) tuple with one Crypto asset seeded."""
    asset = crud.create_asset(db, schemas.AssetCreate(
        name="Bitcoin", category="Crypto", ticker="BTC", current_price=90_000.0
    ))
    return db, asset


def _make_alert(db, asset_id: int, condition: str, target: float):
    from backend.models import Alert
    alert = Alert(
        asset_id=asset_id,
        condition=condition,
        target_price=target,
        is_active=True,
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return alert


def test_check_alerts_above_triggers(db_with_asset):
    db, asset = db_with_asset
    alert = _make_alert(db, asset.id, "ABOVE", target=95_000.0)

    service.check_alerts(db, asset.id, price=100_000.0)
    db.refresh(alert)
    assert alert.triggered_at is not None


def test_check_alerts_above_not_triggered_below_target(db_with_asset):
    db, asset = db_with_asset
    alert = _make_alert(db, asset.id, "ABOVE", target=95_000.0)

    service.check_alerts(db, asset.id, price=80_000.0)
    db.refresh(alert)
    assert alert.triggered_at is None


def test_check_alerts_below_triggers(db_with_asset):
    db, asset = db_with_asset
    alert = _make_alert(db, asset.id, "BELOW", target=85_000.0)

    service.check_alerts(db, asset.id, price=84_000.0)
    db.refresh(alert)
    assert alert.triggered_at is not None


def test_check_alerts_below_not_triggered_above_target(db_with_asset):
    db, asset = db_with_asset
    alert = _make_alert(db, asset.id, "BELOW", target=85_000.0)

    service.check_alerts(db, asset.id, price=90_000.0)
    db.refresh(alert)
    assert alert.triggered_at is None


def test_check_alerts_already_triggered_not_overwritten(db_with_asset):
    """An alert that already has triggered_at should not be overwritten."""
    db, asset = db_with_asset
    alert = _make_alert(db, asset.id, "ABOVE", target=95_000.0)
    first_trigger = datetime(2025, 1, 1, 12, 0, 0)
    alert.triggered_at = first_trigger
    db.commit()

    service.check_alerts(db, asset.id, price=100_000.0)
    db.refresh(alert)
    assert alert.triggered_at == first_trigger


def test_check_alerts_inactive_alert_ignored(db_with_asset):
    db, asset = db_with_asset
    alert = _make_alert(db, asset.id, "ABOVE", target=95_000.0)
    alert.is_active = False
    db.commit()

    service.check_alerts(db, asset.id, price=100_000.0)
    db.refresh(alert)
    assert alert.triggered_at is None
