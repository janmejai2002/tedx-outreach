from fastapi import FastAPI, Depends, HTTPException, Query, Response, Header
from sqlmodel import Session, select, func
from database import create_db_and_tables, get_session, engine
from models import Speaker, SpeakerUpdate, OutreachStatus, AuditLog, AuthorizedUser, AuthorizedUserCreate, AuthorizedUserUpdate, BulkUpdate, Sponsor, SponsorUpdate, SponsorStatus, CreativeAsset, CreativeUpdate
from sqlalchemy import text
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
from typing import List, Optional
from contextlib import asynccontextmanager
import requests
import json
import os
import io
from pydantic import BaseModel
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables from .env file (local) or /etc/secrets/.env (Render)
load_dotenv()  # Load from local .env
load_dotenv('/etc/secrets/.env')  # Load from Render Secret Files if exists

from auth_utils import create_access_token, verify_token, verify_admin, get_current_user_name, ADMIN_ROLL

class LoginRequest(BaseModel):
    roll_number: str

class RefineRequest(BaseModel):
    current_draft: str
    instruction: str

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
    if is_postgres:
        run_step("ALTER TABLE authorizeduser ADD COLUMN IF NOT EXISTS role VARCHAR DEFAULT 'SPEAKER_OUTREACH'", "Add role to authorizeduser")
    else:
        run_step("ALTER TABLE authorizeduser ADD COLUMN role VARCHAR DEFAULT 'SPEAKER_OUTREACH'", "Add role to authorizeduser")

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
                    # Map CSV columns to Model
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

app = FastAPI(lifespan=lifespan)

# CORS Setup - Allow all origins for production
# Version: 2026-01-19 - CORS Fixed for Render
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,  # Must be False when using wildcard origins
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

@app.get("/healthz")
def health_check():
    return {"status": "healthy"}

@app.get("/authorized-users")
def get_authorized_users(session: Session = Depends(get_session), admin: dict = Depends(verify_admin)):
    return session.exec(select(AuthorizedUser)).all()

@app.get("/debug/env")
def debug_env(user: dict = Depends(verify_token)):
    """Debug endpoint to check if environment variables are loaded"""
    api_key = os.getenv('PERPLEXITY_API_KEY')
    return {
        "perplexity_key_loaded": bool(api_key),
        "key_length": len(api_key) if api_key else 0,
        "key_prefix": api_key[:10] + "..." if api_key else "NOT_SET"
    }

@app.post("/login")
def login(request: LoginRequest, session: Session = Depends(get_session)):
    roll = request.roll_number.lower().strip()
    user = session.exec(select(AuthorizedUser).where(AuthorizedUser.roll_number == roll)).first()
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized. Contact admin.")
    access_token = create_access_token(data={"sub": user.name, "roll": roll, "is_admin": user.is_admin, "role": user.role})
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "user_name": user.name,
        "roll_number": roll,
        "is_admin": user.is_admin,
        "role": user.role
    }

