from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from database import get_session
from models import (CreativeAsset, CreativeUpdate, CreativeStatus, 
                    CreativeRequest, CreativeRequestUpdate, CreativeRequestStatus, AuditLog)
from auth_utils import verify_token, get_current_user_name
from typing import List, Optional
from datetime import datetime

router = APIRouter(tags=["creatives"])

# --- Creative Assets (Internal Team) ---

@router.get("/creatives", response_model=List[CreativeAsset])
def read_creatives(
    session: Session = Depends(get_session),
    status: Optional[str] = None
):
    query = select(CreativeAsset)
    if status:
        query = query.where(CreativeAsset.status == status)
    return session.exec(query).all()

@router.post("/creatives", response_model=CreativeAsset)
def create_creative(
    asset: CreativeAsset,
    session: Session = Depends(get_session)
):
    session.add(asset)
    session.commit()
    session.refresh(asset)
    return asset

@router.patch("/creatives/{asset_id}", response_model=CreativeAsset)
def update_creative(
    asset_id: int,
    asset_update: CreativeUpdate,
    session: Session = Depends(get_session)
):
    db_asset = session.get(CreativeAsset, asset_id)
    if not db_asset:
        raise HTTPException(status_code=404, detail="Asset not found")
        
    update_data = asset_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_asset, key, value)
        
    db_asset.last_updated = datetime.now()
    session.add(db_asset)
    session.commit()
    session.refresh(db_asset)
    return db_asset

# --- Creative Requests (Public/PR -> Creatives) ---

@router.get("/creative-requests", response_model=List[CreativeRequest])
def get_creative_requests(
    session: Session = Depends(get_session),
    user: dict = Depends(verify_token)
):
    return session.exec(select(CreativeRequest).order_by(CreativeRequest.created_at.desc())).all()

@router.post("/creative-requests", response_model=CreativeRequest)
def create_creative_request(
    request: CreativeRequest,
    session: Session = Depends(get_session),
    user: dict = Depends(verify_token)
):
    request.requested_by = user["roll_number"]
    session.add(request)
    session.commit()
    session.refresh(request)
    return request

@router.patch("/creative-requests/{request_id}", response_model=CreativeRequest)
def update_creative_request(
    request_id: int,
    update: CreativeRequestUpdate,
    session: Session = Depends(get_session),
    user: dict = Depends(verify_token)
):
    db_req = session.get(CreativeRequest, request_id)
    if not db_req:
        raise HTTPException(status_code=404, detail="Request not found")
        
    data = update.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(db_req, key, value)
        
    if update.status == CreativeRequestStatus.COMPLETED and not db_req.completed_at:
        db_req.completed_at = datetime.now()
        
    session.add(db_req)
    session.commit()
    session.refresh(db_req)
    return db_req
