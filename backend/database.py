import threading
from sqlalchemy import create_engine, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from . import profile_manager

# Protects the global engine / SessionLocal swap inside reconnect().
# Prevents a race between an in-flight APScheduler job and a Profile switch.
_reconnect_lock = threading.Lock()

# Dynamic Database URL
def get_engine():
    url = profile_manager.get_db_url()
    eng = create_engine(url, connect_args={"check_same_thread": False})

    # Enable WAL journal mode and NORMAL sync for better concurrency and
    # performance (prevents SQLITE_BUSY on concurrent reads + writes).
    @event.listens_for(eng, "connect")
    def set_wal_pragma(dbapi_conn, _):
        dbapi_conn.execute("PRAGMA journal_mode=WAL")
        dbapi_conn.execute("PRAGMA synchronous=NORMAL")

    return eng

engine = get_engine()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def reconnect():
    """Dispose existing engine and create new one based on current profile.

    Guarded by _reconnect_lock so concurrent calls (e.g. a Profile switch
    arriving while an APScheduler job is mid-flight) don't corrupt the
    global engine / SessionLocal references.
    """
    global engine, SessionLocal
    with _reconnect_lock:
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

