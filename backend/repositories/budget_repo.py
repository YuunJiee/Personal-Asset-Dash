from sqlalchemy.orm import Session

from .. import models, schemas


class BudgetRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_all(self, skip: int = 0, limit: int = 200) -> list[models.BudgetCategory]:
        return (
            self.db.query(models.BudgetCategory)
            .filter(models.BudgetCategory.is_active == True)
            .offset(skip)
            .limit(limit)
            .all()
        )

    def create(self, data: schemas.BudgetCategoryCreate) -> models.BudgetCategory:
        db_cat = models.BudgetCategory(**data.dict())
        self.db.add(db_cat)
        self.db.commit()
        self.db.refresh(db_cat)
        return db_cat

    def update(self, category_id: int, data: schemas.BudgetCategoryUpdate) -> models.BudgetCategory | None:
        db_cat = self.db.query(models.BudgetCategory).filter(models.BudgetCategory.id == category_id).first()
        if db_cat:
            for key, value in data.dict(exclude_unset=True).items():
                setattr(db_cat, key, value)
            self.db.commit()
            self.db.refresh(db_cat)
        return db_cat

    def delete(self, category_id: int) -> bool:
        db_cat = self.db.query(models.BudgetCategory).filter(models.BudgetCategory.id == category_id).first()
        if db_cat:
            self.db.delete(db_cat)
            self.db.commit()
            return True
        return False
