from fastapi import FastAPI, Depends, HTTPException, Query, Response, Header
from sqlmodel import Session, select
from database import create_db_and_tables, engine 
from models import Speaker, Sponsor, SponsorStatus, AuthorizedUser
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# Import Routers
from routers import auth, admin, speakers, gamification, sponsors, creatives, ai, meta

# Load environment variables
load_dotenv()
load_dotenv('/etc/secrets/.env')

def auto_migrate():
    """Adds missing columns automatically with robust transaction handling for Render/Postgres"""
    print("🔄 Running auto-migrations...")
    from sqlalchemy import text
    
    def run_step(sql, label):
        # Use a fresh connection for each step to prevent transaction abortion from spreading
        with engine.connect() as conn:
            try:
                conn.execute(text(sql))
                conn.commit()
                print(f"  ✓ {label}")
            except Exception as e:
                # Ignore "already exists" errors
                err_str = str(e).lower()
                if "already exists" in err_str or "duplicate column" in err_str:
                    return
                print(f"  ⚠ Note on {label}: {e}")

    is_postgres = "postgresql" in str(engine.url)
    
    # Speaker Table
    speaker_cols = [
        ("assigned_to", "VARCHAR"),
        ("assigned_by", "VARCHAR"),
        ("assigned_at", "TIMESTAMP"),
        ("priority", "VARCHAR DEFAULT 'MEDIUM'"),
        ("due_date", "TIMESTAMP"),
        ("tags", "VARCHAR"),
        ("phone", "VARCHAR"),
        ("remarks", "VARCHAR"),
        ("last_activity", "TIMESTAMP")
    ]
    
    for col, col_type in speaker_cols:
        if is_postgres:
            run_step(f"ALTER TABLE speaker ADD COLUMN IF NOT EXISTS {col} {col_type}", f"Add {col} to speaker")
        else:
            run_step(f"ALTER TABLE speaker ADD COLUMN {col} {col_type}", f"Add {col} to speaker")

    # AuditLog Table
    if is_postgres:
        run_step("ALTER TABLE auditlog ADD COLUMN IF NOT EXISTS speaker_id INTEGER", "Add speaker_id to auditlog")
    else:
        run_step("ALTER TABLE auditlog ADD COLUMN speaker_id INTEGER", "Add speaker_id to auditlog")

    # AuthorizedUser Table
    user_cols = [
        ("role", "VARCHAR DEFAULT 'SPEAKER_OUTREACH'"),
        ("xp", "INTEGER DEFAULT 0"),
        ("streak", "INTEGER DEFAULT 0"),
        ("last_login_date", "VARCHAR")
    ]
    for col, col_type in user_cols:
        if is_postgres:
            run_step(f"ALTER TABLE authorizeduser ADD COLUMN IF NOT EXISTS {col} {col_type}", f"Add {col} to authorizeduser")
        else:
            run_step(f"ALTER TABLE authorizeduser ADD COLUMN {col} {col_type}", f"Add {col} to authorizeduser")

@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    auto_migrate()
    # Import CSV if DB is empty
    with Session(engine) as session:
        statement = select(Speaker)
        results = session.exec(statement).first()
        if not results:
            print("Importing data from CSV...")
            try:
                # Read CSV - Adjust path as needed
                file_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "TEDxXLRI_Master_Speaker_List.csv")
                df = pd.read_csv(file_path)
                
                # Iterate and save
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
            except Exception as e:
                print(f"Error importing CSV: {e}")
        
        # Initialize Authorized Users if empty
        user_check = session.exec(select(AuthorizedUser)).first()
        if not user_check:
            print("Initializing authorized users...")
            from migrate_users import INITIAL_USERS
            for roll, (name, is_admin) in INITIAL_USERS.items():
                user = AuthorizedUser(
                    roll_number=roll,
                    name=name,
                    is_admin=is_admin,
                    added_by="system"
                )
                session.add(user)
            session.commit()
            print("Authorized users initialized.")

        # Seed Sponsors if empty
        if session.exec(select(Sponsor)).first() is None:
            print("🌱 Seeding initial sponsors...")
            sponsors = [
                Sponsor(company_name="Google India", industry="Tech", partnership_tier="Platinum", target_amount=1500000, status=SponsorStatus.PROSPECT),
                Sponsor(company_name="Tata Motors", industry="Automotive", partnership_tier="Title", target_amount=2500000, status=SponsorStatus.PROSPECT),
                Sponsor(company_name="Red Bull", industry="Beverage", partnership_tier="Platinum", target_amount=1200000, status=SponsorStatus.CONTACTED),
                Sponsor(company_name="Zomato", industry="FoodTech", partnership_tier="Gold", target_amount=800000, status=SponsorStatus.NEGOTIATING),
                Sponsor(company_name="Unacademy", industry="EdTech", partnership_tier="Gold", target_amount=1000000, status=SponsorStatus.PITCHED),
                Sponsor(company_name="HDFC Bank", industry="Banking", partnership_tier="Gold", target_amount=1500000, status=SponsorStatus.PROSPECT),
                Sponsor(company_name="Adobe", industry="Software", partnership_tier="Platinum", target_amount=1200000, status=SponsorStatus.PROSPECT),
            ]
            for s in sponsors:
                session.add(s)
            session.commit()
            print("✅ Sponsors seeded.")
    yield

# Initialize Limiter
limiter = Limiter(key_func=get_remote_address)
app = FastAPI(lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS configuration
origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://tedx-outreach.onrender.com",
    "https://tedxoutreach.onrender.com"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request Size Limit Middleware
@app.middleware("http")
async def limit_request_size(request, call_next):
    if request.method in ["POST", "PATCH", "PUT"]:
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > 1 * 1024 * 1024:  # 1MB
            raise HTTPException(status_code=413, detail="Request entity too large")
    response = await call_next(request)
    return response

@app.get("/healthz")
def health_check():
    return {"status": "healthy"}

# Include Routers
app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(speakers.router)
app.include_router(gamification.router)
app.include_router(sponsors.router)
app.include_router(creatives.router)
app.include_router(ai.router)
app.include_router(meta.router)
