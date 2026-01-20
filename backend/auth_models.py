from pydantic import BaseModel

class LoginRequest(BaseModel):
    roll_number: str
