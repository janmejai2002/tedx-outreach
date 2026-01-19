# Phase 1 Integration Guide - Task Assignment & Ownership

## ✅ Completed Automatically

1. ✅ **Speaker Model Updated** (`backend/models.py`)
   - Added: `assigned_to`, `assigned_by`, `assigned_at`
   - Added: `priority`, `due_date`, `tags`
   - Added: `last_activity`

2. ✅ **SpeakerUpdate Model Updated** (`backend/models.py`)
   - Added assignment fields to allow API updates

3. ✅ **Migration Script Created** (`backend/migrate_assignment_fields.py`)
   - Ready to run to add database columns

4. ✅ **Frontend API Functions Added** (`frontend/src/api.js`)
   - `assignSpeaker(speakerId, assignedTo)`
   - `unassignSpeaker(speakerId)`
   - `getAuthorizedUsers()`

---

## 🔧 Manual Integration Required

### Step 1: Add Backend Endpoints to `main.py`

**Location**: After the `/login` endpoint (around line 113)

**Code to add**: Copy from `backend/assignment_endpoints_code.py`

The file contains:
- `POST /speakers/{speaker_id}/assign` - Assign speaker to user
- `POST /speakers/{speaker_id}/unassign` - Remove assignment
- Updated `GET /speakers` with assignment filters

**How to integrate**:
1. Open `backend/main.py`
2. Find the `/login` endpoint (around line 113)
3. After the login endpoint closing brace, paste the assignment endpoints from `assignment_endpoints_code.py`
4. Also update the existing `/speakers` endpoint with the new filter parameters

---

### Step 2: Update `OutreachModal.jsx`

**Add assignment UI section** in the modal (after speaker details, before tabs):

```jsx
import { assignSpeaker, unassignSpeaker, getAuthorizedUsers } from '../api';
import { User, UserX } from 'lucide-react';

// In component state
const [assigning, setAssigning] = useState(false);
const [authorizedUsers, setAuthorizedUsers] = useState([]);

// Fetch users on mount
useEffect(() => {
    const fetchUsers = async () => {
        if (currentUser?.is_admin) {
            try {
                const users = await getAuthorizedUsers();
                setAuthorizedUsers(users);
            } catch (error) {
                console.error('Failed to fetch users', error);
            }
        }
    };
    fetchUsers();
}, [currentUser]);

// Assignment handlers
const handleAssign = async (assignedTo) => {
    setAssigning(true);
    try {
        await assignSpeaker(speaker.id, assignedTo);
        onUpdate(speaker.id, { assigned_to: assignedTo });
        alert('Speaker assigned successfully!');
    } catch (error) {
        alert('Failed to assign speaker');
    } finally {
        setAssigning(false);
    }
};

const handleUnassign = async () => {
    setAssigning(true);
    try {
        await unassignSpeaker(speaker.id);
        onUpdate(speaker.id, { assigned_to: null });
        alert('Speaker unassigned successfully!');
    } catch (error) {
        alert('Failed to unassign speaker');
    } finally {
        setAssigning(false);
    }
};

// Add this UI section in the modal
<div className="bg-gray-800 p-4 rounded-lg mb-4">
    <h3 className="text-white font-bold mb-2 flex items-center gap-2">
        <User size={18} />
        Assignment
    </h3>
    
    {speaker.assigned_to ? (
        <div className="flex justify-between items-center">
            <span className="text-gray-300">
                Assigned to: <strong className="text-blue-400">{speaker.assigned_to}</strong>
            </span>
            {currentUser?.is_admin && (
                <button
                    onClick={handleUnassign}
                    disabled={assigning}
                    className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm text-white"
                >
                    {assigning ? 'Unassigning...' : 'Unassign'}
                </button>
            )}
        </div>
    ) : (
        <div>
            <p className="text-gray-400 mb-2 text-sm flex items-center gap-1">
                <UserX size={14} />
                Not assigned
            </p>
            {currentUser?.is_admin && (
                <select
                    onChange={(e) => e.target.value && handleAssign(e.target.value)}
                    disabled={assigning}
                    className="bg-gray-700 text-white p-2 rounded w-full text-sm"
                >
                    <option value="">Select team member...</option>
                    {authorizedUsers.map(user => (
                        <option key={user.roll_number} value={user.roll_number}>
                            {user.name} ({user.roll_number})
                        </option>
                    ))}
                </select>
            )}
        </div>
    )}
</div>
```

---

### Step 3: Update `Board.jsx`

**Add filter state and UI**:

