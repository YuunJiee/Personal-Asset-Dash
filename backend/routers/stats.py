from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from .. import crud, models, schemas
from ..database import get_db
from datetime import datetime, timedelta, date
import yfinance as yf
import pandas as pd
from collections import defaultdict
import math
import traceback


def safe_float(val):
    if val is None: return 0.0
    if isinstance(val, (int, float)):
        if math.isnan(val) or math.isinf(val):
            return 0.0
    return val


def parse_range(range: str) -> date:
    """Convert a range string to a start date."""
    today = datetime.now().date()
    if range == "30d":  return today - timedelta(days=30)
    if range == "3mo":  return today - timedelta(days=90)
    if range == "6mo":  return today - timedelta(days=180)
    if range == "1y":   return today - timedelta(days=365)
    if range == "ytd":  return date(today.year, 1, 1)
    if range == "all":  return date(2020, 1, 1)
    return today - timedelta(days=365)  # default


def fetch_yahoo_history(symbols, start_date: date) -> dict:
    """Download price history from Yahoo Finance. Returns {ticker: {date_str: price}}."""
    try:
        fetch_start = (start_date - timedelta(days=7)).strftime("%Y-%m-%d")
        today = datetime.now().date()
        data = yf.download(symbols, start=fetch_start, end=str(today + timedelta(days=1)), progress=False)['Close']
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
        print(f"Error fetching history for {symbols}: {e}")
        traceback.print_exc()
        return {}


router = APIRouter(
    prefix="/api/stats",
    tags=["stats"],
)

@router.get("/asset/{asset_id}/history")
def get_asset_history(asset_id: int, range: str = "1y", db: Session = Depends(get_db)):
    today = datetime.now().date()
    start_date = parse_range(range)

    asset = crud.get_asset(db, asset_id)
    if not asset:
        return []

    # Resolve yfinance ticker
    ticker = None
    if (asset.category in ('Stock', 'Crypto')) and asset.ticker:
        t = asset.ticker
        if t.isdigit() and len(t) == 4: t = f"{t}.TW"
        if ("Crypto" in (asset.sub_category or "") or asset.category == 'Crypto') and "-" not in t: t = f"{t}-USD"
        ticker = t

    price_history = {}
    usdtwd_history = {}
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
            p = price_history.get(d_str)
            rate = usdtwd_history.get(d_str, current_usdtwd)
            if p is not None:
                price = p if asset.source == 'max' or ticker.endswith('.TW') else p * rate
            else:
                price = asset.current_price
        else:
            price = asset.current_price

        history.append({
            "date": d_str,
            "quantity": current_qty,
            "value": round(current_qty * price, 2),
            "price": round(price, 2)
        })
        curr_date += timedelta(days=1)

    return history

