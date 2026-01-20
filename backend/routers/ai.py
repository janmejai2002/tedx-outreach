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
    - Event: TEDxXLRI 2026
    - Campus: XLRI Delhi-NCR (India's premier and oldest management institute).
    - Audience: 100+ ambitious MBA students, future business leaders, and CXOs.
    - Global Reach: The talk will be professionally recorded and featured on the global TEDx YouTube channel.
    - Theme: 'The Blurring Line' (Exploring the dissolving boundaries between technology, humanity, and business in 2025/2026).
    - Logistics: TEDxXLRI will provide full coverage for travel and deluxe accommodation.
    - Format: Standard 18-minute TED-style talk.
    
    Speaker Intelligence:
    - Name: {speaker.name}
    - Field: {speaker.primary_domain or 'Leadership/Innovation'}
    - Existing Data: {speaker.search_details or ''}
    
    Formatting Guidelines:
    1. The Hook: Start by citing a VERY specific recent milestone or thought-piece you found about them in Step 1.
    2. The Why: Articulate exactly how their specific work bridges the "Blurring Line" theme.
    3. The Vibe: Use a tone that is "Prestigious but Disruptive."
    4. The Logistics: Seamlessly mention that travel and stay are managed by us to minimize friction.
    5. The CTA: Request a 10-minute introductory sync.

    Output ONLY the email content. No conversational filler.
    """
    
    draft = call_ai(prompt, system_prompt="You are a prestigious head of speaker curation for TEDxXLRI. Your goal is to secure world-class speakers by demonstrating deep knowledge of their work.")
    
    # Save to DB
    speaker.email_draft = draft
    if speaker.status == OutreachStatus.SCOUTED:
        speaker.status = OutreachStatus.DRAFTED
    session.add(speaker)
    session.commit()
    
    return {"draft": draft}

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
    
    Rewrite the email according to the instruction while maintaining the professional tone of TEDxXLRI.
    Output ONLY the refined email content.
    """
    
    refined_draft = call_ai(prompt)
    return {"draft": refined_draft}

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
    
    raw_json = call_ai(prompt, system_prompt="You are a data extraction assistant for TEDxXLRI. Output ONLY valid JSON array. Be extremely accurate with names.")
    
    try:
        # Clean the output if the AI added markdown blocks
        clean_json = raw_json
        if "```json" in raw_json:
            clean_json = raw_json.split("```json")[1].split("```")[0].strip()
        elif "```" in raw_json:
            clean_json = raw_json.split("```")[1].split("```")[0].strip()
            
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
