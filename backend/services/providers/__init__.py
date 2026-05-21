from .binance import BinanceProvider
from .max import MaxProvider
from .pionex import PionexProvider
from .wallet import WalletProvider

PROVIDERS = {
    "binance": BinanceProvider(),
    "max":     MaxProvider(),
    "pionex":  PionexProvider(),
    "wallet":  WalletProvider(),
}
