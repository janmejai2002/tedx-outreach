import os
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from fastapi import HTTPException, Security, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# Admin roll number (hardcoded for bootstrap)
ADMIN_ROLL = "b25349"

# JWT Config
SECRET_KEY = os.getenv("SECRET_KEY", "tedx_xlri_super_secret_key_2025")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 30

security = HTTPBearer()

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(credentials: HTTPAuthorizationCredentials = Security(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        roll_number: str = payload.get("sub")
        name: str = payload.get("name")
        is_admin: bool = payload.get("is_admin", False)
        if roll_number is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return {"roll_number": roll_number, "username": name, "is_admin": is_admin}
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

def get_current_user_name(token_data: dict = Security(verify_token)):
    return token_data["username"]

def verify_admin(token_data: dict = Depends(verify_token)):
    """Verify that the current user is an admin"""
    if not token_data.get("is_admin", False):
        raise HTTPException(status_code=403, detail="Admin access required")
    return token_data
