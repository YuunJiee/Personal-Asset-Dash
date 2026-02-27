"""Shared fixtures for backend tests."""

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from unittest.mock import patch

from backend.models import Base


@pytest.fixture
def db():
    """Provide an isolated **in-memory** SQLite session for each test.

    All tables are created fresh for every test and torn down afterwards,
    so tests are fully independent and leave no state on disk.
    """
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()
    Base.metadata.drop_all(engine)


@pytest.fixture(autouse=True)
def mock_exchange_rate():
    """Stub out the live exchange-rate lookup so tests never hit the network.

    ``get_usdt_twd_rate`` is imported at the top of ``crud.py``; patching the
    name in that module's namespace is the correct approach.
    """
    with patch("backend.crud.get_usdt_twd_rate", return_value=32.0):
        yield