```jsx
import { getAuthorizedUsers } from '../api';

// Add state
const [authorizedUsers, setAuthorizedUsers] = useState([]);
const [filters, setFilters] = useState({
    assigned_to: null,
    unassigned: false,
    assigned_to_me: false
});

// Fetch users on mount
useEffect(() => {
    const fetchUsers = async () => {
        if (currentUser?.is_admin) {
            try {
                const users = await getAuthorizedUsers();
                setAuthorizedUsers(users);
            } catch (error) {
                console.error('Failed to fetch users', error);
            }
        }
    };
    fetchUsers();
}, [currentUser]);

// Update fetchSpeakers to use filters
const fetchSpeakers = async () => {
    const params = new URLSearchParams();
    if (filters.assigned_to) params.append('assigned_to', filters.assigned_to);
    if (filters.unassigned) params.append('unassigned', 'true');
    if (filters.assigned_to_me) params.append('assigned_to_me', 'true');
    
    const queryString = params.toString();
    const data = await getSpeakers(queryString ? `?${queryString}` : '');
    setSpeakers(data);
};

// Re-fetch when filters change
useEffect(() => {
    fetchSpeakers();
}, [filters]);

// Add filter buttons in header (after search or before columns)
<div className="flex gap-2 mb-4">
    <button
        onClick={() => setFilters({...filters, assigned_to_me: !filters.assigned_to_me, unassigned: false})}
        className={`px-4 py-2 rounded text-sm font-bold ${filters.assigned_to_me ? 'bg-blue-600' : 'bg-gray-700'}`}
    >
        My Tasks
    </button>
    <button
        onClick={() => setFilters({...filters, unassigned: !filters.unassigned, assigned_to_me: false})}
        className={`px-4 py-2 rounded text-sm font-bold ${filters.unassigned ? 'bg-orange-600' : 'bg-gray-700'}`}
    >
        Unassigned
    </button>
    {filters.assigned_to_me || filters.unassigned ? (
        <button
            onClick={() => setFilters({ assigned_to: null, unassigned: false, assigned_to_me: false })}
            className="px-4 py-2 rounded text-sm bg-gray-600 hover:bg-gray-500"
        >
            Clear Filters
        </button>
    ) : null}
</div>
```

---

### Step 4: Update Speaker Card Display

**In the component that renders speaker cards** (likely in `Board.jsx` or a separate `SpeakerCard.jsx`):

```jsx
import { User, UserX } from 'lucide-react';

// Add this inside the speaker card (after name/domain):
<div className="flex items-center gap-2 mt-2 text-xs">
    {speaker.assigned_to ? (
        <div className="flex items-center gap-1 text-blue-400">
            <User size={12} />
            <span>{speaker.assigned_to}</span>
        </div>
    ) : (
        <div className="flex items-center gap-1 text-gray-500">
            <UserX size={12} />
            <span>Unassigned</span>
        </div>
    )}
</div>
```

---

## 🚀 Testing Steps

### 1. Run Migration

```bash
cd backend
python migrate_assignment_fields.py
```

Expected output:
```
🔄 Running migration: Add assignment fields to Speaker table...
  ✓ Added column: assigned_to
  ✓ Added column: assigned_by
  ...
✅ Migration completed successfully!
```

### 2. Restart Backend

The backend should auto-reload if using `--reload` flag. Otherwise:
```bash
python -m uvicorn main:app --reload --port 8000
```

### 3. Test Assignment Flow

1. Open `http://localhost:5173`
2. Log in as admin (b25349)
3. Click any speaker card
4. Verify "Assignment" section appears
5. Select a team member from dropdown
6. Verify speaker is assigned
7. Click "Unassign" button
8. Verify speaker shows "Not assigned"

### 4. Test Filters

1. Click "My Tasks" button
2. Verify only your assigned speakers show
3. Click "Unassigned" button
4. Verify only unassigned speakers show
5. Click "Clear Filters"
6. Verify all speakers return

### 5. Verify Speaker Cards

- Assigned speakers should show: `👤 b25xxx`
- Unassigned speakers should show: `✕ Unassigned`

---

## 📝 Commit & Deploy

Once tested locally:

```bash
git add .
git commit -m "Add Phase 1: Task assignment and ownership tracking"
git push origin master
```

Then:
1. **Deploy backend to Render** (manual deploy)
2. **Run migration on Render** (via Render shell or auto-run on startup)
3. **Test on production** (https://tedx-outreach.vercel.app)

---

## ✅ Success Criteria

- ✅ Admin can assign speakers to team members
- ✅ Admin can unassign speakers
- ✅ Speaker cards show assignment status
- ✅ "My Tasks" filter works
- ✅ "Unassigned" filter works
- ✅ Assignment is logged in audit log
- ✅ Assignment persists after page reload

---

## 🐛 Troubleshooting

**Issue**: Migration fails
- **Solution**: Check if columns already exist. Migration script handles this gracefully.

**Issue**: "Assignee not found" error
- **Solution**: Ensure user migration was run first (`migrate_users.py`)

**Issue**: Assignment UI doesn't show
- **Solution**: Verify `currentUser?.is_admin` is true. Check login response includes `is_admin` field.

**Issue**: Filters don't work
- **Solution**: Check backend `/speakers` endpoint has new filter parameters. Verify API calls include query params.
