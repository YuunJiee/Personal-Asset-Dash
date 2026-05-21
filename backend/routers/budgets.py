from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .. import schemas, database
from ..repositories.budget_repo import BudgetRepository

router = APIRouter(
    prefix="/api/budgets",
    tags=["budgets"],
)


@router.get("/categories", response_model=list[schemas.BudgetCategory])
def get_budget_categories(skip: int = 0, limit: int = 200, db: Session = Depends(database.get_db)):
    return BudgetRepository(db).list_all(skip=skip, limit=limit)


@router.post("/categories", response_model=schemas.BudgetCategory)
def create_budget_category(category: schemas.BudgetCategoryCreate, db: Session = Depends(database.get_db)):
    return BudgetRepository(db).create(category)


@router.put("/categories/{category_id}", response_model=schemas.BudgetCategory)
def update_budget_category(
    category_id: int, category: schemas.BudgetCategoryUpdate, db: Session = Depends(database.get_db)
):
    db_cat = BudgetRepository(db).update(category_id, category)
    if db_cat is None:
        raise HTTPException(status_code=404, detail="Category not found")
    return db_cat


@router.delete("/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_budget_category(category_id: int, db: Session = Depends(database.get_db)):
    if not BudgetRepository(db).delete(category_id):
        raise HTTPException(status_code=404, detail="Category not found")
    return None
