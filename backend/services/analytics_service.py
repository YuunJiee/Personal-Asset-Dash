import math
import json
import traceback
import logging
import yfinance as yf
import pandas as pd
from collections import defaultdict
from datetime import datetime, timedelta, date
from sqlalchemy.orm import Session

from .. import models
from ..repositories.asset_repo import AssetRepository
from ..repositories.goal_repo import GoalRepository
from ..utils.math import safe_float
from ..utils.currency import is_usd_denominated
from ..services.exchange_rate_service import get_usdt_twd_rate

logger = logging.getLogger(__name__)


# ── Range parsing ─────────────────────────────────────────────────────────────

def parse_range(range_str: str) -> date:
    today = datetime.now().date()
    if range_str == "30d":  return today - timedelta(days=30)
    if range_str == "3mo":  return today - timedelta(days=90)
    if range_str == "6mo":  return today - timedelta(days=180)
    if range_str == "1y":   return today - timedelta(days=365)
    if range_str == "ytd":  return date(today.year, 1, 1)
    if range_str == "all":  return date(2020, 1, 1)
    return today - timedelta(days=365)


# ── Yahoo Finance helpers ─────────────────────────────────────────────────────

def fetch_yahoo_history(symbols, start_date: date) -> dict:
    try:
        fetch_start = (start_date - timedelta(days=7)).strftime("%Y-%m-%d")
        today = datetime.now().date()
        data = yf.download(
            symbols,
            start=fetch_start,
            end=str(today + timedelta(days=1)),
            progress=False,
        )['Close']
        history_map = {}
        if isinstance(data, pd.DataFrame) and not data.empty:
            for col in data.columns:
                series = data[col].ffill().bfill()
                history_map[col] = {d.strftime("%Y-%m-%d"): val for d, val in series.items()}
        elif isinstance(data, pd.Series) and not data.empty:
            symbol = symbols[0] if isinstance(symbols, list) else symbols
            series = data.ffill().bfill()
            history_map[symbol] = {d.strftime("%Y-%m-%d"): val for d, val in series.items()}
        return history_map
    except Exception as e:
        logger.error(f"fetch_yahoo_history failed for {symbols}: {e}")
        return {}


def _yf_ticker_for_asset(asset) -> str | None:
    """Return the Yahoo Finance symbol for an asset, or None if not applicable."""
    if asset.category not in ('Stock', 'Crypto') or not asset.ticker:
        return None
    t = asset.ticker
    if t.isdigit() and len(t) == 4:
        t = f"{t}.TW"
    if ("Crypto" in (asset.sub_category or "") or asset.category == 'Crypto') and "-" not in t:
        t = f"{t}-USD"
    return t


# ── Per-asset history ─────────────────────────────────────────────────────────

def build_asset_history(asset, start_date: date) -> list[dict]:
    today = datetime.now().date()
    ticker = _yf_ticker_for_asset(asset)

    price_history: dict = {}
    usdtwd_history: dict = {}
    if ticker:
        price_history = fetch_yahoo_history([ticker], start_date).get(ticker, {})
        usdtwd_history = fetch_yahoo_history("USDTWD=X", start_date).get("USDTWD=X", {})

    transactions = sorted(asset.transactions, key=lambda x: x.date)
    current_qty = 0.0
    tx_idx = 0
    while tx_idx < len(transactions) and transactions[tx_idx].date.date() < start_date:
        current_qty += transactions[tx_idx].amount
        tx_idx += 1

    history = []
    curr_date = start_date
    current_usdtwd = 32.0

    while curr_date <= today:
        d_str = curr_date.strftime("%Y-%m-%d")
        while tx_idx < len(transactions) and transactions[tx_idx].date.date() == curr_date:
            current_qty += transactions[tx_idx].amount
            tx_idx += 1

        if ticker:
            yf_price = price_history.get(d_str)
            rate = usdtwd_history.get(d_str, current_usdtwd)
            if yf_price is not None:
                price = yf_price if ticker.endswith('.TW') else yf_price * rate
            else:
                fallback = asset.current_price
                price = fallback * rate if is_usd_denominated(asset) else fallback
        else:
            price = asset.current_price

        history.append({
            "date": d_str,
            "quantity": current_qty,
            "value": round(current_qty * price, 2),
            "price": round(price, 2),
        })
        curr_date += timedelta(days=1)

    return history


# ── Net worth history ─────────────────────────────────────────────────────────

