from sqlalchemy.orm import Session

from .. import models, schemas


class IncomeRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_all(self, skip: int = 0, limit: int = 200) -> list[models.IncomeItem]:
        return (
            self.db.query(models.IncomeItem)
            .filter(models.IncomeItem.is_active == True)
            .offset(skip)
            .limit(limit)
            .all()
        )

    def create(self, data: schemas.IncomeItemCreate) -> models.IncomeItem:
        db_item = models.IncomeItem(**data.model_dump())
        self.db.add(db_item)
        self.db.commit()
        self.db.refresh(db_item)
        return db_item

    def update(self, item_id: int, data: schemas.IncomeItemUpdate) -> models.IncomeItem | None:
        db_item = self.db.query(models.IncomeItem).filter(models.IncomeItem.id == item_id).first()
        if db_item:
            for key, value in data.model_dump(exclude_unset=True).items():
                setattr(db_item, key, value)
            self.db.commit()
            self.db.refresh(db_item)
        return db_item

    def delete(self, item_id: int) -> bool:
        db_item = self.db.query(models.IncomeItem).filter(models.IncomeItem.id == item_id).first()
        if db_item:
            self.db.delete(db_item)
            self.db.commit()
            return True
        return False
