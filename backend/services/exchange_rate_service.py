
import requests
import logging
import time
from sqlalchemy.orm import Session
from .. import models

logger = logging.getLogger(__name__)

# Cache duration in seconds (e.g., 5 minutes)
CACHE_DURATION = 300
_rate_cache = {
    "rate": 32.0, # Default fallback
    "timestamp": 0
}

def get_usdt_twd_rate(db: Session = None) -> float:
    """
    Get the current USDT/TWD exchange rate.
    Uses caching to avoid excessive API calls.
    Prioritizes MAX API -> DB Saved Value -> Hardcoded Fallback.
    """
    global _rate_cache
    now = time.time()
    
    # Check Cache
    if now - _rate_cache["timestamp"] < CACHE_DURATION:
        return _rate_cache["rate"]
        
    # Fetch from External Source (MAX)
    rate = fetch_rate_from_max()
    
    if rate:
        _rate_cache["rate"] = rate
        _rate_cache["timestamp"] = now
        
        # Update DB if session provided
        if db:
            try:
                setting = db.query(models.SystemSetting).filter_by(key="exchange_rate_usdtwd").first()
                if not setting:
                    setting = models.SystemSetting(key="exchange_rate_usdtwd", value=str(rate))
                    db.add(setting)
                else:
                    setting.value = str(rate)
                db.commit()
            except Exception as e:
                logger.error(f"Failed to update exchange rate in DB: {e}")
                
        return rate
        
    # Fallback to DB if external fetch failed
    if db:
        try:
            setting = db.query(models.SystemSetting).filter_by(key="exchange_rate_usdtwd").first()
            if setting:
                return float(setting.value)
        except:
            pass
            
    # Hard Fallback
    logger.warning("Using hardcoded fallback rate for USDT/TWD")
    return 32.0

def fetch_rate_from_max() -> float:
    try:
        response = requests.get("https://max-api.maicoin.com/api/v3/tickers?markets[]=usdttwd", timeout=5)
        if response.status_code == 200:
            data = response.json()
            for item in data:
                if item['market'] == 'usdttwd':
                    rate = float(item['last'])
                    logger.info(f"Fetched USDT/TWD rate from MAX: {rate}")
                    return rate
    except Exception as e:
        logger.error(f"Error fetching rate from MAX: {e}")
    return None
