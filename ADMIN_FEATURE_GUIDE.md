# TEDx Outreach Platform - Enhanced Admin & Features Implementation Plan

## 🎯 Overview

This plan adds enterprise-grade features to transform the TEDx Outreach platform into a production-ready CRM system with:
- **Task Assignment & Ownership Tracking**
- **Advanced Filtering & Search**
- **Admin Panel with Team Management**
- **Industry-Standard CRM Features**

---

## 📋 Phase 1: Task Assignment & Ownership

### Backend Changes

#### 1.1 Update Speaker Model (`backend/models.py`)

Add ownership and assignment fields:

```python
class Speaker(SQLModel, table=True):
    # ... existing fields ...
    
    # NEW: Ownership & Assignment
    assigned_to: Optional[str] = None  # Roll number of assigned user
    assigned_by: Optional[str] = None  # Who assigned it
    assigned_at: Optional[datetime] = None
    
    # NEW: Task Management
    priority: Optional[str] = Field(default="MEDIUM")  # LOW, MEDIUM, HIGH, URGENT
    due_date: Optional[datetime] = None
    tags: Optional[str] = None  # Comma-separated tags
    
    # NEW: Collaboration
    watchers: Optional[str] = None  # Comma-separated roll numbers
    last_activity: Optional[datetime] = Field(default_factory=datetime.now)
```

#### 1.2 Add Assignment Endpoints (`backend/main.py`)

```python
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
    
    return {"message": "Speaker unassigned successfully"}
```

---

## 📋 Phase 2: Advanced Filtering & Search

### 2.1 Enhanced Speaker Endpoint

Update `/speakers` endpoint with comprehensive filters:

```python
@app.get("/speakers", response_model=List[Speaker])
def read_speakers(
    session: Session = Depends(get_session),
    user: dict = Depends(verify_token),
    # Existing filters
    status: Optional[str] = None,
    limit: int = 300,
    offset: int = 0,
    # NEW: Advanced filters
    assigned_to: Optional[str] = None,  # Filter by assignee
    assigned_to_me: bool = False,  # Show only my assignments
    unassigned: bool = False,  # Show unassigned only
    priority: Optional[str] = None,  # Filter by priority
    search: Optional[str] = None,  # Search name, domain, location
    tags: Optional[str] = None,  # Filter by tags
    is_bounty: Optional[bool] = None,  # Filter bounties
    domain: Optional[str] = None,  # Filter by primary domain
    location: Optional[str] = None,  # Filter by location
    due_soon: bool = False,  # Due in next 7 days
    overdue: bool = False,  # Past due date
    sort_by: Optional[str] = "last_updated",  # Sort field
    sort_order: Optional[str] = "desc"  # asc or desc
):
    query = select(Speaker)
    
    # Apply filters
    if status:
        query = query.where(Speaker.status == status)
    
    if assigned_to:
        query = query.where(Speaker.assigned_to == assigned_to)
    
    if assigned_to_me:
        query = query.where(Speaker.assigned_to == user["roll_number"])
    
    if unassigned:
        query = query.where(Speaker.assigned_to == None)
    
    if priority:
        query = query.where(Speaker.priority == priority)
    
    if search:
        search_term = f"%{search}%"
        query = query.where(
            (Speaker.name.ilike(search_term)) |
            (Speaker.primary_domain.ilike(search_term)) |
            (Speaker.location.ilike(search_term))
        )
    
    if tags:
        query = query.where(Speaker.tags.contains(tags))
    
    if is_bounty is not None:
        query = query.where(Speaker.is_bounty == is_bounty)
    
    if domain:
        query = query.where(Speaker.primary_domain.ilike(f"%{domain}%"))
    
    if location:
        query = query.where(Speaker.location.ilike(f"%{location}%"))
    
    if due_soon:
        week_from_now = datetime.now() + timedelta(days=7)
        query = query.where(
            (Speaker.due_date != None) &
            (Speaker.due_date <= week_from_now) &
            (Speaker.due_date >= datetime.now())
        )
    
    if overdue:
        query = query.where(
            (Speaker.due_date != None) &
            (Speaker.due_date < datetime.now())
        )
    
    # Sorting
    if sort_by == "last_updated":
        query = query.order_by(Speaker.last_updated.desc() if sort_order == "desc" else Speaker.last_updated.asc())
    elif sort_by == "name":
        query = query.order_by(Speaker.name.asc() if sort_order == "asc" else Speaker.name.desc())
    elif sort_by == "priority":
        query = query.order_by(Speaker.priority.desc() if sort_order == "desc" else Speaker.priority.asc())
    elif sort_by == "due_date":
        query = query.order_by(Speaker.due_date.asc() if sort_order == "asc" else Speaker.due_date.desc())
    
    # Pagination
    query = query.offset(offset).limit(limit)
    
    speakers = session.exec(query).all()
    return speakers
```