def get_net_worth_history(db: Session, range_str: str = "30d") -> list[dict]:
    try:
        today = datetime.now().date()
        start_date = parse_range(range_str)

        # Fast path: serve from pre-computed daily snapshots when coverage ≥ 80%.
        snapshots = (
            db.query(models.NetWorthHistory)
            .filter(models.NetWorthHistory.date >= start_date.strftime("%Y-%m-%d"))
            .order_by(models.NetWorthHistory.date)
            .all()
        )
        expected_days = (today - start_date).days + 1
        if snapshots and len(snapshots) >= max(1, int(expected_days * 0.8)):
            return [
                {
                    "date": s.date,
                    "value": safe_float(s.value),
                    "breakdown": json.loads(s.breakdown) if s.breakdown else {},
                }
                for s in snapshots
            ]

        # Slow path: rebuild from transactions + Yahoo Finance price history.
        assets = AssetRepository(db).list_all()

        yf_ticker_map: dict[int, str] = {}
        tickers = []
        for asset in assets:
            t = _yf_ticker_for_asset(asset)
            if t:
                yf_ticker_map[asset.id] = t
                tickers.append(t)

        price_history = fetch_yahoo_history(tickers, start_date) if tickers else {}
        usdtwd_history = fetch_yahoo_history("USDTWD=X", start_date).get("USDTWD=X", {})
        current_usdtwd = 32.0

        all_txns = []
        for asset in assets:
            for txn in asset.transactions:
                t_date = txn.date.date() if isinstance(txn.date, datetime) else txn.date
                all_txns.append((t_date, asset.id, txn.amount))
        all_txns.sort(key=lambda x: x[0])

        balances: dict[int, float] = defaultdict(float)
        txn_idx = 0
        while txn_idx < len(all_txns) and all_txns[txn_idx][0] < start_date:
            _, aid, amt = all_txns[txn_idx]
            balances[aid] += amt
            txn_idx += 1

        result = []
        current_date = start_date
        while current_date <= today:
            date_str = current_date.strftime("%Y-%m-%d")

            while txn_idx < len(all_txns) and all_txns[txn_idx][0] == current_date:
                _, aid, amt = all_txns[txn_idx]
                balances[aid] += amt
                txn_idx += 1

            rate = usdtwd_history.get(date_str) or current_usdtwd
            day_total = 0.0
            cat_totals: dict[str, float] = defaultdict(float)

            for asset in assets:
                if not asset.include_in_net_worth:
                    continue
                qty = balances[asset.id]
                if qty == 0:
                    continue

                price = 1.0
                t = yf_ticker_map.get(asset.id)
                if t:
                    hist = price_history.get(t, {})
                    yf_price = hist.get(date_str)
                    if yf_price is not None and (math.isnan(yf_price) or math.isinf(yf_price)):
                        yf_price = None
                    if yf_price is not None:
                        price = yf_price if t.endswith('.TW') else yf_price * rate
                    else:
                        fallback = asset.current_price
                        price = fallback * rate if is_usd_denominated(asset) else fallback
                elif asset.category in ('Stock', 'Crypto'):
                    price = asset.current_price

                val = qty * price
                if asset.category == 'Liabilities':
                    day_total -= val
                    cat_totals[asset.category] -= val
                else:
                    day_total += val
                    cat_totals[asset.category] += val

            result.append({
                "date": date_str,
                "value": safe_float(round(day_total, 0)),
                "breakdown": {k: safe_float(round(v, 0)) for k, v in cat_totals.items()},
            })
            current_date += timedelta(days=1)

        return result
    except Exception as e:
        logger.error(f"get_net_worth_history failed: {e}")
        traceback.print_exc()
        return []


# ── Risk metrics ──────────────────────────────────────────────────────────────

_EMPTY_METRICS = {
    "cagr":        {"value": 0, "status": "N/A"},
    "maxDrawdown": {"value": 0, "status": "N/A"},
    "volatility":  {"value": 0, "status": "N/A"},
}


def compute_risk_metrics(history: list[dict]) -> dict:
    if not history or len(history) < 2:
        return _EMPTY_METRICS

    values = [h["value"] for h in history if h["value"] > 0]
    dates  = [datetime.strptime(h["date"], "%Y-%m-%d") for h in history if h["value"] > 0]

    if len(values) < 2:
        return _EMPTY_METRICS

    # Max drawdown
    peak = values[0]
    max_dd = 0.0
    for v in values:
        if v > peak:
            peak = v
        dd = (peak - v) / peak if peak > 0 else 0
        if dd > max_dd:
            max_dd = dd

    # Annualised volatility
    daily_returns = [(values[i] - values[i - 1]) / values[i - 1] for i in range(1, len(values))]
    if daily_returns:
        mean = sum(daily_returns) / len(daily_returns)
        variance = sum((r - mean) ** 2 for r in daily_returns) / len(daily_returns)
        annualised_vol = math.sqrt(variance) * math.sqrt(365)
    else:
        annualised_vol = 0.0

    # CAGR
    days = (dates[-1] - dates[0]).days
    years = days / 365.25
    start_val, end_val = values[0], values[-1]
    if years >= 1.0 and start_val > 0:
        cagr = (end_val / start_val) ** (1 / years) - 1
    else:
        cagr = (end_val - start_val) / start_val if start_val > 0 else 0

    cagr_pct = cagr * 100
    mdd_pct  = max_dd * 100
    vol_pct  = annualised_vol * 100

    def _cagr_status(v):
        if v > 15: return "Excellent"
        if v > 5:  return "Healthy"
        if v >= 0: return "Slow"
        return "Declining"

    def _vol_status(v):
        if v > 40: return "High Risk"
        if v > 15: return "Moderate"
        return "Stable"

    def _dd_status(v):
        if v > 30: return "Heavy Loss"
        if v > 15: return "Correction"
        return "Safe"

    return {
        "cagr":        {"value": cagr_pct, "status": _cagr_status(cagr_pct)},
        "maxDrawdown": {"value": mdd_pct,  "status": _dd_status(mdd_pct)},
        "volatility":  {"value": vol_pct,  "status": _vol_status(vol_pct)},
    }


