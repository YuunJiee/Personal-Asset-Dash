import json
import time
import logging
from datetime import datetime
from sqlalchemy.orm import Session
from web3 import Web3

from .base import ExchangeProvider
from ... import models
from ...utils.icons import get_icon_for_ticker
from ..price_service import fetch_crypto_price

logger = logging.getLogger(__name__)

ERC20_ABI = json.loads('[{"constant":true,"inputs":[{"name":"_owner","type":"address"}],"name":"balanceOf","outputs":[{"name":"balance","type":"uint256"}],"type":"function"},{"constant":true,"inputs":[],"name":"decimals","outputs":[{"name":"","type":"uint8"}],"type":"function"}]')

NETWORKS = {
    'Ethereum': 'https://rpc.ankr.com/eth',
    'Scroll':   'https://rpc.scroll.io',
    'BSC':      'https://bsc-dataseed.binance.org/',
    'Arbitrum': 'https://arb1.arbitrum.io/rpc',
}

POPULAR_TOKENS = {
    'Ethereum': [
        {'symbol': 'USDT',  'address': '0xdac17f958d2ee523a2206206994597c13d831ec7', 'decimals': 6},
        {'symbol': 'USDC',  'address': '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', 'decimals': 6},
        {'symbol': 'DAI',   'address': '0x6b175474e89094c44da98b954eedeac495271d0f', 'decimals': 18},
        {'symbol': 'WBTC',  'address': '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', 'decimals': 8},
        {'symbol': 'SHIB',  'address': '0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce', 'decimals': 18},
        {'symbol': 'LINK',  'address': '0x514910771af9ca656af840dff83e8264ecf986ca', 'decimals': 18},
        {'symbol': 'UNI',   'address': '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984', 'decimals': 18},
    ],
    'BSC': [
        {'symbol': 'USDT',  'address': '0x55d398326f99059ff775485246999027b3197955', 'decimals': 18},
        {'symbol': 'USDC',  'address': '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d', 'decimals': 18},
        {'symbol': 'DAI',   'address': '0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3', 'decimals': 18},
        {'symbol': 'ETH',   'address': '0x2170ed0880ac9a755fd29b2688956bd959f933f8', 'decimals': 18},
        {'symbol': 'Cake',  'address': '0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82', 'decimals': 18},
        {'symbol': 'BTCB',  'address': '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c', 'decimals': 18},
    ],
    'Arbitrum': [
        {'symbol': 'USDT',  'address': '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9', 'decimals': 6},
        {'symbol': 'USDC',  'address': '0xaf88d065e77c8cc2239327c5edb3a432268e5831', 'decimals': 6},
        {'symbol': 'ARB',   'address': '0x912ce59144191c1204e64559fe8253a0e49e6548', 'decimals': 18},
        {'symbol': 'WBTC',  'address': '0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f', 'decimals': 8},
    ],
    'Scroll': [
        {'symbol': 'USDC',  'address': '0x06efdbff2a14a7c8e15944d1f4a48f9f95f663a4', 'decimals': 6},
        {'symbol': 'USDT',  'address': '0xf55bec9cafdb3a3e221dc78e2d31c7709a189aa5', 'decimals': 6},
        {'symbol': 'WETH',  'address': '0x5300000000000000000000000000000000000004', 'decimals': 18},
    ],
}


