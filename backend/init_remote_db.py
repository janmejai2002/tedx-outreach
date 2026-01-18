import os
from sqlmodel import SQLModel, create_engine, Session, select
from database import engine
from models import Speaker
import pandas as pd

def init_db():
    print("Connecting to remote database...")
    # SQLModel will use the engine which already looks at os.environ.get("DATABASE_URL")
    # But since we want to be sure, we can print the sanitized URL (hide password)
    url = str(engine.url)
    print(f"Target DB: {url.split('@')[-1]}")
    
    print("Creating tables...")
    SQLModel.metadata.create_all(engine)
    print("Tables created successfully.")

    # Check if empty and import CSV
    with Session(engine) as session:
        count = session.exec(select(Speaker)).first()
        if not count:
            print("DB is empty. Importing initial speaker list...")
            file_path = "TEDxXLRI_Master_Speaker_List.csv"
            if not os.path.exists(file_path):
                file_path = os.path.join("..", file_path)
            
            if os.path.exists(file_path):
                df = pd.read_csv(file_path)
                for _, row in df.iterrows():
                    speaker = Speaker(
                        original_id=str(row.get('S. No.', '')),
                        batch=str(row.get('Batch', '')),
                        name=str(row.get('Name', 'Unknown')),
                        primary_domain=str(row.get('Primary Domain', '')),
                        blurring_line_angle=str(row.get('Blurring Line Angle', '')),
                        location=str(row.get('Location', '')),
                        outreach_priority=str(row.get('Outreach Priority', 'Tier 3')),
                        contact_method=str(row.get('Contact Method', ''))
                    )
                    session.add(speaker)
                session.commit()
                print("Import completed.")
            else:
                print(f"Warning: {file_path} not found. Skipping import.")
        else:
            print("DB already has data. Skipping import.")

if __name__ == "__main__":
    init_db()
