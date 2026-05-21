from abc import ABC, abstractmethod
from sqlalchemy.orm import Session


class ExchangeProvider(ABC):
    @abstractmethod
    def sync(self, db: Session) -> bool:
        """Sync balances from exchange to DB. Returns True on success."""
        ...
