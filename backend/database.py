import os
from sqlmodel import SQLModel, create_engine, Session

# Use DATABASE_URL env var if set (Production), else local SQLite
DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    sqlite_file_name = "database.db"
    DATABASE_URL = f"sqlite:///{sqlite_file_name}"
    connect_args = {"check_same_thread": False}
else:
    # Postgres adjustments (Render/Neon usually provide postgres:// but SQLAlchemy wants postgresql://)
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
    connect_args = {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
