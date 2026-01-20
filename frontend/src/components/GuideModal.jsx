import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Database, Mail, Trophy, Map, Flame, Star, Zap, Shield } from 'lucide-react';

const GuideModal = ({ isOpen, onClose, userXP = 0, streak = 0 }) => {
    const [activeTab, setActiveTab] = useState('tools');

    if (!isOpen) return null;

    const tabs = [
        { id: 'start', label: 'Getting Started', icon: <Map size={16} /> },
        { id: 'tools', label: 'Scouting Tools', icon: <Search size={16} /> },
        { id: 'flash', label: 'Flash Mode', icon: <Zap size={16} className="text-yellow-500" /> },
        { id: 'workflow', label: 'Workflow', icon: <Database size={16} /> },
        { id: 'admin', label: 'Admin Power Tools', icon: <Shield size={16} className="text-blue-500" /> },
        { id: 'strategies', label: 'Team Strategies', icon: <Star size={16} className="text-purple-500" /> },
        { id: 'gamification', label: 'Profile & Rewards', icon: <Trophy size={16} /> },
    ];

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                />
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="bg-[#0A0A0A] border border-white/10 w-full max-w-4xl h-[80vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col relative z-50"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-white/10 bg-white/5">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center">
                                <span className="text-xl font-bold text-white">?</span>
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">Outreach Playbook</h2>
                                <p className="text-xs text-gray-400 uppercase tracking-widest">The official guide to TEDx Scouting</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="flex flex-1 overflow-hidden">
                        {/* Sidebar Tabs */}
                        <div className="w-64 bg-black/40 border-r border-white/10 p-4 space-y-2">
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === tab.id
                                        ? 'bg-red-600/20 text-red-500 border border-red-500/20'
                                        : 'text-gray-400 hover:bg-white/5 hover:text-white'
                                        }`}
                                >
                                    {tab.icon}
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-[#050505]">
                            {activeTab === 'start' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <h3 className="text-2xl font-bold text-white mb-4">Welcome to the War Room</h3>
                                    <p className="text-gray-400 leading-relaxed">
                                        This dashboard is your command center for curating the next lineup of TEDx speakers.
                                        Your mission is simple: <strong>Find, Connect, and Lock</strong> the most inspiring voices in the world.
                                    </p>
                                    <div className="grid grid-cols-2 gap-4 mt-8">
                                        <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                                            <h4 className="text-red-500 font-bold mb-2">1. Scout</h4>
                                            <p className="text-sm text-gray-400">Find speakers who align with our theme. Add them to the board.</p>
                                        </div>
                                        <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                                            <h4 className="text-blue-500 font-bold mb-2">2. Hunt</h4>
                                            <p className="text-sm text-gray-400">Use tools like Lusha/Mr.E to find their direct contact info.</p>
                                        </div>
                                        <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                                            <h4 className="text-yellow-500 font-bold mb-2">3. Engage</h4>
                                            <p className="text-sm text-gray-400">Draft personalized emails and start the conversation.</p>
                                        </div>
                                        <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                                            <h4 className="text-green-500 font-bold mb-2">4. Lock</h4>
                                            <p className="text-sm text-gray-400">Get the confirmation. Make it official.</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'tools' && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div>
                                        <h3 className="text-2xl font-bold text-white mb-6">The Scouting Arsenal</h3>
                                        <p className="text-gray-400 mb-8">
                                            Finding the right email is 90% of the battle. Use these tools to bypass gatekeepers.
                                        </p>
                                    </div>

                                    <div className="space-y-6">
                                        <GuideCard
                                            title="1. LinkedIn + Chrome Extensions"
                                            description="The primary hunting ground. Search for the speaker's name."
                                            steps={[
                                                "Go to the speaker's LinkedIn profile.",
                                                "Use extensions like **Lusha**, **Apollo**, or **Mr. E**.",
                                                "These tools will reveal multiple email addresses.",
                                                "PRIORITIZE personal emails (gmail/yahoo) over generic 'info@' or agent emails."
                                            ]}
                                        />

                                        <GuideCard
                                            title="2. Search Modifiers"
                                            description="Use Google Dorking if LinkedIn fails."
                                            steps={[
                                                "Try queries like: `\"Speaker Name\" email` or `\"Speaker Name\" contact`.",
                                                "Try: `site:company.com \"Speaker Name\"`"
                                            ]}
                                        />
                                    </div>
                                </div>
                            )}

                            {activeTab === 'flash' && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div>
                                        <h3 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
                                            <Zap size={24} className="text-yellow-500 fill-yellow-500/20" /> Flash Mode
                                        </h3>
                                        <p className="text-gray-400">
                                            The most efficient way to scale our speaker database. Use this mode when you want to focus on high-speed data entry.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="bg-red-600/5 border border-red-500/20 p-6 rounded-2xl relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                                <Search size={60} />
                                            </div>
                                            <h4 className="text-red-500 font-bold text-lg mb-2">1. Add New Mode</h4>
                                            <p className="text-xs text-gray-400 mb-4 leading-relaxed">
                                                Best for <strong>Bulk Scouting</strong>. Stay on LinkedIn, find a profile, and quickly commit their basic details to our board.
                                            </p>
                                            <ul className="text-[10px] text-gray-500 space-y-2">
                                                <li className="flex items-center gap-2">💨 Keyboard focused entry</li>
                                                <li className="flex items-center gap-2">⚡ Ctrl+Enter to save instantly</li>
                                            </ul>
                                        </div>

                                        <div className="bg-blue-600/5 border border-blue-500/20 p-6 rounded-2xl relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                                <Mail size={60} />
                                            </div>
                                            <h4 className="text-blue-500 font-bold text-lg mb-2">2. Enrich Mode</h4>
                                            <p className="text-xs text-gray-400 mb-4 leading-relaxed">
                                                The <strong>Email Hunter's</strong> choice. Automatically cycles through speakers who lack contact info.
                                            </p>
                                            <ul className="text-[10px] text-gray-500 space-y-2">
                                                <li className="flex items-center gap-2">🔍 One-click Search buttons</li>
                                                <li className="flex items-center gap-2">⏭️ Auto-next on save</li>
                                            </ul>
                                        </div>
                                    </div>

                                    <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
                                        <h4 className="text-white font-bold mb-4 flex items-center gap-2">
                                            <Zap size={16} className="text-yellow-500" /> Pro Power-User Tip
                                        </h4>
                                        <p className="text-sm text-gray-400 leading-relaxed italic">
                                            "Keep LinkedIn open in a separate window. Use **Add New** to dump 10-15 interesting people, then flip to **Enrich** to find all their emails in one sitting. It's 5x faster than doing them one-by-one."
                                        </p>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'workflow' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <h3 className="text-2xl font-bold text-white mb-4">Pipeline Stages</h3>

                                    <StatusDefinition
                                        status="SCOUTED"
                                        color="border-l-gray-500"
                                        desc="Just found them. No contact info yet. A raw idea."
                                    />
                                    <StatusDefinition
                                        status="EMAIL ADDED"
                                        color="border-l-blue-500"
                                        desc="You've found a verified email. They are ready for outreach."
                                    />
                                    <StatusDefinition
                                        status="RESEARCHED"
                                        color="border-l-purple-500"
                                        desc="You've watched their previous talks and know their angle."
                                    />
                                    <StatusDefinition
                                        status="DRAFTED"
                                        color="border-l-yellow-500"
                                        desc="Email is written in the portal but NOT sent."
                                    />
                                    <StatusDefinition
                                        status="CONTACT INITIATED"
                                        color="border-l-orange-500"
                                        desc="Email sent! Now we wait."
                                    />
                                    <StatusDefinition
                                        status="LOCKED"
                                        color="border-l-red-600"
                                        desc="The Holy Grail. They confirmed they are coming."
                                    />
                                </div>
                            )}

                            {activeTab === 'admin' && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div>
                                        <h3 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
                                            <Shield size={24} className="text-blue-500" /> Admin Power Tools
                                        </h3>
                                        <p className="text-gray-400">
                                            Advanced tools for managers to distribute workload and oversee the operation.
                                        </p>
                                    </div>

                                    <div className="space-y-6">
                                        <GuideCard
                                            title="Mass Action Terminal"
                                            description="Enter 'Select Mode' at the top right to act on hundreds of leads at once."
                                            steps={[
                                                "**Bulk Assign**: Select multiple leads and move them to a team member instantly.",
                                                "**Mass Status Reset**: Move entire batches between columns if priority changes.",
                                                "**Bounty System**: Mark high-value leads with a red target to incentivize the team."
                                            ]}
                                        />

                                        <GuideCard
                                            title="Equally Divide (The 'Deploy' Tool)"
                                            description="The fastest way to distribute fresh leads to your active team members."
                                            steps={[
                                                "Select all the leads you want to distribute.",
                                                "Click **'Divide'** in the Mass Action Toolbar.",
                                                "Pick the users who are working today.",
                                                "Click **'Deploy'**. The system mathematically splits the leads and assigns them instantly."
                                            ]}
                                        />
                                    </div>
                                </div>
                            )}

                            {activeTab === 'strategies' && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div>
                                        <h3 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
                                            <Star size={24} className="text-purple-500 fill-purple-500/20" /> Team Strategy
                                        </h3>
                                        <p className="text-gray-400">
                                            How to win the outreach game and lock the best speakers.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="p-5 bg-white/5 rounded-2xl border border-white/10">
                                            <h4 className="text-white font-bold mb-3">Focus on 'The Hook'</h4>
                                            <p className="text-xs text-gray-400 leading-relaxed">
                                                Don't just send generic invites. Use the **Ghostwriter AI** inside the cards to find a unique angle related to our theme: **"Blurring Lines"**.
                                            </p>
                                        </div>
                                        <div className="p-5 bg-white/5 rounded-2xl border border-white/10">
                                            <h4 className="text-white font-bold mb-3">The Follow-Up Rule</h4>
                                            <p className="text-xs text-gray-400 leading-relaxed">
                                                70% of speakers are locked on the 2nd or 3rd follow-up. Keep cards in **Contact Initiated** and use the activity log to track touches.
                                            </p>
                                        </div>
                                        <div className="p-5 bg-white/5 rounded-2xl border border-white/10">
                                            <h4 className="text-white font-bold mb-3">Quality vs Quantity</h4>
                                            <p className="text-xs text-gray-400 leading-relaxed">
                                                One personalized, well-researched invite to a 'Legend' tier speaker is worth 50 generic ones.
                                            </p>
                                        </div>
                                        <div className="p-5 bg-white/5 rounded-2xl border border-white/10">
                                            <h4 className="text-white font-bold mb-3">Collaborate</h4>
                                            <p className="text-xs text-gray-400 leading-relaxed">
                                                If you lose momentum on a lead, unassign yourself and let someone else take a fresh crack at it.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'gamification' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-2xl font-bold text-white">Your Legacy</h3>
                                        <div className="text-right">
                                            <p className="text-xs text-gray-500 uppercase tracking-widest">Current XP</p>
                                            <p className="text-2xl font-bold text-red-500 font-mono">{userXP}</p>
                                        </div>
                                    </div>

                                    {/* Stats Summary */}
                                    <div className="grid grid-cols-2 gap-4 mb-6">
                                        <div className="bg-white/5 p-4 rounded-xl border border-white/10 flex items-center gap-3">
                                            <div className="p-2 bg-orange-500/20 rounded-lg text-orange-500">
                                                <Flame size={20} />
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500">Active Streak</p>
                                                <p className="text-lg font-bold text-white">{streak} Days</p>
                                            </div>
                                        </div>
                                        <div className="bg-white/5 p-4 rounded-xl border border-white/10 flex items-center gap-3">
                                            <div className="p-2 bg-yellow-500/20 rounded-lg text-yellow-500">
                                                <Star size={20} />
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500">Next Rank</p>
                                                <p className="text-lg font-bold text-white">
                                                    {userXP < 100 ? 'Scout' :
                                                        userXP < 500 ? 'Diplomat' :
                                                            userXP < 1000 ? 'Ambassador' : 'Legend'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <h4 className="text-lg font-bold text-gray-400 mb-4">Badges & Honors</h4>
                                    <div className="grid grid-cols-3 gap-4">
                                        <Badge
                                            icon="👶"
                                            name="Rookie"
                                            desc="Start your journey"
                                            unlocked={userXP >= 0}
                                            color="bg-gray-500"
                                        />
                                        <Badge
                                            icon="🥉"
                                            name="Scout"
                                            desc="Earn 100 XP"
                                            unlocked={userXP >= 100}
                                            color="bg-orange-600"
                                        />
                                        <Badge
                                            icon="🥈"
                                            name="Diplomat"
                                            desc="Earn 500 XP"
                                            unlocked={userXP >= 500}
                                            color="bg-gray-300"
                                        />
                                        <Badge
                                            icon="🥇"
                                            name="Ambassador"
                                            desc="Earn 1000 XP"
                                            unlocked={userXP >= 1000}
                                            color="bg-yellow-500"
                                        />
                                        <Badge
                                            icon="🏆"
                                            name="Legend"
                                            desc="Earn 5000 XP"
                                            unlocked={userXP >= 5000}
                                            color="bg-yellow-400"
                                        />
                                        <Badge
                                            icon="🔥"
                                            name="On Fire"
                                            desc="3 Day Streak"
                                            unlocked={streak >= 3}
                                            color="bg-red-600"
                                        />
                                    </div>

                                    <div className="bg-gradient-to-r from-red-900/20 to-black p-6 rounded-xl border border-red-500/20 mt-6">
                                        <h4 className="font-bold text-red-500 mb-4 text-sm uppercase tracking-wider">How to Earn</h4>
                                        <div className="space-y-3 text-sm">
                                            <div className="flex justify-between items-center border-b border-white/5 pb-2">
                                                <span className="text-gray-300">Scout a speaker</span>
                                                <span className="font-mono text-yellow-500 font-bold">+10 XP</span>
                                            </div>
                                            <div className="flex justify-between items-center border-b border-white/5 pb-2">
                                                <span className="text-gray-300">Add verified Email</span>
                                                <span className="font-mono text-yellow-500 font-bold">+20 XP</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-gray-300">Lock a speaker</span>
                                                <span className="font-mono text-yellow-500 font-bold">+500 XP</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

// Helper Components
const GuideCard = ({ title, description, steps }) => (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6 hover:border-red-500/30 transition-colors">
        <h4 className="font-bold text-white mb-2">{title}</h4>
        <p className="text-sm text-gray-400 mb-4">{description}</p>
        <ul className="space-y-2">
            {steps.map((step, i) => (
                <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                    <span className="text-red-500 font-bold">•</span>
                    <span dangerouslySetInnerHTML={{ __html: step }} />
                </li>
            ))}
        </ul>
    </div>
);

const StatusDefinition = ({ status, color, desc }) => (
    <div className={`bg-black/40 border-l-4 ${color} p-4 rounded-r-xl border-y border-r border-white/5`}>
        <h5 className="font-bold text-white text-sm mb-1">{status}</h5>
        <p className="text-xs text-gray-400">{desc}</p>
    </div>
);

const Badge = ({ icon, name, desc, unlocked, color }) => (
    <div className={`bg-white/5 p-4 rounded-xl text-center border border-white/5 transition-all ${unlocked ? 'opacity-100 hover:border-white/20' : 'opacity-40 grayscale'}`}>
        <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-2 shadow-lg ${unlocked ? color : 'bg-gray-700'}`}>
            <span className="text-xl">{icon}</span>
        </div>
        <h5 className="font-bold text-white text-sm">{name}</h5>
        <p className="text-[10px] text-gray-400">{desc}</p>
        {!unlocked && <div className="mt-2 text-[10px] bg-white/10 rounded px-1 py-0.5 inline-block">LOCKED</div>}
    </div>
);

export default GuideModal;
