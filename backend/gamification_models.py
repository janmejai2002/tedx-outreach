from pydantic import BaseModel
from typing import Optional

class GamificationUpdate(BaseModel):
    xp: Optional[int] = None
    streak: Optional[int] = None
    last_login_date: Optional[str] = None
