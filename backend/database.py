from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from . import profile_manager

# Dynamic Database URL
def get_engine():
    url = profile_manager.get_db_url()
    return create_engine(url, connect_args={"check_same_thread": False})

engine = get_engine()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def reconnect():
    """Dispose existing engine and create new one based on current profile."""
    global engine, SessionLocal
    engine.dispose()
    engine = get_engine()
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    # Ensure tables exist for the new DB
    Base.metadata.create_all(bind=engine)

# Dependency
def get_db():
    # Always create a new session from the current SessionLocal
    # Reconnect should have updated SessionLocal if profile changed
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

