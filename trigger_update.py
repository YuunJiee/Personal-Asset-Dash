from backend.database import SessionLocal
from backend.service import update_prices

db = SessionLocal()
print("Updating prices...")
update_prices(db)
print("Done.")
db.close()
