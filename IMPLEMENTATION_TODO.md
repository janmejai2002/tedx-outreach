# TEDx Outreach - Remaining Implementation Tasks

## ✅ COMPLETED
1. **Backend Models & Endpoints**
   - Added `SprintDeadline` model with admin edit capability
   - Added `CreativeRequest` and `CreativeRequestStatus` models
   - Implemented `/sprint/deadline` GET endpoint (auto-creates initial: Jan 20, 2026 11:59:59 PM)
   - Implemented `/admin/sprint/deadline` POST endpoint (admin-only)
   - Implemented full CRUD for `/creative-requests`
   - Fixed `UserLogin` NameError that was causing deployment failure

## 🚧 TODO - SPRINT DEADLINE UI

### Board.jsx - Add Deadline Indicator
```javascript
// Add state
const [sprintDeadline, setSprintDeadline] = useState(null);

// Fetch deadline
useEffect(() => {
    const fetchDeadline = async () => {
        try {
            const res = await axios.get(`${API_URL}/sprint/deadline`);
            setSprintDeadline(new Date(res.data.deadline));
        } catch (e) { console.error(e); }
    };
    fetchDeadline();
}, []);

// Add countdown component in header (after logo, before search)
<div className="flex items-center gap-3 bg-red-600/10 border border-red-500/30 rounded-xl px-4 py-2">
    <Clock className="text-red-500" size={16} />
    <div>
        <p className="text-[8px] font-black text-red-500 uppercase tracking-widest">Sprint Ends In</p>
        <p className="text-sm font-black text-white font-mono">
            {sprintDeadline && calculateTimeRemaining(sprintDeadline)}
        </p>
    </div>
</div>

// Helper function
const calculateTimeRemaining = (deadline) => {
    const now = new Date();
    const diff = deadline - now;
    if (diff <= 0) return "EXPIRED";
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${days}d ${hours}h ${mins}m`;
};
```

### AdminPanel.jsx - Add Deadline Editor
```javascript
// Add to Admin Panel tabs
<button onClick={() => setActiveTab('deadline')}>
    <Clock size={14} /> Sprint Deadline
</button>

// Add deadline editor section
{activeTab === 'deadline' && (
    <div>
        <h3>Current Deadline: {currentDeadline}</h3>
        <input type="datetime-local" onChange={...} />
        <button onClick={updateDeadline}>Update Deadline</button>
    </div>
)}
```

## 🚧 TODO - CREATIVE REQUEST SYSTEM

### Create New Component: `CreativeRequestBoard.jsx`
- PR team can create requests with title, description, priority, due date
- Creatives team can see all requests
- Upload functionality for completed files
- Status tracking: REQUESTED → IN_PROGRESS → REVIEW → COMPLETED

### Fix Navigation Bug
The issue is likely in App.jsx or wherever CreativeBoard is mounted. Need to ensure `onSwitchMode` prop properly navigates back to main board.

**Fix in App.jsx** (or wherever CreativeBoard is used):
```javascript
const [currentView, setCurrentView] = useState('board'); // 'board' or 'creative'

{currentView === 'board' && <Board onSwitchToCreative={() => setCurrentView('creative')} />}
{currentView === 'creative' && <CreativeBoard onSwitchMode={() => setCurrentView('board')} />}
```

## 📋 PRIORITY ORDER
1. Fix CreativeBoard navigation (CRITICAL - blocking bug)
2. Add Sprint Deadline countdown to Board header
3. Add Deadline editor to AdminPanel
4. Create CreativeRequestBoard component
5. Integrate file upload for creative requests

## 🎯 DARK PSYCHOLOGY ENHANCEMENTS COMPLETED
- ✅ Dismissible quest cards
- ✅ Streak system with loss aversion
- ✅ Daily goals with urgency timers
- ✅ Progress bars and completion tracking
- ✅ Bonus multipliers for streaks

