from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from .. import crud, schemas, database

router = APIRouter(
    prefix="/api/income",
    tags=["income"],
    responses={404: {"description": "Not found"}},
)

@router.get("/", response_model=List[schemas.IncomeItem])
def read_income_items(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db)):
    return crud.get_income_items(db, skip=skip, limit=limit)

@router.post("/", response_model=schemas.IncomeItem)
def create_income_item(item: schemas.IncomeItemCreate, db: Session = Depends(database.get_db)):
    return crud.create_income_item(db=db, item=item)

@router.put("/{item_id}", response_model=schemas.IncomeItem)
def update_income_item(item_id: int, item: schemas.IncomeItemUpdate, db: Session = Depends(database.get_db)):
    db_item = crud.update_income_item(db=db, item_id=item_id, item_update=item)
    if db_item is None:
        raise HTTPException(status_code=404, detail="Income item not found")
    return db_item

@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_income_item(item_id: int, db: Session = Depends(database.get_db)):
    success = crud.delete_income_item(db=db, item_id=item_id)
    if not success:
        raise HTTPException(status_code=404, detail="Income item not found")
    return None
