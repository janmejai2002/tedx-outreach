import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Users, TrendingUp, Shield, Trash2, UserPlus,
    ShieldCheck, Activity, Award, CheckSquare,
    Palette, Building2, User
} from 'lucide-react';
import { getAllUsers, updateUserRole } from '../api';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const AdminPanel = ({ onClose, speakers = [] }) => {
    const [activeTab, setActiveTab] = useState('users'); // users | analytics
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [addingUser, setAddingUser] = useState(false);
    const [newUser, setNewUser] = useState({ roll_number: '', name: '', is_admin: false, role: 'SPEAKER_OUTREACH' });

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const data = await getAllUsers();
            setUsers(data);
        } catch (error) {
            console.error("Failed to fetch users", error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateUser = async (roll, patches) => {
        try {
            await updateUserRole(roll, patches);
            fetchUsers();
        } catch (error) {
            alert("Failed to update user status");
        }
    };

    const handleAddUser = async (e) => {
        e.preventDefault();
        setAddingUser(true);
        try {
            const token = localStorage.getItem('tedx_token');
            await axios.post(`${API_URL}/admin/users`, newUser, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setNewUser({ roll_number: '', name: '', is_admin: false, role: 'SPEAKER_OUTREACH' });
            fetchUsers();
            alert("User added successfully");
        } catch (error) {
            alert(error.response?.data?.detail || "Failed to add user");
        } finally {
            setAddingUser(false);
        }
    };

    const handleDeleteUser = async (roll) => {
        if (!window.confirm(`Are you sure you want to remove ${roll}?`)) return;
        try {
            const token = localStorage.getItem('tedx_token');
            await axios.delete(`${API_URL}/admin/users/${roll}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            fetchUsers();
        } catch (error) {
            alert(error.response?.data?.detail || "Failed to remove user");
        }
    };

    const getRoleIcon = (role) => {
        switch (role) {
            case 'CREATIVES': return <Palette size={12} className="text-purple-400" />;
            case 'SPONSOR_OUTREACH': return <Building2 size={12} className="text-emerald-400" />;
            default: return <User size={12} className="text-red-400" />;
        }
    };

    // Analytics Calculations
    const totalSpeakers = speakers.length;
    const lockedSpeakers = speakers.filter(s => s.status === 'LOCKED').length;
    const conversionRate = totalSpeakers > 0 ? ((lockedSpeakers / totalSpeakers) * 100).toFixed(1) : 0;

    const userPerformance = users.map(user => {
        const userLeads = speakers.filter(s => s.assigned_to === user.roll_number);
        const userLocked = userLeads.filter(s => s.status === 'LOCKED').length;
        const userOutreach = userLeads.filter(s => ['CONTACT_INITIATED', 'CONNECTED', 'IN_TALKS', 'LOCKED'].includes(s.status)).length;
        return {
            ...user,
            leads: userLeads.length,
            locked: userLocked,
            outreach: userOutreach,
            efficiency: userLeads.length > 0 ? ((userLocked / userLeads.length) * 100).toFixed(1) : 0
        };
    }).sort((a, b) => b.locked - a.locked);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="w-full max-w-5xl bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-red-600/10 to-transparent">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-900/20">
                            <Shield className="text-white" size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black tracking-tight text-white uppercase">Team Authority Center</h2>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Global Roles & Data Integrity</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                {/* Navbar */}
                <div className="flex bg-white/5 border-b border-white/5">
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`flex-1 flex items-center justify-center gap-2 p-4 text-xs font-black uppercase tracking-widest transition-all relative ${activeTab === 'users' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        <Users size={14} /> Global Roster
                        {activeTab === 'users' && <motion.div layoutId="tab-admin" className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600" />}
                    </button>
                    <button
                        onClick={() => setActiveTab('analytics')}
                        className={`flex-1 flex items-center justify-center gap-2 p-4 text-xs font-black uppercase tracking-widest transition-all relative ${activeTab === 'analytics' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        <TrendingUp size={14} /> Team IQ
                        {activeTab === 'analytics' && <motion.div layoutId="tab-admin" className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600" />}
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {activeTab === 'users' ? (
                        <div className="space-y-8">
                            {/* Add User Section */}
                            <div className="bg-white/5 border border-white/5 rounded-2xl p-6">
                                <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <UserPlus size={16} className="text-red-500" /> Onboard Team Member
                                </h3>
                                <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                    <input
                                        type="text"
                                        placeholder="Roll (b25349)"
                                        value={newUser.roll_number}
                                        onChange={e => setNewUser({ ...newUser, roll_number: e.target.value })}
                                        className="bg-black border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-red-500 transition-all font-mono"
                                        required
                                    />
                                    <input
                                        type="text"
                                        placeholder="Full Name"
                                        value={newUser.name}
                                        onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                                        className="bg-black border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-red-500 transition-all"
                                        required
                                    />
                                    <select
                                        value={newUser.role}
                                        onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                                        className="bg-black border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-red-500"
                                    >
                                        <option value="SPEAKER_OUTREACH">Speaker Outreach</option>
                                        <option value="SPONSOR_OUTREACH">Sponsor Outreach</option>
                                        <option value="CREATIVES">Creatives</option>
                                    </select>
                                    <div className="flex items-center gap-3 px-4">
                                        <input
                                            type="checkbox"
                                            id="admin-check"
                                            checked={newUser.is_admin}
                                            onChange={e => setNewUser({ ...newUser, is_admin: e.target.checked })}
                                            className="w-4 h-4 accent-red-600"
                                        />
                                        <label htmlFor="admin-check" className="text-[10px] text-gray-500 font-black uppercase cursor-pointer">Admin</label>
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={addingUser}
                                        className="bg-red-600 hover:bg-red-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
                                    >
                                        {addingUser ? '...' : 'Add to Team'}
                                    </button>
                                </form>
                            </div>

                            {/* User List */}
                            <div className="space-y-4">
                                <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <ShieldCheck size={14} /> Platform Access Matrix
                                </h3>
                                <div className="border border-white/5 rounded-2xl overflow-hidden bg-white/5">
                                    <div className="grid grid-cols-6 p-4 border-b border-white/10 text-[9px] font-black text-gray-600 uppercase tracking-widest">
                                        <div className="col-span-2">Personnel</div>
                                        <div>Role Assignment</div>
                                        <div className="text-center">Permissions</div>
                                        <div className="text-center">Transparency</div>
                                        <div className="text-right">Actions</div>
                                    </div>
                                    {users.map(user => (
                                        <div key={user.roll_number} className="grid grid-cols-6 p-4 items-center border-b border-white/5 hover:bg-white/5 transition-colors group">
                                            <div className="col-span-2 flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center font-black text-[10px] text-gray-500 border border-white/5">
                                                    {user.name[0]}
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-white">{user.name}</p>
                                                    <p className="text-[9px] font-mono text-gray-600 uppercase">{user.roll_number}</p>
                                                </div>
                                            </div>
                                            <div>
                                                <select
                                                    value={user.role}
                                                    onChange={(e) => handleUpdateUser(user.roll_number, { role: e.target.value })}
                                                    className="bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-gray-400 focus:text-white"
                                                >
                                                    <option value="SPEAKER_OUTREACH">Speaker Outreach</option>
                                                    <option value="SPONSOR_OUTREACH">Sponsor Outreach</option>
                                                    <option value="CREATIVES">Creatives</option>
                                                </select>
                                            </div>
                                            <div className="text-center">
                                                <button
                                                    onClick={() => handleUpdateUser(user.roll_number, { is_admin: !user.is_admin })}
                                                    className={`px-3 py-1 rounded-full text-[8px] font-black uppercase transition-all ${user.is_admin ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-gray-800 text-gray-600 border border-white/5'}`}
                                                >
                                                    {user.is_admin ? 'ADMIN ACCESS' : 'MEMBER'}
                                                </button>
                                            </div>
                                            <div className="text-center">
                                                <span className="text-[8px] font-black text-green-500 bg-green-500/10 px-2 py-1 rounded border border-green-500/20">FULL VIEW</span>
                                            </div>
                                            <div className="text-right">
                                                <button
                                                    onClick={() => handleDeleteUser(user.roll_number)}
                                                    className="p-2 text-gray-700 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-gradient-to-br from-red-600/10 to-transparent p-6 rounded-2xl border border-red-500/10">
                                    <p className="text-[10px] text-red-500 font-black uppercase tracking-widest mb-1">Total Pipeline</p>
                                    <h4 className="text-3xl font-black text-white">{totalSpeakers}</h4>
                                    <p className="text-[10px] text-gray-500 mt-2 font-bold uppercase">Active Prospects</p>
                                </div>
                                <div className="bg-gradient-to-br from-green-600/10 to-transparent p-6 rounded-2xl border border-green-500/10">
                                    <p className="text-[10px] text-green-500 font-black uppercase tracking-widest mb-1">Conversion Rate</p>
                                    <h4 className="text-3xl font-black text-white">{conversionRate}%</h4>
                                    <p className="text-[10px] text-gray-500 mt-2 font-bold uppercase">{lockedSpeakers} Leads Locked</p>
                                </div>
                                <div className="bg-gradient-to-br from-blue-600/10 to-transparent p-6 rounded-2xl border border-blue-500/10">
                                    <p className="text-[10px] text-blue-500 font-black uppercase tracking-widest mb-1">Team Velocity</p>
                                    <h4 className="text-3xl font-black text-white">Aggressive</h4>
                                    <p className="text-[10px] text-gray-500 mt-2 font-bold uppercase">Optimal Output</p>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <TrendingUp size={16} className="text-yellow-500" /> Team Contribution matrix
                                </h3>
                                <div className="border border-white/5 rounded-2xl overflow-hidden bg-white/5">
                                    <div className="grid grid-cols-6 p-4 border-b border-white/10 text-[9px] font-black text-gray-600 uppercase tracking-widest">
                                        <div className="col-span-2">Member</div>
                                        <div className="text-center">Role</div>
                                        <div className="text-center">Managed</div>
                                        <div className="text-center">Outcome</div>
                                        <div className="text-center">IQ Rating</div>
                                    </div>
                                    {userPerformance.map((user, idx) => (
                                        <div key={user.roll_number} className="grid grid-cols-6 p-4 border-b border-white/5 items-center hover:bg-white/[0.02] transition-colors">
                                            <div className="col-span-2 flex items-center gap-3">
                                                <div className="text-xs font-black text-gray-600 w-4">{idx + 1}.</div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-white">{user.name}</span>
                                                    <span className="text-[8px] text-gray-600 font-mono">{user.roll_number}</span>
                                                </div>
                                            </div>
                                            <div className="flex justify-center">
                                                <div className="flex items-center gap-2 bg-white/5 px-2 py-1 rounded border border-white/5">
                                                    {getRoleIcon(user.role)}
                                                    <span className="text-[8px] font-black text-gray-400 uppercase tracking-tighter">
                                                        {user.role?.replace('_OUTREACH', '')}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="text-center text-sm font-bold text-gray-400">{user.leads}</div>
                                            <div className="text-center text-sm font-black text-green-500">{user.locked}</div>
                                            <div className="text-center">
                                                <div className="flex gap-0.5 justify-center">
                                                    {[1, 2, 3, 4, 5].map(s => <div key={s} className={`w-1 h-3 rounded-full ${s <= (user.locked > 5 ? 5 : user.locked || 1) ? 'bg-red-500' : 'bg-gray-800'}`} />)}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 bg-white/5 border-t border-white/5 text-center flex justify-between items-center px-10">
                    <p className="text-[9px] text-gray-600 font-bold uppercase tracking-[0.2em]">Platform Transparency: Active</p>
                    <p className="text-[9px] text-gray-400 font-black uppercase tracking-[0.2em]">TEDxXLRI Hub Management Terminal</p>
                </div>
            </motion.div>
        </div>
    );
};

export default AdminPanel;
