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

router = APIRouter(
    prefix="/api/stats",
    tags=["stats"],
)

@router.get("/asset/{asset_id}/history")
def get_asset_history(asset_id: int, range: str = "1y", db: Session = Depends(get_db)):
    # Determine start date
    today = datetime.now().date()
    if range == "30d": start_date = today - timedelta(days=30)
    elif range == "3mo": start_date = today - timedelta(days=90)
    elif range == "6mo": start_date = today - timedelta(days=180)
    elif range == "1y": start_date = today - timedelta(days=365)
    elif range == "ytd": start_date = date(today.year, 1, 1)
    elif range == "all": start_date = date(2020, 1, 1) # Arbitrary old date
    else: start_date = today - timedelta(days=365)

    asset = crud.get_asset(db, asset_id)
    if not asset:
        return []

    # 1. Fetch Price History if applicable
    price_history = {}
    usdtwd_history = {}
    
    # Check if stock/crypto for price fetching
    ticker = None
    if (asset.category == 'Stock' or asset.category == 'Crypto') and asset.ticker:
        t = asset.ticker
        if t.isdigit() and len(t) == 4: t = f"{t}.TW"
        if ("Crypto" in (asset.sub_category or "") or asset.category == 'Crypto') and "-" not in t: t = f"{t}-USD"
        ticker = t

    if ticker:
        # Fetch Price History similar to get_net_worth_history
        # We can refactor fetch_yahoo_history to be shared, but for now inline or copy is safer for this tool usage.
        # Minimal fetch logic
        try:
             fetch_start = (start_date - timedelta(days=7)).strftime("%Y-%m-%d")
             # Fetch Ticker
             p_data = yf.download(ticker, start=fetch_start, end=str(today + timedelta(days=1)), progress=False)['Close']
             if not p_data.empty:
                 series = p_data.ffill().bfill()
                 price_history = {d.strftime("%Y-%m-%d"): val for d, val in series.items()}
             
             # Fetch FX
             fx_data = yf.download("USDTWD=X", start=fetch_start, end=str(today + timedelta(days=1)), progress=False)['Close']
             if not fx_data.empty:
                 fx_series = fx_data.ffill().bfill()
                 usdtwd_history = {d.strftime("%Y-%m-%d"): val for d, val in fx_series.items()}
                 
        except Exception as e:
            print(f"Error fetching hisotry for asset {asset_id}: {e}")

    # 2. Replay Transactions
    transactions = sorted(asset.transactions, key=lambda x: x.date)
    
    current_qty = 0.0
    # Calculate initial quantity before start_date
    tx_idx = 0
    while tx_idx < len(transactions) and transactions[tx_idx].date.date() < start_date:
        current_qty += transactions[tx_idx].amount
        tx_idx += 1
        
    history = []
    curr_date = start_date
    current_usdtwd = 32.0 # Fallback
    
    while curr_date <= today:
        d_str = curr_date.strftime("%Y-%m-%d")
        
        # Apply daily transactions
        while tx_idx < len(transactions) and transactions[tx_idx].date.date() == curr_date:
            current_qty += transactions[tx_idx].amount
            tx_idx += 1
            
        # Determine Value
        price = 1.0 # Default
        if ticker:
            p = price_history.get(d_str)
            rate = usdtwd_history.get(d_str, current_usdtwd)
            
            if p is not None:
                if asset.source == 'max': # MAX usually TWD
                     if p is not None: price = p # Assuming fallback logic handled
                elif ticker.endswith('.TW'):
                     price = p
                else:
                     price = p * rate
            else:
                 # Fallback to current price if history missing
                 price = asset.current_price
        else:
             price = asset.current_price
             
        val = current_qty * price
        
        history.append({
            "date": d_str,
            "quantity": current_qty,
            "value": round(val, 2),
            "price": round(price, 2)
        })
        
        curr_date += timedelta(days=1)
        
    return history

