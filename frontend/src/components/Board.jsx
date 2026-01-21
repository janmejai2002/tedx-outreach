import React, { useState, useEffect, useMemo } from 'react';
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
import SpeakerColumn from './SpeakerColumn';
import BoardHeader from './BoardHeader';
import IngestionModal from './IngestionModal';
import CreativeRequestModal from './CreativeRequestModal';
import { getSpeakers, updateSpeaker, exportSpeakers, getLogs, bulkUpdateSpeakers, getMyDetails, updateMyGamification, getSprintDeadline, bulkHuntEmails, approveHuntedEmail, getHealth, getAllUsers } from '../api';
import { Search, Filter, Trophy, Zap, Download, Undo, Redo, Star, Flame, Target, Bell, ListTodo, X, CircleHelp, Shield, Users, CheckCircle, LayoutGrid, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

// New Granular Workflow
const SECTIONS = {
    SCOUTED: 'Scouted',
    RESEARCHED: 'Researched 🔍',
    EMAIL_ADDED: 'Email Added 📧',
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

const Countdown = ({ targetDate }) => {
    const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();
            const target = new Date(targetDate);
            const diff = target - now;

            if (diff <= 0) {
                clearInterval(interval);
                setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
            } else {
                const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
                const minutes = Math.floor((diff / 1000 / 60) % 60);
                const seconds = Math.floor((diff / 1000) % 60);
                setTimeLeft({ days, hours, minutes, seconds });
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [targetDate]);

    return (
        <span className="flex gap-1">
            <span>{String(timeLeft.days).padStart(2, '0')}d</span>
            <span className="opacity-30">:</span>
            <span>{String(timeLeft.hours).padStart(2, '0')}h</span>
            <span className="opacity-30">:</span>
            <span>{String(timeLeft.minutes).padStart(2, '0')}m</span>
            <span className="opacity-30">:</span>
            <span>{String(timeLeft.seconds).padStart(2, '0')}s</span>
        </span>
    );
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

    // Version Check for Auto-Refresh (Fixes stale code issues)
    const [appVersion, setAppVersion] = useState(null);
    useEffect(() => {
        const checkVersion = async () => {
            try {
                const health = await getHealth();
                if (appVersion && health.version !== appVersion) {
                    console.log(`🚀 New version detected (${health.version}). Refreshing...`);
                    // Force refresh after a tiny delay for visibility
                    setTimeout(() => {
                        window.location.reload(true);
                    }, 2000);
                } else if (!appVersion) {
                    setAppVersion(health.version);
                }
            } catch (e) {
                console.warn("Version check skipped (offline/server error)");
            }
        };

        // Check on focus to be responsive to tab switchers
        window.addEventListener('focus', checkVersion);

        // Polling check every 5 minutes
        const interval = setInterval(checkVersion, 5 * 60 * 1000);

        // Initial check
        checkVersion();

        return () => {
            window.removeEventListener('focus', checkVersion);
            clearInterval(interval);
        };
    }, [appVersion]);

    // Check Streak on Load
    // Sync Gamification on Load
    useEffect(() => {
        if (currentUser) {
            const syncUserStats = async () => {
                try {
                    const user = await getMyDetails();
                    setUserXP(user.xp || 0);

                    // Sync Admin status in case it changed
                    if (user.is_admin || user.role === 'ADMIN') {
                        setCurrentUser(prev => {
                            if (prev?.isAdmin) return prev;
                            const updated = { ...prev, isAdmin: true };
                            localStorage.setItem('tedx_user_obj', JSON.stringify(updated));
                            return updated;
                        });
                    }

                    const today = new Date().toDateString();
                    const lastLogin = user.last_login_date;
                    let currentStreak = user.streak || 0;

                    if (lastLogin !== today) {
                        const yesterday = new Date();
                        yesterday.setDate(yesterday.getDate() - 1);

                        if (lastLogin === yesterday.toDateString()) {
                            // Consecutive day
                            currentStreak += 1;
                            if (currentStreak % 3 === 0) confetti({ particleCount: 50, origin: { x: 0.1, y: 0.1 } });
                        } else if (lastLogin) {
                            // Check if strictly more than 1 day gap
                            const lastDate = new Date(lastLogin);
                            const diffTime = Math.abs(new Date() - lastDate);
                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                            if (diffDays > 1) {
                                currentStreak = 1; // Reset
                            }
                        } else {
                            currentStreak = 1; // First time
                        }

                        // Optimistic update
                        setStreak(currentStreak);

                        // Push to backend
                        await updateMyGamification({
                            streak: currentStreak,
                            last_login_date: today
                        });
                    } else {
                        setStreak(currentStreak);
                    }
                } catch (error) {
                    console.error("Failed to sync gamification", error);
                    if (error.response?.status === 401) {
                        handleLogout();
                    } else {
                        // Fallback to local
                        setStreak(parseInt(localStorage.getItem('user_streak') || '0'));
                    }
                }
            };

            syncUserStats();
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
    const [sprintDeadline, setSprintDeadline] = useState(null);

    const fetchSprintDeadline = async () => {
        try {
            const data = await getSprintDeadline();
            setSprintDeadline(data);
        } catch (e) {
            console.error("Failed to fetch sprint deadline", e);
            if (e.response?.status === 401) {
                handleLogout();
            }
        }
    };

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
            const users = await getAllUsers();
            if (users && Array.isArray(users)) {
                setAuthorizedUsers(users);
                const map = {};
                users.forEach(u => {
                    map[u.roll_number] = u.name;
                });
                setUserMap(map);
            }
        } catch (e) {
            console.error("Failed to fetch users", e);
            if (e.response?.status === 401) {
                handleLogout();
            }
        }
    };

    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 500); // 500ms debounce
        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        if (currentUser) {
            fetchSpeakers();
            fetchLogs();
            fetchSprintDeadline();
            if (currentUser.isAdmin) {
                fetchAuthorizedUsers();
            }
            const interval = setInterval(fetchLogs, 10000);
            return () => clearInterval(interval);
        }
    }, [currentUser, filterMode, debouncedSearchTerm]);

    // Hourly refresh for bounty board
    useEffect(() => {
        if (currentUser) {
            const hourlyRefresh = setInterval(() => {
                fetchSpeakers();
                console.log('Hourly refresh: Speakers updated');
            }, 3600000); // 1 hour = 3600000ms
            return () => clearInterval(hourlyRefresh);
        }
    }, [currentUser]);

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
    const [showCreativeRequest, setShowCreativeRequest] = useState(false);

    // Filter logic
    const lowerTerm = searchTerm.toLowerCase();
    const currentFilteredSpeakers = useMemo(() => {
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
        return filtered;
    }, [speakers, lowerTerm]);

    // Update filteredSpeakers sync if needed, but better to use it directly
    useEffect(() => {
        setFilteredSpeakers(currentFilteredSpeakers);
    }, [currentFilteredSpeakers]);

    // XP calculation
    const calculatedXP = useMemo(() => {
        if (!currentUser) return 0;
        const myLeads = speakers.filter(s => s.spoc_name === currentUser.name || s.assigned_to === currentUser.roll);
        let xp = 0;
        myLeads.forEach(s => {
            const multiplier = s.is_bounty ? 2 : 1;
            if (['RESEARCHED'].includes(s.status)) xp += (10 * multiplier);
            if (['CONTACT_INITIATED', 'CONNECTED', 'IN_TALKS'].includes(s.status)) xp += (60 * multiplier);
            if (['LOCKED'].includes(s.status)) xp += (560 * multiplier);
        });
        return xp;
    }, [speakers, currentUser]);

    // Sync XP to state if needed for other hooks
    useEffect(() => {
        setUserXP(calculatedXP);
    }, [calculatedXP]);

    const currentLeaderboard = useMemo(() => {
        return authorizedUsers
            .map(u => ({ name: u.name, score: u.xp || 0 }))
            .sort((a, b) => b.score - a.score)
            .slice(0, 10);
    }, [authorizedUsers]);

    useEffect(() => {
        setLeaderboard(currentLeaderboard);
    }, [currentLeaderboard]);

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

    const handleBulkHunt = async () => {
        const validIds = Array.from(selectedIds)
            .map(id => parseInt(id))
            .filter(id => !isNaN(id));

        if (validIds.length === 0) return;

        const confirm = window.confirm(`Start AI Hunt for ${validIds.length} leads? This may take some time.`);
        if (!confirm) return;

        setLoading(true);
        let found = 0;
        let processed = 0;

        try {
            const { huntEmail } = await import('../api');

            for (const id of validIds) {
                try {
                    const result = await huntEmail(id);
                    if (result.email) found++;
                } catch (err) {
                    console.error(`Failed to hunt email for ID ${id}:`, err);
                }
                processed++;
            }

            await fetchSpeakers();
            setSelectedIds(new Set());
            setIsSelectMode(false);

            alert(`AI Hunt complete! Processed ${processed} leads, found ${found} emails.`);

            if (found > 0) {
                confetti({
                    particleCount: 150,
                    spread: 70,
                    origin: { y: 0.6 },
                    colors: ['#3b82f6', '#ffffff', '#60a5fa']
                });
            }
        } catch (error) {
            console.error("Bulk hunt failed", error);
            alert(`Bulk hunt process interrupted: ${error.message}`);
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

                // Sync Gamification from Backend (since backend awards XP)
                getMyDetails().then(u => {
                    setUserXP(u.xp);
                    setStreak(u.streak);
                });
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

    const handleApproveEmail = async (id, approve) => {
        try {
            const updatedSpeaker = await approveHuntedEmail(id, approve);
            setSpeakers(prev => prev.map(s => s.id === id ? updatedSpeaker : s));
            if (approve) {
                confetti({
                    particleCount: 30,
                    spread: 40,
                    origin: { y: 0.7 },
                    colors: ['#22c55e', '#ffffff']
                });
            }
        } catch (e) {
            console.error("Failed to approve email", e);
        }
    };

    if (!currentUser) {
        return <LoginModal onLogin={handleLogin} />;
    }

    const myBadge = getBadge(userXP);

    return (
        <div className="h-screen flex flex-col bg-[#050505] text-white overflow-hidden font-sans">
            {/* Redesigned Premium Navbar */}
            {/* Refactored Header */}
            <BoardHeader
                sprintDeadline={sprintDeadline}
                onSwitchMode={onSwitchMode}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                filterMode={filterMode}
                setFilterMode={setFilterMode}
                setIsAdding={setIsAdding}
                setShowIngestion={setShowIngestion}
                setShowCreativeRequest={setShowCreativeRequest}
                handleUndo={handleUndo}
                handleRedo={handleRedo}
                historyIndex={historyIndex}
                historyLength={history.length}
                isSelectMode={isSelectMode}
                setIsSelectMode={setIsSelectMode}
                setSelectedIds={setSelectedIds}
                exportSpeakers={exportSpeakers}
                userXP={userXP}
                showHub={showHub}
                setShowHub={setShowHub}
                quests={quests}
                showActivity={showActivity}
                setShowActivity={setShowActivity}
                activityLog={activityLog}
                setShowGuide={setShowGuide}
                currentUser={currentUser}
                setShowAdminPanel={setShowAdminPanel}
                handleLogout={handleLogout}
            />

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
                                <SpeakerColumn
                                    id={key}
                                    title={title}
                                    speakers={filteredSpeakers.filter(s => s.status === key)}
                                    onSpeakerClick={setSelectedSpeaker}
                                    onStatusChange={handleSpeakerUpdate}
                                    isSelectMode={isSelectMode}
                                    selectedIds={selectedIds}
                                    onToggleSelect={toggleSelection}
                                    onApproveEmail={handleApproveEmail}
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
                speakers={speakers}
                authorizedUsers={authorizedUsers}
                teamGoal={{
                    current: speakers.filter(s => s.status === 'LOCKED').length,
                    target: 12
                }}
            />

            {/* Admin Panel */}
            {showAdminPanel && (
                <AdminPanel
                    onClose={() => setShowAdminPanel(false)}
                    currentUser={currentUser}
                    speakers={speakers}
                />
            )}

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
            <div className="fixed bottom-6 right-8 z-40 flex flex-col gap-2">
                {/* Clear All Button */}
                <AnimatePresence>
                    {(quests.filter(q => !q.completed && !q.dismissed).length > 0 || streak > 0 || dailyGoal.current < dailyGoal.target) && (
                        <motion.button
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            onClick={() => {
                                setQuests(prev => prev.map(q => ({ ...q, dismissed: true })));
                                setStreak(0);
                                localStorage.setItem('user_streak', '0');
                            }}
                            className="self-end px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[9px] font-bold text-gray-500 hover:text-white transition-all flex items-center gap-1.5"
                        >
                            <X size={10} /> Clear All
                        </motion.button>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {quests.filter(q => !q.completed && !q.dismissed).map(quest => (
                        <motion.div
                            key={quest.id}
                            initial={{ x: 300, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: 300, opacity: 0 }}
                            className="bg-black/90 backdrop-blur-md border border-white/10 p-3 rounded-lg shadow-xl w-60 group hover:border-red-500/50 transition-colors relative"
                        >
                            <button
                                onClick={() => {
                                    setQuests(prev => prev.map(q => q.id === quest.id ? { ...q, dismissed: true } : q));
                                }}
                                className="absolute top-1.5 right-1.5 w-4 h-4 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/20 text-gray-500 hover:text-white transition-all"
                                title="Dismiss"
                            >
                                <X size={10} />
                            </button>
                            <div className="flex items-center justify-between mb-1.5">
                                <h4 className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter flex items-center gap-1.5">
                                    <Target size={10} className="text-red-500" /> {quest.daily ? '🔥 Daily' : 'Quest'}
                                </h4>
                                <span className="text-[9px] bg-red-600/20 text-red-400 px-1.5 py-0.5 rounded-full font-bold">+{quest.reward}</span>
                            </div>
                            <p className="text-xs font-medium text-white mb-1.5">{quest.title}</p>
                            <div className="flex items-center gap-1.5 mb-1">
                                <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                                    <motion.div
                                        className="h-full bg-gradient-to-r from-red-600 to-orange-500 shadow-[0_0_8px_rgba(230,43,30,0.4)]"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${(quest.current / quest.target) * 100}%` }}
                                        transition={{ duration: 1 }}
                                    />
                                </div>
                                <span className="text-[8px] font-black text-gray-500">{quest.current}/{quest.target}</span>
                            </div>
                            {quest.daily && (
                                <p className="text-[7px] text-orange-500 font-bold uppercase tracking-wider">⏰ Resets midnight</p>
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
                            className="bg-gradient-to-br from-orange-600/20 to-red-600/20 backdrop-blur-md border border-orange-500/30 p-3 rounded-lg shadow-xl w-60"
                        >
                            <div className="flex items-center justify-between mb-1.5">
                                <h4 className="text-[9px] font-bold text-orange-400 uppercase tracking-tighter flex items-center gap-1.5">
                                    🔥 Streak
                                </h4>
                                <button
                                    onClick={() => {
                                        setStreak(0);
                                        localStorage.setItem('user_streak', '0');
                                    }}
                                    className="text-[8px] text-gray-500 hover:text-white"
                                >
                                    <X size={10} />
                                </button>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="text-2xl font-black text-orange-500">{streak}</div>
                                <div>
                                    <p className="text-[10px] font-bold text-white">Day Streak!</p>
                                    <p className="text-[8px] text-gray-400">Don't break it! 💪</p>
                                </div>
                            </div>
                            {streak >= 3 && (
                                <div className="mt-1.5 pt-1.5 border-t border-white/10">
                                    <p className="text-[7px] text-yellow-500 font-bold uppercase">⚡ {streak >= 7 ? 'LEGENDARY' : 'ON FIRE'} +{streak * 10}% XP</p>
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
                            className="bg-black/90 backdrop-blur-md border border-blue-500/30 p-3 rounded-lg shadow-xl w-60"
                        >
                            <div className="flex items-center justify-between mb-1.5">
                                <h4 className="text-[9px] font-bold text-blue-400 uppercase tracking-tighter">
                                    📊 Today's Goal
                                </h4>
                                <span className="text-[8px] text-gray-500 font-mono">{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <div className="flex items-center gap-1.5 mb-1.5">
                                <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                    <motion.div
                                        className="h-full bg-gradient-to-r from-blue-600 to-cyan-500"
                                        animate={{ width: `${(dailyGoal.current / dailyGoal.target) * 100}%` }}
                                    />
                                </div>
                                <span className="text-[9px] font-black text-blue-400">{dailyGoal.current}/{dailyGoal.target}</span>
                            </div>
                            <p className="text-[8px] text-gray-400">
                                {dailyGoal.target - dailyGoal.current} more to maintain streak
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

                            <button
                                onClick={handleBulkHunt}
                                disabled={loading}
                                className="h-9 px-4 bg-blue-600/10 hover:bg-blue-600 text-blue-500 hover:text-white rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 border border-blue-500/20"
                            >
                                <Sparkles size={12} /> Hunt Emails
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

            {/* Creative Request Modal */}
            <AnimatePresence>
                {showCreativeRequest && (
                    <CreativeRequestModal
                        onClose={() => setShowCreativeRequest(false)}
                        onSuccess={() => {
                            confetti({
                                particleCount: 100,
                                spread: 70,
                                origin: { y: 0.6 },
                                colors: ['#a855f7', '#d946ef', '#ffffff']
                            });
                        }}
                    />
                )}
            </AnimatePresence>

        </div >
    );
};

export default Board;

