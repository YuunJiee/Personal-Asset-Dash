from web3 import Web3
from sqlalchemy.orm import Session
from .. import models
from datetime import datetime
import json
import logging

logger = logging.getLogger(__name__)

# ERC20 ABI (Minimal)
ERC20_ABI = json.loads('[{"constant":true,"inputs":[{"name":"_owner","type":"address"}],"name":"balanceOf","outputs":[{"name":"balance","type":"uint256"}],"type":"function"}, {"constant":true,"inputs":[],"name":"decimals","outputs":[{"name":"","type":"uint8"}],"type":"function"}]')

# Network RPC Configuration
NETWORKS = {
    'Ethereum': 'https://eth.llamarpc.com',
    'Scroll': 'https://rpc.scroll.io',
    'BSC': 'https://binance.llamarpc.com',
    'Arbitrum': 'https://arb1.arbitrum.io/rpc'
}

def get_web3(network_name):
    rpc_url = NETWORKS.get(network_name)
    if not rpc_url:
        return None
    return Web3(Web3.HTTPProvider(rpc_url))

def sync_wallets(db: Session):
    logger.info("Starting Wallet Sync (Multi-Connection)...")
    
    # 1. Get All Active Wallet Connections
    connections = db.query(models.CryptoConnection).filter(
        models.CryptoConnection.provider == 'wallet',
        models.CryptoConnection.is_active == True
    ).all()
    
    if not connections:
        logger.info("Wallet Sync skipped: No active wallet connections found.")
        return False
        
    # Cache Web3 instances
    web3_instances = {}
    
    # 2. Iterate Connections
    for conn in connections:
        logger.info(f"Syncing Wallet: {conn.name} ({conn.address})")
        user_address = conn.address
        if not user_address:
            continue
            
        try:
            checksum_address = Web3.to_checksum_address(user_address)
        except ValueError:
            logger.error(f"  Invalid address: {user_address}")
            continue

        # 3. Find Assets associated with this connection OR are "Global" tokens we want to track for this wallet type
        # Ideally, user defines tokens PER wallet connection.
        # OR we have a list of tokens we MUST track. 
        # For simplicity in this iteration: We track assets that are ALREADY in the DB associated with this connection.
        # BUT for a new wallet, we might want to auto-discover Native tokens (ETH, BNB).
        
        # Strategy:
        # 1. Always check Native Token for supported networks (ETH, Scroll, BSC)
        # 2. Check any specific Token Assets associated with this connection_id
        
        target_networks = ['Ethereum', 'Scroll', 'BSC']
        
        for network in target_networks:
            if network not in web3_instances:
                w3 = get_web3(network)
                if w3 and w3.is_connected():
                    web3_instances[network] = w3
                else:
                    logger.warning(f"  Failed to connect to {network}")
                    continue
            
            w3 = web3_instances[network]
            
            # A. Sync Native Token
            try:
                balance_wei = w3.eth.get_balance(checksum_address)
                balance_fmt = float(balance_wei) / 1e18
                
                native_ticker = "ETH" if network in ['Ethereum', 'Scroll', 'Arbitrum'] else "BNB"
                # Clean Name
                clean_conn_name = conn.name.replace(' Connection', '').strip().capitalize()
                asset_name = f"{native_ticker} ({clean_conn_name})" # e.g. ETH (Main Wallet)
                
                # Check DB
                db_asset = db.query(models.Asset).filter(
                    models.Asset.connection_id == conn.id,
                    models.Asset.network == network,
                    models.Asset.contract_address == None # Native
                ).first()
                
                if db_asset:
                    # Update
                    db_asset.last_updated_at = datetime.now()
                    current_qty = sum(t.amount for t in db_asset.transactions)
                    diff = balance_fmt - current_qty
                    if abs(diff) > 1e-6:
                        new_tx = models.Transaction(asset_id=db_asset.id, amount=diff, buy_price=0, date=datetime.now())
                        db.add(new_tx)
                        logger.info(f"    Updated {native_ticker} on {network}: {diff}")
                else:
                    # Create if > 0
                    if balance_fmt > 0:
                        new_asset = models.Asset(
                            name=asset_name,
                            ticker=native_ticker,
                            category="Investment",
                            sub_category="Crypto",
                            source="web3_wallet",
                            include_in_net_worth=True,
                            network=network,
                            connection_id=conn.id,
                            decimals=18
                        )
                        db.add(new_asset)
                        db.commit()
                        db.refresh(new_asset)
                        
                        init_tx = models.Transaction(asset_id=new_asset.id, amount=balance_fmt, buy_price=0, date=datetime.now())
                        db.add(init_tx)
                        logger.info(f"    Created {native_ticker} on {network}")

            except Exception as e:
                logger.error(f"  Error syncing native on {network}: {e}")

            # B. Sync Tokens (Only if added to DB for this connection)
            # This allows user to manually add a Token asset for a specific wallet, and we update it.
            token_assets = db.query(models.Asset).filter(
                models.Asset.connection_id == conn.id,
                models.Asset.network == network,
                models.Asset.contract_address != None
            ).all()
            
            for asset in token_assets:
                try:
                    contract = w3.eth.contract(address=Web3.to_checksum_address(asset.contract_address), abi=ERC20_ABI)
                    bal = contract.functions.balanceOf(checksum_address).call()
                    decimals = asset.decimals or 18
                    bal_fmt = float(bal) / (10 ** decimals)
                    
                    header_qty = sum(t.amount for t in asset.transactions)
                    diff = bal_fmt - header_qty
                    
                    if abs(diff) > 1e-6:
                        db.add(models.Transaction(asset_id=asset.id, amount=diff, buy_price=0, date=datetime.now()))
                        asset.last_updated_at = datetime.now()
                        logger.info(f"    Updated Token {asset.ticker}: {diff}")
                        
                except Exception as e:
                    logger.error(f"    Error syncing token {asset.ticker}: {e}")

    db.commit()
    return True
