from datetime import datetime
from sqlalchemy.orm import Session

from .. import models, schemas


class GoalRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_all(self, skip: int = 0, limit: int = 100) -> list[models.Goal]:
        return self.db.query(models.Goal).offset(skip).limit(limit).all()

    def create(self, data: schemas.GoalCreate) -> models.Goal:
        db_goal = models.Goal(**data.dict(), created_at=datetime.now())
        self.db.add(db_goal)
        self.db.commit()
        self.db.refresh(db_goal)
        return db_goal

    def update(self, goal_id: int, data: schemas.GoalUpdate) -> models.Goal | None:
        db_goal = self.db.query(models.Goal).filter(models.Goal.id == goal_id).first()
        if db_goal:
            for key, value in data.dict(exclude_unset=True).items():
                setattr(db_goal, key, value)
            self.db.commit()
            self.db.refresh(db_goal)
        return db_goal

    def delete(self, goal_id: int) -> bool:
        db_goal = self.db.query(models.Goal).filter(models.Goal.id == goal_id).first()
        if db_goal:
            self.db.delete(db_goal)
            self.db.commit()
            return True
        return False
