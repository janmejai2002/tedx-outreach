from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from database import get_session
from models import Speaker, OutreachStatus
from auth_utils import verify_token
import os
import requests
import json
from pydantic import BaseModel
from typing import Optional
from ai_utils import call_ai

router = APIRouter(tags=["AI"])

class RefineRequest(BaseModel):
    current_draft: str
    instruction: str

class IngestRequest(BaseModel):
    raw_text: str

@router.post("/generate-email")
async def generate_email(
    speaker_id: int,
    session: Session = Depends(get_session),
    user: dict = Depends(verify_token)
):
    speaker = session.get(Speaker, speaker_id)
    if not speaker:
        raise HTTPException(status_code=404, detail="Speaker not found")

    prompt = f"""
    Step 1: Search for the most recent professional achievements (2024-2025), recent books, or notable talks by {speaker.name}.
    
    Step 2: Based on that research, write a highly personalized and compelling invitation email for {speaker.name} to speak at TEDxXLRI.
    
    Event Personality & Context:
    - Event: TEDxXLRI 2026 (Theme: 'The Blurring Line')
    - Logistics: Travel and deluxe accommodation provided.
    
    Output format: You MUST return ONLY a JSON object with two fields:
    - subject: A catchy subject line
    - body_html: The email content in HTML format (use <p>, <br>, <strong> tags).
    """
    
    raw_response = call_ai(prompt, system_prompt="You are a prestigious head of speaker curation for TEDxXLRI. Output ONLY valid JSON.")
    
    try:
        # Robust JSON cleaning
        clean_json = raw_response
        if "```json" in raw_response:
            clean_json = raw_response.split("```json")[1].split("```")[0].strip()
        elif "```" in raw_response:
            clean_json = raw_response.split("```")[1].split("```")[0].strip()
        
        email_obj = json.loads(clean_json)
        # Ensure it has the right keys
        if "subject" not in email_obj: email_obj["subject"] = f"Invitation: TEDxXLRI 2026"
        if "body_html" not in email_obj: email_obj["body_html"] = raw_response
    except:
        email_obj = {
            "subject": f"Invitation: TEDxXLRI 2026",
            "body_html": raw_response.replace("\n", "<br>")
        }
    
    # Save to DB as stringified JSON
    draft_str = json.dumps(email_obj)
    speaker.email_draft = draft_str
    if speaker.status == OutreachStatus.SCOUTED:
        speaker.status = OutreachStatus.DRAFTED
    session.add(speaker)
    session.commit()
    
    return email_obj

@router.post("/refine-email")
async def refine_email(
    request: RefineRequest,
    user: dict = Depends(verify_token)
):
    prompt = f"""
    Current Email Draft:
    ---
    {request.current_draft}
    ---
    
    Instruction for refinement:
    {request.instruction}
    
    Output format: You MUST return ONLY a JSON object with two fields:
    - subject: The updated subject line
    - body_html: The updated email content in HTML.
    """
    
    raw_response = call_ai(prompt)
    try:
        clean_json = raw_response
        if "```json" in raw_response:
            clean_json = raw_response.split("```json")[1].split("```")[0].strip()
        elif "```" in raw_response:
            clean_json = raw_response.split("```")[1].split("```")[0].strip()
        return json.loads(clean_json)
    except:
        return {"subject": "Updated Invitation", "body_html": raw_response.replace("\n", "<br>")}

@router.post("/ingest-ai-data")
@router.post("/admin/ingest-ai")
async def ingest_ai_data(
    payload: IngestRequest,
    session: Session = Depends(get_session),
    user: dict = Depends(verify_token)
):
    """
    Parses raw search data and extracts speaker profiles with deduplication.
    """
    prompt = f"""
    Extract a list of potential speakers from the following text. 
    Format the output as a JSON array of objects with these fields:
    - name: Full name (be precise)
    - primary_domain: Their main field or occupation
    - location: City or country
    - linkedin_url: URL if found
    - email: Email if found
    - phone: Phone if found
    - search_details: A short 2-3 sentence summary of why they are relevant to TEDxXLRI's theme 'The Blurring Line'.

    Raw Text:
    {payload.raw_text}

    Return ONLY the raw JSON array. If no speakers are found, return [].
    """
    
    raw_json = call_ai(prompt, system_prompt="You are a data extraction assistant for TEDxXLRI. Output ONLY a valid JSON array of objects. No intro text, no conversational filler.")
    
    try:
        # Robust JSON cleaning
        clean_json = raw_json.strip()
        if "```json" in clean_json:
            clean_json = clean_json.split("```json")[1].split("```")[0].strip()
        elif "```" in clean_json:
            clean_json = clean_json.split("```")[1].split("```")[0].strip()
        
        # Remove any leading/trailing non-bracket characters if AI added text
        start_idx = clean_json.find('[')
        end_idx = clean_json.rfind(']')
        if start_idx != -1 and end_idx != -1:
            clean_json = clean_json[start_idx : end_idx + 1]
            
        speakers_data = json.loads(clean_json)
        
        new_speakers_count = 0
        skipped_duplicates = []
        
        for s_data in speakers_data:
            name = s_data.get("name", "").strip()
            if not name or name.lower() == "unknown":
                continue
                
            # Deduplication: Check if name already exists
            existing = session.exec(select(Speaker).where(Speaker.name == name)).first()
            if existing:
                skipped_duplicates.append(name)
                continue
                
            speaker = Speaker(
                name=name,
                primary_domain=s_data.get("primary_domain"),
                location=s_data.get("location"),
                linkedin_url=s_data.get("linkedin_url"),
                email=s_data.get("email"),
                phone=s_data.get("phone"),
                search_details=s_data.get("search_details"),
                status=OutreachStatus.SCOUTED,
                assigned_by=user["roll_number"]
            )
            session.add(speaker)
            new_speakers_count += 1
            
        session.commit()
        return {
            "message": f"Successfully ingested {new_speakers_count} new speakers.",
            "count": new_speakers_count,
            "skipped_duplicates": skipped_duplicates,
            "skipped_count": len(skipped_duplicates)
        }
    except Exception as e:
        print(f"Ingestion error: {e}")
        return {"error": "Failed to parse AI output into valid speaker data.", "raw": raw_json}

@router.get("/speakers/{speaker_id}/ai-prompt")
def get_ai_prompt(
    speaker_id: int,
    session: Session = Depends(get_session)
):
    speaker = session.get(Speaker, speaker_id)
    if not speaker:
        raise HTTPException(status_code=404, detail="Speaker not found")
        
    prompt = f"Draft a professional invitation email for {speaker.name} who is a {speaker.primary_domain}. Mention TEDxXLRI..."
    return {"prompt": prompt}
