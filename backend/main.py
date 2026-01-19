from fastapi import FastAPI, Depends, HTTPException, Query, Response, Header
from sqlmodel import Session, select, func
from database import create_db_and_tables, get_session, engine
from models import Speaker, SpeakerUpdate, OutreachStatus, AuditLog, AuthorizedUser, AuthorizedUserCreate, BulkUpdate
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
    """Adds missing columns automatically to avoid startup crashes on Render/Production"""
    print("🔄 Running auto-migrations...")
    from sqlalchemy import text
    with engine.connect() as conn:
        # Speaker Table Migrations
        speaker_columns = [
            ("assigned_to", "ALTER TABLE speaker ADD COLUMN assigned_to VARCHAR"),
            ("assigned_by", "ALTER TABLE speaker ADD COLUMN assigned_by VARCHAR"),
            ("assigned_at", "ALTER TABLE speaker ADD COLUMN assigned_at TIMESTAMP"),
            ("priority", "ALTER TABLE speaker ADD COLUMN priority VARCHAR DEFAULT 'MEDIUM'"),
            ("due_date", "ALTER TABLE speaker ADD COLUMN due_date TIMESTAMP"),
            ("tags", "ALTER TABLE speaker ADD COLUMN tags VARCHAR"),
            ("last_activity", "ALTER TABLE speaker ADD COLUMN last_activity TIMESTAMP")
        ]
        
        for col, sql in speaker_columns:
            try:
                conn.execute(text(sql))
                conn.commit()
                print(f"  ✓ Added {col} to speaker")
            except Exception as e:
                # Silently ignore if column already exists
                if "already exists" in str(e).lower() or "duplicate column" in str(e).lower():
                    continue
                print(f"  ⚠ Note on {col}: {e}")

        # AuditLog Table Migrations
        try:
            if "postgresql" in str(engine.url):
                # Postgres IF NOT EXISTS is safer
                conn.execute(text("ALTER TABLE auditlog ADD COLUMN IF NOT EXISTS speaker_id INTEGER"))
            else:
                conn.execute(text("ALTER TABLE auditlog ADD COLUMN speaker_id INTEGER"))
            conn.commit()
            print("  ✓ Checked speaker_id in auditlog")
        except Exception as e:
            if "already exists" in str(e).lower() or "duplicate column" in str(e).lower():
                pass
            else:
                print(f"  ⚠ Error adding speaker_id to auditlog: {e}")

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
    access_token = create_access_token(data={"sub": user.name, "roll": roll, "is_admin": user.is_admin})
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "user_name": user.name,
        "roll_number": roll,
        "is_admin": user.is_admin
    }
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

@app.patch("/speakers/bulk")
def bulk_update_speakers(
    update_data: BulkUpdate,
    session: Session = Depends(get_session),
    user_name: str = Depends(get_current_user_name)
):
    """Update multiple speakers at once"""
    count = 0
    for speaker_id in update_data.ids:
        db_speaker = session.get(Speaker, speaker_id)
        if not db_speaker:
            continue
            
        modified = False
        if update_data.status:
            db_speaker.status = update_data.status
            modified = True
        if update_data.assigned_to is not None:
            db_speaker.assigned_to = update_data.assigned_to
            db_speaker.assigned_by = user_name
            db_speaker.assigned_at = func.now()
            modified = True
        if update_data.is_bounty is not None:
            db_speaker.is_bounty = update_data.is_bounty
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
            details=f"Updated {count} speakers (IDs: {update_data.ids[:5]}...)"
        )
        session.add(log)
        session.commit()
        
    return {"message": f"Successfully updated {count} speakers", "count": count}

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
