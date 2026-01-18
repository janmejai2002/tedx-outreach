import sqlite3

def migrate():
    try:
        conn = sqlite3.connect('database.db')
        cursor = conn.cursor()
        cursor.execute("ALTER TABLE speaker ADD COLUMN is_bounty BOOLEAN DEFAULT 0")
        conn.commit()
        print("Migration successful: Added is_bounty column.")
    except Exception as e:
        print(f"Migration failed (maybe column exists?): {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