# ── Goal forecast ─────────────────────────────────────────────────────────────

def compute_goal_forecast(db: Session) -> dict:
    try:
        today = datetime.now().date()
        history_data = get_net_worth_history(db, range_str="6mo")

        avg_growth = 0.0
        if history_data and len(history_data) > 10:
            avg_growth = (history_data[-1]['value'] - history_data[0]['value']) / 6.0

        goals = GoalRepository(db).list_all()
        nw_goals = [g for g in goals if g.goal_type == 'NET_WORTH']
        current_nw = history_data[-1]['value'] if history_data else 0

        forecasts = []
        for goal in nw_goals:
            remaining = goal.target_amount - current_nw
            if remaining <= 0:
                prediction, months_to_go = "Achieved", 0
            elif avg_growth <= 0:
                prediction, months_to_go = "N/A (No Growth)", 999
            else:
                months_to_go = remaining / avg_growth
                future_date = today + timedelta(days=int(months_to_go * 30))
                prediction = future_date.strftime("%b %Y")

            forecasts.append({
                "goal_id":            goal.id,
                "current_amount":     current_nw,
                "target_amount":      goal.target_amount,
                "avg_monthly_growth": round(avg_growth, 0),
                "months_to_reach":    round(months_to_go, 1),
                "predicted_date":     prediction,
            })

        return {"growth_rate_6mo": round(avg_growth, 0), "forecasts": forecasts}
    except Exception as e:
        logger.error(f"compute_goal_forecast failed: {e}")
        traceback.print_exc()
        return {"growth_rate_6mo": 0, "forecasts": []}


# ── Rebalance suggestions ─────────────────────────────────────────────────────

_REBALANCEABLE_CATEGORIES = ("Fluid", "Stock", "Crypto")


def compute_rebalance_suggestions(db: Session) -> dict:
    assets = AssetRepository(db).list_all()
    usdt_rate = get_usdt_twd_rate(db)

    total_value = 0.0
    current_allocation: dict[str, float] = defaultdict(float)

    for asset in assets:
        if not asset.include_in_net_worth:
            continue
        qty = sum(t.amount for t in asset.transactions)
        if qty <= 0:
            continue
        val = (asset.current_price or 1.0) * qty
        if is_usd_denominated(asset):
            val *= usdt_rate
        cat = asset.category
        if cat in _REBALANCEABLE_CATEGORIES:
            current_allocation[cat] += val
            total_value += val

    if total_value <= 0:
        return {"total_value": 0.0, "current_allocation": {}, "targets": {}, "suggestions": []}

    target_setting = db.query(models.SystemSetting).filter_by(key="target_allocation").first()
    try:
        targets = json.loads(target_setting.value) if target_setting else {}
    except Exception:
        targets = {}

    suggestions = []
    for category, target_pct in targets.items():
        if category not in _REBALANCEABLE_CATEGORIES:
            continue
        current_val = current_allocation.get(category, 0)
        current_pct = (current_val / total_value * 100) if total_value > 0 else 0
        diff_pct = current_pct - target_pct
        diff_val = total_value * (diff_pct / 100)
        if abs(diff_pct) >= 2:
            action = "Sell" if diff_pct > 0 else "Buy"
            suggestions.append({
                "category":    category,
                "current_pct": round(current_pct, 1),
                "target_pct":  target_pct,
                "diff_val":    round(abs(diff_val), 0),
                "action":      action,
                "message":     f"{action} ${round(abs(diff_val)):,} of {category} ({round(current_pct, 1)}% vs {target_pct}%)",
            })

    return {
        "total_value":        total_value,
        "current_allocation": current_allocation,
        "targets":            targets,
        "suggestions":        suggestions,
    }
