"""Unit tests for backend/crud.py.

Uses an in-memory SQLite database (via the ``db`` fixture in conftest.py) so
every test is isolated and never touches the real data files.
"""

import pytest
from datetime import datetime

from backend import crud, schemas


# ── Helpers ──────────────────────────────────────────────────────────────────

def _fluid_asset(name: str = "Cash") -> schemas.AssetCreate:
    """Return a minimal AssetCreate for a Fluid (cash) asset."""
    return schemas.AssetCreate(
        name=name,
        category="Fluid",
        current_price=1.0,
    )


def _transaction(amount: float = 1000.0, buy_price: float = 1.0) -> schemas.TransactionCreate:
    return schemas.TransactionCreate(
        amount=amount,
        buy_price=buy_price,
        date=datetime(2025, 1, 1),
    )


# ── create_asset ─────────────────────────────────────────────────────────────

def test_create_asset_returns_id(db):
    asset = crud.create_asset(db, _fluid_asset("Wallet"))
    assert asset.id is not None
    assert asset.name == "Wallet"
    assert asset.category == "Fluid"


def test_create_asset_default_source(db):
    asset = crud.create_asset(db, _fluid_asset())
    assert asset.source == "manual"


def test_create_asset_include_in_net_worth_default_true(db):
    asset = crud.create_asset(db, _fluid_asset())
    assert asset.include_in_net_worth is True


# ── get_asset ────────────────────────────────────────────────────────────────

def test_get_asset_returns_correct_record(db):
    created = crud.create_asset(db, _fluid_asset("Checking"))
    fetched = crud.get_asset(db, created.id)
    assert fetched is not None
    assert fetched.id == created.id
    assert fetched.name == "Checking"


def test_get_asset_missing_returns_none(db):
    result = crud.get_asset(db, asset_id=9999)
    assert result is None


def test_get_asset_computes_value_twd_fluid(db):
    """Fluid assets are TWD-denominated: value_twd = price × qty."""
    asset = crud.create_asset(db, schemas.AssetCreate(
        name="Savings", category="Fluid", current_price=1.0
    ))
    crud.create_transaction(db, _transaction(amount=50_000.0, buy_price=1.0), asset.id)
    fetched = crud.get_asset(db, asset.id)
    assert fetched.value_twd == pytest.approx(50_000.0)


# ── get_assets ───────────────────────────────────────────────────────────────

def test_get_assets_empty(db):
    assert crud.get_assets(db) == []


def test_get_assets_returns_all(db):
    crud.create_asset(db, _fluid_asset("A"))
    crud.create_asset(db, _fluid_asset("B"))
    crud.create_asset(db, _fluid_asset("C"))
    assets = crud.get_assets(db)
    assert len(assets) == 3


def test_get_assets_value_twd_no_transactions(db):
    """Asset with no transactions should have value_twd == 0."""
    crud.create_asset(db, _fluid_asset())
    assets = crud.get_assets(db)
    assert assets[0].value_twd == pytest.approx(0.0)


def test_get_assets_value_twd_with_transaction(db):
    asset = crud.create_asset(db, schemas.AssetCreate(
        name="ETF", category="Fluid", current_price=100.0
    ))
    crud.create_transaction(db, _transaction(amount=10.0, buy_price=90.0), asset.id)
    assets = crud.get_assets(db)
    assert assets[0].value_twd == pytest.approx(1_000.0)  # 100 * 10


def test_get_assets_roi_computed(db):
    """ROI should reflect gain relative to cost."""
    asset = crud.create_asset(db, schemas.AssetCreate(
        name="Stock", category="Stock", ticker="2330.TW", current_price=1_000.0
    ))
    crud.create_transaction(db, _transaction(amount=1.0, buy_price=800.0), asset.id)
    assets = crud.get_assets(db)
    assert assets[0].roi == pytest.approx(25.0)  # (1000-800)/800 * 100


# ── create_transaction ───────────────────────────────────────────────────────

def test_create_transaction_attached_to_asset(db):
    asset = crud.create_asset(db, _fluid_asset())
    tx = crud.create_transaction(db, _transaction(amount=500.0), asset.id)
    assert tx.id is not None
    assert tx.asset_id == asset.id
    assert tx.amount == pytest.approx(500.0)


def test_create_transaction_is_transfer_flag(db):
    asset = crud.create_asset(db, _fluid_asset())
    tx_schema = schemas.TransactionCreate(
        amount=-200.0, buy_price=1.0, date=datetime.now(), is_transfer=True
    )
    tx = crud.create_transaction(db, tx_schema, asset.id)
    assert tx.is_transfer is True


# ── transfer_funds ───────────────────────────────────────────────────────────

def test_transfer_creates_two_transactions(db):
    src = crud.create_asset(db, _fluid_asset("Source"))
    dst = crud.create_asset(db, _fluid_asset("Destination"))

    # Seed source balance
    crud.create_transaction(db, _transaction(amount=10_000.0), src.id)

    transfer = schemas.TransferCreate(
        from_asset_id=src.id,
        to_asset_id=dst.id,
        amount=3_000.0,
        fee=0.0,
    )
    result = crud.transfer_funds(db, transfer)
    assert result is True

    src_fetched = crud.get_asset(db, src.id)
    dst_fetched = crud.get_asset(db, dst.id)

    # Source: original 10000 + withdraw -3000 = 7000
    src_qty = sum(t.amount for t in src_fetched.transactions)
    assert src_qty == pytest.approx(7_000.0)

    # Destination: deposit 3000
    dst_qty = sum(t.amount for t in dst_fetched.transactions)
    assert dst_qty == pytest.approx(3_000.0)


def test_transfer_with_fee_reduces_deposit(db):
    src = crud.create_asset(db, _fluid_asset("A"))
    dst = crud.create_asset(db, _fluid_asset("B"))
    crud.create_transaction(db, _transaction(amount=5_000.0), src.id)

    transfer = schemas.TransferCreate(
        from_asset_id=src.id,
        to_asset_id=dst.id,
        amount=1_000.0,
        fee=50.0,
    )
    crud.transfer_funds(db, transfer)

    dst_fetched = crud.get_asset(db, dst.id)
    dst_qty = sum(t.amount for t in dst_fetched.transactions)
    assert dst_qty == pytest.approx(950.0)  # 1000 - 50 fee


# ── update_asset_price ───────────────────────────────────────────────────────

def test_update_asset_price(db):
    asset = crud.create_asset(db, schemas.AssetCreate(
        name="BTC", category="Crypto", ticker="BTC", current_price=1_000.0
    ))
    crud.update_asset_price(db, asset.id, 2_500.0)
    updated = crud.get_asset(db, asset.id)
    assert updated.current_price == pytest.approx(2_500.0)
