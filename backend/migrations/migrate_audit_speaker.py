import os
import sqlite3
import psycopg2
from dotenv import load_dotenv

load_dotenv()
load_dotenv('/etc/secrets/.env')

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///database.db")

def migrate():
    print(f"🔄 Running migration: Add speaker_id to AuditLog")
    
    if "postgresql" in DATABASE_URL or DATABASE_URL.startswith("postgres://"):
        # Postgres migration
        url = DATABASE_URL
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql://", 1)
        
        try:
            conn = psycopg2.connect(url)
            cur = conn.cursor()
            cur.execute("ALTER TABLE auditlog ADD COLUMN IF NOT EXISTS speaker_id INTEGER;")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_auditlog_speaker_id ON auditlog(speaker_id);")
            conn.commit()
            cur.close()
            conn.close()
            print("✅ Postgres migration successful")
        except Exception as e:
            print(f"❌ Postgres migration failed: {e}")
    else:
        # SQLite migration
        db_path = DATABASE_URL.replace("sqlite:///", "")
        try:
            conn = sqlite3.connect(db_path)
            cur = conn.cursor()
            try:
                cur.execute("ALTER TABLE auditlog ADD COLUMN speaker_id INTEGER;")
                cur.execute("CREATE INDEX idx_auditlog_speaker_id ON auditlog(speaker_id);")
            except sqlite3.OperationalError:
                print("⚠️ Column speaker_id might already exist, skipping...")
            conn.commit()
            conn.close()
            print("✅ SQLite migration successful")
        except Exception as e:
            print(f"❌ SQLite migration failed: {e}")

if __name__ == "__main__":
    migrate()
