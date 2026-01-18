import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Save, Zap, CheckCircle, Clock, Search, Mail, Database } from 'lucide-react';

const FocusMode = ({ isOpen, onClose, onAdd, recentAdds = [], speakers = [] }) => {
    const [formData, setFormData] = useState({
        name: '',
        primary_domain: '',
        designation: '',
        curr_email: '',
        spoc_name: '', // Will be filled automatically
        status: 'SCOUTED'
    });
    const [showSuccess, setShowSuccess] = useState(false);
    const [sidebarTab, setSidebarTab] = useState('list'); // 'list' or 'tools'

    // Auto-focus name input on mount
    useEffect(() => {
        if (isOpen) {
            document.getElementById('focus-name-input')?.focus();
        }
    }, [isOpen, showSuccess]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.name || !formData.primary_domain) return;

        // If email is provided, status bumps to EMAIL_ADDED
        const finalStatus = formData.curr_email ? 'EMAIL_ADDED' : 'SCOUTED';

        onAdd({
            ...formData,
            status: finalStatus,
            id: Date.now().toString(),
            spoc_name: localStorage.getItem('tedx_user') || 'Anonymous'
        });

        // Reset and show success
        setFormData(prev => ({ ...prev, name: '', primary_domain: '', designation: '', curr_email: '' }));
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 1500);
    };

    const handleKeyDown = (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            handleSubmit(e);
        }
        if (e.key === 'Escape') {
            onClose();
        }
    };

    // Filter for speakers in SCOUTED status (or EMAIL_ADDED if recent)
    const scoutedSpeakers = speakers.filter(s => s.status === 'SCOUTED').reverse();

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 bg-[#050505] flex flex-col">
                {/* Header */}
                <div className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-black/40">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <Zap size={18} className="text-yellow-500" /> Focus Mode
                        </h2>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span><kbd className="bg-white/10 px-2 py-0.5 rounded text-gray-300">Ctrl + Enter</kbd> to Save</span>
                        <span><kbd className="bg-white/10 px-2 py-0.5 rounded text-gray-300">Esc</kbd> to Exit</span>
                    </div>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Input Area (Center/Left) */}
                    <div className="flex-1 flex items-center justify-center p-8 relative">
                        {showSuccess && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute top-10 flex items-center gap-2 bg-green-500/10 text-green-500 px-4 py-2 rounded-full border border-green-500/20"
                            >
                                <CheckCircle size={16} /> Added Successfully!
                            </motion.div>
                        )}

                        <form onSubmit={handleSubmit} className="w-full max-w-xl space-y-6" onKeyDown={handleKeyDown}>
                            <div>
                                <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2 font-bold">Speaker Name</label>
                                <input
                                    id="focus-name-input"
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full bg-transparent border-b-2 border-white/20 text-4xl font-bold text-white placeholder-gray-700 focus:border-red-600 focus:outline-none py-2 transition-colors"
                                    placeholder="Enter Name..."
                                    autoComplete="off"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2 font-bold">Domain / Field</label>
                                    <input
                                        type="text"
                                        value={formData.primary_domain}
                                        onChange={e => setFormData({ ...formData, primary_domain: e.target.value })}
                                        className="w-full bg-transparent border-b border-white/10 text-xl text-gray-300 placeholder-gray-700 focus:border-red-600 focus:outline-none py-2 transition-colors"
                                        placeholder="e.g. AI, Music..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2 font-bold">Designation (Optional)</label>
                                    <input
                                        type="text"
                                        value={formData.designation}
                                        onChange={e => setFormData({ ...formData, designation: e.target.value })}
                                        className="w-full bg-transparent border-b border-white/10 text-xl text-gray-300 placeholder-gray-700 focus:border-red-600 focus:outline-none py-2 transition-colors"
                                        placeholder="e.g. CEO"
                                    />
                                </div>
                            </div>

                            <div className="pt-4 border-t border-white/5">
                                <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2 font-bold flex items-center gap-2">
                                    <Mail size={12} /> Email (Optional - If found immediately)
                                </label>
                                <input
                                    type="text"
                                    value={formData.curr_email}
                                    onChange={e => setFormData({ ...formData, curr_email: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg text-sm text-gray-300 placeholder-gray-600 focus:border-red-600 focus:ring-1 focus:ring-red-600 focus:outline-none px-4 py-3 transition-colors"
                                    placeholder="Use Lusha/Mr. E to find email..."
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl shadow-lg shadow-red-900/30 transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2 mt-4"
                            >
                                <Save size={20} /> Save Speaker
                            </button>
                        </form>
                    </div>

                    {/* Sidebar (Right) */}
                    <div className="w-96 bg-black/20 border-l border-white/10 flex flex-col">
                        {/* Sidebar Tabs */}
                        <div className="flex border-b border-white/10">
                            <button
                                onClick={() => setSidebarTab('tools')}
                                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${sidebarTab === 'tools' ? 'bg-white/5 text-white border-b-2 border-red-500' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                                Tools & Tips
                            </button>
                            <button
                                onClick={() => setSidebarTab('list')}
                                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${sidebarTab === 'list' ? 'bg-white/5 text-white border-b-2 border-red-500' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                                Scouted List ({scoutedSpeakers.length})
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                            {sidebarTab === 'tools' ? (
                                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                                        <h4 className="font-bold text-white mb-2 flex items-center gap-2">
                                            <Search size={14} className="text-red-500" /> Finding Details
                                        </h4>
                                        <p className="text-sm text-gray-400 mb-4">
                                            Before adding, quickly check:
                                            <br />1. Is their bio impressive?
                                            <br />2. Do they fit the theme?
                                        </p>
                                    </div>

                                    <div className="bg-red-900/10 border border-red-500/20 rounded-xl p-4">
                                        <h4 className="font-bold text-white mb-2 flex items-center gap-2">
                                            <Mail size={14} className="text-red-500" /> Finding Emails
                                        </h4>
                                        <p className="text-xs text-gray-400 mb-3">
                                            Use these Chrome extensions on their LinkedIn profile:
                                        </p>
                                        <ul className="space-y-3">
                                            <li className="flex items-start gap-3 bg-black/20 p-2 rounded-lg">
                                                <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center text-[10px] font-bold">L</div>
                                                <div>
                                                    <span className="text-sm font-bold block">Lusha</span>
                                                    <span className="text-[10px] text-gray-500">Best for direct phone #s and personal emails.</span>
                                                </div>
                                            </li>
                                            <li className="flex items-start gap-3 bg-black/20 p-2 rounded-lg">
                                                <div className="w-6 h-6 rounded bg-purple-600 flex items-center justify-center text-[10px] font-bold">E</div>
                                                <div>
                                                    <span className="text-sm font-bold block">Mr. E</span>
                                                    <span className="text-[10px] text-gray-500">Great for finding corporate emails.</span>
                                                </div>
                                            </li>
                                            <li className="flex items-start gap-3 bg-black/20 p-2 rounded-lg">
                                                <div className="w-6 h-6 rounded bg-yellow-600 flex items-center justify-center text-[10px] font-bold">A</div>
                                                <div>
                                                    <span className="text-sm font-bold block">Apollo</span>
                                                    <span className="text-[10px] text-gray-500">Huge database, reliable for US/EU speakers.</span>
                                                </div>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-300">
                                    <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                                        <span>Entire 'Scouted' Column</span>
                                        <span>Total: {scoutedSpeakers.length}</span>
                                    </div>

                                    {scoutedSpeakers.length === 0 ? (
                                        <div className="text-center text-gray-600 italic py-10">
                                            No speakers in Scouted yet.
                                        </div>
                                    ) : (
                                        scoutedSpeakers.map((speaker) => (
                                            <motion.div
                                                key={speaker.id}
                                                initial={{ x: 20, opacity: 0 }}
                                                animate={{ x: 0, opacity: 1 }}
                                                className="bg-white/5 border border-white/10 rounded-lg p-3 hover:border-red-500/30 transition-colors group"
                                            >
                                                <div className="flex justify-between items-start">
                                                    <h4 className="font-bold text-white text-sm">{speaker.name}</h4>
                                                    <span className="text-[10px] bg-white/10 text-gray-400 px-1.5 py-0.5 rounded ml-2 whitespace-nowrap">
                                                        {speaker.spoc_name?.split(' ')[0] || 'Unassigned'}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-400 mt-1 truncate">{speaker.primary_domain}</p>
                                                {speaker.designation && <p className="text-[10px] text-gray-500 truncate">{speaker.designation}</p>}
                                            </motion.div>
                                        ))
                                    )}
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
