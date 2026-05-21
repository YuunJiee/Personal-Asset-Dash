from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..services import analytics_service
from ..repositories.asset_repo import AssetRepository

router = APIRouter(
    prefix="/api/stats",
    tags=["stats"],
)


@router.get("/asset/{asset_id}/history")
def get_asset_history(asset_id: int, range: str = "1y", db: Session = Depends(get_db)):
    asset = AssetRepository(db).get(asset_id)
    if not asset:
        return []
    start_date = analytics_service.parse_range(range)
    return analytics_service.build_asset_history(asset, start_date)


@router.get("/history")
def get_net_worth_history(range: str = "30d", db: Session = Depends(get_db)):
    return analytics_service.get_net_worth_history(db, range_str=range)


@router.get("/risk_metrics")
def get_risk_metrics(db: Session = Depends(get_db)):
    history = analytics_service.get_net_worth_history(db, range_str="all")
    return analytics_service.compute_risk_metrics(history)


@router.get("/rebalance")
def get_rebalance_suggestions(db: Session = Depends(get_db)):
    return analytics_service.compute_rebalance_suggestions(db)


@router.get("/forecast")
def get_goal_forecast(db: Session = Depends(get_db)):
    return analytics_service.compute_goal_forecast(db)
