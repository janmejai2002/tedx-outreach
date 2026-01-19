import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Target, Flame, Star, X, BarChart3, Users, Zap, Award } from 'lucide-react';

const RecruiterDashboard = ({
    isOpen,
    onClose,
    userXP,
    streak,
    leaderboard,
    quests,
    teamGoal = { current: 45, target: 100 },
    userName
}) => {
    if (!isOpen) return null;

    const level = Math.floor(userXP / 500) + 1;
    const progressToNextLevel = (userXP % 500) / 5;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[60] flex justify-end">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                />

                <motion.div
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="relative w-full max-w-md bg-[#0a0a0a] border-l border-white/10 h-full flex flex-col shadow-2xl"
                >
                    {/* Header */}
                    <div className="p-8 border-b border-white/5 bg-gradient-to-br from-red-600/10 to-transparent">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-2xl font-black text-white tracking-tighter uppercase">Recruiter Hub</h2>
                                <p className="text-[10px] text-gray-500 font-bold tracking-widest uppercase">Performance Dashboard</p>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-gray-400 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* User ID Card */}
                        <div className="bg-white/5 border border-white/10 p-5 rounded-2xl flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-600 to-purple-700 flex items-center justify-center font-black text-xl border border-white/20 shadow-xl">
                                {userName ? userName[0] : '?'}
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-bold text-white leading-none mb-1">{userName}</h3>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Level {level}</span>
                                    <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                                        <motion.div
                                            className="h-full bg-red-600"
                                            initial={{ width: 0 }}
                                            animate={{ width: `${progressToNextLevel}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
                        {/* Stats Grid */}
                        <section>
                            <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <BarChart3 size={12} /> Live Metrics
                            </h4>
                            <div className="grid grid-cols-2 gap-4">
                                <StatBox icon={<Flame size={16} />} label="Streak" value={`${streak} Days`} color="text-orange-500" />
                                <StatBox icon={<Award size={16} />} label="XP earned" value={userXP} color="text-yellow-500" />
                            </div>
                        </section>

                        {/* Team Goal Tracker */}
                        <section className="bg-blue-600/5 border border-blue-500/20 p-6 rounded-3xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-5">
                                <Users size={80} />
                            </div>
                            <h4 className="text-blue-500 font-bold text-sm mb-4 flex items-center gap-2">
                                <Users size={14} /> Team Milestone
                            </h4>
                            <div className="flex justify-between items-end mb-2">
                                <span className="text-3xl font-black text-white">{teamGoal.current}<span className="text-sm text-gray-500 font-normal">/{teamGoal.target}</span></span>
                                <span className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">Speakers Confirmed</span>
                            </div>
                            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                                <motion.div
                                    className="h-full bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.4)]"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(teamGoal.current / teamGoal.target) * 100}%` }}
                                />
                            </div>
                        </section>

                        {/* Quests */}
                        <section>
                            <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Target size={12} className="text-red-500" /> Active Bounty
                            </h4>
                            <div className="space-y-3">
                                {quests.map(quest => (
                                    <div key={quest.id} className={`p-4 rounded-2xl border transition-all ${quest.completed ? 'bg-green-500/10 border-green-500/20 opacity-60' : 'bg-white/5 border-white/10 hover:border-red-500/30'}`}>
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-xs font-bold text-gray-200">{quest.title}</span>
                                            <span className="text-[9px] font-black text-yellow-500">+{quest.reward} XP</span>
                                        </div>
                                        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                                            <motion.div
                                                className={`h-full ${quest.completed ? 'bg-green-500' : 'bg-red-600'}`}
                                                initial={{ width: 0 }}
                                                animate={{ width: `${(quest.current / quest.target) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Global Leaderboard */}
                        <section>
                            <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Trophy size={12} className="text-yellow-500" /> Top Ambassadors
                            </h4>
                            <div className="space-y-4">
                                {leaderboard.map((user, idx) => (
                                    <div key={user.name} className="flex items-center gap-4 group">
                                        <div className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-black ${idx === 0 ? 'bg-yellow-500 text-black' : 'bg-white/10 text-gray-500'}`}>
                                            {idx + 1}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className={`text-sm font-bold ${user.name === userName ? 'text-red-500' : 'text-gray-300'}`}>{user.name}</span>
                                                <span className="text-xs font-mono text-gray-500">{user.score} XP</span>
                                            </div>
                                            <div className="w-full h-[2px] bg-white/5 rounded-full overflow-hidden">
                                                <motion.div
                                                    className={`h-full ${idx === 0 ? 'bg-yellow-500' : 'bg-white/20'}`}
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${(user.score / (leaderboard[0].score || 1)) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>

                    <div className="p-8 border-t border-white/5 bg-black/40">
                        <button
                            className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all"
                            onClick={() => alert("Daily quests refresh in 14h 22m")}
                        >
                            Refresh Bounty Board
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

const StatBox = ({ icon, label, value, color }) => (
    <div className="bg-white/5 border border-white/10 p-5 rounded-3xl hover:border-white/20 transition-all">
        <div className={`mb-2 ${color}`}>{icon}</div>
        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{label}</p>
        <p className="text-xl font-black text-white">{value}</p>
    </div>
);

export default RecruiterDashboard;
