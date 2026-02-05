from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from .. import crud, schemas, database

router = APIRouter(
    prefix="/api/transactions",
    tags=["transactions"],
    responses={404: {"description": "Not found"}},
)

@router.post("/transfer", status_code=status.HTTP_200_OK)
def transfer_funds(transfer: schemas.TransferCreate, db: Session = Depends(database.get_db)):
    if transfer.from_asset_id == transfer.to_asset_id:
        raise HTTPException(status_code=400, detail="Cannot transfer to the same account")
        
    # Check if assets exist
    from_asset = crud.get_asset(db, transfer.from_asset_id)
    to_asset = crud.get_asset(db, transfer.to_asset_id)
    
    if not from_asset or not to_asset:
        raise HTTPException(status_code=404, detail="One or more assets not found")
        
    success = crud.transfer_funds(db, transfer)
    if not success:
        raise HTTPException(status_code=400, detail="Transfer failed")
    return {"message": "Transfer successful"}
