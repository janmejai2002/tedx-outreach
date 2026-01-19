# Admin User Management Implementation Guide

## 🎯 What's Being Added

1. **Database-driven user management** - No more hardcoded users
2. **Admin panel** - Add/remove authorized users through UI
3. **Clean login screen** - Removed roll number hints

## 📝 Implementation Steps

### Step 1: Add Admin Endpoints to main.py

Add these endpoints after the `/login` endpoint (around line 113):

```python
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
    
    if user.roll_number == admin["roll_number"]:
        raise HTTPException(status_code=400, detail="Cannot remove yourself")
    
    session.delete(user)
    session.commit()
    
    log = AuditLog(
        user_name=admin["username"],
        action="REMOVE_USER",
        details=f"Removed {user.name} ({user.roll_number})"
    )
    session.add(log)
    session.commit()
    
    return {"message": "User removed successfully"}
```

### Step 2: Run Migration Script

**Locally:**
```bash
cd backend
python migrate_users.py
```

**On Render (after deployment):**
The migration will run automatically on first startup if the table is empty.

### Step 3: Update Frontend

#### Remove Roll Number Hint from Login

Edit `frontend/src/components/LoginModal.jsx`:

Find the input field and remove the placeholder:
```jsx
<input
    type="text"
    value={rollNumber}
    onChange={(e) => setRollNumber(e.target.value)}
    placeholder="Enter your roll number"  // REMOVE THIS LINE
    className="..."
/>
```

#### Add Admin Panel Component

Create `frontend/src/components/AdminPanel.jsx`:
```jsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, UserPlus, Trash2, Shield } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const AdminPanel = ({ isOpen, onClose, isAdmin }) => {
    const [users, setUsers] = useState([]);
    const [newUser, setNewUser] = useState({ roll_number: '', name: '', is_admin: false });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && isAdmin) {
            fetchUsers();
        }
    }, [isOpen, isAdmin]);

    const fetchUsers = async () => {
        try {
            const token = localStorage.getItem('tedx_token');
            const response = await axios.get(`${API_URL}/admin/users`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setUsers(response.data);
        } catch (error) {
            console.error('Failed to fetch users', error);
        }
    };

    const addUser = async () => {
        if (!newUser.roll_number || !newUser.name) {
            alert('Please fill in all fields');
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('tedx_token');
            await axios.post(`${API_URL}/admin/users`, newUser, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setNewUser({ roll_number: '', name: '', is_admin: false });
            fetchUsers();
            alert('User added successfully!');
        } catch (error) {
            alert(error.response?.data?.detail || 'Failed to add user');
        } finally {
            setLoading(false);
        }
    };

    const removeUser = async (rollNumber) => {
        if (!confirm(`Remove user ${rollNumber}?`)) return;

        try {
            const token = localStorage.getItem('tedx_token');
            await axios.delete(`${API_URL}/admin/users/${rollNumber}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            fetchUsers();
            alert('User removed successfully!');
        } catch (error) {
            alert(error.response?.data?.detail || 'Failed to remove user');
        }
    };

    if (!isOpen || !isAdmin) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-gray-900 rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto"
            >
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Shield className="text-red-500" />
                        Admin Panel - Manage Users
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <X size={24} />
                    </button>
                </div>

                {/* Add New User */}
                <div className="bg-gray-800 p-4 rounded-lg mb-6">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <UserPlus size={20} />
                        Add New User
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <input
                            type="text"
                            placeholder="Roll Number (e.g., b25123)"
                            value={newUser.roll_number}
                            onChange={(e) => setNewUser({ ...newUser, roll_number: e.target.value })}
                            className="bg-gray-700 text-white px-4 py-2 rounded"
                        />
                        <input
                            type="text"
                            placeholder="Full Name"
                            value={newUser.name}
                            onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                            className="bg-gray-700 text-white px-4 py-2 rounded"
                        />
                    </div>
                    <div className="flex items-center gap-4 mt-4">
                        <label className="flex items-center gap-2 text-white">
                            <input
                                type="checkbox"
                                checked={newUser.is_admin}
                                onChange={(e) => setNewUser({ ...newUser, is_admin: e.target.checked })}
                            />
                            Make Admin
                        </label>
                        <button
                            onClick={addUser}
                            disabled={loading}
                            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded font-bold"
                        >
                            {loading ? 'Adding...' : 'Add User'}
                        </button>
                    </div>
                </div>

                {/* User List */}
                <div>
                    <h3 className="text-lg font-bold text-white mb-4">Authorized Users ({users.length})</h3>
                    <div className="space-y-2">
                        {users.map(user => (
                            <div key={user.id} className="bg-gray-800 p-4 rounded flex justify-between items-center">
                                <div>
                                    <div className="text-white font-bold">{user.name}</div>
                                    <div className="text-gray-400 text-sm">{user.roll_number}</div>
                                </div>
                                <div className="flex items-center gap-4">
                                    {user.is_admin && (
                                        <span className="bg-red-600 text-white px-2 py-1 rounded text-xs font-bold">
                                            ADMIN
                                        </span>
                                    )}
                                    <button
                                        onClick={() => removeUser(user.roll_number)}
                                        className="text-red-500 hover:text-red-400"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default AdminPanel;
```

#### Add Admin Button to Board

In `Board.jsx`, add:
```jsx
import AdminPanel from './AdminPanel';

// In state
const [showAdminPanel, setShowAdminPanel] = useState(false);

// In the header (after the Hub button)
{currentUser?.is_admin && (
    <button
        onClick={() => setShowAdminPanel(true)}
        className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded flex items-center gap-2"
        title="Admin Panel"
    >
        <Shield size={20} />
        Admin
    </button>
)}

// Before closing div
<AdminPanel 
    isOpen={showAdminPanel} 
    onClose={() => setShowAdminPanel(false)}
    isAdmin={currentUser?.is_admin}
/>
```

### Step 4: Deploy

1. Commit all changes
2. Push to GitHub
3. Manually deploy on Render
4. Run migration script on Render (or it will auto-run)

## ✅ Result

- Admin can add/remove users through UI
- Login screen is clean (no hints)
- All users stored in database
- Audit log tracks all user management actions

## 🔐 Security

- Only admin (b25349) can access admin panel
- Cannot remove yourself
- All actions are logged
- JWT tokens include admin flag
