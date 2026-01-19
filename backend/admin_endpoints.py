# Admin Endpoints - Add these to main.py after the login endpoint

# Admin endpoints for managing authorized users
@app.get("/admin/users", response_model=List[AuthorizedUser])
def get_authorized_users(
    session: Session = Depends(get_session),
    admin: dict = Depends(verify_admin)
):
    """Get all authorized users (admin only)"""
    users = session.exec(select(AuthorizedUser)).all()
    return users

@app.post("/admin/users")
def add_authorized_user(
    user_data: AuthorizedUserCreate,
    session: Session = Depends(get_session),
    admin: dict = Depends(verify_admin)
):
    """Add a new authorized user (admin only)"""
    # Check if user already exists
    existing = session.exec(
        select(AuthorizedUser).where(AuthorizedUser.roll_number == user_data.roll_number.lower())
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="User already authorized")
    
    new_user = AuthorizedUser(
        roll_number=user_data.roll_number.lower(),
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

@app.delete("/admin/users/{roll_number}")
def remove_authorized_user(
    roll_number: str,
    session: Session = Depends(get_session),
    admin: dict = Depends(verify_admin)
):
    """Remove an authorized user (admin only)"""
    user = session.exec(
        select(AuthorizedUser).where(AuthorizedUser.roll_number == roll_number.lower())
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prevent removing yourself
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