@router.get("/history")
def get_net_worth_history(range: str = "30d", db: Session = Depends(get_db)):
    try:
        # Determine start date
        today = datetime.now().date()
        if range == "30d":
            start_date = today - timedelta(days=30)
        elif range == "3mo":
            start_date = today - timedelta(days=90)
        elif range == "6mo":
            start_date = today - timedelta(days=180)
        elif range == "1y":
            start_date = today - timedelta(days=365)
        elif range == "ytd":
            start_date = date(today.year, 1, 1)
        else:
            start_date = today - timedelta(days=30)
    
        # 1. Fetch all assets and transactions
        assets = crud.get_assets(db)
        
        # 2. Identify Investable Assets (Stocks/Crypto) to fetch history
        tickers = []
        # asset_map = {} # id -> Asset
        # txn_map = defaultdict(list)
        
        for asset in assets:
            # asset_map[asset.id] = asset
            if (asset.category == 'Stock' or asset.category == 'Crypto') and asset.ticker:
                t = asset.ticker
                # Heuristic checks
                if t.isdigit() and len(t) == 4: t = f"{t}.TW"
                if ("Crypto" in (asset.sub_category or "") or asset.category == 'Crypto') and "-" not in t: t = f"{t}-USD"
                
                asset.yf_ticker = t 
                tickers.append(t)
    
        # 3. Fetch Historical Data (Prices and FX)
        price_history = {} # ticker -> {date_str ('YYYY-MM-DD') -> close_price}
        usdtwd_history = {} # date_str -> rate
    
        # Helper to download and process
        def fetch_yahoo_history(symbols):
            try:
                # Buffer start date by 7 days to ensure we have previous close for weekends/holidays
                fetch_start = (start_date - timedelta(days=7)).strftime("%Y-%m-%d")
                data = yf.download(symbols, start=fetch_start, end=str(today + timedelta(days=1)), progress=False)['Close']
                
                history_map = {}
                
                # Normalize to dict: ticker -> {date_str -> price}
                if isinstance(data, pd.DataFrame) and not data.empty:
                     # If MultiIndex columns (when multiple tickers)
                     if isinstance(data.columns, pd.MultiIndex): 
                         # Should not happen with just 'Close' usually, unless yfinance version differs. 
                         # Newer yfinance might return MultiIndex if asking for multiple fields.
                         # But ['Close'] returns DataFrame with tickers as columns.
                         pass
                     
                     for col in data.columns:
                         # Fill NaN with forward fill (ffill) then backward fill (bfill)
                         # to handle weekends/holidays seamlessly
                         series = data[col].ffill().bfill()
                         history_map[col] = {d.strftime("%Y-%m-%d"): val for d, val in series.items()}
                         
                elif isinstance(data, pd.Series) and not data.empty:
                     # Single symbol
                     symbol = symbols[0] if isinstance(symbols, list) else symbols
                     series = data.ffill().bfill()
                     history_map[symbol] = {d.strftime("%Y-%m-%d"): val for d, val in series.items()}
                
                return history_map
            except Exception as e:
                print(f"Error fetching history for {symbols}: {e}")
                traceback.print_exc()
                return {}
    
        if tickers:
            price_history = fetch_yahoo_history(tickers)
    
        # Fetch USDTWD History
        fx_map = fetch_yahoo_history("USDTWD=X")
        usdtwd_history = fx_map.get("USDTWD=X", {})
    
        # Default FX if missing
        current_usdtwd = 32.0 # fallback
    
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
                
                # Determine Price
                price = 1.0 # Default (Fluid/Fixed/Receivables)
                
                if (asset.category == 'Stock' or asset.category == 'Crypto') and getattr(asset, 'yf_ticker', None):
                    t = asset.yf_ticker
                    # Get price from history
                    hist = price_history.get(t, {})
                    p = hist.get(date_str)
                    
                    if p is None:
                        # Fallback to current asset price if history missing completely?
                        # Or 0?
                        # Let's use asset.current_price as last resort
                        p = asset.current_price
                    
                    # Check Currency (Heuristic: Stocks.TW -> TWD, Crypto -> USD, US Stocks -> USD)
                    # If ticker ends with .TW, no FX. Else x Rate.
                    # FIX: If Asset Source is 'max', price is already TWD (from DB Fallback or Manual).
                    # Actually, MAX assets fallback to `current_price` which is TWD.
                    # If YF fetch succeeds, it returns USD for BTC-USD. 
                    # But YF fails in 2026 -> Fallback to TWD Price -> Mistakenly * 32.
                    
                    if asset.source == 'max':
                        # Special case: If we used Fallback (p == current_price), it is TWD.
                        # If we used YF (p == hist), it is likely USD (e.g. BTC-USD).
                        # How to know if p came from YF or Fallback?
                        # Check if p (hist) was None.
                        
                        if hist.get(date_str) is None:
                             # Fallback used -> TWD
                             price = p
                        else:
                             # YF used -> USD (assuming BTC-USD)
                             price = p * rate
                    elif t.endswith('.TW'):
                        price = p
                    else:
                        price = p * rate
                
                elif asset.category == 'Stock' or asset.category == 'Crypto':
                     # Investment without recognized ticker (manual price)
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
                "value": round(day_total, 0),
                "breakdown": {k: round(v, 0) for k, v in cat_totals.items()}
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
    
    for asset in assets:
        if not asset.include_in_net_worth:
            continue
            
        qty = 0
        for t in asset.transactions:
            qty += t.amount
            
        if qty <= 0: continue
        
        # Price
        price = asset.current_price if asset.current_price else 1.0
        
        # FX
        if "USD" in (asset.ticker or "") or "USD" in (asset.name or ""): 
             val = qty * price * 32
        else:
             val = qty * price
             
        # SIMPLIFIED: Top Level Category Only (Fluid or Investment)
        # Any other category (Liabilities) we ignore for rebalancing or map?
        # Assuming only Fluid and Investment matter for this specific request.
        
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
