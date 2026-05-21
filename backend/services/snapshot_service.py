import json
import logging
from datetime import datetime
from sqlalchemy.orm import Session

from .. import models
from ..repositories.asset_repo import AssetRepository

logger = logging.getLogger(__name__)


def snapshot_net_worth(db: Session) -> None:
    """Write today's net worth to NetWorthHistory.

    Called by the scheduler after each price update so the history endpoint
    can serve from fast snapshot reads instead of recalculating every request.
    """
    today = datetime.now().strftime("%Y-%m-%d")
    assets = AssetRepository(db).list_all()

    net_worth = 0.0
    breakdown: dict[str, float] = {}

    for asset in assets:
        if not asset.include_in_net_worth:
            continue
        val = asset.value_twd or 0.0
        if asset.category == 'Liabilities':
            net_worth -= val
            breakdown['Liabilities'] = breakdown.get('Liabilities', 0.0) - val
        else:
            net_worth += val
            breakdown[asset.category] = breakdown.get(asset.category, 0.0) + val

    rounded = round(net_worth, 0)
    breakdown_json = json.dumps({k: round(v, 0) for k, v in breakdown.items()})

    try:
        existing = db.query(models.NetWorthHistory).filter_by(date=today).first()
        if existing:
            existing.value = rounded
            existing.breakdown = breakdown_json
        else:
            db.add(models.NetWorthHistory(date=today, value=rounded, breakdown=breakdown_json))
        db.commit()
        logger.info(f"Net worth snapshot saved: {today} = {rounded:,.0f}")
    except Exception as e:
        logger.error(f"Failed to save net worth snapshot: {e}")
        db.rollback()
