from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from database import get_session
from models import SprintDeadline
from auth_utils import verify_token, verify_admin
from datetime import datetime

router = APIRouter(prefix="/meta", tags=["meta"])

@router.get("/sprint-deadline", response_model=SprintDeadline)
def get_sprint_deadline(
    session: Session = Depends(get_session),
    user: dict = Depends(verify_token)
):
    # Get the latest deadline
    deadline = session.exec(select(SprintDeadline).order_by(SprintDeadline.created_at.desc())).first()
    if not deadline:
        return SprintDeadline(deadline=datetime.now(), created_by="system")
    return deadline

@router.post("/sprint-deadline", response_model=SprintDeadline)
def set_sprint_deadline(
    deadline_data: SprintDeadline,
    session: Session = Depends(get_session),
    admin: dict = Depends(verify_admin)
):
    deadline_data.created_by = admin["roll_number"]
    deadline_data.created_at = datetime.now()
    session.add(deadline_data)
    session.commit()
    session.refresh(deadline_data)
    return deadline_data
