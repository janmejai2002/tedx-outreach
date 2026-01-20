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

PERPLEXITY_API_URL = "https://api.perplexity.ai/chat/completions"
# Using a robust sonar-online model for live info or instruct model
MODEL = "sonar" 

class RefineRequest(BaseModel):
    current_draft: str
    instruction: str

class IngestRequest(BaseModel):
    raw_text: str

def call_ai(prompt: str, system_prompt: str = "You are a professional outreach assistant for TEDxXLRI."):
    api_key = os.getenv("PERPLEXITY_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Perplexity API key not configured")
        
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.2
    }

    try:
        response = requests.post(PERPLEXITY_API_URL, headers=headers, json=payload, timeout=30)
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"]
    except Exception as e:
        print(f"AI Error: {e}")
        # Try fallback model if sonar fails
        if "sonar" in MODEL:
            try:
                payload["model"] = "llama-3.1-8b-instruct"
                response = requests.post(PERPLEXITY_API_URL, headers=headers, json=payload, timeout=30)
                response.raise_for_status()
                return response.json()["choices"][0]["message"]["content"]
            except:
                pass
        raise HTTPException(status_code=502, detail=f"AI Service Error: {str(e)}")

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
    Write a highly personalized, professional, and compelling invitation email for {speaker.name} to speak at TEDxXLRI.
    
    Speaker Context:
    - Name: {speaker.name}
    - Domain/Expertise: {speaker.primary_domain or 'General Expert'}
    - Location: {speaker.location or 'Unknown'}
    - Research Details: {speaker.search_details or 'None provided'}
    
    The theme of the event is 'The Blurring Line'.
    Event Date: Late Feb 2026.
    
    The email should:
    1. Acknowledge their specific work or background.
    2. Explain why 'The Blurring Line' theme is relevant to them.
    3. Invite them to share their unique perspective.
    4. Maintain a prestigious, respectful, and enthusiastic tone.
    5. Include a clear Call to Action (like a short sync call).
    
    Output ONLY the email content.
    """
    
    draft = call_ai(prompt)
    
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
    Parses raw search data and extracts speaker profiles.
    """
    prompt = f"""
    Extract a list of potential speakers from the following text. 
    Format the output as a JSON array of objects with these fields:
    - name: Full name
    - primary_domain: Their main field or occupation
    - location: City or country
    - linkedin_url: URL if found
    - search_details: A short 2-3 sentence summary of why they are relevant.

    Raw Text:
    {payload.raw_text}

    Return ONLY the raw JSON array. If no speakers are found, return [].
    """
    
    raw_json = call_ai(prompt, system_prompt="You are a data extraction assistant. Output only valid JSON.")
    
    try:
        # Clean the output if the AI added markdown blocks
        clean_json = raw_json
        if "```json" in raw_json:
            clean_json = raw_json.split("```json")[1].split("```")[0].strip()
        elif "```" in raw_json:
            clean_json = raw_json.split("```")[1].split("```")[0].strip()
            
        speakers_data = json.loads(clean_json)
        
        new_speakers = []
        for s_data in speakers_data:
            speaker = Speaker(
                name=s_data.get("name", "Unknown"),
                primary_domain=s_data.get("primary_domain"),
                location=s_data.get("location"),
                linkedin_url=s_data.get("linkedin_url"),
                search_details=s_data.get("search_details"),
                status=OutreachStatus.SCOUTED,
                assigned_by=user["roll_number"]
            )
            session.add(speaker)
            new_speakers.append(speaker)
            
        session.commit()
        return {"message": f"Successfully ingested {len(new_speakers)} speakers.", "count": len(new_speakers)}
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
