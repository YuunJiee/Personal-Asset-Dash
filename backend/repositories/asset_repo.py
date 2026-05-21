from datetime import datetime
from sqlalchemy.orm import Session, joinedload

from .. import models, schemas
from ..services.exchange_rate_service import get_usdt_twd_rate
from ..utils.currency import is_usd_denominated


class AssetRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    # ── Internal helpers ──────────────────────────────────────────────────────

    def _enrich(self, asset: models.Asset) -> models.Asset:
        """Compute value_twd, unrealized_pl, roi as transient attributes."""
        usdt_rate = get_usdt_twd_rate(self.db)
        is_usd = is_usd_denominated(asset)

        total_qty = sum(t.amount for t in asset.transactions)
        native_value = (asset.current_price or 0.0) * total_qty
        asset.value_twd = native_value * usdt_rate if is_usd else native_value

        invested_capital = 0.0
        for t in asset.transactions:
            if t.amount > 0:
                cost = t.amount * (t.buy_price or 0.0)
                if is_usd:
                    cost *= usdt_rate
                invested_capital += cost

        if invested_capital > 0:
            asset.unrealized_pl = asset.value_twd - invested_capital
            asset.roi = (asset.unrealized_pl / invested_capital) * 100
        else:
            asset.unrealized_pl = 0.0
            asset.roi = 0.0

        return asset

    # ── Asset CRUD ────────────────────────────────────────────────────────────

    def get(self, asset_id: int) -> models.Asset | None:
        asset = (
            self.db.query(models.Asset)
            .options(joinedload(models.Asset.transactions))
            .filter(models.Asset.id == asset_id)
            .first()
        )
        return self._enrich(asset) if asset else None

    def list_all(self, skip: int = 0, limit: int = 100) -> list[models.Asset]:
        assets = (
            self.db.query(models.Asset)
            .options(joinedload(models.Asset.transactions))
            .offset(skip)
            .limit(limit)
            .all()
        )
        return [self._enrich(a) for a in assets]

    def create(self, data: schemas.AssetCreate) -> models.Asset:
        db_asset = models.Asset(
            name=data.name,
            ticker=data.ticker,
            category=data.category,
            sub_category=data.sub_category,
            include_in_net_worth=data.include_in_net_worth,
            is_favorite=data.is_favorite,
            icon=data.icon,
            current_price=data.current_price if data.current_price is not None else (0.0 if data.ticker else 1.0),
            last_updated_at=datetime.now(),
            network=data.network,
            contract_address=data.contract_address,
            decimals=data.decimals,
            connection_id=data.connection_id,
            source=data.source or "manual",
        )
        self.db.add(db_asset)
        self.db.commit()
        self.db.refresh(db_asset)
        return db_asset

    def update(self, asset_id: int, data: schemas.AssetUpdate) -> models.Asset | None:
        db_asset = self.db.query(models.Asset).filter(models.Asset.id == asset_id).first()
        if db_asset:
            for key, value in data.dict(exclude_unset=True).items():
                setattr(db_asset, key, value)
            db_asset.last_updated_at = datetime.now()
            self.db.commit()
            self.db.refresh(db_asset)
        return db_asset

    def delete(self, asset_id: int) -> bool:
        db_asset = self.db.query(models.Asset).filter(models.Asset.id == asset_id).first()
        if db_asset:
            self.db.delete(db_asset)
            self.db.commit()
            return True
        return False

    def update_price(self, asset_id: int, price: float) -> models.Asset | None:
        db_asset = self.db.query(models.Asset).filter(models.Asset.id == asset_id).first()
        if db_asset:
            db_asset.current_price = price
            db_asset.last_updated_at = datetime.now()
            self.db.commit()
            self.db.refresh(db_asset)
        return db_asset

    # ── Transaction CRUD ──────────────────────────────────────────────────────

    def create_transaction(self, transaction: schemas.TransactionCreate, asset_id: int) -> models.Transaction:
        tx_data = transaction.model_dump()
        if not tx_data.get('date'):
            tx_data['date'] = datetime.now()

        db_tx = models.Transaction(**tx_data, asset_id=asset_id)
        self.db.add(db_tx)

        asset = self.db.query(models.Asset).filter(models.Asset.id == asset_id).first()
        if asset:
            asset.last_updated_at = datetime.now()

        self.db.commit()
        self.db.refresh(db_tx)
        return db_tx

    def delete_transaction(self, transaction_id: int) -> bool:
        tx = self.db.query(models.Transaction).filter(models.Transaction.id == transaction_id).first()
        if tx:
            self.db.delete(tx)
            self.db.commit()
            return True
        return False

    def update_transaction(self, transaction_id: int, data: schemas.TransactionUpdate) -> models.Transaction | None:
        tx = self.db.query(models.Transaction).filter(models.Transaction.id == transaction_id).first()
        if tx:
            for key, value in data.dict(exclude_unset=True).items():
                setattr(tx, key, value)
            self.db.commit()
            self.db.refresh(tx)
        return tx

    # ── Transfer ──────────────────────────────────────────────────────────────

    def transfer_funds(self, transfer: schemas.TransferCreate) -> bool:
        now = transfer.date or datetime.now()

        self.create_transaction(
            schemas.TransactionCreate(amount=-transfer.amount, buy_price=1.0, date=now, is_transfer=True),
            transfer.from_asset_id,
        )

        deposit_amount = transfer.amount - (transfer.fee or 0.0)
        to_asset = self.get(transfer.to_asset_id)
        if to_asset and to_asset.category == 'Liabilities':
            deposit_amount = -deposit_amount

        self.create_transaction(
            schemas.TransactionCreate(amount=deposit_amount, buy_price=1.0, date=now, is_transfer=True),
            transfer.to_asset_id,
        )
        return True
