from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .. import schemas, database
from ..repositories.income_repo import IncomeRepository

router = APIRouter(
    prefix="/api/income",
    tags=["income"],
)


@router.get("/items", response_model=list[schemas.IncomeItem])
def get_income_items(skip: int = 0, limit: int = 200, db: Session = Depends(database.get_db)):
    return IncomeRepository(db).list_all(skip=skip, limit=limit)


@router.post("/items", response_model=schemas.IncomeItem)
def create_income_item(item: schemas.IncomeItemCreate, db: Session = Depends(database.get_db)):
    return IncomeRepository(db).create(item)


@router.put("/items/{item_id}", response_model=schemas.IncomeItem)
def update_income_item(item_id: int, item: schemas.IncomeItemUpdate, db: Session = Depends(database.get_db)):
    db_item = IncomeRepository(db).update(item_id, item)
    if db_item is None:
        raise HTTPException(status_code=404, detail="Income item not found")
    return db_item


@router.delete("/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_income_item(item_id: int, db: Session = Depends(database.get_db)):
    if not IncomeRepository(db).delete(item_id):
        raise HTTPException(status_code=404, detail="Income item not found")
    return None
