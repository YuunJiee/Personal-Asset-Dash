from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from .. import crud, schemas, models, database

router = APIRouter(
    prefix="/api/goals",
    tags=["goals"],
    responses={404: {"description": "Not found"}},
)

@router.get("/", response_model=List[schemas.Goal])
def read_goals(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db)):
    goals = crud.get_goals(db, skip=skip, limit=limit)
    return goals

@router.post("/", response_model=schemas.Goal)
def create_goal(goal: schemas.GoalCreate, db: Session = Depends(database.get_db)):
    return crud.create_goal(db=db, goal=goal)

@router.put("/{goal_id}", response_model=schemas.Goal)
def update_goal(goal_id: int, goal: schemas.GoalUpdate, db: Session = Depends(database.get_db)):
    db_goal = crud.update_goal(db=db, goal_id=goal_id, goal_update=goal)
    if db_goal is None:
        raise HTTPException(status_code=404, detail="Goal not found")
    return db_goal

@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_goal(goal_id: int, db: Session = Depends(database.get_db)):
    success = crud.delete_goal(db=db, goal_id=goal_id)
    if not success:
        raise HTTPException(status_code=404, detail="Goal not found")
    return None
