import sqlite3
import os
import sys

# Ensure we can import from local modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import engine, Base
from profile_manager import get_db_url, get_current_profile

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

    # 2. If Database Doesn't Exist -> Create it
    if not os.path.exists(db_path):
        print(f"⚠️ Database file not found.")
        print("🚀 Initializing new database with latest schema...")
        try:
            Base.metadata.create_all(bind=engine)
            print("✅ Database created successfully!")
            return # Fresh DB needs no patches
        except Exception as e:
            print(f"❌ Failed to create database: {e}")
            return

    # 3. If Database Exists -> Patch it
    print(f"🔧 Analyzing existing database schema...")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Check/Add 'payment_due_day'
    try:
        cursor.execute("SELECT payment_due_day FROM assets LIMIT 1")
        print("✅ Column 'payment_due_day' exists.")
    except sqlite3.OperationalError:
        print("⚠️ Missing 'payment_due_day'. Adding...")
        try:
            cursor.execute("ALTER TABLE assets ADD COLUMN payment_due_day INTEGER DEFAULT NULL")
            conn.commit()
            print("✅ Fixed: Added 'payment_due_day'.")
        except Exception as e:
            print(f"❌ Fix Failed: {e}")

    # Check/Add 'sub_category'
    try:
        cursor.execute("SELECT sub_category FROM assets LIMIT 1")
        print("✅ Column 'sub_category' exists.")
    except sqlite3.OperationalError:
        print("⚠️ Missing 'sub_category'. Adding...")
        try:
            cursor.execute("ALTER TABLE assets ADD COLUMN sub_category VARCHAR DEFAULT NULL")
            conn.commit()
            print("✅ Fixed: Added 'sub_category'.")
        except Exception as e:
            print(f"❌ Fix Failed: {e}")

    conn.close()
    print("🎉 Database verification complete! Please restart the application.")

if __name__ == "__main__":
    fix_database()
