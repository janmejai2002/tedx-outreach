"""
Migration script to initialize authorized users table with existing users
Run this once to migrate from hardcoded users to database
"""

from sqlmodel import Session, create_engine, select
from models import AuthorizedUser
import os

# Database URL
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///database.db")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)

# Initial authorized users (from the old AUTHORIZED_USERS dict)
INITIAL_USERS = {
    "b25380": ("Abhishek Tiwari", False),
    "b25474": ("Sarah Dhamija", False),
    "b25305": ("Isha Manilal Solanki", False),
    "b25327": ("Faria Choudhry", False),
    "v25017": ("Manojna Eadala", False),
    "b25434": ("Sanjeet Shrivastava", False),
    "b25470": ("Lavanya Krishan Sharma", False),
    "b25392": ("Shauryadeep Lall", False),
    "b25347": ("Chaitanya Sharma", False),
    "b25328": ("Kishlay Kishore", False),
    "b25440": ("Yashas Tarakaram", False),
    "b25316": ("Saraswat Majumder", False),
    "b25472": ("Pratik Gandhi", False),
    "b25416": ("Suyog Sachin Shah", False),
    "b25359": ("Harshit Kumar", False),
    "b25349": ("Janmejai", True),  # Admin
}

def migrate_users():
    with Session(engine) as session:
        # Check if users already exist
        existing_count = len(session.exec(select(AuthorizedUser)).all())
        
        if existing_count > 0:
            print(f"✅ Database already has {existing_count} users. Skipping migration.")
            return
        
        print("🔄 Migrating users to database...")
        
        for roll_number, (name, is_admin) in INITIAL_USERS.items():
            user = AuthorizedUser(
                roll_number=roll_number,
                name=name,
                is_admin=is_admin,
                added_by="system_migration"
            )
            session.add(user)
            print(f"  ✓ Added {name} ({roll_number})" + (" [ADMIN]" if is_admin else ""))
        
        session.commit()
        print(f"\n✅ Successfully migrated {len(INITIAL_USERS)} users!")

if __name__ == "__main__":
    migrate_users()
