import sqlite3
import os

DB_FILE = "sql_app.db"

def fix_database():
    if not os.path.exists(DB_FILE):
        print(f"❌ Database file {DB_FILE} not found in current directory.")
        print("Please make sure you are in the 'backend' directory.")
        return

    print(f"🔧 Checking database: {DB_FILE}...")
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()

    # 1. Check for payment_due_day in assets
    try:
        cursor.execute("SELECT payment_due_day FROM assets LIMIT 1")
        print("✅ Column 'payment_due_day' already exists in 'assets'.")
    except sqlite3.OperationalError:
        print("⚠️ Column 'payment_due_day' missing in 'assets'. Adding it...")
        try:
            cursor.execute("ALTER TABLE assets ADD COLUMN payment_due_day INTEGER DEFAULT NULL")
            conn.commit()
            print("✅ Added 'payment_due_day' column.")
        except Exception as e:
            print(f"❌ Failed to add column: {e}")

    # 2. Check for sub_category in assets (just in case)
    try:
        cursor.execute("SELECT sub_category FROM assets LIMIT 1")
        print("✅ Column 'sub_category' already exists in 'assets'.")
    except sqlite3.OperationalError:
        print("⚠️ Column 'sub_category' missing in 'assets'. Adding it...")
        try:
            cursor.execute("ALTER TABLE assets ADD COLUMN sub_category VARCHAR DEFAULT NULL")
            conn.commit()
            print("✅ Added 'sub_category' column.")
        except Exception as e:
            print(f"❌ Failed to add column: {e}")

    conn.close()
    print("🎉 Database fix complete! Please restart the application.")

if __name__ == "__main__":
    fix_database()
