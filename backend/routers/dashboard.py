from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from .. import database, schemas
from ..services.dashboard_service import calculate_dashboard_metrics

router = APIRouter(
    prefix="/api/dashboard",
    tags=["dashboard"],
    responses={404: {"description": "Not found"}},
)

@router.get("", include_in_schema=False)
@router.get("/", response_model=schemas.DashboardData)
def read_dashboard(db: Session = Depends(database.get_db)):
    return calculate_dashboard_metrics(db)
