from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from .. import crud, schemas, database

router = APIRouter(
    prefix="/api/assets",
    tags=["assets"],
    responses={404: {"description": "Not found"}},
)

# Get all assets
@router.get("", include_in_schema=False)
@router.get("/", response_model=List[schemas.Asset])
def read_assets(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db)):
    assets = crud.get_assets(db, skip=skip, limit=limit)
    return assets

# Create new asset
@router.post("/", response_model=schemas.Asset)
def create_asset(asset: schemas.AssetCreate, db: Session = Depends(database.get_db)):
    return crud.create_asset(db=db, asset=asset)

@router.put("/{asset_id}", response_model=schemas.Asset)
def update_asset(asset_id: int, asset: schemas.AssetUpdate, db: Session = Depends(database.get_db)):
    db_asset = crud.update_asset(db=db, asset_id=asset_id, asset_update=asset)
    if db_asset is None:
        raise HTTPException(status_code=404, detail="Asset not found")
    return db_asset

@router.delete("/{asset_id}")
def delete_asset(asset_id: int, db: Session = Depends(database.get_db)):
    success = crud.delete_asset(db=db, asset_id=asset_id)
    if not success:
        raise HTTPException(status_code=404, detail="Asset not found")
    return {"ok": True}

@router.get("/lookup/{ticker}")
def lookup_ticker(ticker: str):
    import yfinance as yf
    try:
        # Taiwan stock heuristic
        if ticker.isdigit() and len(ticker) == 4:
            ticker = f"{ticker}.TW"
            
        t = yf.Ticker(ticker)
        info = t.info
        
        # Try to find a good name
        name = info.get('longName') or info.get('shortName') or ticker
        
        # Get current price
        current_price = info.get('currentPrice') or info.get('regularMarketPrice') or info.get('previousClose')

        # Currency Conversion to TWD - REMOVED
        # We store native currency price and convert on display/calculation
        # currency = info.get('currency')
        # if current_price and currency and currency != 'TWD':
        #     try:
        #         # Construct exchange rate ticker, e.g., USDTWD=X, EURTWD=X
        #         exchange_ticker = f"{currency}TWD=X"
        #         rate_ticker = yf.Ticker(exchange_ticker)
        #         rate_info = rate_ticker.info
        #         rate = rate_info.get('currentPrice') or rate_info.get('regularMarketPrice') or rate_info.get('previousClose')
        #         
        #         if rate:
        #             current_price = current_price * rate
        #     except Exception as e:
        #         print(f"Currency conversion failed for {ticker} ({currency}): {e}")
        #         # Fallback to original price if conversion fails
        
        return {
            "name": name, 
            "symbol": ticker,
            "price": current_price
        }
    except Exception as e:
        return {"name": "", "error": str(e)}

# Get specific asset
@router.get("/{asset_id}", response_model=schemas.Asset)
def read_asset(asset_id: int, db: Session = Depends(database.get_db)):
    db_asset = crud.get_asset(db, asset_id=asset_id)
    if db_asset is None:
        raise HTTPException(status_code=404, detail="Asset not found")
    return db_asset

# Create transaction for an asset
@router.post("/{asset_id}/transactions/", response_model=schemas.Transaction)
def create_transaction_for_asset(
    asset_id: int, transaction: schemas.TransactionCreate, db: Session = Depends(database.get_db)
):
    db_asset = crud.get_asset(db, asset_id=asset_id)
    if db_asset is None:
         raise HTTPException(status_code=404, detail="Asset not found")
    return crud.create_transaction(db=db, transaction=transaction, asset_id=asset_id)

@router.delete("/transactions/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction_endpoint(transaction_id: int, db: Session = Depends(database.get_db)):
    success = crud.delete_transaction(db=db, transaction_id=transaction_id)
    if not success:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return None

@router.put("/transactions/{transaction_id}", response_model=schemas.Transaction)
def update_transaction_endpoint(transaction_id: int, transaction: schemas.TransactionUpdate, db: Session = Depends(database.get_db)):
    # Check if transaction exists and asset source
    db_transaction = crud.get_transaction(db, transaction_id) # Need to add get_transaction to crud first? Or query directly here?
    # Let's query directly or add helper. 
    # Actually crud.update_transaction handles "if db_transaction" but returns None if not found.
    # But we also need to check if Asset Source is MAX.
    
    # Let's do it properly:
    from .. import models
    tx = db.query(models.Transaction).filter(models.Transaction.id == transaction_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
        
    if tx.asset.source == 'max':
        raise HTTPException(status_code=403, detail="Cannot edit auto-synced MAX transactions")
        
    updated_tx = crud.update_transaction(db=db, transaction_id=transaction_id, transaction_update=transaction)
    return updated_tx

# Delete asset (Optional, for management)
@router.delete("/{asset_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_asset(asset_id: int, db: Session = Depends(database.get_db)):
    # Need to implement delete in CRUD if not exists or use direct session delete
    # For now, let's assume we might need to add it to CRUD or do it here. 
    # Let's do it here for simplicity or add to CRUD.
    # Actually, standard practice is to use CRUD. 
    # But for now, let's keep it simple: "Not Implemented" or just do it.
    # Let's add delete capability to crud.py first? Or just do:
    # db_asset = crud.get_asset(db, asset_id)
    # if not db_asset: raise 404
    # db.delete(db_asset)
    # db.commit()
    # But cascades?
    
    # I'll implement a basic delete in crud.py or here. 
    # Let's do it here for now as it's simple.
    from .. import models
    db_asset = db.query(models.Asset).filter(models.Asset.id == asset_id).first()
    if not db_asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    db.delete(db_asset) # SQLAlchemy should handle cascades if configured, or transactions might be orphaned.
    db.commit()
    return None

# Tag Endpoints
@router.post("/{asset_id}/tags", response_model=schemas.Asset)
def add_tag(asset_id: int, tag: schemas.TagCreate, db: Session = Depends(database.get_db)):
    db_asset = crud.add_tag_to_asset(db, asset_id, tag.name, tag.color)
    if not db_asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return db_asset

@router.delete("/{asset_id}/tags/{tag_id}", response_model=schemas.Asset)
def remove_tag(asset_id: int, tag_id: int, db: Session = Depends(database.get_db)):
    db_asset = crud.remove_tag_from_asset(db, asset_id, tag_id)
    if not db_asset:
         raise HTTPException(status_code=404, detail="Asset not found")
    return db_asset
