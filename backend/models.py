from typing import Optional, List
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

class SponsorStatus(str, Enum):
    PROSPECT = "PROSPECT"
    CONTACTED = "CONTACTED"
    PITCHED = "PITCHED"
    NEGOTIATING = "NEGOTIATING"
    SIGNED = "SIGNED"
    ONBOARDED = "ONBOARDED"
    REJECTED = "REJECTED"

from pydantic import EmailStr, validator

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
    email: Optional[str] = Field(default=None, unique=True)
    phone: Optional[str] = None
    remarks: Optional[str] = None # Quick remarks for floating tags
    spoc_name: Optional[str] = None # Single Point of Contact
    status: OutreachStatus = Field(default=OutreachStatus.SCOUTED)
    notes: Optional[str] = None
    email_draft: Optional[str] = Field(default=None) # Store HTML draft
    last_updated: datetime = Field(default_factory=datetime.now)
    is_bounty: bool = Field(default=False) # Admin flag for High Value
    
    # Task Assignment & Ownership
    assigned_to: Optional[str] = None  # Roll number of assigned user
    assigned_by: Optional[str] = None  # Who assigned it
    assigned_at: Optional[datetime] = None
    
    # Task Management
    priority: Optional[str] = Field(default="MEDIUM")  # LOW, MEDIUM, HIGH, URGENT
    due_date: Optional[datetime] = None
    tags: Optional[str] = None  # Comma-separated tags
    
    # Activity Tracking
    last_activity: Optional[datetime] = Field(default_factory=datetime.now)

class SpeakerUpdate(SQLModel):
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    remarks: Optional[str] = None
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
    assigned_to: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[datetime] = None
    tags: Optional[str] = None

class Sponsor(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    company_name: str = Field(index=True, unique=True)
    industry: Optional[str] = None
    contact_person: Optional[str] = None
    email: Optional[str] = Field(default=None, unique=True)
    phone: Optional[str] = None
    website: Optional[str] = None
    linkedin_url: Optional[str] = None
    
    # Financials / Tiers
    target_amount: Optional[float] = None
    actual_amount: Optional[float] = None
    partnership_tier: Optional[str] = None # Title, Platinum, Gold, Silver, Associate
    
    # Tracking
    status: SponsorStatus = Field(default=SponsorStatus.PROSPECT)
    notes: Optional[str] = None
    assigned_to: Optional[str] = None # Roll number
    assigned_by: Optional[str] = None 
    assigned_at: Optional[datetime] = None
    
    # AI / Outreach
    email_draft: Optional[str] = None
    last_updated: datetime = Field(default_factory=datetime.now)

class SponsorUpdate(SQLModel):
    company_name: Optional[str] = None
    industry: Optional[str] = None
    contact_person: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    linkedin_url: Optional[str] = None
    target_amount: Optional[float] = None
    actual_amount: Optional[float] = None
    partnership_tier: Optional[str] = None
    status: Optional[SponsorStatus] = None
    notes: Optional[str] = None
    assigned_to: Optional[str] = None
    email_draft: Optional[str] = None

class UserRole(str, Enum):
    SPEAKER_OUTREACH = "SPEAKER_OUTREACH"
    SPONSOR_OUTREACH = "SPONSOR_OUTREACH"
    CREATIVES = "CREATIVES"
    ADMIN = "ADMIN"

class CreativeStatus(str, Enum):
    CONCEPT = "CONCEPT"
    SCRIPTING = "SCRIPTING"
    PRODUCTION = "PRODUCTION"
    EDITING = "EDITING"
    REVIEW = "REVIEW"
    APPROVED = "APPROVED"

class CreativeAsset(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str = Field(index=True)
    asset_type: str = Field(default="Video") # Video, Social Post, Poster, Blog
    platform: Optional[str] = None # Instagram, YouTube, LinkedIn
    description: Optional[str] = None
    moodboard_url: Optional[str] = None
    creative_brief: Optional[str] = None # AI Generated
    
    status: CreativeStatus = Field(default=CreativeStatus.CONCEPT)
    priority: Optional[str] = Field(default="MEDIUM")
    due_date: Optional[datetime] = None
    
    assigned_to: Optional[str] = None # Roll number (name)
    assigned_by: Optional[str] = None
    last_updated: datetime = Field(default_factory=datetime.now)

class CreativeUpdate(SQLModel):
    title: Optional[str] = None
    asset_type: Optional[str] = None
    platform: Optional[str] = None
    description: Optional[str] = None
    moodboard_url: Optional[str] = None
    creative_brief: Optional[str] = None
    status: Optional[CreativeStatus] = None
    priority: Optional[str] = None
    due_date: Optional[datetime] = None
    assigned_to: Optional[str] = None

class BulkUpdate(SQLModel):
    ids: List[int]
    status: Optional[OutreachStatus] = None
    assigned_to: Optional[str] = None
    is_bounty: Optional[bool] = None

class AuditLog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_name: str
    action: str
    details: str
    speaker_id: Optional[int] = Field(default=None, index=True)
    timestamp: datetime = Field(default_factory=datetime.now)


class AuthorizedUser(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    roll_number: str = Field(index=True, unique=True)
    name: str
    is_admin: bool = Field(default=False)
    role: UserRole = Field(default=UserRole.SPEAKER_OUTREACH)
    added_by: Optional[str] = None
    added_at: datetime = Field(default_factory=datetime.now)
    
    # Gamification
    xp: int = Field(default=0)
    streak: int = Field(default=0)
    last_login_date: Optional[str] = None

class AuthorizedUserUpdate(SQLModel):
    name: Optional[str] = None
    is_admin: Optional[bool] = None
    role: Optional[UserRole] = None
    xp: Optional[int] = None
    streak: Optional[int] = None
    last_login_date: Optional[str] = None

class AuthorizedUserCreate(SQLModel):
    roll_number: str
    name: str
    is_admin: bool = False
    role: UserRole = UserRole.SPEAKER_OUTREACH

# Sprint Deadline Management
class SprintDeadline(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    deadline: datetime
    description: Optional[str] = "Sprint Deadline"
    created_by: str
    created_at: datetime = Field(default_factory=datetime.now)

# Creative Request System (PR -> Creatives)
class CreativeRequestStatus(str, Enum):
    REQUESTED = "REQUESTED"
    IN_PROGRESS = "IN_PROGRESS"
    REVIEW = "REVIEW"
    COMPLETED = "COMPLETED"

class CreativeRequest(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    description: str
    requested_by: str  # Roll number
    assigned_to: Optional[str] = None  # Creative team member
    status: CreativeRequestStatus = Field(default=CreativeRequestStatus.REQUESTED)
    priority: str = Field(default="MEDIUM")  # LOW, MEDIUM, HIGH, URGENT
    due_date: Optional[datetime] = None
    file_urls: Optional[str] = None  # JSON array of uploaded file URLs
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)
    completed_at: Optional[datetime] = None

class CreativeRequestUpdate(SQLModel):
    title: Optional[str] = None
    description: Optional[str] = None
    assigned_to: Optional[str] = None
    status: Optional[CreativeRequestStatus] = None
    priority: Optional[str] = None
    due_date: Optional[datetime] = None
    file_urls: Optional[str] = None
    notes: Optional[str] = None
