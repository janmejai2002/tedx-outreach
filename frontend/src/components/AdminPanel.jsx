import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, TrendingUp, Shield, Trash2, UserPlus, ShieldCheck, Activity, Award } from 'lucide-react';
import { getAuthorizedUsers } from '../api';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const AdminPanel = ({ onClose, speakers = [] }) => {
    const [activeTab, setActiveTab] = useState('users'); // users | analytics
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [addingUser, setAddingUser] = useState(false);
    const [newUser, setNewUser] = useState({ roll_number: '', name: '', is_admin: false });

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const data = await getAuthorizedUsers();
            setUsers(data);
        } catch (error) {
            console.error("Failed to fetch users", error);
        } finally {
            setLoading(false);
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
            setNewUser({ roll_number: '', name: '', is_admin: false });
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
                className="w-full max-w-4xl bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-red-600/10 to-transparent">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-900/20">
                            <Shield className="text-white" size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black tracking-tight text-white uppercase">Admin Command Center</h2>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Management & Intelligence</p>
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
                        <Users size={14} /> User Management
                        {activeTab === 'users' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600" />}
                    </button>
                    <button
                        onClick={() => setActiveTab('analytics')}
                        className={`flex-1 flex items-center justify-center gap-2 p-4 text-xs font-black uppercase tracking-widest transition-all relative ${activeTab === 'analytics' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        <TrendingUp size={14} /> Team Intelligence
                        {activeTab === 'analytics' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600" />}
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {activeTab === 'users' ? (
                        <div className="space-y-8">
                            {/* Add User Section */}
                            <div className="bg-white/5 border border-white/5 rounded-2xl p-6">
                                <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <UserPlus size={16} className="text-red-500" /> Add Authorized Personnel
                                </h3>
                                <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <input
                                        type="text"
                                        placeholder="Roll Number (e.g. b25349)"
                                        value={newUser.roll_number}
                                        onChange={e => setNewUser({ ...newUser, roll_number: e.target.value })}
                                        className="bg-black border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-red-500 transition-all font-mono"
                                        required
                                    />
                                    <input
                                        type="text"
                                        placeholder="Full Name"
                                        value={newUser.name}
                                        onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                                        className="bg-black border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-red-500 transition-all"
                                        required
                                    />
                                    <div className="flex items-center gap-3 px-4">
                                        <input
                                            type="checkbox"
                                            id="admin-check"
                                            checked={newUser.is_admin}
                                            onChange={e => setNewUser({ ...newUser, is_admin: e.target.checked })}
                                            className="w-4 h-4 accent-red-600"
                                        />
                                        <label htmlFor="admin-check" className="text-xs text-gray-400 font-bold uppercase cursor-pointer">Admin Rights</label>
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={addingUser}
                                        className="bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
                                    >
                                        {addingUser ? 'Authorizing...' : 'Grant Access'}
                                    </button>
                                </form>
                            </div>

                            {/* User List */}
                            <div>
                                <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <ShieldCheck size={16} className="text-blue-500" /> Active Roster
                                </h3>
                                <div className="space-y-2">
                                    {loading ? (
                                        <div className="text-center py-8 text-gray-500 text-xs animate-pulse">Synchronizing access records...</div>
                                    ) : (
                                        users.map(user => (
                                            <div key={user.roll_number} className="bg-white/[0.03] border border-white/5 p-4 rounded-xl flex items-center justify-between hover:bg-white/5 transition-colors group">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black ${user.is_admin ? 'bg-red-600/20 text-red-500 border border-red-500/20' : 'bg-gray-800 text-gray-500 border border-white/10'}`}>
                                                        {user.name[0].toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-bold text-white">{user.name}</span>
                                                            {user.is_admin && <span className="text-[8px] bg-red-600/20 text-red-500 px-1.5 py-0.5 rounded font-black uppercase tracking-tighter border border-red-500/20">Admin</span>}
                                                        </div>
                                                        <span className="text-[10px] text-gray-550 font-mono uppercase tracking-widest opacity-60">{user.roll_number}</span>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleDeleteUser(user.roll_number)}
                                                    className="p-2 text-gray-700 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {/* Summary Stats */}
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
                                    <p className="text-[10px] text-blue-500 font-black uppercase tracking-widest mb-1">Team Efficiency</p>
                                    <h4 className="text-3xl font-black text-white">High</h4>
                                    <p className="text-[10px] text-gray-500 mt-2 font-bold uppercase">Optimal Velocity</p>
                                </div>
                            </div>

                            {/* Performance Leaderboard */}
                            <div>
                                <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <TrendingUp size={16} className="text-yellow-500" /> Lead Performance Board
                                </h3>
                                <div className="border border-white/5 rounded-2xl overflow-hidden">
                                    <div className="grid grid-cols-5 p-4 bg-white/5 border-b border-white/5 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                        <div className="col-span-2">Member</div>
                                        <div className="text-center">Leads</div>
                                        <div className="text-center">Outreach</div>
                                        <div className="text-center">Locked</div>
                                    </div>
                                    {userPerformance.map((user, idx) => (
                                        <div key={user.roll_number} className="grid grid-cols-5 p-4 border-b border-white/5 items-center hover:bg-white/[0.02] transition-colors">
                                            <div className="col-span-2 flex items-center gap-3">
                                                <div className="text-xs font-black text-gray-600 w-4">{idx + 1}.</div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-white">{user.name}</span>
                                                    <span className="text-[8px] text-gray-500 uppercase font-bold tracking-widest">{user.roll_number}</span>
                                                </div>
                                            </div>
                                            <div className="text-center text-sm font-bold text-gray-400">{user.leads}</div>
                                            <div className="text-center text-sm font-bold text-blue-400">{user.outreach}</div>
                                            <div className="text-center text-sm font-black text-green-500">{user.locked}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 bg-white/5 border-t border-white/5 text-center">
                    <p className="text-[9px] text-gray-600 font-bold uppercase tracking-[0.2em]">Authorized for Janmejai (Admin) • b25349</p>
                </div>
            </motion.div>
        </div>
    );
};

export default AdminPanel;
