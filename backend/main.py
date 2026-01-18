from fastapi import FastAPI, Depends, HTTPException, Query, Response, Header
from sqlmodel import Session, select, func
from database import create_db_and_tables, get_session, engine
from models import Speaker, SpeakerUpdate, OutreachStatus, AuditLog
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

load_dotenv()

class RefineRequest(BaseModel):
    current_draft: str
    instruction: str

@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
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
    yield

app = FastAPI(lifespan=lifespan)

# CORS Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/healthz")
def health_check():
    return {"status": "healthy"}

@app.get("/speakers", response_model=List[Speaker])
def read_speakers(
    session: Session = Depends(get_session),
    status: Optional[str] = None,
    limit: int = 300,
    offset: int = 0
):
    query = select(Speaker)
    if status:
        query = query.where(Speaker.status == status)
    
    query = query.offset(offset).limit(limit)
    speakers = session.exec(query).all()
    return speakers

@app.post("/speakers", response_model=Speaker)
def create_speaker(speaker: Speaker, session: Session = Depends(get_session), x_user_name: Optional[str] = Header(None)):
    session.add(speaker)
    session.commit()
    session.refresh(speaker)
    
    # Audit Log
    if x_user_name:
        log = AuditLog(
            user_name=x_user_name,
            action="ADD",
            details=f"Added speaker {speaker.name} to {speaker.status.value}"
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
def update_speaker(speaker_id: int, speaker_update: SpeakerUpdate, session: Session = Depends(get_session), x_user_name: Optional[str] = Header(None)):
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
    if x_user_name:
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
            user_name=x_user_name,
            action=action,
            details=details
        )
        session.add(log)
    
    session.commit()
    session.refresh(db_speaker)
    return db_speaker

@app.post("/generate-email")
def generate_email(speaker_id: int, session: Session = Depends(get_session)):
    speaker = session.get(Speaker, speaker_id)
    if not speaker:
        raise HTTPException(status_code=404, detail="Speaker not found")

    # Real AI Generation via Perplexity
    url = "https://api.perplexity.ai/chat/completions"
    headers = {
        "Authorization": f"Bearer {os.getenv('PERPLEXITY_API_KEY')}",
        "Content-Type": "application/json"
    }
    
    prompt = f"""
    Write a highly personalized, persuasive HTML email invitation for a TEDx speaker.
    THE GOAL: Convince {speaker.name} that they are the *perfect* fit for our theme.

    Speaker Profile:
    - Name: {speaker.name}
    - Domain: {speaker.primary_domain}
    - UNIQUENESS HOOK (The "Why You?"): {speaker.blurring_line_angle or 'Your unique ability to bridge disciplines'}
    
    Event Details:
    - Event: TEDxXLRI
    - Theme: "Blurring Lines" (Converging distinct disciplines to create new innovations)
    - Date: 20th February 2026
    
    Mandatory Requirements:
    1. **THE HOOK**: Start immediately with the "Blurring Line Angle". Don't be generic. Example: "Your work at the intersection of X and Y is exactly what we are celebrating..."
    2. **CONCISENESS**: Keep the main body under 200 words. Busy people don't read essays.
    3. **TONE**: Professional but passionate. Admiring but not fawning.
    4. **DESIGN**: HTML with inline CSS. Minimalist. Use TED Red (#e62b1e) for accents/buttons. Black text on white.
    5. **HEADER**: Acknowledge the TEDxXLRI logo placeholder.
    6. **CTA**: A clear, red button saying "I'm Interested - Let's Chat".

    Output Format:
    Return explicitly JSON with 3 keys:
    - "subject": A catchy subject line (e.g., "TEDx Invitation: {speaker.name} + Blurring Lines")
    - "body_text": Plain text version
    - "body_html": Full HTML string
    
    Do not include markdown blocks like ```json.
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
            print(f"API Error Details: {response.text}")
        response.raise_for_status()
        result = response.json()
        content = result['choices'][0]['message']['content']
        
        # Clean up optional markdown blocks if present
        clean_content = content.replace('```json', '').replace('```', '').strip()
        email_data = json.loads(clean_content)
        
        # Save draft to DB
        speaker.email_draft = json.dumps(email_data)
        speaker.status = OutreachStatus.DRAFTED
        session.add(speaker)
        session.commit()
        
        return email_data
    except Exception as e:
        print(f"AI Error: {e}")
        return {
            "subject": f"Invitation: TEDxXLRI x {speaker.name}", 
            "body_text": f"Error generating email: {e}",
            "body_html": f"<p>Error generating email: {e}</p>"
        }

@app.post("/refine-email")
def refine_email(request: RefineRequest):
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
def read_logs(limit: int = 50, session: Session = Depends(get_session)):
    query = select(AuditLog).order_by(AuditLog.timestamp.desc()).limit(limit)
    return session.exec(query).all()