---

## 📋 Phase 3: Enhanced Admin Panel

### 3.1 Admin Dashboard Features

#### Team Performance Analytics
```python
@app.get("/admin/analytics/team-performance")
def get_team_performance(
    session: Session = Depends(get_session),
    admin: dict = Depends(verify_admin)
):
    """Get team performance metrics"""
    users = session.exec(select(AuthorizedUser)).all()
    
    performance = []
    for user in users:
        # Count speakers by status
        assigned_speakers = session.exec(
            select(Speaker).where(Speaker.assigned_to == user.roll_number)
        ).all()
        
        locked_count = len([s for s in assigned_speakers if s.status == "LOCKED"])
        in_progress = len([s for s in assigned_speakers if s.status not in ["LOCKED", "SCOUTED"]])
        total_assigned = len(assigned_speakers)
        
        # Calculate conversion rate
        conversion_rate = (locked_count / total_assigned * 100) if total_assigned > 0 else 0
        
        performance.append({
            "user": user.name,
            "roll_number": user.roll_number,
            "total_assigned": total_assigned,
            "locked": locked_count,
            "in_progress": in_progress,
            "conversion_rate": round(conversion_rate, 2),
            "is_admin": user.is_admin
        })
    
    # Sort by locked count
    performance.sort(key=lambda x: x["locked"], reverse=True)
    
    return performance
```

#### Bulk Assignment
```python
@app.post("/admin/bulk-assign")
def bulk_assign_speakers(
    speaker_ids: List[int],
    assigned_to: str,
    session: Session = Depends(get_session),
    admin: dict = Depends(verify_admin)
):
    """Bulk assign multiple speakers to a user"""
    assignee = session.exec(
        select(AuthorizedUser).where(AuthorizedUser.roll_number == assigned_to)
    ).first()
    
    if not assignee:
        raise HTTPException(status_code=404, detail="Assignee not found")
    
    assigned_count = 0
    for speaker_id in speaker_ids:
        speaker = session.get(Speaker, speaker_id)
        if speaker:
            speaker.assigned_to = assigned_to
            speaker.assigned_by = admin["roll_number"]
            speaker.assigned_at = datetime.now()
            speaker.last_activity = datetime.now()
            session.add(speaker)
            assigned_count += 1
    
    session.commit()
    
    log = AuditLog(
        user_name=admin["username"],
        action="BULK_ASSIGN",
        details=f"Bulk assigned {assigned_count} speakers to {assignee.name}"
    )
    session.add(log)
    session.commit()
    
    return {"message": f"Successfully assigned {assigned_count} speakers"}
```

---

## 📋 Phase 4: Industry-Standard CRM Features

### 4.1 Activity Timeline

```python
class Activity(SQLModel, table=True):
    """Track all activities on a speaker"""
    id: Optional[int] = Field(default=None, primary_key=True)
    speaker_id: int = Field(foreign_key="speaker.id")
    user_name: str
    activity_type: str  # STATUS_CHANGE, NOTE_ADDED, EMAIL_SENT, ASSIGNED, etc.
    description: str
    metadata: Optional[str] = None  # JSON string for additional data
    timestamp: datetime = Field(default_factory=datetime.now)

@app.get("/speakers/{speaker_id}/activity")
def get_speaker_activity(
    speaker_id: int,
    session: Session = Depends(get_session),
    user: dict = Depends(verify_token)
):
    """Get activity timeline for a speaker"""
    activities = session.exec(
        select(Activity)
        .where(Activity.speaker_id == speaker_id)
        .order_by(Activity.timestamp.desc())
    ).all()
    
    return activities
```

### 4.2 Email Templates

```python
class EmailTemplate(SQLModel, table=True):
    """Reusable email templates"""
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    subject_template: str
    body_template: str
    created_by: str
    is_public: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.now)

@app.get("/email-templates")
def get_email_templates(
    session: Session = Depends(get_session),
    user: dict = Depends(verify_token)
):
    """Get all email templates"""
    templates = session.exec(
        select(EmailTemplate).where(
            (EmailTemplate.is_public == True) |
            (EmailTemplate.created_by == user["roll_number"])
        )
    ).all()
    return templates
```

### 4.3 Reminders & Notifications

