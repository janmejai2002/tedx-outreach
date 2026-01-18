from sqlmodel import SQLModel, create_engine
from models import AuditLog
import sqlite3

# Define DB URL (Make sure this matches main.py)
sqlite_file_name = "database.db"
sqlite_url = f"sqlite:///{sqlite_file_name}"

def migrate():
    print("Migrating database to include AuditLog...")
    
    # Connect directly to SQLite to check/add table
    conn = sqlite3.connect(sqlite_file_name)
    cursor = conn.cursor()
    
    # Check if table exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='auditlog'")
    if cursor.fetchone():
        print("AuditLog table already exists.")
    else:
        print("Creating AuditLog table...")
        # Use SQLModel to create the table
        engine = create_engine(sqlite_url)
        SQLModel.metadata.create_all(engine)
        print("AuditLog table created.")
        
    conn.close()

if __name__ == "__main__":
    migrate()
