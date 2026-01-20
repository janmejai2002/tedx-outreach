import os
import requests
from fastapi import HTTPException

PERPLEXITY_API_URL = "https://api.perplexity.ai/chat/completions"
MODEL = "sonar"

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
        response = requests.post(PERPLEXITY_API_URL, headers=headers, json=payload, timeout=45)
        if response.status_code == 429:
            raise HTTPException(status_code=429, detail="AI Rate Limit exceeded. Please wait a moment.")
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"]
    except requests.exceptions.Timeout:
        raise HTTPException(status_code=504, detail="AI Service Timeout. The search took too long.")
    except Exception as e:
        detail = str(e)
        if hasattr(e, 'response') and e.response is not None:
            try:
                error_json = e.response.json()
                detail = error_json.get('error', {}).get('message', str(e))
            except:
                pass
        print(f"AI Error: {detail}")
        raise HTTPException(status_code=502, detail=f"AI Service Error: {detail}")

def hunt_email(name: str, domain: str = "", location: str = ""):
    """
    Uses AI with search to find a public email address.
    """
    prompt = f"Find the public professional email address for {name}"
    if domain: prompt += f", who works in {domain}"
    if location: prompt += f" based in {location}"
    
    prompt += """
    . Search LinkedIn, personal websites, company directories, and press releases. 
    Return ONLY the email address. 
    If you find multiple, return the most official looking one. 
    If absolutely no email is found, return 'NOT_FOUND'.
    Do not include any conversational filler.
    """
    
    return call_ai(prompt, system_prompt="You are a specialized lead generation agent. Your goal is to find valid email addresses for outreach. NO INTRO, NO OUTRO.")

