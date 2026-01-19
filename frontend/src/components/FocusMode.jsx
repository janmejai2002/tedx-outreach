import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Save, Zap, CheckCircle, Search, Mail, UserPlus, Database, ArrowRight, ExternalLink, Map } from 'lucide-react';
import { updateSpeaker, createSpeaker } from '../api';

const FocusMode = ({ isOpen, onClose, onAdd, onUpdate, recentAdds = [], speakers = [] }) => {
    const [mode, setMode] = useState('ADD'); // 'ADD' or 'ENRICH'
    const [formData, setFormData] = useState({
        name: '',
        primary_domain: '',
        designation: '',
        email: '',
        linkedin_url: '',
        status: 'SCOUTED'
    });

    const [showSuccess, setShowSuccess] = useState(false);
    const [sidebarTab, setSidebarTab] = useState('tools');
    const [enrichIndex, setEnrichIndex] = useState(0);
    const [isSaving, setIsSaving] = useState(false);

    // Filter for speakers needing enrichment (Scouted but no email)
    const speakersToEnrich = speakers.filter(s => s.status === 'SCOUTED' && !s.email).reverse();
    const currentEnrichSpeaker = speakersToEnrich[enrichIndex];

    useEffect(() => {
        if (isOpen && mode === 'ADD') {
            document.getElementById('focus-name-input')?.focus();
        }
    }, [isOpen, mode, showSuccess]);

    if (!isOpen) return null;

    const handleAddSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name) return;

        setIsSaving(true);
        try {
            const finalStatus = formData.email ? 'EMAIL_ADDED' : 'SCOUTED';
            const newSpeaker = {
                ...formData,
                status: finalStatus,
                spoc_name: localStorage.getItem('tedx_user') || 'Anonymous'
            };

            const savedSpeaker = await createSpeaker(newSpeaker);
            onAdd(savedSpeaker);

            setFormData({ name: '', primary_domain: '', designation: '', email: '', linkedin_url: '', status: 'SCOUTED' });
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 1500);
        } catch (err) {
            console.error("Add failed", err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleEnrichSubmit = async (e) => {
        e.preventDefault();
        if (!currentEnrichSpeaker || !formData.email) return;

        setIsSaving(true);
        try {
            const patches = {
                email: formData.email,
                linkedin_url: formData.linkedin_url,
                status: 'EMAIL_ADDED'
            };

            await updateSpeaker(currentEnrichSpeaker.id, patches);
            onUpdate(currentEnrichSpeaker.id, patches);

            setFormData({ ...formData, email: '', linkedin_url: '' });
            setShowSuccess(true);

            // Move to next speaker in list or switch mode if done
            if (enrichIndex < speakersToEnrich.length - 1) {
                // Stay on same index because the previous one is now filtered out (status changed)
                // But React state might be tricky here, let's just show success and let the filter re-run
            }

            setTimeout(() => setShowSuccess(false), 1500);
        } catch (err) {
            console.error("Enrich failed", err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleKeyDown = (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            mode === 'ADD' ? handleAddSubmit(e) : handleEnrichSubmit(e);
        }
        if (e.key === 'Escape') {
            onClose();
        }
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 bg-[#050505] flex flex-col font-sans">
                {/* Header */}
                <div className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-black/40 backdrop-blur-xl">
                    <div className="flex items-center gap-6">
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors">
                            <ArrowLeft size={20} />
                        </button>

                        <div className="flex items-center gap-2">
                            <Zap size={18} className="text-yellow-500 fill-yellow-500/20" />
                            <h2 className="text-sm font-black text-white uppercase tracking-[0.2em]">Flash Mode</h2>
                        </div>

                        {/* Mode Switcher */}
                        <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 mx-4">
                            <button
                                onClick={() => setMode('ADD')}
                                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${mode === 'ADD' ? 'bg-red-600 text-white shadow-lg shadow-red-900/40 translate-y-[-1px]' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                                <UserPlus size={12} /> Add New
                            </button>
                            <button
                                onClick={() => setMode('ENRICH')}
                                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${mode === 'ENRICH' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40 translate-y-[-1px]' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                                <Database size={12} /> Enrich ({speakersToEnrich.length})
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-8">
                        <div className="hidden md:flex items-center gap-6 text-[10px] font-black uppercase tracking-widest text-gray-500">
                            <span className="flex items-center gap-2">
                                <span className="bg-white/10 px-1.5 py-0.5 rounded text-white font-mono">CTRL + ENTER</span>
                                COMMIT
                            </span>
                            <span className="flex items-center gap-2">
                                <span className="bg-white/10 px-1.5 py-0.5 rounded text-white font-mono">ESC</span>
                                ABORT
                            </span>
                        </div>
                        <div className="w-px h-4 bg-white/10" />
                        <button
                            className="text-[10px] font-black text-red-500 hover:text-red-400 uppercase tracking-widest flex items-center gap-2 transition-colors"
                            onClick={() => {
                                // We can't directly open GuideModal from here unless we pass a prop or use a global state
                                // For now, let's just make sure they know there's a guide
                                alert("Check the 'Outreach Playbook' (?) on the main board for the full Flash Mode guide!");
                            }}
                        >
                            <Map size={14} /> View Playbook
                        </button>
                    </div>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Main Content Area */}
                    <div className="flex-1 flex flex-col items-center justify-center p-12 relative overflow-y-auto custom-scrollbar">
                        {showSuccess && (
                            <motion.div
                                initial={{ y: -20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: -20, opacity: 0 }}
                                className="absolute top-10 flex items-center gap-2 bg-green-500/10 text-green-500 px-6 py-2.5 rounded-full border border-green-500/20 font-bold text-sm shadow-xl shadow-green-900/10"
                            >
                                <CheckCircle size={18} /> {mode === 'ADD' ? 'Speaker Saved!' : 'Profile Enriched!'}
                            </motion.div>
                        )}

                        {mode === 'ADD' ? (
                            <motion.form
                                key="add-form"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                onSubmit={handleAddSubmit}
                                className="w-full max-w-2xl space-y-10"
                                onKeyDown={handleKeyDown}
                            >
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em] ml-1">Full Identity</label>
                                    <input
                                        id="focus-name-input"
                                        type="text"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full bg-transparent border-b-2 border-white/10 text-5xl font-black text-white placeholder-gray-800 focus:border-red-600 focus:outline-none py-4 transition-all"
                                        placeholder="Speaker Name..."
                                        autoComplete="off"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-10">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">Domain of Expertise</label>
                                        <input
                                            type="text"
                                            value={formData.primary_domain}
                                            onChange={e => setFormData({ ...formData, primary_domain: e.target.value })}
                                            className="w-full bg-transparent border-b border-white/10 text-xl font-bold text-gray-300 placeholder-gray-800 focus:border-red-600 focus:outline-none py-2 transition-all"
                                            placeholder="AI, Space, Ethics..."
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">Current Designation</label>
                                        <input
                                            type="text"
                                            value={formData.designation}
                                            onChange={e => setFormData({ ...formData, designation: e.target.value })}
                                            className="w-full bg-transparent border-b border-white/10 text-xl font-bold text-gray-300 placeholder-gray-800 focus:border-red-600 focus:outline-none py-2 transition-all"
                                            placeholder="CEO, Founder, Artist..."
                                        />
                                    </div>
                                </div>

                                <div className="bg-white/5 p-8 rounded-3xl border border-white/5 space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                            <Mail size={12} className="text-red-500" /> Direct Email
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.email}
                                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-700 focus:border-red-600 focus:outline-none transition-all"
                                            placeholder="Found it already? Enter here..."
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={!formData.name || isSaving}
                                    className="w-full py-5 bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 text-white font-black rounded-2xl shadow-2xl shadow-red-900/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-50"
                                >
                                    {isSaving ? 'Saving Process...' : <><Save size={20} /> Commit to Scouting List</>}
                                </button>
                            </motion.form>
                        ) : (
                            <motion.div
                                key="enrich-form"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="w-full max-w-4xl"
                            >
                                {currentEnrichSpeaker ? (
                                    <div className="grid grid-cols-5 gap-12 items-center">
                                        {/* Speaker Preview Card */}
                                        <div className="col-span-2 space-y-6">
                                            <div className="bg-gradient-to-br from-red-600/20 to-purple-900/20 p-1 rounded-[2rem] border border-white/10 shadow-2xl">
                                                <div className="bg-[#0f0f0f] rounded-[1.8rem] p-8 aspect-square flex flex-col justify-center">
                                                    <div className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center text-3xl font-black mb-6 shadow-xl shadow-red-900/40">
                                                        {currentEnrichSpeaker.name[0]}
                                                    </div>
                                                    <h3 className="text-3xl font-black text-white leading-tight mb-2">{currentEnrichSpeaker.name}</h3>
                                                    <p className="text-red-500 font-bold uppercase tracking-widest text-[10px] mb-4">{currentEnrichSpeaker.primary_domain}</p>
                                                    <p className="text-gray-500 text-sm leading-relaxed">{currentEnrichSpeaker.designation || "Expert in the field"}</p>

                                                    <div className="mt-8 pt-8 border-t border-white/5 flex gap-4">
                                                        <a
                                                            href={`https://www.google.com/search?q=${currentEnrichSpeaker.name}+linkedin+email`}
                                                            target="_blank"
                                                            className="flex-1 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 py-3 rounded-xl text-xs font-bold transition-all"
                                                        >
                                                            <Search size={14} /> Search
                                                        </a>
                                                        <a
                                                            href={currentEnrichSpeaker.linkedin_url || `https://www.linkedin.com/search/results/all/?keywords=${currentEnrichSpeaker.name}`}
                                                            target="_blank"
                                                            className="flex-1 flex items-center justify-center gap-2 bg-[#0077b5]/10 hover:bg-[#0077b5]/20 text-[#0077b5] py-3 rounded-xl text-xs font-bold transition-all"
                                                        >
                                                            <ExternalLink size={14} /> LinkedIn
                                                        </a>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-center px-4">
                                                <span className="text-[10px] font-bold text-gray-500">REMAINING: {speakersToEnrich.length}</span>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => setEnrichIndex(prev => Math.max(0, prev - 1))}
                                                        className="p-2 bg-white/5 rounded-lg text-gray-500 hover:text-white"
                                                    >
                                                        <ArrowLeft size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => setEnrichIndex(prev => (prev + 1) % speakersToEnrich.length)}
                                                        className="p-2 bg-white/5 rounded-lg text-gray-500 hover:text-white font-bold text-[10px] flex items-center gap-2 px-3"
                                                    >
                                                        Skip <ArrowRight size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Enrichment Form */}
                                        <form onSubmit={handleEnrichSubmit} className="col-span-3 space-y-8" onKeyDown={handleKeyDown}>
                                            <div className="space-y-4">
                                                <h2 className="text-4xl font-black text-white tracking-tighter">Locate Connection</h2>
                                                <p className="text-gray-500 text-sm">Find this speaker's direct coordinates to unlock the next stage.</p>
                                            </div>

                                            <div className="space-y-6">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">Direct Business Email</label>
                                                    <input
                                                        autoFocus
                                                        type="text"
                                                        value={formData.email}
                                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-lg text-white placeholder-gray-700 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none transition-all shadow-inner"
                                                        placeholder="Paste direct email here..."
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">LinkedIn Profile URL</label>
                                                    <input
                                                        type="text"
                                                        value={formData.linkedin_url}
                                                        onChange={e => setFormData({ ...formData, linkedin_url: e.target.value })}
                                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-sm text-gray-400 placeholder-gray-700 focus:border-blue-600 focus:outline-none transition-all"
                                                        placeholder="https://linkedin.com/in/..."
                                                    />
                                                </div>
                                            </div>

                                            <button
                                                type="submit"
                                                disabled={!formData.email || isSaving}
                                                className="w-full py-5 bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-500 hover:to-blue-700 text-white font-black rounded-2xl shadow-2xl shadow-blue-900/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-50"
                                            >
                                                {isSaving ? 'Updating...' : <><CheckCircle size={20} /> Done - Move to Outreach Phase</>}
                                            </button>
                                        </form>
                                    </div>
                                ) : (
                                    <div className="text-center py-20 space-y-6">
                                        <div className="w-20 h-20 bg-green-500/20 text-green-500 rounded-full mx-auto flex items-center justify-center">
                                            <CheckCircle size={40} />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-bold text-white mb-2">Queue Clear!</h3>
                                            <p className="text-gray-500">Every scouted speaker has an email. Good job!</p>
                                        </div>
                                        <button onClick={() => setMode('ADD')} className="bg-white/10 hover:bg-white/20 px-6 py-2 rounded-full font-bold transition-all">
                                            Scout More Speakers
                                        </button>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </div>

                    {/* Sidebar Instructions (Right) */}
                    <div className="w-80 bg-black/60 border-l border-white/10 flex flex-col backdrop-blur-md">
                        <div className="p-6 border-b border-white/10">
                            <div className="flex bg-white/5 p-1 rounded-lg border border-white/5 mb-6">
                                <button
                                    onClick={() => setSidebarTab('tools')}
                                    className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider transition-all ${sidebarTab === 'tools' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-400'}`}
                                >
                                    Toolkit
                                </button>
                                <button
                                    onClick={() => setSidebarTab('stats')}
                                    className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider transition-all ${sidebarTab === 'stats' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-400'}`}
                                >
                                    Log
                                </button>
                            </div>

                            {sidebarTab === 'tools' ? (
                                <div className="space-y-8">
                                    <div className="space-y-4">
                                        <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                            <Zap size={10} className="text-yellow-500" /> Quick-Finding Tips
                                        </h4>
                                        <div className="space-y-4">
                                            <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                                <span className="text-xs font-bold text-white block mb-1">Method 1: Mr. E</span>
                                                <p className="text-[10px] text-gray-500 leading-relaxed">Most reliable for corporate emails. Just open their LinkedIn and click the "E" icon.</p>
                                            </div>
                                            <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                                <span className="text-xs font-bold text-white block mb-1">Method 2: Lusha</span>
                                                <p className="text-[10px] text-gray-500 leading-relaxed">Best for personal emails or mobile numbers of Founders/CEOs.</p>
                                            </div>
                                            <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                                <span className="text-xs font-bold text-white block mb-1">Method 3: Apollo.io</span>
                                                <p className="text-[10px] text-gray-500 leading-relaxed">Used for bulk lead scraping. Reliable verification indicators.</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-red-600/10 border border-red-500/20 p-5 rounded-3xl">
                                        <h5 className="text-xs font-bold text-red-500 mb-2">Quality Check</h5>
                                        <p className="text-[10px] text-red-100/60 leading-relaxed italic">
                                            "A lead is only as good as its contact point. Double-check if it's their personal inbox or a general 'info@' address."
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Session Summary</h4>
                                    <div className="space-y-2">
                                        {recentAdds.slice(0, 10).map((s, i) => (
                                            <div key={i} className="flex items-center gap-3 bg-white/5 p-2 rounded-lg border border-white/5">
                                                <div className="w-8 h-8 rounded-lg bg-green-500/20 text-green-500 flex items-center justify-center text-[10px] font-bold">
                                                    +
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-xs font-bold text-white truncate">{s.name}</div>
                                                    <div className="text-[9px] text-gray-500 uppercase">{s.status}</div>
                                                </div>
                                            </div>
                                        ))}
                                        {recentAdds.length === 0 && <p className="text-center text-gray-600 text-[10px] py-10">No actions this session</p>}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AnimatePresence>
    );
};

export default FocusMode;
