from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, func
from database import get_session
from models import Speaker, SpeakerUpdate, OutreachStatus, AuditLog, AuthorizedUser, BulkUpdate
from auth_utils import verify_token, get_current_user_name, verify_admin
from typing import List, Optional
from datetime import datetime

router = APIRouter(prefix="/speakers", tags=["speakers"])

@router.get("", response_model=List[Speaker])
def read_speakers(
    session: Session = Depends(get_session),
    status: Optional[str] = None,
    limit: int = 300,
    offset: int = 0,
    user: dict = Depends(verify_token),
    # Assignment filters
    assigned_to: Optional[str] = None,
    unassigned: bool = False,
    assigned_to_me: bool = False,
    search: Optional[str] = None
):
    query = select(Speaker)
    
    if status:
        query = query.where(Speaker.status == status)
    
    if assigned_to:
        query = query.where(Speaker.assigned_to == assigned_to)
    
    if unassigned:
        query = query.where(Speaker.assigned_to == None)
        
    if assigned_to_me:
        query = query.where(Speaker.assigned_to == user["roll_number"])

    if search:
        search_term = f"%{search}%"
        query = query.where(
            (Speaker.name.ilike(search_term)) |
            (Speaker.primary_domain.ilike(search_term)) |
            (Speaker.location.ilike(search_term))
        )
    
    # Order by last update
    query = query.order_by(Speaker.last_updated.desc())
    
    query = query.offset(offset).limit(limit)
    speakers = session.exec(query).all()
    return speakers

@router.post("", response_model=Speaker)
def create_speaker(
    speaker: Speaker, 
    session: Session = Depends(get_session), 
    user_name: str = Depends(get_current_user_name)
):
    session.add(speaker)
    session.commit()
    session.refresh(speaker)
    
    # Audit Log
    if user_name:
        log = AuditLog(
            user_name=user_name,
            action="ADD",
            details=f"Added speaker {speaker.name} to {speaker.status.value}",
            speaker_id=speaker.id
        )
        session.add(log)
        session.commit()

    return speaker

@router.get("/{speaker_id}", response_model=Speaker)
def read_speaker(speaker_id: int, session: Session = Depends(get_session)):
    speaker = session.get(Speaker, speaker_id)
    if not speaker:
        raise HTTPException(status_code=404, detail="Speaker not found")
    return speaker

@router.get("/{speaker_id}/logs", response_model=List[AuditLog])
def get_speaker_logs(
    speaker_id: int,
    session: Session = Depends(get_session),
    user: dict = Depends(verify_token)
):
    """Retrieve history for a specific speaker"""
    logs = session.exec(
        select(AuditLog)
        .where(AuditLog.speaker_id == speaker_id)
        .order_by(AuditLog.timestamp.desc())
    ).all()
    return logs

@router.patch("/bulk")
def bulk_update_speakers(
    update_data: BulkUpdate,
    session: Session = Depends(get_session),
    user_name: str = Depends(get_current_user_name)
):
    """Update multiple speakers at once"""
    count = 0
    skipped = 0
    for speaker_id in update_data.ids:
        db_speaker = session.get(Speaker, speaker_id)
        if not db_speaker:
            continue
            
        update_dict = update_data.model_dump(exclude_unset=True)
        modified = False
        
        if 'status' in update_dict:
            new_status = update_dict['status']
            # Verification: If moving to EMAIL_ADDED or beyond, must have an email OR phone
            if new_status != OutreachStatus.SCOUTED and not (db_speaker.email or db_speaker.phone):
                skipped += 1
                continue
            db_speaker.status = new_status
            modified = True
            
        if 'assigned_to' in update_dict:
            target = update_dict['assigned_to']
            if target == "null" or target is None:
                db_speaker.assigned_to = None
                db_speaker.assigned_by = None
                db_speaker.assigned_at = None
            elif str(target).lower() == 'nan':
                # Skip NaN assignments strictly
                pass
            else:
                db_speaker.assigned_to = target
                db_speaker.assigned_by = user_name
                db_speaker.assigned_at = func.now()
            modified = True
            
        if 'is_bounty' in update_dict:
            db_speaker.is_bounty = update_dict['is_bounty']
            modified = True
            
        if modified:
            db_speaker.last_updated = func.now()
            session.add(db_speaker)
            count += 1
            
    session.commit()
    
    # Log the bulk action
    if count > 0:
        log = AuditLog(
            user_name=user_name,
            action="BULK_UPDATE",
            details=f"Updated {count} speakers (Skipped {skipped} due to missing email)"
        )
        session.add(log)
        session.commit()
        
    return {
        "message": f"Successfully updated {count} speakers. Skipped {skipped} lacking email.", 
        "count": count,
        "skipped": skipped
    }

@router.delete("/bulk")
def bulk_delete_speakers(
    delete_data: BulkUpdate,
    session: Session = Depends(get_session),
    user_name: str = Depends(get_current_user_name),
    admin: dict = Depends(verify_admin)
):
    """Delete multiple speakers at once (Admin Only)"""
    count = 0
    for speaker_id in delete_data.ids:
        db_speaker = session.get(Speaker, speaker_id)
        if db_speaker:
            session.delete(db_speaker)
            count += 1
            
    session.commit()
    
    if count > 0:
        log = AuditLog(
            user_name=user_name,
            action="BULK_DELETE",
            details=f"Deleted {count} speakers (IDs: {delete_data.ids[:5]}...)"
        )
        session.add(log)
        session.commit()
        
    return {"message": f"Successfully deleted {count} speakers", "count": count}

