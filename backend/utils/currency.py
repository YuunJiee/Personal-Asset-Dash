from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from ..models import Asset


def is_usd_denominated(asset: "Asset") -> bool:
    """Return True if the asset's price is quoted in USD (needs TWD conversion)."""
    if asset.source == "max":
        return False
    if asset.category == "Crypto":
        return True
    if asset.category == "Stock" and asset.ticker:
        if asset.ticker.endswith(".TW") or (
            asset.ticker.isdigit() and len(asset.ticker) == 4
        ):
            return False
        return True
    return False
