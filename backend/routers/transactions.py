from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .. import schemas, database
from ..repositories.asset_repo import AssetRepository

router = APIRouter(
    prefix="/api/transactions",
    tags=["transactions"],
)


@router.post("/transfer", status_code=status.HTTP_200_OK)
def transfer_funds(transfer: schemas.TransferCreate, db: Session = Depends(database.get_db)):
    if transfer.from_asset_id == transfer.to_asset_id:
        raise HTTPException(status_code=400, detail="Cannot transfer to the same account")

    repo = AssetRepository(db)
    if not repo.get(transfer.from_asset_id) or not repo.get(transfer.to_asset_id):
        raise HTTPException(status_code=404, detail="One or more assets not found")

    repo.transfer_funds(transfer)
    return {"message": "Transfer successful"}