@router.patch("/{speaker_id}", response_model=Speaker)
def update_speaker(
    speaker_id: int, 
    speaker_update: SpeakerUpdate, 
    session: Session = Depends(get_session), 
    user_token: dict = Depends(verify_token)
):
    db_speaker = session.get(Speaker, speaker_id)
    if not db_speaker:
        raise HTTPException(status_code=404, detail="Speaker not found")
    
    old_status = db_speaker.status
    speaker_data = speaker_update.model_dump(exclude_unset=True)
    
    # Update temporary object to check final state
    temp_status = speaker_data.get('status', db_speaker.status)
    temp_email = speaker_data.get('email', db_speaker.email)
    temp_phone = speaker_data.get('phone', db_speaker.phone)
    
    # Verification: Progressing beyond SCOUTED requires some contact info
    if temp_status != OutreachStatus.SCOUTED and not (temp_email or temp_phone):
        raise HTTPException(
            status_code=400, 
            detail="Forbidden: Cannot progress beyond 'Scouted' without an Email or Phone. Please add contact information first."
        )

    # AUTO-MOVE LOGIC: Move to EMAIL_ADDED if info provided while in SCOUTED
    if db_speaker.status == OutreachStatus.SCOUTED and (temp_email or temp_phone) and 'status' not in speaker_data:
        db_speaker.status = OutreachStatus.EMAIL_ADDED
        print(f"Auto-moving {db_speaker.name} to EMAIL_ADDED")

    for key, value in speaker_data.items():
        setattr(db_speaker, key, value)
        
    db_speaker.last_updated = func.now()
    session.add(db_speaker)
    
    # Audit Log and XP Awarding
    if user_token:
        user_roll = user_token["roll_number"]
        action = "UPDATE"
        details = f"Updated profile for {db_speaker.name}"
        
        # Check specific important changes
        if 'status' in speaker_data and old_status != db_speaker.status:
            action = "MOVE"
            details = f"Moved {db_speaker.name} to {db_speaker.status.value}"
            
            # Award XP if status improved
            XP_MAP = {
                OutreachStatus.RESEARCHED: 10,
                OutreachStatus.EMAIL_ADDED: 5,
                OutreachStatus.DRAFTED: 5,
                OutreachStatus.CONTACT_INITIATED: 50,
                OutreachStatus.CONNECTED: 100,
                OutreachStatus.IN_TALKS: 150,
                OutreachStatus.LOCKED: 500
            }
            reward = XP_MAP.get(db_speaker.status, 0)
            if reward > 0:
                # Find the user performing the action to award XP
                current_user = session.exec(select(AuthorizedUser).where(AuthorizedUser.roll_number == user_roll)).first()
                if current_user:
                    current_user.xp += reward
                    session.add(current_user)
                    details += f" (+{reward} XP)"

        elif 'is_bounty' in speaker_data:
            action = "BOUNTY"
            status_str = "Marked" if db_speaker.is_bounty else "Unmarked"
            details = f"{status_str} {db_speaker.name} as Bounty"
            
        log = AuditLog(
            user_name=user_token.get("username") or user_token.get("roll_number") or "Unknown",
            action=action,
            details=details,
            speaker_id=speaker_id
        )
        session.add(log)
    
    session.commit()
    session.refresh(db_speaker)
    return db_speaker

@router.post("/{speaker_id}/assign")
def assign_speaker(
    speaker_id: int,
    assigned_to: str,  # Roll number
    session: Session = Depends(get_session),
    user: dict = Depends(verify_token)
):
    """Assign a speaker to a team member"""
    speaker = session.get(Speaker, speaker_id)
    if not speaker:
        raise HTTPException(status_code=404, detail="Speaker not found")
    
    # Verify assigned_to user exists
    assignee = session.exec(
        select(AuthorizedUser).where(AuthorizedUser.roll_number == assigned_to)
    ).first()
    
    if not assignee:
        raise HTTPException(status_code=404, detail="Assignee not found")
    
    speaker.assigned_to = assigned_to
    speaker.assigned_by = user["roll_number"]
    speaker.assigned_at = datetime.now()
    speaker.last_activity = datetime.now()
    speaker.last_updated = datetime.now()
    
    session.add(speaker)
    session.commit()
    
    # Log the assignment
    log = AuditLog(
        user_name=user["username"],
        action="ASSIGN_SPEAKER",
        details=f"Assigned {speaker.name} to {assignee.name}",
        speaker_id=speaker_id
    )
    session.add(log)
    session.commit()
    
    return {"message": "Speaker assigned successfully", "assigned_to": assignee.name}

@router.post("/{speaker_id}/unassign")
def unassign_speaker(
    speaker_id: int,
    session: Session = Depends(get_session),
    user: dict = Depends(verify_token)
):
    """Remove assignment from a speaker"""
    speaker = session.get(Speaker, speaker_id)
    if not speaker:
        raise HTTPException(status_code=404, detail="Speaker not found")
    
    speaker.assigned_to = None
    speaker.assigned_by = None
    speaker.assigned_at = None
    speaker.last_activity = datetime.now()
    speaker.last_updated = datetime.now()
    
    session.add(speaker)
    session.commit()
    
    # Log the unassignment
    log = AuditLog(
        user_name=user["username"],
        action="UNASSIGN_SPEAKER",
        details=f"Unassigned {speaker.name}",
        speaker_id=speaker_id
    )
    session.add(log)
    session.commit()
    
    return {"message": "Speaker unassigned successfully"}
