from fastapi import APIRouter, Depends, HTTPException, Response, Request
from sqlmodel import Session, select
from database import get_session
from models import AuthorizedUser, UserRole
from auth_models import LoginRequest
from auth_utils import create_access_token, verify_token, verify_admin
from slowapi import Limiter
from slowapi.util import get_remote_address

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

@router.post("/login")
def login(request: LoginRequest, response: Response, session: Session = Depends(get_session)):
    # Try Roll Number match (Original)
    user = session.exec(select(AuthorizedUser).where(AuthorizedUser.roll_number == request.roll_number.lower().strip())).first()
    
    # If no roll match, try First Name match (Case insensitive)
    if not user:
        all_users = session.exec(select(AuthorizedUser)).all()
        target_name = request.roll_number.lower().strip()
        for u in all_users:
            if u.name.split()[0].lower() == target_name:
                user = u
                break
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credential. Roll/Name not recognized.")
    
    access_token = create_access_token(data={
        "sub": user.roll_number, 
        "name": user.name,
        "is_admin": user.role == "ADMIN" or user.is_admin
    })
    return {
        "access_token": access_token, 
        "token_type": "bearer", 
        "isAdmin": user.role == "ADMIN", 
        "user_name": user.name,
        "roll_number": user.roll_number
    }

@router.get("/debug/env")
def debug_env(user: dict = Depends(verify_token)):
    """Debug endpoint to check if environment variables are loaded"""
    import os
    api_key = os.getenv('PERPLEXITY_API_KEY')
    return {
        "perplexity_key_loaded": bool(api_key),
        "key_length": len(api_key) if api_key else 0,
        "key_prefix": api_key[:10] + "..." if api_key else "NOT_SET"
    }
