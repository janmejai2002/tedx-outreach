from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from database import get_session
from models import AuthorizedUser
from gamification_models import GamificationUpdate
from auth_utils import verify_token

router = APIRouter()

@router.get("/users/me", response_model=AuthorizedUser)
def get_current_user_details(
    session: Session = Depends(get_session),
    user_token: dict = Depends(verify_token)
):
    """Get current user details including Gamification stats"""
    user = session.exec(select(AuthorizedUser).where(AuthorizedUser.roll_number == user_token["roll_number"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.patch("/users/me/gamification")
def update_gamification(
    update: GamificationUpdate,
    session: Session = Depends(get_session),
    user_token: dict = Depends(verify_token)
):
    """Sync/Update XP and Streak from frontend"""
    user = session.exec(select(AuthorizedUser).where(AuthorizedUser.roll_number == user_token["roll_number"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if update.xp is not None:
        user.xp = update.xp
    if update.streak is not None:
        user.streak = update.streak
    if update.last_login_date is not None:
        user.last_login_date = update.last_login_date
    
    session.add(user)
    session.commit()
    session.refresh(user)
    return user
