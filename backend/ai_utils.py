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
        response = requests.post(PERPLEXITY_API_URL, headers=headers, json=payload, timeout=30)
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"]
    except Exception as e:
        print(f"AI Error: {e}")
        # Try fallback model if sonar fails
        try:
            payload["model"] = "llama-3.1-8b-instruct"
            response = requests.post(PERPLEXITY_API_URL, headers=headers, json=payload, timeout=30)
            response.raise_for_status()
            return response.json()["choices"][0]["message"]["content"]
        except:
            pass
        raise HTTPException(status_code=502, detail=f"AI Service Error: {str(e)}")
