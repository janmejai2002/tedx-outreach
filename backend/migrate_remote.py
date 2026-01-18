import os
import psycopg2
from urllib.parse import urlparse

def migrate_remote():
    # Use the Neon URL provided earlier
    db_url = "postgresql://neondb_owner:npg_eaUjt2uMZw5H@ep-autumn-glitter-a1lbi159-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
    
    print("Migrating Neon Database Schema...")
    
    try:
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()
        
        # Add missing columns to 'speaker' table
        print("Adding columns to 'speaker' table...")
        columns_to_add = [
            ("linkedin_url", "TEXT"),
            ("search_details", "TEXT")
        ]
        
        for col_name, col_type in columns_to_add:
            try:
                cur.execute(f"ALTER TABLE speaker ADD COLUMN {col_name} {col_type};")
                print(f"Added column: {col_name}")
            except psycopg2.Error as e:
                # 42701 is the code for 'column_already_exists'
                if e.pgcode == '42701':
                    print(f"Column {col_name} already exists, skipping.")
                    conn.rollback() # Rollback the error but continue
                else:
                    raise e
        
        conn.commit()
        print("Migration complete!")
        
    except Exception as e:
        print(f"Migration failed: {e}")
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    migrate_remote()
