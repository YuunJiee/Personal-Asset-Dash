from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from .. import crud, schemas, models, database

router = APIRouter(
    prefix="/api/expenses",
    tags=["expenses"],
    responses={404: {"description": "Not found"}},
)

@router.get("/", response_model=List[schemas.Expense])
def read_expenses(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db)):
    expenses = crud.get_expenses(db, skip=skip, limit=limit)
    return expenses

@router.post("/", response_model=schemas.Expense)
def create_expense(expense: schemas.ExpenseCreate, db: Session = Depends(database.get_db)):
    return crud.create_expense(db=db, expense=expense)

@router.put("/{expense_id}", response_model=schemas.Expense)
def update_expense(expense_id: int, expense: schemas.ExpenseUpdate, db: Session = Depends(database.get_db)):
    db_expense = crud.update_expense(db=db, expense_id=expense_id, expense_update=expense)
    if db_expense is None:
        raise HTTPException(status_code=404, detail="Expense not found")
    return db_expense

@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense(expense_id: int, db: Session = Depends(database.get_db)):
    success = crud.delete_expense(db=db, expense_id=expense_id)
    if not success:
        raise HTTPException(status_code=404, detail="Expense not found")
    return None