@router.get("/history")
def get_net_worth_history(range: str = "30d", db: Session = Depends(get_db)):
    try:
        today = datetime.now().date()
        start_date = parse_range(range)

        assets = crud.get_assets(db)

        # Build yf_ticker map (avoid monkey-patching SQLAlchemy models)
        yf_ticker_map: dict[int, str] = {}
        tickers = []
        for asset in assets:
            if (asset.category in ('Stock', 'Crypto')) and asset.ticker:
                t = asset.ticker
                if t.isdigit() and len(t) == 4: t = f"{t}.TW"
                if ("Crypto" in (asset.sub_category or "") or asset.category == 'Crypto') and "-" not in t: t = f"{t}-USD"
                yf_ticker_map[asset.id] = t
                tickers.append(t)

        price_history = fetch_yahoo_history(tickers, start_date) if tickers else {}
        fx_map = fetch_yahoo_history("USDTWD=X", start_date)
        usdtwd_history = fx_map.get("USDTWD=X", {})
        current_usdtwd = 32.0
    
        # 4. Reconstruct Daily Net Worth
        result = []
        
        # Pre-calculate asset quantities over time
        # This is O(Assets * Days * Transactions). 
        # Since transactions are likely few, we can iterate forward.
        
        # Initial State (Balances BEFORE start_date)
        # Map: asset_id -> quantity
        balances = defaultdict(float)
        
        # Pre-process transactions into a timeline?
        # Or just iterate all transactions for every day? (Inefficient but robust)
        # Better: Sort transactions by date.
        
        # Flatten transactions: (date, asset_id, amount)
        all_txns = []
        for asset in assets:
            for txn in asset.transactions:
                # txn.date is likely datetime, convert to date
                t_date = txn.date.date() if isinstance(txn.date, datetime) else txn.date
                all_txns.append((t_date, asset.id, txn.amount))
        
        all_txns.sort(key=lambda x: x[0])
        
        # Calculate balances up to start_date
        txn_idx = 0
        while txn_idx < len(all_txns) and all_txns[txn_idx][0] < start_date:
            d, aid, amt = all_txns[txn_idx]
            balances[aid] += amt
            txn_idx += 1
        
        # Iterate Day by Day
        current_date = start_date
        while current_date <= today:
            date_str = current_date.strftime("%Y-%m-%d")
            
            # Apply transactions for this day
            while txn_idx < len(all_txns) and all_txns[txn_idx][0] == current_date:
                d, aid, amt = all_txns[txn_idx]
                balances[aid] += amt
                txn_idx += 1
                
            # Calculate Total Net Worth for this day
            day_total = 0.0
            cat_totals = defaultdict(float)
            
            # Get FX for this day (or fallback to latest known)
            # Since we used ffill, key should exist if within range. 
            # If not, use fallback.
            rate = usdtwd_history.get(date_str)
            if not rate:
                 # Try finding last available date? (Already done via ffill mostly)
                 # Fallback to hardcoded
                 rate = current_usdtwd
            
            for asset in assets:
                if not asset.include_in_net_worth:
                    continue

                qty = balances[asset.id]
                if qty == 0: continue

                price = 1.0
                t = yf_ticker_map.get(asset.id)
                if t:
                    hist = price_history.get(t, {})
                    p = hist.get(date_str)
                    if p is not None and (math.isnan(p) or math.isinf(p)):
                        p = None
                    if p is None:
                        p = asset.current_price
                    if asset.source == 'max':
                        price = p if hist.get(date_str) is None else p * rate
                    elif t.endswith('.TW'):
                        price = p
                    else:
                        price = p * rate
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
                "breakdown": {k: safe_float(round(v, 0)) for k, v in cat_totals.items()}
            })
            
            current_date += timedelta(days=1)
            
        return result
    except Exception as e:
        print(f"Error in get_net_worth_history: {e}")
        traceback.print_exc()
        return []

