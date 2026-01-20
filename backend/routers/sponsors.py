from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from database import get_session
from models import Sponsor, SponsorUpdate, SponsorStatus, AuditLog
from auth_utils import verify_token, get_current_user_name
from typing import List, Optional
from datetime import datetime

router = APIRouter(prefix="/sponsors", tags=["sponsors"])

@router.get("", response_model=List[Sponsor])
def read_sponsors(
    session: Session = Depends(get_session),
    status: Optional[str] = None,
    user: dict = Depends(verify_token)
):
    query = select(Sponsor)
    if status:
        query = query.where(Sponsor.status == status)
    return session.exec(query).all()

@router.post("", response_model=Sponsor)
def create_sponsor(
    sponsor: Sponsor,
    session: Session = Depends(get_session),
    user_name: str = Depends(get_current_user_name)
):
    session.add(sponsor)
    session.commit()
    session.refresh(sponsor)
    
    if user_name:
        log = AuditLog(
            user_name=user_name,
            action="ADD_SPONSOR",
            details=f"Added sponsor {sponsor.company_name}",
            timestamp=datetime.now()
        )
        session.add(log)
        session.commit()
        
    return sponsor

@router.patch("/{sponsor_id}", response_model=Sponsor)
def update_sponsor(
    sponsor_id: int,
    sponsor_update: SponsorUpdate,
    session: Session = Depends(get_session),
    user_name: str = Depends(get_current_user_name)
):
    db_sponsor = session.get(Sponsor, sponsor_id)
    if not db_sponsor:
        raise HTTPException(status_code=404, detail="Sponsor not found")
    
    update_data = sponsor_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_sponsor, key, value)
        
    db_sponsor.last_updated = datetime.now()
    session.add(db_sponsor)
    session.commit()
    session.refresh(db_sponsor)
    return db_sponsor

@router.post("/generate-email")
def generate_sponsor_email(
    sponsor_id: int,
    session: Session = Depends(get_session)
):
    # Mock AI generation for now or implement if logic existed
    # Providing basic placeholder
    sponsor = session.get(Sponsor, sponsor_id)
    if not sponsor:
        raise HTTPException(status_code=404, detail="Sponsor not found")
        
    draft = f"""Subject: Partnership Opportunity with TEDxXLRI

Dear {sponsor.contact_person or 'Team'},

I hope this email finds you well. I am reaching out from TEDxXLRI regarding a potential partnership..."""

    return {"draft": draft}
