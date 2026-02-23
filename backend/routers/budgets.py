from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from .. import crud, schemas, database

router = APIRouter(
    prefix="/api/budgets",
    tags=["budgets"],
    responses={404: {"description": "Not found"}},
)

@router.get("/", response_model=List[schemas.BudgetCategory])
def read_budget_categories(skip: int = 0, limit: int = 200, db: Session = Depends(database.get_db)):
    return crud.get_budget_categories(db, skip=skip, limit=limit)

@router.post("/", response_model=schemas.BudgetCategory)
def create_budget_category(category: schemas.BudgetCategoryCreate, db: Session = Depends(database.get_db)):
    return crud.create_budget_category(db=db, category=category)

@router.put("/{category_id}", response_model=schemas.BudgetCategory)
def update_budget_category(category_id: int, category: schemas.BudgetCategoryUpdate, db: Session = Depends(database.get_db)):
    db_cat = crud.update_budget_category(db=db, category_id=category_id, category_update=category)
    if db_cat is None:
        raise HTTPException(status_code=404, detail="Budget category not found")
    return db_cat

@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_budget_category(category_id: int, db: Session = Depends(database.get_db)):
    success = crud.delete_budget_category(db=db, category_id=category_id)
    if not success:
        raise HTTPException(status_code=404, detail="Budget category not found")
    return None
