from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, delete
from database import get_session
from models import AuthorizedUser, AuthorizedUserCreate, AuthorizedUserUpdate, Speaker, AuditLog
from auth_utils import verify_admin
from datetime import datetime
from typing import List

router = APIRouter(prefix="/admin", tags=["admin"])

@router.get("/users", response_model=List[AuthorizedUser])
def get_authorized_users(
    session: Session = Depends(get_session),
    admin: dict = Depends(verify_admin)
):
    """Get all authorized users (admin only)"""
    users = session.exec(select(AuthorizedUser)).all()
    return users

@router.post("/users")
def add_authorized_user(
    user_data: AuthorizedUserCreate,
    session: Session = Depends(get_session),
    admin: dict = Depends(verify_admin)
):
    """Add a new authorized user (admin only)"""
    # Check if user already exists
    existing = session.exec(
        select(AuthorizedUser).where(AuthorizedUser.roll_number == user_data.roll_number.lower().strip())
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="User already authorized")
    
    new_user = AuthorizedUser(
        roll_number=user_data.roll_number.lower().strip(),
        name=user_data.name,
        is_admin=user_data.is_admin,
        added_by=admin["username"]
    )
    
    session.add(new_user)
    session.commit()
    session.refresh(new_user)
    
    # Log the action
    log = AuditLog(
        user_name=admin["username"],
        action="ADD_USER",
        details=f"Added {new_user.name} ({new_user.roll_number})"
    )
    session.add(log)
    session.commit()
    
    return {"message": "User added successfully", "user": new_user}

@router.delete("/users/{roll_number}")
def remove_authorized_user(
    roll_number: str,
    session: Session = Depends(get_session),
    admin: dict = Depends(verify_admin)
):
    """Remove an authorized user (admin only)"""
    user = session.exec(
        select(AuthorizedUser).where(AuthorizedUser.roll_number == roll_number.lower().strip())
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prevent removing original admin if needed, or at least self
    if user.roll_number == admin["roll_number"]:
        raise HTTPException(status_code=400, detail="Cannot remove yourself")
    
    session.delete(user)
    session.commit()
    
    # Log the action
    log = AuditLog(
        user_name=admin["username"],
        action="REMOVE_USER",
        details=f"Removed {user.name} ({user.roll_number})"
    )
    session.add(log)
    session.commit()
    
    return {"message": "User removed successfully"}

@router.patch("/users/{roll_number}")
def update_authorized_user(
    roll_number: str,
    update_data: dict,
    session: Session = Depends(get_session),
    admin: dict = Depends(verify_admin)
):
    """Update user role or permissions (Admin only)"""
    user = session.exec(
        select(AuthorizedUser).where(AuthorizedUser.roll_number == roll_number.lower().strip())
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # SECURITY LOCK: Only allow Janmejai (b25349) to grant Admin status to others
    # This prevents one admin from creating another admin without your permission
    if 'is_admin' in update_data and update_data['is_admin'] == True:
        if admin["roll_number"] != "b25349":
             raise HTTPException(status_code=403, detail="Only the Super Admin (Janmejai) can grant Admin privileges.")

    if 'role' in update_data:
        user.role = update_data['role']
    if 'is_admin' in update_data:
        user.is_admin = update_data['is_admin']
        if user.is_admin:
            user.role = "ADMIN"
            
    session.add(user)
    session.commit()
    
    # Log the action
    log = AuditLog(
        user_name=admin["username"],
        action="UPDATE_USER_PERMISSIONS",
        details=f"Modified {user.name} ({user.roll_number}) - Admin: {user.is_admin}, Role: {user.role}"
    )
    session.add(log)
    session.commit()
    
    return user

@router.post("/purge-invalid")
def purge_invalid_data(
    session: Session = Depends(get_session),
    admin: dict = Depends(verify_admin)
):
    """Delete corrupted junk cards and fix 'NaN' assignments (Admin only)"""
    # 1. Delete actual junk cards (where name is NaN, None or empty)
    junk_speakers = session.exec(
        select(Speaker).where(
            (Speaker.name == 'NaN') | 
            (Speaker.name == 'nan') |
            (Speaker.name == '') | 
            (Speaker.name == 'None') |
            (Speaker.name == 'unknown') |
            (Speaker.name == 'Unknown')
        )
    ).all()
    
    del_count = 0
    for s in junk_speakers:
        session.delete(s)
        del_count += 1
    
    # 2. Fix corrupted assignments (where assigned_to survived as 'NaN' string)
    corrupted_assignments = session.exec(
        select(Speaker).where(
            (Speaker.assigned_to == 'NaN') |
            (Speaker.assigned_to == 'nan') |
            (Speaker.assigned_to == 'None')
        )
    ).all()
    
    fix_count = 0
    for s in corrupted_assignments:
        s.assigned_to = None
        s.assigned_by = None
        s.assigned_at = None
        session.add(s)
        fix_count += 1
    
    session.commit()
    return {
        "message": f"Operation complete. Purged {del_count} junk cards and reset {fix_count} corrupted assignments.",
        "purged": del_count,
        "fixed": fix_count
    }

@router.get("/backup")
def download_backup(
    session: Session = Depends(get_session),
    admin: dict = Depends(verify_admin)
):
    """Export all critical data as JSON"""
    speakers = session.exec(select(Speaker)).all()
    logs = session.exec(select(AuditLog)).all()
    users = session.exec(select(AuthorizedUser)).all()
    
    return {
        "timestamp": datetime.now().isoformat(),
        "speakers": [s.model_dump() for s in speakers],
        "logs": [l.model_dump() for l in logs],
        "authorized_users": [u.model_dump() for u in users]
    }

@router.post("/restore")
def restore_backup(
    backup_data: dict,
    session: Session = Depends(get_session),
    admin: dict = Depends(verify_admin)
):
    """Restore entire DB from JSON backup"""
    try:
        # Clear existing data (CAUTION)
        session.exec(delete(Speaker))
        session.exec(delete(AuditLog))
        session.exec(delete(AuthorizedUser))
        
        # Restore Speakers
        for s_data in backup_data.get("speakers", []):
            if "last_updated" in s_data and s_data["last_updated"]:
                s_data["last_updated"] = datetime.fromisoformat(s_data["last_updated"])
            if s_data.get("assigned_at"):
                s_data["assigned_at"] = datetime.fromisoformat(s_data["assigned_at"])
            if s_data.get("due_date"):
                s_data["due_date"] = datetime.fromisoformat(s_data["due_date"])
            if s_data.get("last_activity"):
                s_data["last_activity"] = datetime.fromisoformat(s_data["last_activity"])
            session.add(Speaker(**s_data))
            
        # Restore Users
        for u_data in backup_data.get("authorized_users", []):
            session.add(AuthorizedUser(**u_data))
            
        # Restore Logs
        for l_data in backup_data.get("logs", []):
            if "timestamp" in l_data and l_data["timestamp"]:
                l_data["timestamp"] = datetime.fromisoformat(l_data["timestamp"])
            session.add(AuditLog(**l_data))
            
        session.commit()
        return {"message": "System Restore Successful", "counts": {
            "speakers": len(backup_data.get("speakers", [])),
            "users": len(backup_data.get("authorized_users", [])),
            "logs": len(backup_data.get("logs", []))
        }}
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=400, detail=f"Restore failed: {str(e)}")
