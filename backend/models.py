from typing import Optional
from sqlmodel import Field, SQLModel
from datetime import datetime
from enum import Enum

class OutreachStatus(str, Enum):
    SCOUTED = "SCOUTED"           # Added to list
    EMAIL_ADDED = "EMAIL_ADDED"   # Email/Phone added
    RESEARCHED = "RESEARCHED"     # Profile detailed
    DRAFTED = "DRAFTED"           # Email written (AI or manual)
    CONTACT_INITIATED = "CONTACT_INITIATED" # Mail sent (strict)
    CONNECTED = "CONNECTED"       # Reply received
    IN_TALKS = "IN_TALKS"         # Discussion
    LOCKED = "LOCKED"             # Confirmed

class Speaker(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    batch: Optional[str] = None
    linkedin_url: Optional[str] = None
    search_details: Optional[str] = None # To store AI research summary
    original_id: Optional[str] = None # The ID from the CSV
    name: str = Field(index=True)
    primary_domain: Optional[str] = None
    blurring_line_angle: Optional[str] = None
    location: Optional[str] = None
    outreach_priority: Optional[str] = None
    contact_method: Optional[str] = None
    
    # Tracking Fields
    email: Optional[str] = None
    spoc_name: Optional[str] = None # Single Point of Contact
    status: OutreachStatus = Field(default=OutreachStatus.SCOUTED)
    notes: Optional[str] = None
    email_draft: Optional[str] = Field(default=None) # Store HTML draft
    last_updated: datetime = Field(default_factory=datetime.now)
    is_bounty: bool = Field(default=False) # Admin flag for High Value

class SpeakerUpdate(SQLModel):
    email: Optional[str] = None
    spoc_name: Optional[str] = None
    status: Optional[OutreachStatus] = None
    notes: Optional[str] = None
    email_draft: Optional[str] = None
    contact_method: Optional[str] = None
    location: Optional[str] = None
    blurring_line_angle: Optional[str] = None
    primary_domain: Optional[str] = None
    is_bounty: Optional[bool] = None
    linkedin_url: Optional[str] = None
    search_details: Optional[str] = None

class AuditLog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_name: str
    action: str
    details: str
    timestamp: datetime = Field(default_factory=datetime.now)

class AuthorizedUser(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    roll_number: str = Field(index=True, unique=True)
    name: str
    is_admin: bool = Field(default=False)
    added_by: Optional[str] = None
    added_at: datetime = Field(default_factory=datetime.now)

class AuthorizedUserCreate(SQLModel):
    roll_number: str
    name: str
    is_admin: bool = False
