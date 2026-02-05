from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import crud, models, schemas, scheduler
from ..database import get_db

router = APIRouter(
    prefix="/api/settings",
    tags=["settings"],
    responses={404: {"description": "Not found"}},
)

@router.get("/", response_model=List[schemas.SystemSetting])
def read_settings(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    settings = db.query(models.SystemSetting).offset(skip).limit(limit).all()
    return settings

import logging
logger = logging.getLogger("uvicorn")

@router.get("/{key}", response_model=schemas.SystemSetting)
def read_setting(key: str, db: Session = Depends(get_db)):
    setting = db.query(models.SystemSetting).filter(models.SystemSetting.key == key).first()
    
    # Defaults map if not found in DB
    defaults = {
        "price_update_interval_minutes": "60",
        "budget_start_day": "1",
        "chart_theme": "Morandi",
        "visible_categories": '["Fluid","Investment","Fixed","Receivables","Liabilities"]'
    }
    
    if setting is None:
        if key in defaults:
            return models.SystemSetting(key=key, value=defaults[key])
        raise HTTPException(status_code=404, detail="Setting not found")
    return setting

@router.put("/{key}", response_model=schemas.SystemSetting)
def update_setting(key: str, setting: schemas.SystemSettingBase, db: Session = Depends(get_db)):
    db_setting = db.query(models.SystemSetting).filter(models.SystemSetting.key == key).first()
    if db_setting:
        db_setting.value = setting.value
    else:
        db_setting = models.SystemSetting(key=key, value=setting.value)
        db.add(db_setting)
    
    db.commit()
    db.refresh(db_setting)

    # Trigger scheduler update if needed
    if key == "price_update_interval_minutes":
        try:
            minutes = int(db_setting.value)
            scheduler.reschedule_updates(minutes)
        except Exception as e:
            logger.error(f"Failed to reschedule: {e}")

    return db_setting
