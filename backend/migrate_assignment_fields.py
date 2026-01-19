"""
Add assignment and task management fields to Speaker table
Run this migration before starting the backend with new features
"""
from sqlmodel import Session, create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()
load_dotenv('/etc/secrets/.env')

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///tedx.db")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)

def migrate():
    print("🔄 Running migration: Add assignment fields to Speaker table...")
    
    with Session(engine) as session:
        # SQLite and PostgreSQL compatible migrations
        migrations = [
            ("assigned_to", "ALTER TABLE speaker ADD COLUMN assigned_to VARCHAR"),
            ("assigned_by", "ALTER TABLE speaker ADD COLUMN assigned_by VARCHAR"),
            ("assigned_at", "ALTER TABLE speaker ADD COLUMN assigned_at TIMESTAMP"),
            ("priority", "ALTER TABLE speaker ADD COLUMN priority VARCHAR DEFAULT 'MEDIUM'"),
            ("due_date", "ALTER TABLE speaker ADD COLUMN due_date TIMESTAMP"),
            ("tags", "ALTER TABLE speaker ADD COLUMN tags VARCHAR"),
            ("last_activity", "ALTER TABLE speaker ADD COLUMN last_activity TIMESTAMP")
        ]
        
        for field_name, migration_sql in migrations:
            try:
                session.exec(text(migration_sql))
                print(f"  ✓ Added column: {field_name}")
            except Exception as e:
                if "already exists" in str(e).lower() or "duplicate column" in str(e).lower():
                    print(f"  ⊙ Column already exists: {field_name}")
                else:
                    print(f"  ✗ Error adding {field_name}: {e}")
        
        session.commit()
        print("\n✅ Migration completed successfully!")
        print("\nNew features available:")
        print("  - Task assignment (assign speakers to team members)")
        print("  - Priority levels (LOW, MEDIUM, HIGH, URGENT)")
        print("  - Due dates for follow-ups")
        print("  - Tags for categorization")
        print("  - Activity tracking")

if __name__ == "__main__":
    migrate()
