import os
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# Authorised users list synced from frontend
AUTHORIZED_USERS = {
    "b25380": "Abhishek Tiwari",
    "b25474": "Sarah Dhamija",
    "b25305": "Isha Manilal Solanki",
    "b25327": "Faria Choudhry",
    "v25017": "Manojna Eadala",
    "b25434": "Sanjeet Shrivastava",
    "b25470": "Lavanya Krishan Sharma",
    "b25392": "Shauryadeep Lall",
    "b25347": "Chaitanya Sharma",
    "b25328": "Kishlay Kishore",
    "b25440": "Yashas Tarakaram",
    "b25316": "Saraswat Majumder",
    "b25472": "Pratik Gandhi",
    "b25416": "Suyog Sachin Shah",
    "b25359": "Harshit Kumar",
    "b25349": "Janmejai(Admin)"
}

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
        username: str = payload.get("sub")
        roll_number: str = payload.get("roll")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return {"username": username, "roll_number": roll_number}
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

def get_current_user_name(token_data: dict = Security(verify_token)):
    return token_data["username"]
