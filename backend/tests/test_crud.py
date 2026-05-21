"""Unit tests for repository classes (replaces crud.py tests).

Uses an in-memory SQLite database (via the ``db`` fixture in conftest.py) so
every test is isolated and never touches the real data files.
"""

import pytest
from datetime import datetime

from backend import schemas
from backend.repositories.asset_repo import AssetRepository


# ── Helpers ──────────────────────────────────────────────────────────────────

def _fluid_asset(name: str = "Cash") -> schemas.AssetCreate:
    return schemas.AssetCreate(name=name, category="Fluid", current_price=1.0)


def _transaction(amount: float = 1000.0, buy_price: float = 1.0) -> schemas.TransactionCreate:
    return schemas.TransactionCreate(amount=amount, buy_price=buy_price, date=datetime(2025, 1, 1))


# ── AssetRepository.create ────────────────────────────────────────────────────

def test_create_asset_returns_id(db):
    asset = AssetRepository(db).create(_fluid_asset("Wallet"))
    assert asset.id is not None
    assert asset.name == "Wallet"
    assert asset.category == "Fluid"


def test_create_asset_default_source(db):
    asset = AssetRepository(db).create(_fluid_asset())
    assert asset.source == "manual"


def test_create_asset_include_in_net_worth_default_true(db):
    asset = AssetRepository(db).create(_fluid_asset())
    assert asset.include_in_net_worth is True


# ── AssetRepository.get ───────────────────────────────────────────────────────

def test_get_asset_returns_correct_record(db):
    repo = AssetRepository(db)
    created = repo.create(_fluid_asset("Checking"))
    fetched = repo.get(created.id)
    assert fetched is not None
    assert fetched.id == created.id
    assert fetched.name == "Checking"


def test_get_asset_missing_returns_none(db):
    assert AssetRepository(db).get(9999) is None


def test_get_asset_computes_value_twd_fluid(db):
    """Fluid assets are TWD-denominated: value_twd = price × qty."""
    repo = AssetRepository(db)
    asset = repo.create(schemas.AssetCreate(name="Savings", category="Fluid", current_price=1.0))
    repo.create_transaction(_transaction(amount=50_000.0, buy_price=1.0), asset.id)
    fetched = repo.get(asset.id)
    assert fetched.value_twd == pytest.approx(50_000.0)


# ── AssetRepository.list_all ──────────────────────────────────────────────────

def test_list_all_empty(db):
    assert AssetRepository(db).list_all() == []


def test_list_all_returns_all(db):
    repo = AssetRepository(db)
    repo.create(_fluid_asset("A"))
    repo.create(_fluid_asset("B"))
    repo.create(_fluid_asset("C"))
    assert len(repo.list_all()) == 3


def test_list_all_value_twd_no_transactions(db):
    repo = AssetRepository(db)
    repo.create(_fluid_asset())
    assert repo.list_all()[0].value_twd == pytest.approx(0.0)


def test_list_all_value_twd_with_transaction(db):
    repo = AssetRepository(db)
    asset = repo.create(schemas.AssetCreate(name="ETF", category="Fluid", current_price=100.0))
    repo.create_transaction(_transaction(amount=10.0, buy_price=90.0), asset.id)
    assert repo.list_all()[0].value_twd == pytest.approx(1_000.0)


def test_list_all_roi_computed(db):
    repo = AssetRepository(db)
    asset = repo.create(schemas.AssetCreate(name="Stock", category="Stock", ticker="2330.TW", current_price=1_000.0))
    repo.create_transaction(_transaction(amount=1.0, buy_price=800.0), asset.id)
    assert repo.list_all()[0].roi == pytest.approx(25.0)


# ── AssetRepository.create_transaction ───────────────────────────────────────

def test_create_transaction_attached_to_asset(db):
    repo = AssetRepository(db)
    asset = repo.create(_fluid_asset())
    tx = repo.create_transaction(_transaction(amount=500.0), asset.id)
    assert tx.id is not None
    assert tx.asset_id == asset.id
    assert tx.amount == pytest.approx(500.0)


def test_create_transaction_is_transfer_flag(db):
    repo = AssetRepository(db)
    asset = repo.create(_fluid_asset())
    tx = repo.create_transaction(
        schemas.TransactionCreate(amount=-200.0, buy_price=1.0, date=datetime.now(), is_transfer=True),
        asset.id,
    )
    assert tx.is_transfer is True


# ── AssetRepository.transfer_funds ───────────────────────────────────────────

def test_transfer_creates_two_transactions(db):
    repo = AssetRepository(db)
    src = repo.create(_fluid_asset("Source"))
    dst = repo.create(_fluid_asset("Destination"))
    repo.create_transaction(_transaction(amount=10_000.0), src.id)

    result = repo.transfer_funds(schemas.TransferCreate(
        from_asset_id=src.id, to_asset_id=dst.id, amount=3_000.0, fee=0.0
    ))
    assert result is True

    src_qty = sum(t.amount for t in repo.get(src.id).transactions)
    dst_qty = sum(t.amount for t in repo.get(dst.id).transactions)
    assert src_qty == pytest.approx(7_000.0)
    assert dst_qty == pytest.approx(3_000.0)


def test_transfer_with_fee_reduces_deposit(db):
    repo = AssetRepository(db)
    src = repo.create(_fluid_asset("A"))
    dst = repo.create(_fluid_asset("B"))
    repo.create_transaction(_transaction(amount=5_000.0), src.id)

    repo.transfer_funds(schemas.TransferCreate(
        from_asset_id=src.id, to_asset_id=dst.id, amount=1_000.0, fee=50.0
    ))
    dst_qty = sum(t.amount for t in repo.get(dst.id).transactions)
    assert dst_qty == pytest.approx(950.0)


# ── AssetRepository.update_price ─────────────────────────────────────────────

def test_update_price(db):
    repo = AssetRepository(db)
    asset = repo.create(schemas.AssetCreate(name="BTC", category="Crypto", ticker="BTC", current_price=1_000.0))
    repo.update_price(asset.id, 2_500.0)
    assert repo.get(asset.id).current_price == pytest.approx(2_500.0)