# Admin: Role Management
@app.patch("/users/{roll_number}")
def update_user_role(
    roll_number: str, 
    user_update: AuthorizedUserUpdate,
    session: Session = Depends(get_session),
    admin: dict = Depends(verify_admin)
):
    user = session.exec(select(AuthorizedUser).where(AuthorizedUser.roll_number == roll_number)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_data = user_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(user, key, value)
    
    session.add(user)
    session.commit()
    session.refresh(user)
    return user
# Task Assignment Endpoints
@app.post("/speakers/{speaker_id}/assign")
def assign_speaker(
    speaker_id: int,
    assigned_to: str,  # Roll number
    session: Session = Depends(get_session),
    user: dict = Depends(verify_token)
):
    """Assign a speaker to a team member"""
    speaker = session.get(Speaker, speaker_id)
    if not speaker:
        raise HTTPException(status_code=404, detail="Speaker not found")
    
    # Verify assigned_to user exists
    assignee = session.exec(
        select(AuthorizedUser).where(AuthorizedUser.roll_number == assigned_to)
    ).first()
    
    if not assignee:
        raise HTTPException(status_code=404, detail="Assignee not found")
    
    speaker.assigned_to = assigned_to
    speaker.assigned_by = user["roll_number"]
    speaker.assigned_at = datetime.now()
    speaker.last_activity = datetime.now()
    speaker.last_updated = datetime.now()
    
    session.add(speaker)
    session.commit()
    
    # Log the assignment
    log = AuditLog(
        user_name=user["username"],
        action="ASSIGN_SPEAKER",
        details=f"Assigned {speaker.name} to {assignee.name}",
        speaker_id=speaker_id
    )
    session.add(log)
    session.commit()
    
    return {"message": "Speaker assigned successfully", "assigned_to": assignee.name}

@app.post("/speakers/{speaker_id}/unassign")
def unassign_speaker(
    speaker_id: int,
    session: Session = Depends(get_session),
    user: dict = Depends(verify_token)
):
    """Remove assignment from a speaker"""
    speaker = session.get(Speaker, speaker_id)
    if not speaker:
        raise HTTPException(status_code=404, detail="Speaker not found")
    
    speaker.assigned_to = None
    speaker.assigned_by = None
    speaker.assigned_at = None
    speaker.last_activity = datetime.now()
    speaker.last_updated = datetime.now()
    
    session.add(speaker)
    session.commit()
    
    # Log the unassignment
    log = AuditLog(
        user_name=user["username"],
        action="UNASSIGN_SPEAKER",
        details=f"Unassigned {speaker.name}",
        speaker_id=speaker_id
    )
    session.add(log)
    session.commit()
    
    return {"message": "Speaker unassigned successfully"}

# Admin endpoints for managing authorized users
@app.get("/admin/users", response_model=List[AuthorizedUser])
def get_authorized_users(
    session: Session = Depends(get_session),
    admin: dict = Depends(verify_admin)
):
    """Get all authorized users (admin only)"""
    users = session.exec(select(AuthorizedUser)).all()
    return users

@app.post("/admin/users")
def add_authorized_user(
    user_data: AuthorizedUserCreate,
    session: Session = Depends(get_session),
    admin: dict = Depends(verify_admin)
):
    """Add a new authorized user (admin only)"""
    # Check if user already exists
    existing = session.exec(
        select(AuthorizedUser).where(AuthorizedUser.roll_number == user_data.roll_number.lower().strip())
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="User already authorized")
    
    new_user = AuthorizedUser(
        roll_number=user_data.roll_number.lower().strip(),
        name=user_data.name,
        is_admin=user_data.is_admin,
        added_by=admin["username"]
    )
    
    session.add(new_user)
    session.commit()
    session.refresh(new_user)
    
    # Log the action
    log = AuditLog(
        user_name=admin["username"],
        action="ADD_USER",
        details=f"Added {new_user.name} ({new_user.roll_number})"
    )
    session.add(log)
    session.commit()
    
    return {"message": "User added successfully", "user": new_user}

@app.post("/admin/purge-invalid")
def purge_invalid_data(
    session: Session = Depends(get_session),
    admin: dict = Depends(verify_admin)
):
    """Delete corrupted junk cards and fix 'NaN' assignments (Admin only)"""
    # 1. Delete actual junk cards (where name is NaN, None or empty)
    junk_speakers = session.exec(
        select(Speaker).where(
            (Speaker.name == 'NaN') | 
            (Speaker.name == 'nan') |
            (Speaker.name == '') | 
            (Speaker.name == 'None') |
            (Speaker.name == 'unknown') |
            (Speaker.name == 'Unknown')
        )
    ).all()
    
    del_count = 0
    for s in junk_speakers:
        session.delete(s)
        del_count += 1
    
    # 2. Fix corrupted assignments (where assigned_to survived as 'NaN' string)
    corrupted_assignments = session.exec(
        select(Speaker).where(
            (Speaker.assigned_to == 'NaN') |
            (Speaker.assigned_to == 'nan') |
            (Speaker.assigned_to == 'None')
        )
    ).all()
    
    fix_count = 0
    for s in corrupted_assignments:
        s.assigned_to = None
        s.assigned_by = None
        s.assigned_at = None
        session.add(s)
        fix_count += 1
    
    session.commit()
    return {
        "message": f"Operation complete. Purged {del_count} junk cards and reset {fix_count} corrupted assignments.",
        "purged": del_count,
        "fixed": fix_count
    }

@app.delete("/admin/users/{roll_number}")
def remove_authorized_user(
    roll_number: str,
    session: Session = Depends(get_session),
    admin: dict = Depends(verify_admin)
):
    """Remove an authorized user (admin only)"""
    user = session.exec(
        select(AuthorizedUser).where(AuthorizedUser.roll_number == roll_number.lower().strip())
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prevent removing original admin if needed, or at least self
    if user.roll_number == admin["roll_number"]:
        raise HTTPException(status_code=400, detail="Cannot remove yourself")
    
    session.delete(user)
    session.commit()
    
    # Log the action
    log = AuditLog(
        user_name=admin["username"],
        action="REMOVE_USER",
        details=f"Removed {user.name} ({user.roll_number})"
    )
    session.add(log)
    session.commit()
    
    return {"message": "User removed successfully"}

@app.get("/speakers", response_model=List[Speaker])
def read_speakers(
    session: Session = Depends(get_session),
    status: Optional[str] = None,
    limit: int = 300,
    offset: int = 0,
    user: dict = Depends(verify_token),
    # Assignment filters
    assigned_to: Optional[str] = None,
    unassigned: bool = False,
    assigned_to_me: bool = False,
    search: Optional[str] = None
):
    query = select(Speaker)
    
    if status:
        query = query.where(Speaker.status == status)
    
    if assigned_to:
        query = query.where(Speaker.assigned_to == assigned_to)
    
    if unassigned:
        query = query.where(Speaker.assigned_to == None)
        
    if assigned_to_me:
        query = query.where(Speaker.assigned_to == user["roll_number"])

    if search:
        search_term = f"%{search}%"
        query = query.where(
            (Speaker.name.ilike(search_term)) |
            (Speaker.primary_domain.ilike(search_term)) |
            (Speaker.location.ilike(search_term))
        )
    
    # Order by last update
    query = query.order_by(Speaker.last_updated.desc())
    
    query = query.offset(offset).limit(limit)
    speakers = session.exec(query).all()
    return speakers

@app.post("/speakers", response_model=Speaker)
def create_speaker(
    speaker: Speaker, 
    session: Session = Depends(get_session), 
    user_name: str = Depends(get_current_user_name)
):
    session.add(speaker)
    session.commit()
    session.refresh(speaker)
    
    # Audit Log
    if user_name:
        log = AuditLog(
            user_name=user_name,
            action="ADD",
            details=f"Added speaker {speaker.name} to {speaker.status.value}",
            speaker_id=speaker.id
        )
        session.add(log)
        session.commit()

    return speaker

@app.get("/speakers/{speaker_id}", response_model=Speaker)
def read_speaker(speaker_id: int, session: Session = Depends(get_session)):
    speaker = session.get(Speaker, speaker_id)
    if not speaker:
        raise HTTPException(status_code=404, detail="Speaker not found")
    return speaker

@app.patch("/speakers/bulk")
def bulk_update_speakers(
    update_data: BulkUpdate,
    session: Session = Depends(get_session),
    user_name: str = Depends(get_current_user_name)
):
    """Update multiple speakers at once"""
    count = 0
    skipped = 0
    for speaker_id in update_data.ids:
        db_speaker = session.get(Speaker, speaker_id)
        if not db_speaker:
            continue
            
        update_dict = update_data.model_dump(exclude_unset=True)
        modified = False
        
        if 'status' in update_dict:
            new_status = update_dict['status']
            # Verification: If moving to EMAIL_ADDED or beyond, must have an email OR phone
            if new_status != OutreachStatus.SCOUTED and not (db_speaker.email or db_speaker.phone):
                skipped += 1
                continue
            db_speaker.status = new_status
            modified = True
            
        if 'assigned_to' in update_dict:
            # Handle string "null" from frontend if it happens
            target = update_dict['assigned_to']
            if target == "null" or target is None:
                db_speaker.assigned_to = None
                db_speaker.assigned_by = None
                db_speaker.assigned_at = None
            elif str(target).lower() == 'nan':
                # Skip NaN assignments strictly
                pass
            else:
                db_speaker.assigned_to = target
                db_speaker.assigned_by = user_name
                db_speaker.assigned_at = func.now()
            modified = True
            
        if 'is_bounty' in update_dict:
            db_speaker.is_bounty = update_dict['is_bounty']
            modified = True
            
        if modified:
            db_speaker.last_updated = func.now()
            session.add(db_speaker)
            count += 1
            
    session.commit()
    
    # Log the bulk action
    if count > 0:
        log = AuditLog(
            user_name=user_name,
            action="BULK_UPDATE",
            details=f"Updated {count} speakers (Skipped {skipped} due to missing email)"
        )
        session.add(log)
        session.commit()
        
    return {
        "message": f"Successfully updated {count} speakers. Skipped {skipped} lacking email.", 
        "count": count,
        "skipped": skipped
    }

@app.delete("/speakers/bulk")
def bulk_delete_speakers(
    delete_data: BulkUpdate, # Reusing BulkUpdate because it just contains a list of IDs
    session: Session = Depends(get_session),
    user_name: str = Depends(get_current_user_name),
    admin: dict = Depends(verify_admin)
):
    """Delete multiple speakers at once (Admin Only)"""
    count = 0
    for speaker_id in delete_data.ids:
        db_speaker = session.get(Speaker, speaker_id)
        if db_speaker:
            session.delete(db_speaker)
            count += 1
            
    session.commit()
    
    if count > 0:
        log = AuditLog(
            user_name=user_name,
            action="BULK_DELETE",
            details=f"Deleted {count} speakers (IDs: {delete_data.ids[:5]}...)"
        )
        session.add(log)
        session.commit()
        
    return {"message": f"Successfully deleted {count} speakers", "count": count}

@app.patch("/speakers/{speaker_id}", response_model=Speaker)
def update_speaker(
    speaker_id: int, 
    speaker_update: SpeakerUpdate, 
    session: Session = Depends(get_session), 
    user_name: str = Depends(get_current_user_name)
):
    db_speaker = session.get(Speaker, speaker_id)
    if not db_speaker:
        raise HTTPException(status_code=404, detail="Speaker not found")
    
    old_status = db_speaker.status
    speaker_data = speaker_update.model_dump(exclude_unset=True)
    
    # Update temporary object to check final state
    temp_status = speaker_data.get('status', db_speaker.status)
    temp_email = speaker_data.get('email', db_speaker.email)
    temp_phone = speaker_data.get('phone', db_speaker.phone)
    
    # Verification: Progressing beyond SCOUTED requires some contact info
    if temp_status != OutreachStatus.SCOUTED and not (temp_email or temp_phone):
        raise HTTPException(
            status_code=400, 
            detail="Forbidden: Cannot progress beyond 'Scouted' without an Email or Phone. Please add contact information first."
        )

    # AUTO-MOVE LOGIC: Move to EMAIL_ADDED if info provided while in SCOUTED
    if db_speaker.status == OutreachStatus.SCOUTED and (temp_email or temp_phone) and 'status' not in speaker_data:
        db_speaker.status = OutreachStatus.EMAIL_ADDED
        print(f"Auto-moving {db_speaker.name} to EMAIL_ADDED")

    for key, value in speaker_data.items():
        setattr(db_speaker, key, value)
        
    db_speaker.last_updated = func.now()
    session.add(db_speaker)
    
    # Audit Log
    if user_name:
        action = "UPDATE"
        details = f"Updated profile for {db_speaker.name}"
        
        # Check specific important changes
        if 'status' in speaker_data and old_status != db_speaker.status:
            action = "MOVE"
            details = f"Moved {db_speaker.name} to {db_speaker.status.value}"
        elif 'is_bounty' in speaker_data:
            action = "BOUNTY"
            status_str = "Marked" if db_speaker.is_bounty else "Unmarked"
            details = f"{status_str} {db_speaker.name} as Bounty"
            
        log = AuditLog(
            user_name=user_name,
            action=action,
            details=details,
            speaker_id=speaker_id
        )
        session.add(log)
    
    session.commit()
    session.refresh(db_speaker)
    return db_speaker



@app.post("/generate-email")
def generate_email(
    speaker_id: int, 
    session: Session = Depends(get_session),
    user: dict = Depends(verify_token)
):
    speaker = session.get(Speaker, speaker_id)
    if not speaker:
        raise HTTPException(status_code=404, detail="Speaker not found")

    api_key = os.getenv('PERPLEXITY_API_KEY')
    if not api_key:
        raise HTTPException(
            status_code=500, 
            detail="PERPLEXITY_API_KEY missing. Please set it in Render environment variables."
        )

    url = "https://api.perplexity.ai/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    prompt = f"""
    Write a world-class, highly personalized email invitation for a prospective TEDx speaker.
    THE MISSION: Convince {speaker.name} (Expert in {speaker.primary_domain}) that they are the essential missing piece for our upcoming event.

    Speaker Context:
    - Name: {speaker.name}
    - Field/Domain: {speaker.primary_domain}
    - The "Blurring Lines" Angle: {speaker.blurring_line_angle or 'Their unique ability to bridge disparate fields'}
    
    Event Context:
    - Event: TEDxXLRI 2026
    - Theme: "Blurring Lines"
    - Date: 20th February 2026
    - Theme Philosophy: We are exploring the intersections where rigid boundaries dissolve—between technology and art, logic and emotion, tradition and innovation.
    - Extra info: The invite should get their expression of interest to be a speaker 
    
    Return explicitly JSON with these keys:
    - "subject": A catchy subject line (e.g., "TEDx Invitation: {speaker.name} + Blurring Lines")
    - "body_text": Plain text version
    - "body_html": Full HTML string with inline CSS. Use TED Red (#e62b1e) for accents.
    
    Output Format: No talk, no markdown blocks. Just raw JSON.
    """

    payload = {
        "model": "sonar",
        "messages": [
            {"role": "system", "content": "You are a helpful assistant that writes perfect JSON email drafts."},
            {"role": "user", "content": prompt}
        ]
    }

    try:
        response = requests.post(url, json=payload, headers=headers)
        if not response.ok:
            error_detail = f"Perplexity API Error: {response.status_code} - {response.text}"
            raise HTTPException(status_code=500, detail=error_detail)
        
        result = response.json()
        content = result['choices'][0]['message']['content']
        
        # More robust JSON extraction
        try:
            start = content.find('{')
            end = content.rfind('}') + 1
            if start != -1 and end != 0:
                clean_content = content[start:end]
            else:
                clean_content = content
            
            email_data = json.loads(clean_content)
        except:
            clean_content = content.replace('```json', '').replace('```', '').strip()
            email_data = json.loads(clean_content)
        
        # Save draft to DB
        speaker.email_draft = json.dumps(email_data)
        speaker.status = OutreachStatus.DRAFTED
        session.add(speaker)
        session.commit()
        
        return email_data
    except Exception as e:
        error_msg = f"AI Generation Error: {str(e)}"
        print(error_msg)
        raise HTTPException(status_code=500, detail=error_msg)

@app.get("/speakers/{speaker_id}/ai-prompt")
def get_ai_prompt(speaker_id: int, session: Session = Depends(get_session)):
    """Returns a pre-configured prompt that users can copy-paste into ChatGPT/Gemini"""
    speaker = session.get(Speaker, speaker_id)
    if not speaker:
        raise HTTPException(status_code=404, detail="Speaker not found")
        
    prompt = f"""Write a professional TEDx speaker invitation for:
Name: {speaker.name}
Domain: {speaker.primary_domain}
Angle: {speaker.blurring_line_angle}

Event: TEDxXLRI 2026
Theme: Blurring Lines
Date: 20th Feb 2026

Requirements:
1. Personalized bridge between their work and the 'Blurring Lines' theme.
2. Formatted with <h1> for title and <p> for body.
3. TED Colors (Red/White/Black).
4. Tone: Intellectual, inviting, and high-prestige."""

    return {"prompt": prompt}

@app.post("/refine-email")
def refine_email(
    request: RefineRequest,
    user: dict = Depends(verify_token)
):
    # Real AI Refinement via Perplexity
    url = "https://api.perplexity.ai/chat/completions"
    headers = {
        "Authorization": f"Bearer {os.getenv('PERPLEXITY_API_KEY')}",
        "Content-Type": "application/json"
    }
    
    prompt = f"""
    Update this email draft based on the user's instruction.
    
    Current Draft (JSON):
    {request.current_draft}
    
    Instruction: "{request.instruction}"
    
    Output Format:
    Return explicitly JSON with 3 keys: "subject", "body_text", "body_html". Do not include markdown blocks.
    Keep the "20th February 2026" date and HTML styling unless asked to change.
    """

    payload = {
        "model": "sonar",
        "messages": [
            {"role": "system", "content": "You are a helpful assistant that edits JSON email drafts."},
            {"role": "user", "content": prompt}
        ]
    }

    try:
        response = requests.post(url, json=payload, headers=headers)
        if not response.ok:
            print(f"API Error Details: {response.text}")
        response.raise_for_status()
        result = response.json()
        content = result['choices'][0]['message']['content']
        
        clean_content = content.replace('```json', '').replace('```', '').strip()
        email_data = json.loads(clean_content)
        
        return email_data
    except Exception as e:
        print(f"AI Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/export/csv")
def export_csv(session: Session = Depends(get_session)):
    query = select(Speaker)
    speakers = session.exec(query).all()
    
    # Convert to DataFrame
    data = [s.model_dump() for s in speakers]
    df = pd.DataFrame(data)
    
    # Create CSV in memory
    stream = io.StringIO()
    df.to_csv(stream, index=False)
    response = Response(content=stream.getvalue(), media_type="text/csv")
    response.headers["Content-Disposition"] = "attachment; filename=tedx_outreach_export.csv"
    return response
    return response

@app.get("/logs", response_model=List[AuditLog])
def read_logs(
    limit: int = 50, 
    session: Session = Depends(get_session),
    user: dict = Depends(verify_token)
):
    query = select(AuditLog).order_by(AuditLog.timestamp.desc()).limit(limit)
    return session.exec(query).all()

@app.get("/speakers/{speaker_id}/logs", response_model=List[AuditLog])
def get_speaker_logs(
    speaker_id: int,
    session: Session = Depends(get_session),
    user: dict = Depends(verify_token)
):
    """Get history for a specific speaker"""
    query = select(AuditLog).where(AuditLog.speaker_id == speaker_id).order_by(AuditLog.timestamp.desc())
    return session.exec(query).all()
@app.get("/sponsors", response_model=List[Sponsor])
def get_sponsors(
    session: Session = Depends(get_session),
    assigned_to_me: bool = Query(False),
    status: Optional[str] = None
):
    statement = select(Sponsor)
    if status:
        statement = statement.where(Sponsor.status == status)
    results = session.exec(statement).all()
    return results

@app.post("/sponsors", response_model=Sponsor)
def create_sponsor(sponsor: Sponsor, session: Session = Depends(get_session)):
    session.add(sponsor)
    session.commit()
    session.refresh(sponsor)
    return sponsor

@app.patch("/sponsors/{sponsor_id}", response_model=Sponsor)
def update_sponsor(
    sponsor_id: int, 
    sponsor_update: SponsorUpdate, 
    session: Session = Depends(get_session),
    user_name: str = Depends(get_current_user_name)
):
    db_sponsor = session.get(Sponsor, sponsor_id)
    if not db_sponsor:
        raise HTTPException(status_code=404, detail="Sponsor not found")
    
    update_data = sponsor_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_sponsor, key, value)
    
    db_sponsor.last_updated = func.now()
    session.add(db_sponsor)
    session.commit()
    session.refresh(db_sponsor)
    return db_sponsor

@app.delete("/sponsors/{sponsor_id}")
def delete_sponsor(sponsor_id: int, session: Session = Depends(get_session)):
    db_sponsor = session.get(Sponsor, sponsor_id)
    if not db_sponsor:
        raise HTTPException(status_code=404, detail="Sponsor not found")
    session.delete(db_sponsor)
    session.commit()
    return {"message": "Sponsor deleted"}

@app.post("/generate-sponsor-email")
def generate_sponsor_email(
    sponsor_id: int, 
    session: Session = Depends(get_session)
):
    sponsor = session.get(Sponsor, sponsor_id)
    if not sponsor:
        raise HTTPException(status_code=404, detail="Sponsor not found")

    api_key = os.getenv("PERPLEXITY_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Perplexity API key not configured")

    url = "https://api.perplexity.ai/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    prompt = f"""Create a Strategic Partnership Kit for:
Company: {sponsor.company_name}
Industry: {sponsor.industry}
Target Tier: {sponsor.partnership_tier or 'Premium Partner'}

Theme: 'Blurring Lines' (TEDxXLRI 2026)
More details: Ask for expression of interest tobe a potential sponsor at TEDxXLRI New Delhi

Generate three distinct outreach assets in a single JSON:
1. "email": A professional partnership pitch (HTML).
2. "inmail": A concise, high-impact LinkedIn message focused on networking.
3. "one_pager": A value-proposition summary (HTML) highlighting ROI, Brand Visibility, and Direct Audience Access.

Output ONLY a JSON object with this structure:
{{
  "email": {{ "subject": "...", "body_html": "..." }},
  "inmail": {{ "body": "..." }},
  "one_pager": {{ "title": "Strategic Value Summary", "body_html": "..." }}
}}"""

    payload = {
        "model": "llama-3-sonar-small-32k-online",
        "messages": [
            {"role": "system", "content": "You are a professional corporate relations head for TEDxXLRI."},
            {"role": "user", "content": prompt}
        ]
    }

    try:
        response = requests.post(url, json=payload, headers=headers)
        result = response.json()
        content = result['choices'][0]['message']['content']
        
        # Robust JSON extraction
        start = content.find('{')
        end = content.rfind('}') + 1
        kit_data = json.loads(content[start:end])
        
        sponsor.email_draft = json.dumps(kit_data)
        sponsor.status = SponsorStatus.PITCHED
        session.add(sponsor)
        session.commit()
        
        return kit_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Creative Asset Endpoints
@app.get("/creatives")
def get_creatives(
    assigned_to_me: bool = False,
    session: Session = Depends(get_session),
    user: dict = Depends(verify_token)
):
    statement = select(CreativeAsset)
    if assigned_to_me:
        statement = statement.where(CreativeAsset.assigned_to == user['roll'])
    
    assets = session.exec(statement.order_by(CreativeAsset.id)).all()
    return assets

@app.post("/creatives")
def create_creative(
    asset: CreativeAsset,
    session: Session = Depends(get_session),
    user: dict = Depends(verify_token)
):
    asset.assigned_by = user['sub']
    session.add(asset)
    session.commit()
    session.refresh(asset)
    return asset

@app.patch("/creatives/{asset_id}")
def update_creative(
    asset_id: int,
    asset_update: CreativeUpdate,
    session: Session = Depends(get_session),
    user: dict = Depends(verify_token)
):
    db_asset = session.get(CreativeAsset, asset_id)
    if not db_asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    update_data = asset_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_asset, key, value)
    
    db_asset.last_updated = func.now()
    session.add(db_asset)
    session.commit()
    session.refresh(db_asset)
    return db_asset

@app.delete("/creatives/{asset_id}")
def delete_creative(asset_id: int, session: Session = Depends(get_session)):
    db_asset = session.get(CreativeAsset, asset_id)
    if not db_asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    session.delete(db_asset)
    session.commit()
    return {"message": "Creative asset deleted"}

@app.post("/generate-creative-brief")
def generate_creative_brief(
    asset_id: int,
    session: Session = Depends(get_session)
):
    asset = session.get(CreativeAsset, asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    api_key = os.getenv("PERPLEXITY_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Perplexity API key not configured")

    url = "https://api.perplexity.ai/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    prompt = f"""Create a Production Brief for:
Asset: {asset.title}
Type: {asset.asset_type}
Description: {asset.description or 'A creative piece for TEDxXLRI 2026'}

Theme: 'Blurring Lines'

Generate a detailed creative brief in a single JSON:
1. "brief_html": A professional creative brief with Production Goals, Visual Style, and Messaging.
2. "shot_list_html": A suggested list of shots or design elements in HTML format.
3. "mood_html": Description of colors, lighting, and vibe in HTML format.

Output ONLY a JSON object with this structure:
{{
  "brief_html": "...",
  "shot_list_html": "...",
  "mood_html": "..."
}}"""

    payload = {
        "model": "llama-3-sonar-small-32k-online",
        "messages": [
            {"role": "system", "content": "You are a creative director for TEDxXLRI."},
            {"role": "user", "content": prompt}
        ]
    }

    try:
        response = requests.post(url, json=payload, headers=headers)
        result = response.json()
        content = result['choices'][0]['message']['content']
        
        start = content.find('{')
        end = content.rfind('}') + 1
        brief_data = json.loads(content[start:end])
        
        asset.creative_brief = json.dumps(brief_data)
        asset.status = CreativeStatus.SCRIPTING
        session.add(asset)
        session.commit()
        
        return brief_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