@router.get("/rebalance")
def get_rebalance_suggestions(db: Session = Depends(get_db)):
    # 1. Fetch Assets
    assets = crud.get_assets(db)
    
    # 2. Calculate Current Allocation by Sub-Category (or Category if Sub is missing)
    # Focus on Investable + Fluid assets usually? Or Net Worth?
    # User said: "Stock 60%, Cash 40%". This implies Sub-Categories.
    
    total_value = 0.0
    current_allocation = defaultdict(float)
    
    # Fetch Exchange Rate ONCE
    from ..services.exchange_rate_service import get_usdt_twd_rate
    usdt_rate = get_usdt_twd_rate(db)

    for asset in assets:
        if not asset.include_in_net_worth:
            continue
            
        qty = sum(t.amount for t in asset.transactions)
        if qty <= 0: continue
        
        price = asset.current_price if asset.current_price else 1.0
        
        # Conversion Logic
        val = qty * price # Default Native Value
        
        is_usd = False
        if asset.category == 'Crypto':
             is_usd = True
        elif asset.category == 'Stock':
             if asset.ticker:
                 if asset.ticker.endswith('.TW') or (asset.ticker.isdigit() and len(asset.ticker) == 4):
                     is_usd = False
                 elif asset.source == 'max': # MAX assumes TWD fallback
                     is_usd = False
                 else:
                     is_usd = True # US Stocks
        
        if is_usd:
            val = val * usdt_rate

        cat = asset.category
        if cat in ['Fluid', 'Stock', 'Crypto']:
            current_allocation[cat] += val
            total_value += val

    # 3. Fetch Target Allocation
    target_setting = db.query(models.SystemSetting).filter(models.SystemSetting.key == "target_allocation").first()
    import json
    try:
        targets = json.loads(target_setting.value) if target_setting else {}
    except:
        targets = {} 
        
    # Example Target: {"Fluid": 40, "Investment": 60}
    
    suggestions = []
    
    # Analyze
    for category, target_pct in targets.items():
        if category not in ['Fluid', 'Stock', 'Crypto']: continue # Ignore old keys
        
        current_val = current_allocation.get(category, 0)
        current_pct = (current_val / total_value * 100) if total_value > 0 else 0
        
        diff_pct = current_pct - target_pct
        diff_val = total_value * (diff_pct / 100)
        
        # Threshold: 2% deviation
        if abs(diff_pct) >= 2: 
            action = "Sell" if diff_pct > 0 else "Buy"
            suggestions.append({
                "category": category,
                "current_pct": round(current_pct, 1),
                "target_pct": target_pct,
                "diff_val": round(abs(diff_val), 0),
                "action": action,
                "message": f"{action} ${round(abs(diff_val)):,} of {category} ({round(current_pct,1)}% vs {target_pct}%)"
            })
            
    return {
        "total_value": total_value,
        "current_allocation": current_allocation,
        "targets": targets,
        "suggestions": suggestions
    }

@router.get("/forecast")
def get_goal_forecast(db: Session = Depends(get_db)):
    try:
        # 1. Calculate Average Monthly Growth (last 6 months)
        # We can use the existing `get_net_worth_history` logic but simplified
        # Or just fetch 2 data points: Today and 6 months ago.
        
        today = datetime.now().date()
        six_months_ago = today - timedelta(days=180)
        
        # Re-use logic to get net worth for specific dates is hard without refactoring.
        # Let's call the internal function if possible, or copy logic.
        # Ideally, refactor `get_net_worth_history` to `calculate_net_worth(date, db)`.
        # For now, let's just fetch history for 6mo and calculate slope.
        
        history_data = get_net_worth_history(range="6mo", db=db)
        
        avg_growth = 0
        if history_data and len(history_data) > 10: # Need enough data
            start_val = history_data[0]['value']
            end_val = history_data[-1]['value']
            
            # Simple Linear Growth: (End - Start) / Months
            diff = end_val - start_val
            # 6 months roughly
            avg_growth = diff / 6.0
        
        # 2. Get Net Worth Goals
        goals = crud.get_goals(db)
        nw_goals = [g for g in goals if g.goal_type == 'NET_WORTH']
        
        # Current Net Worth
        # Reuse `dashboard` logic or fetch from history
        current_nw = history_data[-1]['value'] if history_data else 0
    
        forecasts = []
        
        for goal in nw_goals:
            remaining = goal.target_amount - current_nw
            
            if remaining <= 0:
                prediction = "Achieved"
                months_to_go = 0
            elif avg_growth <= 0:
                prediction = "N/A (No Growth)"
                months_to_go = 999
            else:
                months_to_go = remaining / avg_growth
                years = months_to_go / 12
                
                # Date prediction
                future_date = today + timedelta(days=int(months_to_go * 30))
                prediction = future_date.strftime("%b %Y")
                
            forecasts.append({
                "goal_id": goal.id,
                "current_amount": current_nw,
                "target_amount": goal.target_amount,
                "avg_monthly_growth": round(avg_growth, 0),
                "months_to_reach": round(months_to_go, 1),
                "predicted_date": prediction
            })
            
        return {
            "growth_rate_6mo": round(avg_growth, 0),
            "forecasts": forecasts
        }
    except Exception as e:
        print(f"Error in get_goal_forecast: {e}")
        traceback.print_exc()
        return {
             "growth_rate_6mo": 0,
             "forecasts": []
        }
