import sqlite3
import os

DB_FILES = ["sql_app.db"] # Add other profile DBs if they exist

def migrate_db(db_path):
    if not os.path.exists(db_path):
        print(f"Skipping {db_path} (not found)")
        return

    print(f"Migrating {db_path}...")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Add source column
        try:
            cursor.execute("ALTER TABLE assets ADD COLUMN source TEXT DEFAULT 'manual'")
            print("  Added 'source' column.")
        except sqlite3.OperationalError as e:
            if "duplicate column" in str(e):
                print("  'source' column already exists.")
            else:
                print(f"  Error adding 'source': {e}")

        # Add external_id column
        try:
            cursor.execute("ALTER TABLE assets ADD COLUMN external_id TEXT")
            print("  Added 'external_id' column.")
        except sqlite3.OperationalError as e:
            if "duplicate column" in str(e):
                print("  'external_id' column already exists.")
            else:
                print(f"  Error adding 'external_id': {e}")
                
        conn.commit()
    except Exception as e:
        print(f"Migration failed: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    # Find all sql_app_*.db files plus sql_app.db
    files = [f for f in os.listdir('.') if f.startswith('sql_app') and f.endswith('.db')]
    for db_file in files:
        migrate_db(db_file)
