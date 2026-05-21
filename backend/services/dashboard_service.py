from datetime import datetime, timezone
from sqlalchemy.orm import Session

from .. import schemas
from ..repositories.asset_repo import AssetRepository
from ..services.exchange_rate_service import get_usdt_twd_rate


def calculate_dashboard_metrics(db: Session) -> schemas.DashboardData:
    usdtwd = get_usdt_twd_rate(db)
    assets = AssetRepository(db).list_all()

    total_market_value = 0.0
    total_cost = 0.0

    for asset in assets:
        asset_market_value = asset.value_twd or 0.0
        asset_cost = asset_market_value - (asset.unrealized_pl or 0.0)

        if asset.include_in_net_worth:
            if asset.category == "Liabilities":
                total_market_value -= asset_market_value
                total_cost -= asset_cost
            else:
                total_market_value += asset_market_value
                total_cost += asset_cost

    total_pl = total_market_value - total_cost
    total_roi = (total_pl / total_cost * 100) if total_cost > 0 else 0.0

    return schemas.DashboardData(
        net_worth=total_market_value,
        total_pl=total_pl,
        total_roi=total_roi,
        exchange_rate=usdtwd,
        assets=[schemas.Asset.model_validate(a) for a in assets],
        updated_at=datetime.now(timezone.utc),
    )
