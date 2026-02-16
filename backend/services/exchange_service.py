import ccxt
import logging
from sqlalchemy.orm import Session
from datetime import datetime
from .. import models
from . import max_service, pionex_service, binance_service

logger = logging.getLogger(__name__)

# Supported Exchanges Map
# We can expand this list easily. 
# Key must match ccxt library ID.
SUPPORTED_EXCHANGES = {
    'pionex': 'Pionex',
    'binance': 'Binance',
    'bybit': 'Bybit',
    'okx': 'OKX',
    'kraken': 'Kraken',
    'kucoin': 'KuCoin',
    'htx': 'HTX (Huobi)',
    'bitget': 'Bitget',
    # 'max': 'MAX Exchange', # Not supported by CCXT, handled separately
}

def get_exchange_client(provider_id, api_key, api_secret):
    if provider_id not in ccxt.exchanges:
        raise ValueError(f"Exchange {provider_id} not supported by CCXT")
    
    exchange_class = getattr(ccxt, provider_id)
    return exchange_class({
        'apiKey': api_key,
        'secret': api_secret,
        'enableRateLimit': True,
        # 'options': {'defaultType': 'spot'} # Some exchanges need this for spot vs future
    })

def sync_all_exchanges(db: Session):
    logger.info("Starting Coordinator Exchange Sync...")
    
    # 1. MAX Sync
    try:
        max_service.sync_max_assets(db)
    except Exception as e:
        logger.error(f"MAX Sync Failed: {e}")
        
    # 2. Pionex Sync
    try:
        pionex_service.sync_pionex_assets(db)
    except Exception as e:
        logger.error(f"Pionex Sync Failed: {e}")
        
    # 3. Binance Sync
    try:
        binance_service.sync_binance_assets(db)
    except Exception as e:
        logger.error(f"Binance Sync Failed: {e}")
        
    return True
