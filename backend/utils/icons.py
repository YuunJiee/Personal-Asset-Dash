_TICKER_MAP = {
    'BTC':  'Bitcoin',
    'WBTC': 'Bitcoin',
    'ETH':  'Gem',
    'WETH': 'Gem',
    'USDT': 'DollarSign',
    'USDC': 'CircleDollarSign',
    'DAI':  'CircleDollarSign',
    'BNB':  'Coins',
    'SOL':  'Zap',
    'DOGE': 'PawPrint',
    'MAX':  'Rocket',
    'TWD':  'Banknote',
    'USD':  'DollarSign',
}

_CATEGORY_MAP = {
    'crypto': 'Coins',
    'stock':  'TrendingUp',
    'fluid':  'Wallet',
    'cash':   'Wallet',
}


def get_icon_for_ticker(ticker: str, category: str | None = None) -> str:
    t = ticker.upper()
    if t in _TICKER_MAP:
        return _TICKER_MAP[t]
    if 'USD' in t:
        return 'DollarSign'
    if 'BTC' in t:
        return 'Bitcoin'
    if 'ETH' in t:
        return 'Gem'
    if category:
        for key, icon in _CATEGORY_MAP.items():
            if key in category.lower():
                return icon
    return 'Circle'