class WalletProvider(ExchangeProvider):
    def sync(self, db: Session) -> bool:
        logger.info("Starting Wallet Sync (Multi-Connection)...")

        connections = db.query(models.CryptoConnection).filter(
            models.CryptoConnection.provider == 'wallet',
            models.CryptoConnection.is_active == True,
        ).all()

        if not connections:
            logger.info("Wallet Sync skipped: No active wallet connections found.")
            return False

        web3_instances: dict[str, Web3] = {}

        for conn in connections:
            logger.info(f"Syncing Wallet: {conn.name} ({conn.address})")
            if not conn.address:
                continue

            try:
                checksum_address = Web3.to_checksum_address(conn.address)
            except ValueError:
                logger.error(f"  Invalid address: {conn.address}")
                continue

            for network in ['Ethereum', 'Scroll', 'BSC', 'Arbitrum']:
                if network not in web3_instances:
                    rpc = NETWORKS.get(network)
                    w3 = Web3(Web3.HTTPProvider(rpc)) if rpc else None
                    if w3 and w3.is_connected():
                        web3_instances[network] = w3
                    else:
                        logger.warning(f"  Failed to connect to {network}")
                        continue

                w3 = web3_instances[network]
                clean_conn_name = conn.name.replace(' Connection', '').strip().capitalize()

                # A. Native token
                try:
                    balance_wei = w3.eth.get_balance(checksum_address)
                    balance_fmt = float(balance_wei) / 1e18
                    native_ticker = "ETH" if network in ('Ethereum', 'Scroll', 'Arbitrum') else "BNB"
                    asset_name = f"{native_ticker} ({clean_conn_name})"

                    db_asset = db.query(models.Asset).filter(
                        models.Asset.connection_id == conn.id,
                        models.Asset.network == network,
                        models.Asset.contract_address == None,
                    ).first()

                    if db_asset:
                        db_asset.last_updated_at = datetime.now()
                        current_qty = sum(t.amount for t in db_asset.transactions)
                        diff = balance_fmt - current_qty
                        if abs(diff) > 1e-6:
                            db.add(models.Transaction(asset_id=db_asset.id, amount=diff, buy_price=0, date=datetime.now()))
                    elif balance_fmt > 0:
                        new_asset = models.Asset(
                            name=asset_name, ticker=native_ticker,
                            category="Crypto", sub_category="Crypto",
                            source="web3_wallet", include_in_net_worth=True,
                            network=network, connection_id=conn.id, decimals=18,
                        )
                        db.add(new_asset)
                        db.commit()
                        db.refresh(new_asset)
                        db.add(models.Transaction(asset_id=new_asset.id, amount=balance_fmt, buy_price=0, date=datetime.now()))
                except Exception as e:
                    logger.error(f"  Error syncing native on {network}: {e}")

                # B. Known token assets
                token_assets = db.query(models.Asset).filter(
                    models.Asset.connection_id == conn.id,
                    models.Asset.network == network,
                    models.Asset.contract_address != None,
                ).all()

                tracked_contracts = {a.contract_address.lower() for a in token_assets if a.contract_address}

                for asset in token_assets:
                    try:
                        contract = w3.eth.contract(
                            address=Web3.to_checksum_address(asset.contract_address), abi=ERC20_ABI
                        )
                        bal = contract.functions.balanceOf(checksum_address).call()
                        bal_fmt = float(bal) / (10 ** (asset.decimals or 18))
                        header_qty = sum(t.amount for t in asset.transactions)
                        diff = bal_fmt - header_qty
                        if abs(diff) > 1e-6:
                            db.add(models.Transaction(asset_id=asset.id, amount=diff, buy_price=0, date=datetime.now()))
                            asset.last_updated_at = datetime.now()
                    except Exception as e:
                        logger.error(f"    Error syncing token {asset.ticker}: {e}")

                # C. Auto-discovery of popular tokens
                if network in POPULAR_TOKENS:
                    for token in POPULAR_TOKENS[network]:
                        if token['address'].lower() in tracked_contracts:
                            continue
                        time.sleep(0.1)
                        try:
                            contract = w3.eth.contract(
                                address=Web3.to_checksum_address(token['address']), abi=ERC20_ABI
                            )
                            bal = contract.functions.balanceOf(checksum_address).call()
                            if bal <= 0:
                                continue
                            decimals = token.get('decimals', 18)
                            bal_fmt = float(bal) / (10 ** decimals)
                            if bal_fmt <= 0:
                                continue

                            logger.info(f"  FOUND NEW: {token['symbol']} on {network} ({bal_fmt})")
                            target_icon = get_icon_for_ticker(token['symbol'], "Crypto")
                            new_asset = models.Asset(
                                name=token['symbol'],
                                ticker=f"{token['symbol']}-USD",
                                category="Crypto", sub_category="Token",
                                source="web3_wallet", include_in_net_worth=True,
                                network=network, connection_id=conn.id,
                                contract_address=token['address'],
                                decimals=decimals, icon=target_icon,
                            )
                            try:
                                price = fetch_crypto_price(new_asset.ticker)
                                if price > 0:
                                    new_asset.current_price = price
                            except Exception as e:
                                logger.error(f"Failed to fetch initial price for {token['symbol']}: {e}")

                            db.add(new_asset)
                            db.commit()
                            db.refresh(new_asset)
                            db.add(models.Transaction(asset_id=new_asset.id, amount=bal_fmt, buy_price=0, date=datetime.now()))
                            db.commit()
                            tracked_contracts.add(token['address'].lower())
                        except Exception:
                            pass

        db.commit()
        return True
