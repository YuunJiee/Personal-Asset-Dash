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
    'Ethereum': 'https://rpc.ankr.com/eth',
    'Scroll': 'https://rpc.scroll.io',
    'BSC': 'https://bsc-dataseed.binance.org/',
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

# Popular Tokens Configuration for Auto-Discovery
POPULAR_TOKENS = {
    'Ethereum': [
        {'symbol': 'USDT', 'address': '0xdac17f958d2ee523a2206206994597c13d831ec7', 'decimals': 6, 'name': 'Tether USD'},
        {'symbol': 'USDC', 'address': '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', 'decimals': 6, 'name': 'USD Coin'},
        {'symbol': 'DAI', 'address': '0x6b175474e89094c44da98b954eedeac495271d0f', 'decimals': 18, 'name': 'Dai Stablecoin'},
        {'symbol': 'WBTC', 'address': '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', 'decimals': 8, 'name': 'Wrapped BTC'},
        {'symbol': 'SHIB', 'address': '0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce', 'decimals': 18, 'name': 'SHIBA INU'},
        {'symbol': 'LINK', 'address': '0x514910771af9ca656af840dff83e8264ecf986ca', 'decimals': 18, 'name': 'Chainlink'},
        {'symbol': 'UNI', 'address': '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984', 'decimals': 18, 'name': 'Uniswap'},
    ],
    'BSC': [
        {'symbol': 'USDT', 'address': '0x55d398326f99059ff775485246999027b3197955', 'decimals': 18, 'name': 'Tether USD'},
        {'symbol': 'USDC', 'address': '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d', 'decimals': 18, 'name': 'USD Coin'},
        {'symbol': 'DAI', 'address': '0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3', 'decimals': 18, 'name': 'Dai Stablecoin'},
        {'symbol': 'ETH', 'address': '0x2170ed0880ac9a755fd29b2688956bd959f933f8', 'decimals': 18, 'name': 'Ethereum Token'},
        {'symbol': 'Cake', 'address': '0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82', 'decimals': 18, 'name': 'PancakeSwap Token'},
        {'symbol': 'BTCB', 'address': '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c', 'decimals': 18, 'name': 'Bitcoin Token'},
    ],
    'Arbitrum': [
        {'symbol': 'USDT', 'address': '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9', 'decimals': 6, 'name': 'Tether USD'},
        {'symbol': 'USDC', 'address': '0xaf88d065e77c8cc2239327c5edb3a432268e5831', 'decimals': 6, 'name': 'USD Coin'},
        {'symbol': 'ARB', 'address': '0x912ce59144191c1204e64559fe8253a0e49e6548', 'decimals': 18, 'name': 'Arbitrum'},
        {'symbol': 'WBTC', 'address': '0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f', 'decimals': 8, 'name': 'Wrapped BTC'},
    ],
    'Scroll': [
        {'symbol': 'USDC', 'address': '0x06efdbff2a14a7c8e15944d1f4a48f9f95f663a4', 'decimals': 6, 'name': 'USD Coin'},
        {'symbol': 'USDT', 'address': '0xf55bec9cafdb3a3e221dc78e2d31c7709a189aa5', 'decimals': 6, 'name': 'Tether USD'},
        {'symbol': 'WETH', 'address': '0x5300000000000000000000000000000000000004', 'decimals': 18, 'name': 'Wrapped Ether'},
    ]
}

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

        target_networks = ['Ethereum', 'Scroll', 'BSC', 'Arbitrum']
        
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

            # B. Sync Existing Tokens
            token_assets = db.query(models.Asset).filter(
                models.Asset.connection_id == conn.id,
                models.Asset.network == network,
                models.Asset.contract_address != None
            ).all()
            
            # Set required to check existence effectively
            tracked_contracts = {a.contract_address.lower() for a in token_assets if a.contract_address}

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

            # C. Auto-Discovery (Merge of Scan logic)
            # Iterate popular tokens for this network
            if network in POPULAR_TOKENS:
                for token in POPULAR_TOKENS[network]:
                    # Skip if already tracked
                    if token['address'].lower() in tracked_contracts:
                        continue
                        
                    # Slow down slightly for public RPCs
                    import time
                    time.sleep(0.1) 
                    
                    try:
                        contract = w3.eth.contract(address=Web3.to_checksum_address(token['address']), abi=ERC20_ABI)
                        bal = contract.functions.balanceOf(checksum_address).call()
                        
                        if bal > 0:
                            decimals = token.get('decimals', 18)
                            bal_fmt = float(bal) / (10 ** decimals)
                            
                            if bal_fmt > 0:
                                logger.info(f"  FOUND NEW: {token['symbol']} on {network} ({bal_fmt})")
                                
                                asset_name = token['symbol']
                                new_asset = models.Asset(
                                    name=asset_name,
                                    ticker=f"{token['symbol']}-USD",
                                    category="Crypto",
                                    sub_category="Token",
                                    source="web3_wallet",
                                    include_in_net_worth=True,
                                    network=network,
                                    connection_id=conn.id,
                                    contract_address=token['address'],
                                    decimals=decimals,
                                    icon=token.get('symbol').lower()
                                )
                                
                                # Try to fetch initial price immediately
                                try:
                                    from .. import service
                                    price = service.fetch_crypto_price(new_asset.ticker)
                                    if price > 0:
                                        new_asset.current_price = price
                                        # We might need to handle alerts or other logic, but for now just setting price is enough
                                except Exception as e:
                                    logger.error(f"Failed to fetch initial price for {asset_name}: {e}")

                                db.add(new_asset)
                                db.commit()
                                db.refresh(new_asset)
                                
                                # Add initial transaction
                                init_tx = models.Transaction(
                                    asset_id=new_asset.id, 
                                    amount=bal_fmt, 
                                    buy_price=0, 
                                    date=datetime.now()
                                )
                                db.add(init_tx)
                                db.commit()
                                
                                # Add to tracked so we don't try again in same loop (unlikely but good practice)
                                tracked_contracts.add(token['address'].lower())
                                
                    except Exception as e:
                        # Log but don't stop sync
                        # logger.debug(f"    Discovery check failed for {token['symbol']}: {e}")
                        pass

    db.commit()
    return True

# Helper to keep keeping discover_tokens for backward compatibility or direct endpoint use if needed
# (But sync_wallets now covers it)
def discover_tokens(db: Session, connection_id: int):
    # Just call sync_wallets? No, sync_wallets syncs ALL.
    # For now, we can leave this function as is or deprecate it.
    # User asked to merge logic.
    return {"status": "success", "message": "Discovery is now integrated into Sync."}
