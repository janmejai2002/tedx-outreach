import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Search, Sparkles, Undo, Redo, CheckSquare, Download,
    Flame, Trophy, Bell, CircleHelp, Shield, X
} from 'lucide-react';

const Countdown = ({ targetDate }) => {
    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

    function calculateTimeLeft() {
        const difference = +new Date(targetDate) - +new Date();
        if (difference > 0) {
            return {
                d: Math.floor(difference / (1000 * 60 * 60 * 24)),
                h: Math.floor((difference / (1000 * 60 * 60)) % 24),
                m: Math.floor((difference / 1000 / 60) % 60),
                s: Math.floor((difference / 1000) % 60)
            };
        }
        return null;
    }

    useEffect(() => {
        const timer = setTimeout(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);
        return () => clearTimeout(timer);
    }, [timeLeft, targetDate]);

    if (!timeLeft) return <span>EXPIRED</span>;

    return (
        <>
            <span>{timeLeft.d}d</span>:
            <span>{timeLeft.h}h</span>:
            <span>{timeLeft.m}m</span>:
            <span className="text-red-500">{timeLeft.s}s</span>
        </>
    );
};

const BoardHeader = ({
    sprintDeadline,
    onSwitchMode,
    searchTerm,
    setSearchTerm,
    filterMode,
    setFilterMode,
    setIsAdding,
    setShowIngestion,
    setShowCreativeRequest,
    handleUndo,
    handleRedo,
    historyIndex,
    historyLength,
    isSelectMode,
    setIsSelectMode,
    setSelectedIds,
    exportSpeakers,
    userXP,
    showHub,
    setShowHub,
    quests,
    showActivity,
    setShowActivity,
    activityLog,
    setShowGuide,
    currentUser,
    setShowAdminPanel,
    handleLogout
}) => {

    return (
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

                {/* Sprint Deadline Timer */}
                {sprintDeadline && (
                    <div className="hidden md:flex flex-col items-center justify-center bg-red-950/20 px-4 py-1 rounded-xl border border-red-500/20 ml-6 group hover:border-red-500/40 transition-all">
                        <div className="flex items-center gap-2">
                            <span className="flex h-2 w-2 rounded-full bg-red-600 animate-pulse"></span>
                            <span className="text-[10px] font-black uppercase tracking-widest text-red-500">Deadline Approaching</span>
                        </div>
                        <div className="text-xs font-mono font-bold text-white flex gap-2">
                            <Countdown targetDate={sprintDeadline.deadline} />
                        </div>
                    </div>
                )}

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
                    <button
                        onClick={() => setShowCreativeRequest(true)}
                        className="h-8 md:pl-3 md:pr-4 px-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-[10px] md:text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-purple-900/20"
                        title="Request Creative Asset"
                    >
                        <span className="text-sm font-normal">+</span> <span className="hidden md:inline">Request</span>
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
                        disabled={historyIndex >= historyLength - 1}
                        className={`p-1.5 rounded-lg transition-colors ${historyIndex >= historyLength - 1 ? 'text-gray-700 opacity-50 cursor-not-allowed' : 'text-gray-400 hover:bg-white/10 hover:text-white'}`}
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
    );
};

export default BoardHeader;
