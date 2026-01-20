import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckSquare, Trash2, Edit3, ArrowRight } from 'lucide-react';
import {
    DndContext,
    closestCorners,
    DragOverlay,
    useDroppable,
    useSensor,
    useSensors,
    PointerSensor,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import SpeakerCard from './SpeakerCard';
import OutreachModal from './OutreachModal';
import AddSpeakerModal from './AddSpeakerModal';
import LoginModal from './LoginModal';
import GuideModal from './GuideModal';
import AdminPanel from './AdminPanel';
import FocusMode from './FocusMode';
import TourOverlay from './TourOverlay';
import RecruiterDashboard from './RecruiterDashboard';
import IngestionModal from './IngestionModal';
import { getSpeakers, updateSpeaker, exportSpeakers, getLogs, bulkUpdateSpeakers } from '../api';
import { Search, Filter, Trophy, Zap, Download, Undo, Redo, Star, Flame, Target, Bell, ListTodo, X, CircleHelp, Shield, Users, CheckCircle, LayoutGrid, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

// New Granular Workflow
const SECTIONS = {
    SCOUTED: 'Scouted',
    EMAIL_ADDED: 'Email Added 📧',
    RESEARCHED: 'Researched 🔍',
    DRAFTED: 'Drafted 🤖',
    CONTACT_INITIATED: 'Contact Sent 📨',
    CONNECTED: 'Connected 🤝',
    IN_TALKS: 'In Talks 🗣️',
    LOCKED: 'Confirmed 🔒'
};

// XP System
const XP_MAP = {
    RESEARCHED: 10,
    CONTACT_INITIATED: 50,
    LOCKED: 500
};

const getBadge = (xp) => {
    if (xp >= 5000) return { name: 'Legend', icon: '🏆', color: 'text-yellow-400' };
    if (xp >= 1000) return { name: 'Ambassador', icon: '🥇', color: 'text-yellow-500' };
    if (xp >= 500) return { name: 'Diplomat', icon: '🥈', color: 'text-gray-300' };
    if (xp >= 100) return { name: 'Scout', icon: '🥉', color: 'text-orange-400' };
    return { name: 'Rookie', icon: '👶', color: 'text-gray-500' };
};

const Board = ({ onSwitchMode }) => {
    const [speakers, setSpeakers] = useState([]);
    const [filteredSpeakers, setFilteredSpeakers] = useState([]);
    const [activeId, setActiveId] = useState(null);
    const [currentUser, setCurrentUser] = useState(() => {
        try {
            const saved = localStorage.getItem('tedx_user_obj');
            return saved ? JSON.parse(saved) : null;
        } catch {
            return null;
        }
    });

    const [selectedSpeaker, setSelectedSpeaker] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    // Assignment & Filtering State
    const [authorizedUsers, setAuthorizedUsers] = useState([]);
    const [userMap, setUserMap] = useState({}); // Maps roll_number -> name
    const [filterMode, setFilterMode] = useState('ALL'); // ALL, ME, UNASSIGNED

    // Gamification State
    const [userXP, setUserXP] = useState(0);
    const [leaderboard, setLeaderboard] = useState([]);
    const [streak, setStreak] = useState(0);

    // Check Streak on Load
    useEffect(() => {
        if (currentUser) {
            const lastLogin = localStorage.getItem('last_login_date');
            const currentStreak = parseInt(localStorage.getItem('user_streak') || '0');
            const today = new Date().toDateString();

            if (lastLogin !== today) {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);

                if (lastLogin === yesterday.toDateString()) {
                    // Conniecutive day
                    const newStreak = currentStreak + 1;
                    setStreak(newStreak);
                    localStorage.setItem('user_streak', newStreak);
                    // Bonus XP for streak
                    if (newStreak % 3 === 0) confetti({ particleCount: 50, origin: { x: 0.1, y: 0.1 } });
                } else {
                    // Broken streak (or first login)
                    // Only reset if it's strictly before yesterday (not just first time)
                    if (lastLogin) {
                        const lastDate = new Date(lastLogin);
                        const diffTime = Math.abs(new Date() - lastDate);
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        if (diffDays > 1) {
                            setStreak(1);
                            localStorage.setItem('user_streak', 1);
                        } else {
                            // Same day login, do nothing
                            setStreak(currentStreak);
                        }
                    } else {
                        // First time ever
                        setStreak(1);
                        localStorage.setItem('user_streak', 1);
                    }
                }
                localStorage.setItem('last_login_date', today);
            } else {
                setStreak(currentStreak);
            }
        }
    }, [currentUser]);

    // Undo/Redo State
    const [history, setHistory] = useState([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    // Quest System
    const [quests, setQuests] = useState([
        { id: 1, title: 'Scout 3 Speakers', target: 3, current: 0, reward: 50, completed: false, dismissed: false },
        { id: 2, title: 'Move to LOCKED', target: 1, current: 0, reward: 200, completed: false, dismissed: false },
        { id: 3, title: 'Add 5 Emails Today', target: 5, current: 0, reward: 100, completed: false, dismissed: false, daily: true },
        { id: 4, title: 'Research 3 Profiles', target: 3, current: 0, reward: 75, completed: false, dismissed: false }
    ]);

    // Dark Psychology Gamification (additional states)
    const [lastActiveDate, setLastActiveDate] = useState(localStorage.getItem('tedx_last_active') || new Date().toDateString());
    const [dailyGoal, setDailyGoal] = useState({ target: 5, current: 0 }); // 5 actions per day
    const [teamRank, setTeamRank] = useState(null);
    const [showStreakWarning, setShowStreakWarning] = useState(false);

    // Achievements & Activity
    const [achievements, setAchievements] = useState([]);
    const [activityLog, setActivityLog] = useState([]);
    const [showActivity, setShowActivity] = useState(false);
    const [showGuide, setShowGuide] = useState(false);

    // Focus Mode
    const [showFocusMode, setShowFocusMode] = useState(false);
    const [sessionAdds, setSessionAdds] = useState([]);
    const [showHub, setShowHub] = useState(false);
    const [viewModes, setViewModes] = useState({
        SCOUTED: 'kanban',
        EMAIL_ADDED: 'kanban',
        RESEARCHED: 'kanban',
        DRAFTED: 'kanban',
        CONTACT_INITIATED: 'kanban',
        CONNECTED: 'kanban',
        IN_TALKS: 'kanban',
        LOCKED: 'kanban'
    });

    const toggleViewMode = (colId) => {
        setViewModes(prev => ({
            ...prev,
            [colId]: prev[colId] === 'gallery' ? 'kanban' : 'gallery'
        }));
    };

    // Bulk Selection
    const [isSelectMode, setIsSelectMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState(new Set());

    // Achievement Notification State
    const [latestAchievement, setLatestAchievement] = useState(null);
    const [showAdminPanel, setShowAdminPanel] = useState(false);
    const [showDivideModal, setShowDivideModal] = useState(false);
    const [targetUsers, setTargetUsers] = useState(new Set());
    const [loading, setLoading] = useState(false);
    const [showLogin, setShowLogin] = useState(false);
    const [showAdmin, setShowAdmin] = useState(false);
    const [showIngestion, setShowIngestion] = useState(false);


    const toggleSelection = (id) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const handleSelectAll = () => {
        const allIds = filteredSpeakers.map(s => s.id).filter(id => id !== null && id !== undefined);
        setSelectedIds(new Set(allIds));
    };

    const handleDeselectAll = () => {
        setSelectedIds(new Set());
    };

    const handleBulkStatusChange = (newStatus) => {
        selectedIds.forEach(id => {
            handleSpeakerUpdate(id, { status: newStatus });
        });
        setSelectedIds(new Set());
        setIsSelectMode(false);
    };

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        })
    );

    const fetchLogs = async () => {
        if (!localStorage.getItem('tedx_token')) return;
        try {
            const logs = await getLogs();
            if (logs && Array.isArray(logs)) {
                const formatted = logs.map(l => ({
                    id: l.id,
                    text: l.details,
                    time: new Date(l.timestamp + "Z").toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    user: l.user_name,
                    type: l.action
                }));
                setActivityLog(formatted);
            }
        } catch (e) {
            console.error("Log fetch failed", e);
            if (e.response?.status === 401) {
                handleLogout();
            }
        }
    };

    const fetchAuthorizedUsers = async () => {
        if (!localStorage.getItem('tedx_token')) return;
        try {
            const token = localStorage.getItem('tedx_token');
            const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/admin/users`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const users = await res.json();
                setAuthorizedUsers(users);
                // Create userMap: roll_number -> name
                const map = {};
                users.forEach(u => {
                    map[u.roll_number] = u.name;
                });
                setUserMap(map);
            }
        } catch (e) {
            console.error("Failed to fetch users", e);
        }
    };

    useEffect(() => {
        if (currentUser) {
            fetchSpeakers();
            fetchLogs();
            if (currentUser.isAdmin) {
                fetchAuthorizedUsers();
            }
            const interval = setInterval(fetchLogs, 10000);
            return () => clearInterval(interval);
        }
    }, [currentUser, filterMode, searchTerm]);

    useEffect(() => {
        if (!localStorage.getItem('tedx_tour_completed')) {
            setShowTour(true);
        }
    }, []);

    useEffect(() => {
        // Fetch users for everyone (needed for userMap to display names)
        if (currentUser) {
            fetchAuthorizedUsers();
        }
    }, [currentUser]);

    const [showTour, setShowTour] = useState(false);

    useEffect(() => {
        // Filter logic
        const lowerTerm = searchTerm.toLowerCase();
        let filtered = speakers.filter(s =>
            s.name.toLowerCase().includes(lowerTerm) ||
            s.primary_domain?.toLowerCase().includes(lowerTerm)
        );

        // Priority Sort: Tier 1 > Tier 2 > Tier 3
        const PRIORITY_VALS = { 'Tier 1': 3, 'Tier 2': 2, 'Tier 3': 1 };
        filtered.sort((a, b) => {
            const pA = PRIORITY_VALS[a.outreach_priority] || 0;
            const pB = PRIORITY_VALS[b.outreach_priority] || 0;
            return pB - pA; // Descending
        });

        setFilteredSpeakers(filtered);

        // Gamification Logic
        if (currentUser) {
            // Calculate my XP
            const myLeads = speakers.filter(s => s.spoc_name === currentUser.name || s.assigned_to === currentUser.roll);
            let xp = 0;
            myLeads.forEach(s => {
                const multiplier = s.is_bounty ? 2 : 1;
                if (['RESEARCHED'].includes(s.status)) xp += (10 * multiplier);
                if (['CONTACT_INITIATED', 'CONNECTED', 'IN_TALKS'].includes(s.status)) xp += (60 * multiplier);
                if (['LOCKED'].includes(s.status)) xp += (560 * multiplier);
            });
            setUserXP(xp);

            // Mock Leaderboard (Derived from current board state)
            const spocMap = {};
            speakers.forEach(s => {
                const owner = s.assigned_to || s.spoc_name;
                if (owner) {
                    const multiplier = s.is_bounty ? 2 : 1;
                    if (!spocMap[owner]) spocMap[owner] = 0;
                    if (['LOCKED'].includes(s.status)) spocMap[owner] += (500 * multiplier);
                    if (['CONTACT_INITIATED', 'CONNECTED'].includes(s.status)) spocMap[owner] += (50 * multiplier);
                }
            });
            const lb = Object.entries(spocMap)
                .map(([name, score]) => ({ name, score }))
                .sort((a, b) => b.score - a.score)
                .slice(0, 3);
            setLeaderboard(lb);
        }

    }, [speakers, searchTerm, currentUser]);

    // Keyboard Shortcuts for Undo/Redo
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                e.preventDefault();
                handleUndo();
            }
            if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) {
                e.preventDefault();
                handleRedo();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [history, historyIndex, speakers]); // Dependencies are crucial here

    const addToHistory = (action) => {
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(action);
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    };

    const handleUndo = async () => {
        if (historyIndex < 0) return;
        const action = history[historyIndex];

        // Revert UI
        setSpeakers(prev => prev.map(s => s.id === action.id ? { ...s, status: action.from } : s));
        setHistoryIndex(prev => prev - 1);

        // Revert Backend
        try {
            await updateSpeaker(action.id, { status: action.from });
        } catch (e) {
            console.error("Undo failed", e);
        }
    };

    const handleRedo = async () => {
        if (historyIndex >= history.length - 1) return;
        const action = history[historyIndex + 1];

        // Apply UI
        setSpeakers(prev => prev.map(s => s.id === action.id ? { ...s, status: action.to } : s));
        setHistoryIndex(prev => prev + 1);

        // Apply Backend
        try {
            await updateSpeaker(action.id, { status: action.to });
        } catch (e) {
            console.error("Redo failed", e);
        }
    };

    const handleLogin = (name, roll, isAdmin) => {
        const userObj = { name, roll, isAdmin };
        setCurrentUser(userObj);
        localStorage.setItem('tedx_user_obj', JSON.stringify(userObj));
    };

    const handleLogout = () => {
        const wasLoggedIn = !!localStorage.getItem('tedx_token');
        localStorage.removeItem('tedx_token');
        localStorage.removeItem('tedx_user_obj');
        setCurrentUser(null);
        if (wasLoggedIn) {
            window.location.reload();
        }
    };

    const handleSpeakerAdd = (newSpeaker) => {
        setSpeakers([...speakers, newSpeaker]);
        setSessionAdds(prev => [newSpeaker, ...prev]);
    };

    const fetchSpeakers = async () => {
        if (!localStorage.getItem('tedx_token')) return;
        try {
            const params = {};
            if (filterMode === 'ME') params.assigned_to_me = true;
            if (filterMode === 'UNASSIGNED') params.unassigned = true;
            if (searchTerm) params.search = searchTerm;

            const data = await getSpeakers(params);
            const sanitized = data.filter(s => s && s.name && s.name.toLowerCase() !== 'nan');
            setSpeakers(sanitized);
        } catch (e) {
            console.error("Failed to fetch", e);
            if (e.response?.status === 401) {
                handleLogout();
            }
        }
    };

    const handleBulkUpdate = async (updates) => {
        const validIds = Array.from(selectedIds)
            .map(id => parseInt(id))
            .filter(id => !isNaN(id));

        if (validIds.length === 0) return;
        setLoading(true);
        try {
            const result = await bulkUpdateSpeakers({
                ids: validIds,
                ...updates
            });
            await fetchSpeakers();
            setSelectedIds(new Set());
            setIsSelectMode(false);

            if (result.skipped > 0) {
                alert(`${result.count} leads updated. ${result.skipped} leads were SKIPPED because they lack an email address.`);
            } else {
                confetti({ particleCount: 30, spread: 50, origin: { y: 0.9 } });
            }
        } catch (error) {
            console.error("Bulk update failed", error);
            const detail = error.response?.data?.detail;
            const errorMsg = Array.isArray(detail) ? detail.map(d => d.msg).join(", ") : detail;
            alert(`Failed to perform bulk update: ${errorMsg || error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleBulkDelete = async () => {
        const validIds = Array.from(selectedIds)
            .map(id => parseInt(id))
            .filter(id => !isNaN(id));

        if (validIds.length === 0) return;
        if (!window.confirm(`PERMANENTLY DELETE ${validIds.length} leads? This cannot be undone.`)) return;

        setLoading(true);
        try {
            const { bulkDeleteSpeakers } = await import('../api');
            await bulkDeleteSpeakers({ ids: validIds });
            await fetchSpeakers();
            setSelectedIds(new Set());
            setIsSelectMode(false);
            alert(`Successfully deleted ${validIds.length} speakers.`);
        } catch (error) {
            console.error("Bulk delete failed", error);
            alert(`Failed to delete: ${error.response?.data?.detail || error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleBulkDivide = async () => {
        if (targetUsers.size === 0) return alert("Select at least one user to divide among");

        const validIds = Array.from(selectedIds)
            .map(id => parseInt(id))
            .filter(id => !isNaN(id));

        if (validIds.length === 0) return alert("No valid leads selected");

        console.log(`Starting division of ${validIds.length} leads among ${targetUsers.size} users`);

        setLoading(true);
        try {
            const users = Array.from(targetUsers).filter(u => u && String(u).toLowerCase() !== 'nan');
            const totalLeads = validIds.length;
            const userCount = users.length;

            if (userCount === 0) {
                setLoading(false);
                return alert("No valid target users selected.");
            }

            // Calculate baseline chunk size
            const baseSize = Math.floor(totalLeads / userCount);
            const remainder = totalLeads % userCount;

            let currentIndex = 0;
            let failureLog = [];

            for (let i = 0; i < userCount; i++) {
                const currentChunkSize = baseSize + (i < remainder ? 1 : 0);
                const chunk = validIds.slice(currentIndex, currentIndex + currentChunkSize);

                if (chunk.length > 0) {
                    try {
                        console.log(`Assigning ${chunk.length} leads to ${users[i]}`);
                        await bulkUpdateSpeakers({
                            ids: chunk,
                            assigned_to: users[i]
                        });
                    } catch (chunkError) {
                        console.error(`Failed to assign chunk to ${users[i]}`, chunkError);
                        const rawDetail = chunkError.response?.data?.detail;
                        const errorMsg = typeof rawDetail === 'object' ? JSON.stringify(rawDetail) : (rawDetail || chunkError.message);
                        failureLog.push(`${users[i]}: ${errorMsg}`);
                    }
                }
                currentIndex += currentChunkSize;
            }

            if (failureLog.length > 0) {
                alert(`Partial success. Some assignments failed:\n\n${failureLog.join('\n')}`);
            }

            await fetchSpeakers();
            setSelectedIds(new Set());
            setTargetUsers(new Set());
            setShowDivideModal(false);
            setIsSelectMode(false);
            if (failureLog.length === 0) confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 } });
        } catch (e) {
            console.error("Divide failed", e);
            alert(`An error occurred during division: ${e.message}`);
        } finally {
            setLoading(false);
        }
    };

    const toggleTargetUser = (roll) => {
        const next = new Set(targetUsers);
        if (next.has(roll)) next.delete(roll);
        else next.add(roll);
        setTargetUsers(next);
    };

    const handleDragStart = (event) => {
        setActiveId(event.active.id);
    };

    const handleDragEnd = async (event) => {
        const { active, over } = event;

        if (!over) return;

        const activeDetails = speakers.find(s => s.id === active.id);
        const overId = over.id;

        let newStatus = null;
        if (Object.keys(SECTIONS).includes(overId)) {
            newStatus = overId;
        } else {
            const overItem = speakers.find(s => s.id === overId);
            if (overItem) newStatus = overItem.status;
        }

        // Workflow Enforcement
        if (newStatus === 'CONTACT_INITIATED' && activeDetails.status === 'DRAFTED') {
            // Allowed
        }

        if (newStatus && activeDetails.status !== newStatus) {
            // VERIFICATION: Cannot move beyond SCOUTED without contact info
            if (newStatus !== 'SCOUTED' && !activeDetails.email && !activeDetails.phone) {
                alert(`Cannot move "${activeDetails.name}" to "${SECTIONS[newStatus]}". \n\nReason: Contact information (Email or Phone) is missing. Please add details in the speaker's profile first.`);
                setActiveId(null);
                return;
            }

            const oldStatus = activeDetails.status;

            // Optimistic Update
            const updatedList = speakers.map(s =>
                s.id === active.id ? { ...s, status: newStatus } : s
            );
            setSpeakers(updatedList);

            // Record History
            addToHistory({
                type: 'MOVE',
                id: active.id,
                from: oldStatus,
                to: newStatus
            });

            try {
                await updateSpeaker(active.id, { status: newStatus });

                // Trigger Confetti for LOCKED
                if (newStatus === 'LOCKED') {
                    confetti({
                        particleCount: 150,
                        spread: 70,
                        origin: { y: 0.6 },
                        colors: ['#e62b1e', '#ffffff', '#000000']
                    });
                }

                // Update Quests
                setQuests(prev => prev.map(q => {
                    if (q.id === 2 && newStatus === 'LOCKED' && !q.completed) {
                        return { ...q, current: 1, completed: true };
                    }
                    if (q.id === 1 && newStatus === 'EMAIL_ADDED' && oldStatus === 'SCOUTED' && !q.completed) {
                        const next = q.current + 1;
                        return { ...q, current: next, completed: next >= q.target };
                    }
                    return q;
                }));

                // Update Log
                setActivityLog(prev => [{
                    id: Date.now(),
                    user: currentUser?.name || 'Unknown',
                    action: `moved ${activeDetails.name} to ${newStatus}`,
                    time: new Date().toLocaleTimeString()
                }, ...prev].slice(0, 50));

                // Unlock Achievement
                if (newStatus === 'LOCKED' && !achievements.includes('First Lock')) {
                    setAchievements(prev => [...prev, 'First Lock']);
                    setLatestAchievement({ title: "First Lock!", subtitle: "The first of many.", icon: "🏆" });
                    setTimeout(() => setLatestAchievement(null), 4000);
                }

                if (newStatus === 'EMAIL_ADDED' && activeDetails.status === 'SCOUTED' && !achievements.includes('Lead Hunter')) {
                    setAchievements(prev => [...prev, 'Lead Hunter']);
                    setLatestAchievement({ title: "Lead Hunter", subtitle: "Verified a prospect.", icon: "📡" });
                    setTimeout(() => setLatestAchievement(null), 4000);
                }

            } catch (e) {
                console.error("Update failed", e);
            }
        }

        setActiveId(null);
    };

    const handleSpeakerUpdate = async (id, updates) => {
        // Optimistic update
        const originalSpeakers = [...speakers];
        setSpeakers(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
        try {
            await updateSpeaker(id, updates);
        } catch (e) {
            console.error("Failed to update speaker", e);
            const errorMsg = e.response?.data?.detail || e.message;
            if (e.response?.status === 400) {
                alert(`Update Rejected: ${errorMsg}`);
            }
            // Revert state on failure
            setSpeakers(originalSpeakers);
        }
    };

    if (!currentUser) {
        return <LoginModal onLogin={handleLogin} />;
    }

    const myBadge = getBadge(userXP);

    return (
        <div className="h-screen flex flex-col bg-[#050505] text-white overflow-hidden font-sans">
            {/* Redesigned Premium Navbar */}
            <header className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-black/60 backdrop-blur-xl z-20 sticky top-0">
                {/* Left: Branding */}
                <div className="flex items-center gap-4">
                    <div className="w-9 h-9 bg-red-600 rounded-xl flex items-center justify-center font-black shadow-lg shadow-red-600/20 transform hover:rotate-6 transition-transform cursor-pointer">X</div>
                    <div className="hidden sm:block">
                        <h1 className="text-lg font-black tracking-tighter leading-none flex items-center gap-1">
                            TEDx<span className="text-red-600">XLRI</span>
                        </h1>
                        <p className="text-[9px] text-gray-500 font-bold tracking-widest uppercase opacity-70">Outreach Terminal</p>
                    </div>

                    <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 ml-4">
                        <button
                            onClick={() => onSwitchMode('speaker')}
                            className={`px-3 py-1 text-[9px] font-black uppercase rounded-lg transition-all ${'speaker' === 'speaker' ? 'bg-red-600 text-white shadow-lg shadow-red-900/40' : 'text-gray-500 hover:text-white'}`}
                        >
                            Speakers
                        </button>
                        <button
                            onClick={() => onSwitchMode('sponsor')}
                            className="px-3 py-1 text-[9px] font-black uppercase rounded-lg text-gray-500 hover:text-emerald-400 transition-all"
                        >
                            Sponsors
                        </button>
                        <button
                            onClick={() => onSwitchMode('creatives')}
                            className="px-3 py-1 text-[9px] font-black uppercase rounded-lg text-gray-500 hover:text-purple-400 transition-all"
                        >
                            Creatives
                        </button>
                    </div>
                </div>

                {/* Center: Search & Primary Actions */}
                {/* Middle: Fast Search & Filters */}
                <div className="flex-1 flex items-center gap-2 md:gap-3 px-2 md:px-0">
                    <div className="relative flex-1 group max-w-xs md:max-w-2xl">
                        <Search className="absolute left-3.5 top-2.5 text-gray-400 group-focus-within:text-red-500 transition-colors" size={14} />
                        <input
                            type="text"
                            placeholder="Find..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-red-500/30 focus:bg-white/10 transition-all placeholder:text-gray-600"
                        />
                    </div>

                    <div className="hidden sm:flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
                        {[
                            { id: 'ALL', label: 'All' },
                            { id: 'ME', label: 'Mine' },
                        ].map(m => (
                            <button
                                key={m.id}
                                onClick={() => setFilterMode(m.id)}
                                className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${filterMode === m.id ? 'bg-red-600 text-white' : 'text-gray-500'}`}
                            >
                                {m.label}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-1.5 bg-white/5 p-1 rounded-xl border border-white/5 shrink-0">
                        <button
                            onClick={() => setIsAdding(true)}
                            className="h-8 md:pl-3 md:pr-4 px-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-[10px] md:text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-red-900/20"
                        >
                            <span className="text-sm font-normal">+</span> <span className="hidden md:inline">Add</span>
                        </button>
                        <button
                            onClick={() => setShowIngestion(true)}
                            className="h-8 md:pl-3 md:pr-4 px-2 bg-yellow-600 hover:bg-yellow-500 text-black rounded-lg text-[10px] md:text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-yellow-900/20"
                            title="AI Bulk Import"
                        >
                            <Sparkles size={14} /> <span className="hidden md:inline">AI Import</span>
                        </button>
                    </div>
                </div>

                {/* Right: Tools & Profile */}
                <div className="flex items-center gap-5">
                    {/* Tool Cluster */}
                    <div className="hidden lg:flex items-center gap-1.5 bg-white/5 p-1 rounded-xl border border-white/5">
                        <button
                            onClick={handleUndo}
                            disabled={historyIndex < 0}
                            className={`p-1.5 rounded-lg transition-colors ${historyIndex < 0 ? 'text-gray-700 opacity-50 cursor-not-allowed' : 'text-gray-400 hover:bg-white/10 hover:text-white'}`}
                            title="Undo (Ctrl+Z)"
                        >
                            <Undo size={14} />
                        </button>
                        <button
                            onClick={handleRedo}
                            disabled={historyIndex >= history.length - 1}
                            className={`p-1.5 rounded-lg transition-colors ${historyIndex >= history.length - 1 ? 'text-gray-700 opacity-50 cursor-not-allowed' : 'text-gray-400 hover:bg-white/10 hover:text-white'}`}
                            title="Redo (Ctrl+Y)"
                        >
                            <Redo size={14} />
                        </button>
                        <div className="w-px h-4 bg-white/10 mx-1" />
                        <button
                            onClick={() => {
                                setIsSelectMode(!isSelectMode);
                                setSelectedIds(new Set());
                            }}
                            className={`px-3 h-8 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${isSelectMode ? 'bg-blue-600/20 text-blue-400 border border-blue-600/30' : 'text-gray-400 hover:bg-white/10'}`}
                        >
                            <CheckSquare size={13} /> {isSelectMode ? 'Select On' : 'Select'}
                        </button>
                        <button
                            onClick={exportSpeakers}
                            className="h-8 px-3 text-gray-400 hover:bg-white/10 text-xs font-bold rounded-lg flex items-center gap-2 transition-all"
                        >
                            <Download size={13} /> Export
                        </button>
                    </div>

                    {/* Stats Cluster */}
                    <div className="flex items-center gap-4 border-l border-white/10 pl-5">
                        <div className="hidden xl:flex flex-col items-end">
                            <div className="flex items-center gap-1.5 text-[9px] font-black text-gray-500 uppercase tracking-widest">
                                <Flame size={10} className="text-orange-500" /> LVL {Math.floor(userXP / 500) + 1}
                            </div>
                            <div className="w-24 h-1 bg-white/5 rounded-full mt-1 overflow-hidden border border-white/5">
                                <motion.div
                                    className="h-full bg-gradient-to-r from-red-600 to-orange-500"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(userXP % 500) / 5}%` }}
                                />
                            </div>
                        </div>

                        <button
                            onClick={() => setShowHub(!showHub)}
                            className={`relative h-9 px-4 flex items-center justify-center gap-2 rounded-xl transition-all border ${showHub ? 'bg-red-600 border-red-500 text-white shadow-lg shadow-red-900/40' : 'bg-white/5 text-gray-400 border-white/5 hover:bg-white/10'}`}
                        >
                            <Trophy size={16} />
                            <span className="text-[10px] font-black uppercase tracking-widest hidden md:block">Hub</span>
                            {quests.some(q => q.completed) && !showHub && (
                                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-yellow-500 rounded-full border-2 border-black animate-bounce" />
                            )}
                        </button>

                        <button
                            onClick={() => setShowActivity(!showActivity)}
                            className={`relative h-9 w-9 flex items-center justify-center rounded-xl transition-all ${showActivity ? 'bg-blue-600/20 text-blue-500 border border-blue-500/30' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                        >
                            <Bell size={16} />
                            {activityLog.length > 0 && !showActivity && (
                                <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-red-500 rounded-full border border-black" />
                            )}
                        </button>

                        <button
                            onClick={() => setShowGuide(true)}
                            className="h-9 w-9 flex items-center justify-center bg-white/5 text-gray-400 hover:text-yellow-500 hover:bg-yellow-500/10 border border-white/5 rounded-xl transition-all"
                            title="Outreach Playbook"
                        >
                            <CircleHelp size={16} />
                        </button>

                        {currentUser?.isAdmin && (
                            <button
                                onClick={() => setShowAdminPanel(true)}
                                className="h-9 w-9 flex items-center justify-center bg-white/5 text-gray-400 hover:text-red-500 hover:bg-red-500/10 border border-white/5 rounded-xl transition-all"
                                title="Admin Panel"
                            >
                                <Shield size={16} />
                            </button>
                        )}

                        <div
                            onClick={handleLogout}
                            className="relative group cursor-pointer"
                        >
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-purple-700 flex items-center justify-center font-black text-xs border border-white/20 shadow-lg shadow-red-900/20 group-hover:scale-105 transition-transform">
                                {currentUser?.name ? currentUser.name[0] : '?'}
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-500 border-2 border-black rounded-full" />
                            <div className="absolute top-1/2 -right-2 transform -translate-y-1/2 translate-x-full bg-black/90 text-white text-[8px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-white/10">
                                LOGOUT
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Mission Progress Tracker Bar */}
            <div className="bg-gradient-to-r from-red-600/5 via-black to-red-600/5 border-b border-white/5 h-10 px-6 flex items-center justify-between z-10">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Goal: Early Bird Lineup</span>
                        <div className="w-48 h-1.5 bg-white/5 rounded-full border border-white/5 overflow-hidden">
                            <motion.div
                                className="h-full bg-gradient-to-r from-red-600 to-red-400"
                                initial={{ width: 0 }}
                                animate={{ width: `${(speakers.filter(s => s.status === 'LOCKED').length / 12) * 100}%` }}
                            />
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4 text-[9px] font-black text-red-500 uppercase tracking-widest bg-red-600/10 px-3 py-1 rounded-full border border-red-600/20">
                    <span className="animate-pulse">● LIVE OPS</span>
                    <span className="text-gray-400 text-[8px] border-l border-white/10 pl-4">{speakers.filter(s => s.status !== 'LOCKED').length} Leads in Pipeline</span>
                </div>
            </div>

            {/* Board */}
            < DndContext
                sensors={sensors}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                collisionDetection={closestCorners}
            >
                <div className="flex-1 overflow-x-auto p-6 custom-scrollbar-x snap-x snap-mandatory" data-tour="kanban">
                    <div className="flex gap-4 h-full min-w-max">
                        {Object.entries(SECTIONS).map(([key, title]) => (
                            <div key={key} className="snap-center h-full">
                                <Column
                                    id={key}
                                    title={title}
                                    speakers={filteredSpeakers.filter(s => s.status === key)}
                                    onSpeakerClick={setSelectedSpeaker}
                                    onStatusChange={handleSpeakerUpdate}
                                    isSelectMode={isSelectMode}
                                    selectedIds={selectedIds}
                                    onToggleSelect={toggleSelection}
                                    viewMode={viewModes[key] || 'kanban'}
                                    onToggleView={() => toggleViewMode(key)}
                                    userMap={userMap}
                                />
                            </div>
                        ))}
                    </div>
                </div>
                <DragOverlay>
                    {activeId && speakers.find(s => s.id === activeId) ? <SpeakerCard speaker={speakers.find(s => s.id === activeId)} /> : null}
                </DragOverlay>
            </DndContext >

            {selectedSpeaker && (
                <OutreachModal
                    speaker={selectedSpeaker}
                    onClose={() => setSelectedSpeaker(null)}
                    onUpdate={handleSpeakerUpdate}
                    currentUser={currentUser}
                    authorizedUsers={authorizedUsers}
                />
            )}

            {showAdminPanel && (
                <AdminPanel
                    onClose={() => setShowAdminPanel(false)}
                    speakers={speakers}
                />
            )}

            {
                isAdding && (
                    <AddSpeakerModal
                        onClose={() => setIsAdding(false)}
                        onAdd={(s) => {
                            handleSpeakerAdd(s);
                            // Quest progress for scouting
                            setQuests(prev => prev.map(q => q.id === 1 ? { ...q, current: q.current + 1, completed: q.current + 1 >= q.target } : q));
                        }}
                    />
                )
            }

            <GuideModal
                isOpen={showGuide}
                onClose={() => setShowGuide(false)}
                userXP={userXP}
                streak={streak}
            />

            <TourOverlay
                isOpen={showTour}
                onClose={() => {
                    setShowTour(false);
                    localStorage.setItem('tedx_tour_completed', 'true');
                }}
            />

            <FocusMode
                isOpen={showFocusMode}
                onClose={() => setShowFocusMode(false)}
                onAdd={(s) => {
                    handleSpeakerAdd(s);
                    // Quest for scouting
                    setQuests(prev => prev.map(q => q.id === 1 ? { ...q, current: q.current + 1, completed: q.current + 1 >= q.target } : q));
                }}
                recentAdds={sessionAdds}
                speakers={speakers}
                onUpdate={handleSpeakerUpdate}
            />

            <RecruiterDashboard
                isOpen={showHub}
                onClose={() => setShowHub(false)}
                userXP={userXP}
                streak={streak}
                leaderboard={leaderboard}
                quests={quests}
                userName={currentUser}
                teamGoal={{
                    current: speakers.filter(s => s.status === 'LOCKED').length,
                    target: 12 // Adjusted target for a team
                }}
            />

            {/* Sidebar Activity Feed */}
            <AnimatePresence>
                {showActivity && (
                    <motion.div
                        initial={{ x: 400 }}
                        animate={{ x: 0 }}
                        exit={{ x: 400 }}
                        className="fixed right-0 top-20 bottom-0 w-80 bg-black/90 backdrop-blur-xl border-l border-white/10 z-30 p-6 flex flex-col"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 flex items-center gap-2">
                                <Bell size={14} className="text-red-500" /> Activity Feed
                            </h3>
                            <button onClick={() => setShowActivity(false)} className="text-gray-500 hover:text-white">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar">
                            {activityLog.map(log => (
                                <div key={log.id} className="text-xs border-b border-white/5 pb-3">
                                    <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                                        <span className="font-bold text-red-500/80">{log.user}</span>
                                        <span>{log.time}</span>
                                    </div>
                                    <p className="text-gray-300">{log.action}</p>
                                </div>
                            ))}
                            {activityLog.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center text-gray-600 italic">
                                    No activity yet...
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Enhanced Quests Overlay with Dismissible Cards */}
            <div className="fixed bottom-6 right-8 z-40 flex flex-col gap-3">
                <AnimatePresence>
                    {quests.filter(q => !q.completed && !q.dismissed).map(quest => (
                        <motion.div
                            key={quest.id}
                            initial={{ x: 300, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: 300, opacity: 0 }}
                            className="bg-black/90 backdrop-blur-md border border-white/10 p-4 rounded-xl shadow-2xl w-72 group hover:border-red-500/50 transition-colors relative"
                        >
                            <button
                                onClick={() => {
                                    setQuests(prev => prev.map(q => q.id === quest.id ? { ...q, dismissed: true } : q));
                                }}
                                className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/20 text-gray-500 hover:text-white transition-all"
                                title="Dismiss"
                            >
                                <X size={12} />
                            </button>
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter flex items-center gap-2">
                                    <Target size={12} className="text-red-500" /> {quest.daily ? '🔥 Daily Quest' : 'Active Quest'}
                                </h4>
                                <span className="text-[10px] bg-red-600/20 text-red-400 px-2 py-0.5 rounded-full font-bold">+{quest.reward} XP</span>
                            </div>
                            <p className="text-sm font-medium text-white mb-2">{quest.title}</p>
                            <div className="flex items-center gap-2 mb-1">
                                <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                    <motion.div
                                        className="h-full bg-gradient-to-r from-red-600 to-orange-500 shadow-[0_0_10px_rgba(230,43,30,0.5)]"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${(quest.current / quest.target) * 100}%` }}
                                        transition={{ duration: 1 }}
                                    />
                                </div>
                                <span className="text-[9px] font-black text-gray-500">{quest.current}/{quest.target}</span>
                            </div>
                            {quest.daily && (
                                <p className="text-[8px] text-orange-500 font-bold uppercase tracking-wider mt-1">⏰ Resets at midnight</p>
                            )}
                        </motion.div>
                    ))}
                </AnimatePresence>

                {/* Streak Counter - Dark Psychology: Loss Aversion */}
                <AnimatePresence>
                    {streak > 0 && (
                        <motion.div
                            initial={{ x: 300, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            className="bg-gradient-to-br from-orange-600/20 to-red-600/20 backdrop-blur-md border border-orange-500/30 p-4 rounded-xl shadow-2xl w-72"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="text-[10px] font-bold text-orange-400 uppercase tracking-tighter flex items-center gap-2">
                                    🔥 Streak
                                </h4>
                                <button
                                    onClick={() => setShowStreakWarning(true)}
                                    className="text-[8px] text-gray-500 hover:text-white"
                                >
                                    <X size={12} />
                                </button>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="text-3xl font-black text-orange-500">{streak}</div>
                                <div>
                                    <p className="text-xs font-bold text-white">Day Streak!</p>
                                    <p className="text-[9px] text-gray-400">Don't break it! 💪</p>
                                </div>
                            </div>
                            {streak >= 3 && (
                                <div className="mt-2 pt-2 border-t border-white/10">
                                    <p className="text-[8px] text-yellow-500 font-bold uppercase">⚡ {streak >= 7 ? 'LEGENDARY' : 'ON FIRE'} STREAK BONUS: +{streak * 10}% XP</p>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Daily Goal Progress - Urgency & Scarcity */}
                <AnimatePresence>
                    {dailyGoal.current < dailyGoal.target && (
                        <motion.div
                            initial={{ x: 300, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            className="bg-black/90 backdrop-blur-md border border-blue-500/30 p-4 rounded-xl shadow-2xl w-72"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="text-[10px] font-bold text-blue-400 uppercase tracking-tighter">
                                    📊 Today's Goal
                                </h4>
                                <span className="text-[9px] text-gray-500 font-mono">{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <div className="flex items-center gap-2 mb-2">
                                <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                                    <motion.div
                                        className="h-full bg-gradient-to-r from-blue-600 to-cyan-500"
                                        animate={{ width: `${(dailyGoal.current / dailyGoal.target) * 100}%` }}
                                    />
                                </div>
                                <span className="text-[10px] font-black text-blue-400">{dailyGoal.current}/{dailyGoal.target}</span>
                            </div>
                            <p className="text-[9px] text-gray-400">
                                {dailyGoal.target - dailyGoal.current} more actions to maintain streak
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Bulk Action Toolbar */}
            <AnimatePresence>
                {isSelectMode && (
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[80] bg-black/95 border border-white/10 rounded-2xl shadow-2xl p-4 flex items-center gap-6 backdrop-blur-xl"
                    >
                        <div className="flex flex-col">
                            <h2 className="text-white font-black text-sm uppercase tracking-tight">Mass Action Terminal</h2>
                            <div className="flex items-center gap-3">
                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{selectedIds.size} Leads Active</p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleSelectAll}
                                        className="text-[9px] font-black hover:text-white text-gray-600 uppercase tracking-tighter"
                                    >
                                        Select All
                                    </button>
                                    <button
                                        onClick={handleDeselectAll}
                                        className="text-[9px] font-black hover:text-white text-gray-600 uppercase tracking-tighter"
                                    >
                                        Clear
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="h-8 w-px bg-white/10" />

                        <div className="flex gap-2">
                            <button
                                onClick={() => handleBulkUpdate({ assigned_to: currentUser.roll })}
                                className="h-9 px-4 bg-white/5 hover:bg-white text-gray-400 hover:text-black rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 border border-white/5"
                            >
                                <Users size={12} /> Me
                            </button>

                            {currentUser?.isAdmin && authorizedUsers.length > 0 && (
                                <select
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val) handleBulkUpdate({ assigned_to: val === "null" ? null : val });
                                    }}
                                    className="h-9 px-4 bg-white/5 border border-white/5 hover:border-white/20 rounded-xl text-[10px] font-black uppercase text-gray-400 focus:outline-none transition-all cursor-pointer"
                                >
                                    <option value="">Assign To...</option>
                                    {authorizedUsers.map(u => (
                                        <option key={u.roll_number} value={u.roll_number}>{u.name}</option>
                                    ))}
                                    <option value="null">-- Clear --</option>
                                </select>
                            )}

                            {currentUser?.isAdmin && (
                                <button
                                    onClick={() => setShowDivideModal(true)}
                                    className="h-9 px-4 bg-purple-600/10 hover:bg-purple-600 text-purple-400 hover:text-white rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 border border-purple-500/20"
                                >
                                    <LayoutGrid size={12} /> Divide
                                </button>
                            )}

                            <button
                                onClick={() => handleBulkUpdate({ is_bounty: true })}
                                className="h-9 px-4 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 border border-red-500/20"
                            >
                                <Target size={12} /> Bounty
                            </button>

                            <button
                                onClick={() => handleBulkUpdate({ assigned_to: null })}
                                className="h-9 px-4 bg-orange-600/10 hover:bg-orange-600 text-orange-500 hover:text-white rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 border border-orange-500/20"
                                title="Clear Assignments (Reset Division)"
                            >
                                <Undo size={12} /> Reset
                            </button>

                            {currentUser?.isAdmin && (
                                <button
                                    onClick={handleBulkDelete}
                                    className="h-9 px-4 bg-gray-600/10 hover:bg-black text-gray-400 hover:text-red-500 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 border border-white/5"
                                >
                                    <Trash2 size={12} /> Delete
                                </button>
                            )}

                            <select
                                onChange={(e) => e.target.value && handleBulkUpdate({ status: e.target.value })}
                                className="h-9 px-4 bg-white/5 border border-white/5 hover:border-white/20 rounded-xl text-[10px] font-black uppercase text-gray-400 focus:outline-none transition-all cursor-pointer"
                            >
                                <option value="">Status...</option>
                                {Object.entries(SECTIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select>
                        </div>

                        <div className="h-8 w-px bg-white/10" />

                        <button
                            onClick={() => {
                                setIsSelectMode(false);
                                setSelectedIds(new Set());
                            }}
                            className="p-2 text-gray-600 hover:text-white transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Divide Leads Modal */}
            <AnimatePresence>
                {showDivideModal && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="w-full max-w-md bg-[#111] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
                        >
                            <div className="p-6 border-b border-white/5 flex justify-between items-center">
                                <div>
                                    <h3 className="text-lg font-black text-white uppercase tracking-tight">Equally Divide Leads</h3>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase">Distributing {selectedIds.size} selected cards</p>
                                </div>
                                <button onClick={() => { setShowDivideModal(false); setTargetUsers(new Set()); }} className="text-gray-500 hover:text-white"><X size={20} /></button>
                            </div>

                            <div className="p-6 space-y-4 max-h-[50vh] overflow-y-auto">
                                {authorizedUsers.map(user => (
                                    <div
                                        key={user.roll_number}
                                        onClick={() => toggleTargetUser(user.roll_number)}
                                        className={`flex items-center justify-between p-3 rounded-xl cursor-pointer border transition-all ${targetUsers.has(user.roll_number) ? 'bg-purple-600/10 border-purple-500/50' : 'bg-white/5 border-transparent hover:bg-white/10'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center font-black text-[10px] text-gray-500">
                                                {user.name[0]}
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-white">{user.name}</p>
                                                <p className="text-[9px] font-mono text-gray-600 uppercase">{user.roll_number}</p>
                                            </div>
                                        </div>
                                        {targetUsers.has(user.roll_number) && <div className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]" />}
                                    </div>
                                ))}
                            </div>

                            <div className="p-6 bg-white/5 border-t border-white/5">
                                <button
                                    onClick={handleBulkDivide}
                                    disabled={targetUsers.size === 0}
                                    className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-purple-900/20 disabled:opacity-30"
                                >
                                    Deploy Leads to {targetUsers.size} People
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Achievement Toast */}
            <AnimatePresence>
                {latestAchievement && (
                    <motion.div
                        initial={{ y: -100, opacity: 0, x: '-50%' }}
                        animate={{ y: 24, opacity: 1, x: '-50%' }}
                        exit={{ y: -100, opacity: 0, x: '-50%' }}
                        className="fixed top-24 left-1/2 z-[100] bg-white text-black px-6 py-4 rounded-3xl shadow-[0_20px_40px_rgba(0,0,0,0.4)] flex items-center gap-4 min-w-[300px]"
                    >
                        <div className="w-12 h-12 bg-red-600 rounded-2xl flex items-center justify-center text-2xl text-white shadow-lg shadow-red-200">
                            {latestAchievement.icon}
                        </div>
                        <div>
                            <h4 className="text-sm font-black uppercase tracking-widest leading-none mb-1">{latestAchievement.title}</h4>
                            <p className="text-xs text-gray-500 font-medium">{latestAchievement.subtitle}</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* AI Ingestion Modal */}
            <AnimatePresence>
                {showIngestion && (
                    <IngestionModal onClose={() => setShowIngestion(false)} />
                )}
            </AnimatePresence>

        </div >
    );
};

const Column = ({ id, title, speakers, onSpeakerClick, onStatusChange, isSelectMode, selectedIds, onToggleSelect, viewMode = 'kanban', onToggleView, userMap = {} }) => {
    const { setNodeRef, isOver } = useDroppable({ id });

    return (
        <div ref={setNodeRef} className={`${viewMode === 'gallery' ? 'w-full' : 'w-[85vw] md:w-80'} flex-shrink-0 flex flex-col rounded-xl transition-all duration-300 ${isOver ? 'bg-white/[0.05] border border-red-500/30' : 'bg-transparent'}`}>
            <div className="p-4 flex items-center justify-between sticky top-0 bg-[#050505]/95 backdrop-blur-sm z-10 border-b border-white/5 rounded-t-xl">
                <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${id === 'LOCKED' ? 'bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.5)]' : 'bg-gray-600'}`} />
                    <h3 className="font-bold text-xs md:text-sm tracking-wide text-gray-200 uppercase tracking-tighter">{title}</h3>
                    <button
                        onClick={onToggleView}
                        className="p-1 hover:bg-white/10 rounded-md text-gray-600 hover:text-white transition-all ml-1"
                        title={viewMode === 'gallery' ? "Switch to Kanban" : "Switch to Gallery"}
                    >
                        {viewMode === 'gallery' ? <LayoutGrid size={12} /> : <Search size={12} />}
                    </button>
                </div>
                <span className="text-xs font-bold text-gray-600 bg-white/5 px-2 py-0.5 rounded-full">{speakers.length}</span>
            </div>

            <div className={`flex-1 p-3 overflow-y-auto custom-scrollbar ${viewMode === 'gallery' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4' : 'space-y-3'}`}>
                <SortableContext items={speakers.map(s => s.id)} strategy={verticalListSortingStrategy}>
                    {speakers.map(speaker => (
                        <SpeakerCard
                            key={speaker.id}
                            speaker={speaker}
                            onClick={() => onSpeakerClick(speaker)}
                            onStatusChange={(newStatus) => onStatusChange(speaker.id, { status: newStatus })}
                            isSelectMode={isSelectMode}
                            isSelected={selectedIds.has(speaker.id)}
                            onToggleSelect={onToggleSelect}
                            compact={viewMode === 'gallery'}
                            assignedName={userMap[speaker.assigned_to] || speaker.assigned_to}
                        />
                    ))}
                </SortableContext>
                {speakers.length === 0 && (
                    <div className="h-24 border-2 border-dashed border-white/5 rounded-xl flex items-center justify-center text-xs text-gray-700 font-medium col-span-full">
                        {isOver ? "Drop to update status" : "Empty"}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Board;
