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
import FocusMode from './FocusMode';
import TourOverlay from './TourOverlay';
import { getSpeakers, updateSpeaker, exportSpeakers, getLogs } from '../api';
import { Search, Filter, Trophy, Zap, Download, Undo, Redo, Star, Flame, Target, Bell, ListTodo, X, CircleHelp } from 'lucide-react';
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

const Board = () => {
    const [speakers, setSpeakers] = useState([]);
    const [filteredSpeakers, setFilteredSpeakers] = useState([]);
    const [activeId, setActiveId] = useState(null);
    const [selectedSpeaker, setSelectedSpeaker] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [currentUser, setCurrentUser] = useState(localStorage.getItem('tedx_user') || null);

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
        { id: 1, title: 'Scout 3 Speakers', target: 3, current: 0, reward: 50, completed: false },
        { id: 2, title: 'Move to LOCKED', target: 1, current: 0, reward: 200, completed: false }
    ]);

    // Achievements & Activity
    const [achievements, setAchievements] = useState([]);
    const [activityLog, setActivityLog] = useState([]);
    const [showActivity, setShowActivity] = useState(false);
    const [showGuide, setShowGuide] = useState(false);

    // Focus Mode
    const [showFocusMode, setShowFocusMode] = useState(false);
    const [sessionAdds, setSessionAdds] = useState([]);

    // Bulk Selection
    const [isSelectMode, setIsSelectMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState(new Set());

    const toggleSelection = (id) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
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
                // Only update if different to avoid re-renders? 
                // Currently setActivityLog is simple.
                setActivityLog(formatted);
            }
        } catch (e) {
            console.error("Log fetch failed", e);
        }
    };

    useEffect(() => {
        fetchSpeakers();
        fetchLogs();
        const interval = setInterval(fetchLogs, 10000);

        // Check for first-time tour
        if (!localStorage.getItem('tedx_tour_completed')) {
            setShowTour(true);
        }
        return () => clearInterval(interval);
    }, []);

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
            const myNotes = speakers.filter(s => s.spoc_name === currentUser);
            let xp = 0;
            // Simplified XP calc based on current state of speakers I own
            // In a real app, this would be transactional. Here it's state-based.
            myNotes.forEach(s => {
                const multiplier = s.is_bounty ? 2 : 1;
                if (['RESEARCHED'].includes(s.status)) xp += (10 * multiplier);
                if (['CONTACT_INITIATED', 'CONNECTED', 'IN_TALKS'].includes(s.status)) xp += (60 * multiplier);
                if (['LOCKED'].includes(s.status)) xp += (560 * multiplier);
            });
            setUserXP(xp);

            // Mock Leaderboard (Derived from current board state)
            const spocMap = {};
            speakers.forEach(s => {
                if (s.spoc_name) {
                    const multiplier = s.is_bounty ? 2 : 1;
                    if (!spocMap[s.spoc_name]) spocMap[s.spoc_name] = 0;
                    if (['LOCKED'].includes(s.status)) spocMap[s.spoc_name] += (500 * multiplier);
                    if (['CONTACT_INITIATED', 'CONNECTED'].includes(s.status)) spocMap[s.spoc_name] += (50 * multiplier);
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

    const handleLogin = (name) => {
        setCurrentUser(name);
    };

    const handleLogout = () => {
        localStorage.removeItem('tedx_token');
        localStorage.removeItem('tedx_user');
        localStorage.removeItem('tedx_roll');
        setCurrentUser(null);
        window.location.reload(); // Refresh to clear all sensitive state
    };

    const handleSpeakerAdd = (newSpeaker) => {
        setSpeakers([...speakers, newSpeaker]);
        setSessionAdds(prev => [newSpeaker, ...prev]);
    };

    const fetchSpeakers = async () => {
        try {
            const data = await getSpeakers();
            setSpeakers(data);
        } catch (e) {
            console.error("Failed to fetch", e);
            if (e.response?.status === 401) {
                handleLogout();
            }
        }
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
                    user: currentUser,
                    action: `moved ${activeDetails.name} to ${newStatus}`,
                    time: new Date().toLocaleTimeString()
                }, ...prev].slice(0, 50));

                // Unlock Achievement
                if (newStatus === 'LOCKED' && !achievements.includes('First Lock')) {
                    setAchievements(prev => [...prev, 'First Lock']);
                }

            } catch (e) {
                console.error("Update failed", e);
            }
        }

        setActiveId(null);
    };

    const handleSpeakerUpdate = (id, updates) => {
        setSpeakers(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    };

    if (!currentUser) {
        return <LoginModal onLogin={handleLogin} />;
    }

    const myBadge = getBadge(userXP);

    return (
        <div className="h-screen flex flex-col bg-[#050505] text-white overflow-hidden">
            {/* Navbar */}
            <header className="h-20 border-b border-white/10 flex items-center justify-between px-6 bg-black/40 backdrop-blur-md z-10">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center font-bold">X</div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight leading-none">TEDx<span className="text-red-600">XLRI</span></h1>
                        <p className="text-[10px] text-gray-500 tracking-widest uppercase">Outreach Dashboard</p>
                    </div>
                </div>

                <div className="flex-1 max-w-xl mx-6 flex gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 text-gray-500" size={16} />
                        <input
                            type="text"
                            placeholder="Search speakers..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-full pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-red-500/50 transition-colors"
                        />
                    </div>
                    <button
                        onClick={exportSpeakers}
                        className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-sm flex items-center gap-2 transition-all"
                    >
                        <Download size={14} /> Export CSV
                    </button>
                    <button
                        onClick={() => setIsAdding(true)}
                        className="px-4 py-2 bg-red-600 hover:bg-red-500 shadow-lg shadow-red-900/20 rounded-full text-sm font-bold transition-all"
                        data-tour="add-btn"
                    >
                        + Add Speaker
                    </button>

                    <button
                        onClick={() => setShowFocusMode(true)}
                        className="px-4 py-2 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/20 text-yellow-500 rounded-full text-sm font-bold transition-all flex items-center gap-2"
                        title="Enter Focus Mode"
                        data-tour="focus-btn"
                    >
                        <Zap size={14} /> Focus
                    </button>

                    <button
                        onClick={() => {
                            setIsSelectMode(!isSelectMode);
                            setSelectedIds(new Set());
                        }}
                        className={`px-4 py-2 border rounded-full text-sm font-bold transition-all flex items-center gap-2 ${isSelectMode ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'}`}
                    >
                        <CheckSquare size={14} /> {isSelectMode ? 'Done' : 'Select'}
                    </button>

                    {/* Undo/Redo Controls */}
                    <div className="flex items-center gap-1 bg-white/5 rounded-full p-1 border border-white/10 ml-2">
                        <button
                            onClick={handleUndo}
                            disabled={historyIndex < 0}
                            className={`p-2 rounded-full transition-colors ${historyIndex < 0 ? 'text-gray-600 cursor-not-allowed' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`}
                            title="Undo (Ctrl+Z)"
                        >
                            <Undo size={16} />
                        </button>
                        <button
                            onClick={handleRedo}
                            disabled={historyIndex >= history.length - 1}
                            className={`p-2 rounded-full transition-colors ${historyIndex >= history.length - 1 ? 'text-gray-600 cursor-not-allowed' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`}
                            title="Redo (Ctrl+Y)"
                        >
                            <Redo size={16} />
                        </button>
                    </div>
                </div>

                {/* Gamification Widget */}
                <div className="flex items-center gap-6">

                    {/* Activity Feed Toggle */}
                    <button
                        onClick={() => setShowActivity(!showActivity)}
                        className={`p-2 rounded-full transition-all relative ${showActivity ? 'bg-red-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                    >
                        <ListTodo size={18} />
                        {activityLog.length > 0 && !showActivity && (
                            <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-black animate-pulse" />
                        )}
                    </button>

                    {/* Leaderboard Mini */}
                    <div className="hidden lg:flex items-center gap-4 border-r border-white/10 pr-6">
                        {leaderboard.map((user, i) => (
                            <div key={user.name} className="text-xs text-gray-400">
                                <span className="font-bold text-white mr-1">#{i + 1}</span>
                                {user.name.split(' ')[0]}
                                <span className="text-yellow-500 ml-1">{user.score}xp</span>
                            </div>
                        ))}
                    </div>

                    {/* User Profile */}
                    {/* User Profile & Progress */}
                    <div className="flex items-center gap-4">
                        <div className="hidden xl:flex flex-col items-end gap-1">
                            <div className="flex items-center gap-2 text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                                <Star size={10} className="text-yellow-500" /> Progression
                            </div>
                            <div className="w-32 h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/10">
                                <motion.div
                                    className="h-full bg-gradient-to-r from-red-600 to-orange-500"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min(100, (userXP % 500) / 5)}%` }}
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setShowGuide(true)}
                                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                                title="Outreach Guide"
                                data-tour="guide-btn"
                            >
                                <CircleHelp size={18} />
                            </button>
                            <div className="text-right">
                                <div className="text-xs text-gray-400 flex items-center justify-end gap-1">
                                    {currentUser}
                                    <div className="flex items-center gap-0.5 text-orange-500 font-bold bg-orange-500/10 px-1.5 py-0.5 rounded cursor-help" title={`${streak} Day Streak!`}>
                                        <Flame size={12} fill="currentColor" /> {streak}
                                    </div>
                                </div>
                                <div className="flex items-center justify-end gap-1 text-sm font-bold leading-none mt-0.5">
                                    <span className={myBadge.color}>{myBadge.icon}</span>
                                    {userXP} <span className="text-[10px] text-gray-500 font-normal ml-0.5">XP</span>
                                </div>
                            </div>
                            <div
                                onClick={handleLogout}
                                className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 via-red-600 to-purple-700 flex items-center justify-center font-bold text-sm border-2 border-white/20 shadow-lg shadow-red-900/40 cursor-pointer hover:scale-105 active:scale-95 transition-all group relative"
                            >
                                {currentUser[0]}
                                <div className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] text-white">
                                    Exit
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </header >

            {/* Board */}
            < DndContext
                sensors={sensors}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                collisionDetection={closestCorners}
            >
                <div className="flex-1 overflow-x-auto overflow-y-hidden p-6 custom-scrollbar-x snap-x snap-mandatory" data-tour="kanban">
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
                                />
                            </div>
                        ))}
                    </div>
                </div>
                <DragOverlay>
                    {activeId ? <SpeakerCard speaker={speakers.find(s => s.id === activeId)} /> : null}
                </DragOverlay>
            </DndContext >

            {selectedSpeaker && (
                <OutreachModal
                    speaker={selectedSpeaker}
                    onClose={() => setSelectedSpeaker(null)}
                    onUpdate={handleSpeakerUpdate}
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

            {/* Quests Overlay - Floating Bottom Right */}
            <div className="fixed bottom-6 right-8 z-40 flex flex-col gap-3">
                <AnimatePresence>
                    {quests.filter(q => !q.completed).map(quest => (
                        <motion.div
                            key={quest.id}
                            initial={{ x: 300, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: 300, opacity: 0 }}
                            className="bg-black/80 backdrop-blur-md border border-white/10 p-4 rounded-xl shadow-2xl w-64 group hover:border-red-500/50 transition-colors"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter flex items-center gap-2">
                                    <Target size={12} className="text-red-500" /> Active Quest
                                </h4>
                                <span className="text-[10px] bg-red-600/20 text-red-400 px-2 py-0.5 rounded-full font-bold">+{quest.reward} XP</span>
                            </div>
                            <p className="text-sm font-medium text-white mb-2">{quest.title}</p>
                            <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-red-600 shadow-[0_0_10px_rgba(230,43,30,0.5)]"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(quest.current / quest.target) * 100}%` }}
                                    transition={{ duration: 1 }}
                                />
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Bulk Action Toolbar */}
            <AnimatePresence>
                {isSelectMode && selectedIds.size > 0 && (
                    <motion.div
                        initial={{ y: 100 }}
                        animate={{ y: 0 }}
                        exit={{ y: 100 }}
                        className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-[#1a1a1a] border border-white/10 rounded-full px-6 py-3 shadow-2xl z-50 flex items-center gap-6"
                    >
                        <span className="text-sm font-bold text-white">{selectedIds.size} Selected</span>
                        <div className="h-6 w-px bg-white/20" />

                        <div className="flex items-center gap-2">
                            <select
                                onChange={(e) => handleBulkStatusChange(e.target.value)}
                                className="bg-white/5 border border-white/10 rounded px-3 py-1 text-sm text-gray-300 focus:outline-none focus:border-red-500 hover:bg-white/10 transition-colors"
                            >
                                <option value="">Move to...</option>
                                <option value="SCOUTED">Scouted</option>
                                <option value="EMAIL_ADDED">Email Added</option>
                                <option value="RESEARCHED">Researched</option>
                                <option value="DRAFTED">Drafted</option>
                                <option value="CONTACT_INITIATED">Contact Sent</option>
                                <option value="CONNECTED">Connected</option>
                                <option value="IN_TALKS">In Talks</option>
                                <option value="LOCKED">Locked</option>
                            </select>
                        </div>

                        <button
                            onClick={() => setSelectedIds(new Set())}
                            className="text-xs text-gray-500 hover:text-white underline"
                        >
                            Clear
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

        </div >
    );
};

const Column = ({ id, title, speakers, onSpeakerClick, onStatusChange, isSelectMode, selectedIds, onToggleSelect }) => {
    const { setNodeRef, isOver } = useDroppable({ id });

    return (
        <div ref={setNodeRef} className={`w-80 flex-shrink-0 flex flex-col rounded-xl transition-colors duration-300 ${isOver ? 'bg-white/[0.05] border border-red-500/30' : 'bg-transparent'}`}>
            <div className="p-4 flex items-center justify-between sticky top-0 bg-[#050505]/95 backdrop-blur-sm z-10 border-b border-white/5 rounded-t-xl">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${id === 'LOCKED' ? 'bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.5)]' : 'bg-gray-600'}`} />
                    <h3 className="font-bold text-sm tracking-wide text-gray-200">{title}</h3>
                </div>
                <span className="text-xs font-bold text-gray-600 bg-white/5 px-2 py-0.5 rounded-full">{speakers.length}</span>
            </div>

            <div className="flex-1 p-3 overflow-y-auto custom-scrollbar space-y-3">
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
                        />
                    ))}
                </SortableContext>
                {speakers.length === 0 && (
                    <div className="h-24 border-2 border-dashed border-white/5 rounded-xl flex items-center justify-center text-xs text-gray-700 font-medium">
                        {isOver ? "Drop to update status" : "Empty"}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Board;
