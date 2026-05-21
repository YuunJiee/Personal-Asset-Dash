from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from .. import schemas, models, database
from ..repositories.asset_repo import AssetRepository

router = APIRouter(
    prefix="/api/assets",
    tags=["assets"],
    responses={404: {"description": "Not found"}},
)


@router.get("", include_in_schema=False)
@router.get("/", response_model=List[schemas.Asset])
def read_assets(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db)):
    return AssetRepository(db).list_all(skip=skip, limit=limit)


@router.post("", include_in_schema=False)
@router.post("/", response_model=schemas.Asset)
def create_asset(asset: schemas.AssetCreate, db: Session = Depends(database.get_db)):
    return AssetRepository(db).create(asset)


@router.put("/{asset_id}", response_model=schemas.Asset)
def update_asset(asset_id: int, asset: schemas.AssetUpdate, db: Session = Depends(database.get_db)):
    db_asset = AssetRepository(db).update(asset_id, asset)
    if db_asset is None:
        raise HTTPException(status_code=404, detail="Asset not found")
    return db_asset


@router.get("/lookup/{ticker}")
def lookup_ticker(ticker: str):
    import yfinance as yf
    try:
        if ticker.isdigit() and len(ticker) == 4:
            ticker = f"{ticker}.TW"
        t = yf.Ticker(ticker)
        info = t.info
        name = info.get('longName') or info.get('shortName') or ticker
        current_price = info.get('currentPrice') or info.get('regularMarketPrice') or info.get('previousClose')
        return {"name": name, "symbol": ticker, "price": current_price}
    except Exception as e:
        return {"name": "", "error": str(e)}


@router.get("/{asset_id}", response_model=schemas.Asset)
def read_asset(asset_id: int, db: Session = Depends(database.get_db)):
    db_asset = AssetRepository(db).get(asset_id)
    if db_asset is None:
        raise HTTPException(status_code=404, detail="Asset not found")
    return db_asset


@router.post("/{asset_id}/transactions/", response_model=schemas.Transaction)
def create_transaction_for_asset(
    asset_id: int, transaction: schemas.TransactionCreate, db: Session = Depends(database.get_db)
):
    repo = AssetRepository(db)
    if repo.get(asset_id) is None:
        raise HTTPException(status_code=404, detail="Asset not found")
    return repo.create_transaction(transaction, asset_id)


@router.delete("/transactions/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction_endpoint(transaction_id: int, db: Session = Depends(database.get_db)):
    if not AssetRepository(db).delete_transaction(transaction_id):
        raise HTTPException(status_code=404, detail="Transaction not found")
    return None


@router.put("/transactions/{transaction_id}", response_model=schemas.Transaction)
def update_transaction_endpoint(
    transaction_id: int, transaction: schemas.TransactionUpdate, db: Session = Depends(database.get_db)
):
    tx = db.query(models.Transaction).filter(models.Transaction.id == transaction_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    if tx.asset.source == 'max':
        raise HTTPException(status_code=403, detail="Cannot edit auto-synced MAX transactions")
    return AssetRepository(db).update_transaction(transaction_id, transaction)


@router.delete("/{asset_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_asset(asset_id: int, db: Session = Depends(database.get_db)):
    if not AssetRepository(db).delete(asset_id):
        raise HTTPException(status_code=404, detail="Asset not found")
    return None