```python
class Reminder(SQLModel, table=True):
    """Set reminders for follow-ups"""
    id: Optional[int] = Field(default=None, primary_key=True)
    speaker_id: int = Field(foreign_key="speaker.id")
    user_roll: str
    reminder_date: datetime
    message: str
    is_completed: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.now)

@app.get("/reminders/upcoming")
def get_upcoming_reminders(
    session: Session = Depends(get_session),
    user: dict = Depends(verify_token)
):
    """Get upcoming reminders for current user"""
    reminders = session.exec(
        select(Reminder)
        .where(
            (Reminder.user_roll == user["roll_number"]) &
            (Reminder.is_completed == False) &
            (Reminder.reminder_date >= datetime.now())
        )
        .order_by(Reminder.reminder_date.asc())
    ).all()
    
    return reminders
```

### 4.4 Export & Reporting

```python
@app.get("/export/speakers")
def export_speakers(
    session: Session = Depends(get_session),
    user: dict = Depends(verify_token),
    format: str = "csv",  # csv or excel
    status: Optional[str] = None
):
    """Export speakers data"""
    query = select(Speaker)
    if status:
        query = query.where(Speaker.status == status)
    
    speakers = session.exec(query).all()
    
    # Convert to DataFrame
    data = [
        {
            "Name": s.name,
            "Domain": s.primary_domain,
            "Status": s.status,
            "Email": s.email,
            "Location": s.location,
            "Assigned To": s.assigned_to or "Unassigned",
            "Priority": s.priority,
            "Last Updated": s.last_updated.strftime("%Y-%m-%d %H:%M")
        }
        for s in speakers
    ]
    
    df = pd.DataFrame(data)
    
    if format == "excel":
        output = io.BytesIO()
        df.to_excel(output, index=False)
        output.seek(0)
        return Response(
            content=output.getvalue(),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=speakers.xlsx"}
        )
    else:
        csv_data = df.to_csv(index=False)
        return Response(
            content=csv_data,
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=speakers.csv"}
        )
```

---

## 📋 Phase 5: Frontend Enhancements

### 5.1 Speaker Card with Ownership

Update `SpeakerCard.jsx`:

```jsx
const SpeakerCard = ({ speaker, onClick }) => {
    const getAssigneeDisplay = () => {
        if (!speaker.assigned_to) {
            return (
                <div className="flex items-center gap-1 text-xs text-gray-400">
                    <UserX size={12} />
                    <span>Unassigned</span>
                </div>
            );
        }
        
        return (
            <div className="flex items-center gap-1 text-xs text-blue-400">
                <User size={12} />
                <span>{speaker.assigned_to}</span>
            </div>
        );
    };
    
    const getPriorityColor = () => {
        switch(speaker.priority) {
            case 'URGENT': return 'bg-red-600';
            case 'HIGH': return 'bg-orange-500';
            case 'MEDIUM': return 'bg-yellow-500';
            case 'LOW': return 'bg-green-500';
            default: return 'bg-gray-500';
        }
    };
    
    return (
        <motion.div
            className="bg-gray-800 p-4 rounded-lg cursor-pointer hover:bg-gray-700"
            onClick={onClick}
        >
            {/* Priority Indicator */}
            <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-white">{speaker.name}</h3>
                <div className={`w-2 h-2 rounded-full ${getPriorityColor()}`} />
            </div>
            
            {/* Domain */}
            <p className="text-sm text-gray-400 mb-2">{speaker.primary_domain}</p>
            
            {/* Assignment & Tags */}
            <div className="flex justify-between items-center">
                {getAssigneeDisplay()}
                
                {speaker.tags && (
                    <div className="flex gap-1">
                        {speaker.tags.split(',').slice(0, 2).map(tag => (
                            <span key={tag} className="text-xs bg-purple-600/20 text-purple-400 px-2 py-0.5 rounded">
                                {tag}
                            </span>
                        ))}
                    </div>
                )}
            </div>
            
            {/* Due Date Warning */}
            {speaker.due_date && new Date(speaker.due_date) < new Date() && (
                <div className="mt-2 text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle size={12} />
                    Overdue
                </div>
            )}
        </motion.div>
    );
};
```

### 5.2 Advanced Filter Panel

Create `FilterPanel.jsx`:

