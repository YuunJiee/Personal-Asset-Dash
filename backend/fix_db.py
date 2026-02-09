import sqlite3
import os
import sys

# Get the directory containing this script (backend/)
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
# Get the project root (parent of backend/)
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)

# Add PROJECT_ROOT to sys.path so we can import 'backend' as a package
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

# Now import using the full package path
# This allows 'from . import profile_manager' in database.py to work
from backend.database import engine, Base
from backend.profile_manager import get_db_url, get_current_profile

def fix_database():
    # 1. Resolve DB Path using App Logic
    # This ensures we are looking at the EXACT same file the app uses
    current_profile = get_current_profile()
    db_url = get_db_url(current_profile)
    
    # Extract file path from sqlite URL (sqlite:////absolute/path/to/db)
    if db_url.startswith("sqlite:///"):
        db_path = db_url.replace("sqlite:///", "")
    else:
        print(f"❌ Unexpected DB URL format: {db_url}")
        return

    print(f"🎯 Target Database: {db_path}")

    # 2. Ensure Schema Exists (Create Missing Tables)
    print("🚀 Verifying schema (creating missing tables)...")
    try:
        Base.metadata.create_all(bind=engine)
        print("✅ Schema verification passed.")
    except Exception as e:
        print(f"❌ Schema verification failed: {e}")

    # 3. Patch Existing Tables (Add Missing Columns)
    print(f"🔧 Checking for missing columns...")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Check/Add 'payment_due_day'
    try:
        cursor.execute("SELECT payment_due_day FROM assets LIMIT 1")
        print("✅ Column 'payment_due_day' exists in 'assets'.")
    except sqlite3.OperationalError:
        print("⚠️ Missing 'payment_due_day' in 'assets'. Adding...")
        try:
            cursor.execute("ALTER TABLE assets ADD COLUMN payment_due_day INTEGER DEFAULT NULL")
            conn.commit()
            print("✅ Fixed: Added 'payment_due_day'.")
        except Exception as e:
            print(f"❌ Fix Failed: {e}")

    # Check/Add 'sub_category'
    try:
        cursor.execute("SELECT sub_category FROM assets LIMIT 1")
        print("✅ Column 'sub_category' exists in 'assets'.")
    except sqlite3.OperationalError:
        print("⚠️ Missing 'sub_category' in 'assets'. Adding...")
        try:
            cursor.execute("ALTER TABLE assets ADD COLUMN sub_category VARCHAR DEFAULT NULL")
            conn.commit()
            print("✅ Fixed: Added 'sub_category'.")
        except Exception as e:
            print(f"❌ Fix Failed: {e}")
            
    # Verify crypto_connections table explicitly
    try:
        cursor.execute("SELECT count(*) FROM crypto_connections")
        print("✅ Table 'crypto_connections' verified.")
    except Exception as e:
        print(f"❌ Table 'crypto_connections' check failed: {e}")

    conn.close()
    print("🎉 Database verification complete! Please restart the application.")

if __name__ == "__main__":
    fix_database()
