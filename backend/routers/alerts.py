from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import crud, schemas, database, models

router = APIRouter(
    prefix="/api/alerts",
    tags=["alerts"]
)

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/{asset_id}", response_model=schemas.Alert)
def create_alert(asset_id: int, alert: schemas.AlertCreate, db: Session = Depends(get_db)):
    # Check if asset exists
    asset = db.query(models.Asset).filter(models.Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return crud.create_alert(db=db, alert=alert, asset_id=asset_id)

@router.get("/{asset_id}", response_model=List[schemas.Alert])
def read_alerts(asset_id: int, db: Session = Depends(get_db)):
    return crud.get_alerts_by_asset(db, asset_id=asset_id)

@router.delete("/{alert_id}", response_model=schemas.Alert)
def delete_alert(alert_id: int, db: Session = Depends(get_db)):
    db_alert = crud.delete_alert(db, alert_id=alert_id)
    if db_alert is None:
        raise HTTPException(status_code=404, detail="Alert not found")
    return db_alert