```jsx
const FilterPanel = ({ filters, setFilters, users }) => {
    return (
        <div className="bg-gray-800 p-4 rounded-lg space-y-4">
            <h3 className="font-bold text-white">Filters</h3>
            
            {/* Assignment Filter */}
            <div>
                <label className="text-sm text-gray-400">Assigned To</label>
                <select
                    value={filters.assigned_to || ''}
                    onChange={(e) => setFilters({...filters, assigned_to: e.target.value})}
                    className="w-full bg-gray-700 text-white p-2 rounded mt-1"
                >
                    <option value="">All</option>
                    <option value="unassigned">Unassigned</option>
                    <option value="me">My Tasks</option>
                    {users.map(user => (
                        <option key={user.roll_number} value={user.roll_number}>
                            {user.name}
                        </option>
                    ))}
                </select>
            </div>
            
            {/* Priority Filter */}
            <div>
                <label className="text-sm text-gray-400">Priority</label>
                <select
                    value={filters.priority || ''}
                    onChange={(e) => setFilters({...filters, priority: e.target.value})}
                    className="w-full bg-gray-700 text-white p-2 rounded mt-1"
                >
                    <option value="">All</option>
                    <option value="URGENT">Urgent</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                </select>
            </div>
            
            {/* Search */}
            <div>
                <label className="text-sm text-gray-400">Search</label>
                <input
                    type="text"
                    value={filters.search || ''}
                    onChange={(e) => setFilters({...filters, search: e.target.value})}
                    placeholder="Name, domain, location..."
                    className="w-full bg-gray-700 text-white p-2 rounded mt-1"
                />
            </div>
            
            {/* Quick Filters */}
            <div className="flex flex-wrap gap-2">
                <button
                    onClick={() => setFilters({...filters, is_bounty: true})}
                    className="text-xs bg-yellow-600/20 text-yellow-400 px-3 py-1 rounded"
                >
                    Bounties Only
                </button>
                <button
                    onClick={() => setFilters({...filters, due_soon: true})}
                    className="text-xs bg-orange-600/20 text-orange-400 px-3 py-1 rounded"
                >
                    Due Soon
                </button>
                <button
                    onClick={() => setFilters({...filters, overdue: true})}
                    className="text-xs bg-red-600/20 text-red-400 px-3 py-1 rounded"
                >
                    Overdue
                </button>
            </div>
            
            {/* Clear Filters */}
            <button
                onClick={() => setFilters({})}
                className="w-full bg-gray-700 hover:bg-gray-600 text-white p-2 rounded"
            >
                Clear All Filters
            </button>
        </div>
    );
};
```

### 5.3 Enhanced Admin Panel

Update `AdminPanel.jsx` with new tabs:

```jsx
const AdminPanel = ({ isOpen, onClose, isAdmin }) => {
    const [activeTab, setActiveTab] = useState('users'); // users, analytics, bulk-actions
    
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <motion.div className="bg-gray-900 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                {/* Tabs */}
                <div className="flex gap-4 mb-6 border-b border-gray-700">
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`pb-2 ${activeTab === 'users' ? 'border-b-2 border-red-500 text-white' : 'text-gray-400'}`}
                    >
                        User Management
                    </button>
                    <button
                        onClick={() => setActiveTab('analytics')}
                        className={`pb-2 ${activeTab === 'analytics' ? 'border-b-2 border-red-500 text-white' : 'text-gray-400'}`}
                    >
                        Team Analytics
                    </button>
                    <button
                        onClick={() => setActiveTab('bulk')}
                        className={`pb-2 ${activeTab === 'bulk' ? 'border-b-2 border-red-500 text-white' : 'text-gray-400'}`}
                    >
                        Bulk Actions
                    </button>
                </div>
                
                {/* Tab Content */}
                {activeTab === 'users' && <UserManagementTab />}
                {activeTab === 'analytics' && <TeamAnalyticsTab />}
                {activeTab === 'bulk' && <BulkActionsTab />}
            </motion.div>
        </div>
    );
};
```

---

## 📋 Implementation Priority

### Phase 1 (Week 1): Core Features
1. ✅ Task assignment backend
2. ✅ Ownership tracking in cards
3. ✅ Basic filters (assigned_to, unassigned, my tasks)

### Phase 2 (Week 2): Advanced Features
1. ✅ Advanced filtering (priority, search, tags)
2. ✅ Admin analytics dashboard
3. ✅ Bulk assignment

### Phase 3 (Week 3): CRM Features
1. ✅ Activity timeline
2. ✅ Email templates
3. ✅ Reminders system

### Phase 4 (Week 4): Polish & Export
1. ✅ Export functionality
2. ✅ Enhanced UI/UX
3. ✅ Performance optimization

---

## 🚀 Quick Start

1. Run database migration: `python backend/migrate_users.py`
2. Update models with new fields
3. Add admin endpoints to main.py
4. Update frontend components
5. Test locally
6. Deploy to production

---

## 📊 Expected Impact

- **50% faster** task assignment with bulk actions
- **Better visibility** with ownership tracking
- **Improved accountability** with activity timeline
- **Data-driven decisions** with team analytics
- **Professional CRM** experience matching industry standards
