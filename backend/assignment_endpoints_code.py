# Task Assignment Endpoints - Add these to main.py after the login endpoint (around line 113)

# Task Assignment Endpoints
@app.post("/speakers/{speaker_id}/assign")
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
    
    session.add(speaker)
    session.commit()
    
    # Log the assignment
    log = AuditLog(
        user_name=user["username"],
        action="ASSIGN_SPEAKER",
        details=f"Assigned {speaker.name} to {assignee.name}"
    )
    session.add(log)
    session.commit()
    
    return {"message": "Speaker assigned successfully", "assigned_to": assignee.name}

@app.post("/speakers/{speaker_id}/unassign")
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
    
    session.add(speaker)
    session.commit()
    
    # Log the unassignment
    log = AuditLog(
        user_name=user["username"],
        action="UNASSIGN_SPEAKER",
        details=f"Unassigned {speaker.name}"
    )
    session.add(log)
    session.commit()
    
    return {"message": "Speaker unassigned successfully"}

# Enhanced /speakers endpoint with assignment filters
# Replace the existing @app.get("/speakers") endpoint with this:

@app.get("/speakers", response_model=List[Speaker])
def read_speakers(
    session: Session = Depends(get_session),
    status: Optional[str] = None,
    limit: int = 300,
    offset: int = 0,
    user: dict = Depends(verify_token),
    # NEW: Assignment filters
    assigned_to: Optional[str] = None,
    unassigned: bool = False,
    assigned_to_me: bool = False
):
    query = select(Speaker)
    
    if status:
        query = query.where(Speaker.status == status)
    
    # NEW: Filter by assignment
    if assigned_to:
        query = query.where(Speaker.assigned_to == assigned_to)
    
    if unassigned:
        query = query.where(Speaker.assigned_to == None)
    
    if assigned_to_me:
        query = query.where(Speaker.assigned_to == user["roll_number"])
    
    query = query.order_by(Speaker.last_updated.desc())
    query = query.offset(offset).limit(limit)
    
    speakers = session.exec(query).all()
    return speakers
