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
    # Mask secrets
    masked_settings = []
    for s in settings:
        if any(secret in s.key.lower() for secret in ["key", "secret", "password", "token"]):
             # Create a copy or new object to avoid detaching from session issues if we were to modify s directly
             # Pydantic model will handle from_orm, but we need to modify value.
             # Let's return a list of modified objects.
             masked_value = "********" + s.value[-4:] if s.value and len(s.value) > 4 else "********"
             masked_settings.append(models.SystemSetting(key=s.key, value=masked_value))
        else:
             masked_settings.append(s)
    return masked_settings

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
        "visible_categories": '["Fluid","Investment","Fixed","Receivables","Liabilities"]',
        "wealth_simulator_monthly_contribution": "10000",
        "wealth_simulator_annual_return": "6",
        "wealth_simulator_years": "20",
        "wealth_simulator_initial_amount": "0",
        "emergency_fund_monthly_expense": "30000",
        "emergency_fund_target_months": "6",
        "emergency_fund_cash": "0"
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
