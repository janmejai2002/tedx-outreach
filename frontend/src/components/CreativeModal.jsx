import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Sparkles, Send, Clock, Layout,
    Palette, List, CheckCircle2, User,
    FileText, Save, Trash2, ExternalLink
} from 'lucide-react';
import { generateCreativeBrief, updateCreative } from '../api';

const CreativeModal = ({ asset, onClose, onUpdate, currentUser }) => {
    const [loading, setLoading] = useState(false);
    const [briefData, setBriefData] = useState(null);
    const [activeTab, setActiveTab] = useState('details');
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({ ...asset });

    useEffect(() => {
        if (asset.creative_brief) {
            try {
                setBriefData(JSON.parse(asset.creative_brief));
            } catch (e) { console.error("Bad brief json", e); }
        }
    }, [asset]);

    const handleSave = async () => {
        setLoading(true);
        try {
            await updateCreative(asset.id, formData);
            onUpdate(asset.id, formData);
            setIsEditing(false);
        } catch (e) {
            alert("Failed to save changes");
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateBrief = async () => {
        setLoading(true);
        try {
            const data = await generateCreativeBrief(asset.id);
            setBriefData(data);
            onUpdate(asset.id, { status: 'SCRIPTING', creative_brief: JSON.stringify(data) });
        } catch (error) {
            alert("AI Briefing Failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                className="w-full max-w-5xl bg-[#0a0a0f] border border-purple-500/20 rounded-3xl overflow-hidden flex flex-col max-h-[90vh] shadow-[0_0_100px_rgba(168,85,247,0.15)]"
            >
                {/* Header */}
                <div className="p-8 border-b border-white/5 flex justify-between items-start bg-gradient-to-r from-purple-900/20 to-transparent">
                    <div className="flex gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-900/40">
                            <Palette size={28} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-1">{asset.title}</h2>
                            <div className="flex gap-3 text-[10px] font-black uppercase tracking-widest text-purple-400/80">
                                <span>{asset.asset_type}</span>
                                <span>•</span>
                                <span>{asset.platform || 'General Media'}</span>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-500 hover:text-white">
                        <X size={24} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex px-4 border-b border-white/5">
                    {['details', 'brief'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`p-6 text-xs font-black uppercase tracking-[0.2em] transition-all relative ${activeTab === tab ? 'text-purple-400' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            {tab === 'details' ? 'Production Intel' : 'Creative Brief'}
                            {activeTab === tab && <motion.div layoutId="tab-underline-creative" className="absolute bottom-0 left-6 right-6 h-0.5 bg-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.8)]" />}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto p-10 custom-scrollbar bg-[#0a0a0f]">
                    {activeTab === 'details' ? (
                        <div className="grid grid-cols-5 gap-10">
                            <div className="col-span-3 space-y-10">
                                <div className="space-y-4">
                                    <h3 className="text-[10px] font-black text-purple-500 uppercase tracking-widest flex items-center gap-2">
                                        <FileText size={14} /> Description & Hook
                                    </h3>
                                    {isEditing ? (
                                        <textarea
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm text-gray-200 focus:outline-none focus:border-purple-500/50 min-h-[150px]"
                                            value={formData.description}
                                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        />
                                    ) : (
                                        <div className="p-6 bg-white/5 border border-white/5 rounded-2xl text-sm text-gray-300 leading-loose italic">
                                            {formData.description || "No description provided."}
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-8">
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-gray-600 uppercase">Platform</label>
                                        <input
                                            disabled={!isEditing}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white disabled:opacity-50"
                                            value={formData.platform}
                                            onChange={e => setFormData({ ...formData, platform: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-gray-600 uppercase">Status</label>
                                        <select
                                            disabled={!isEditing}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white disabled:opacity-50 appearance-none"
                                            value={formData.status}
                                            onChange={e => setFormData({ ...formData, status: e.target.value })}
                                        >
                                            {['CONCEPT', 'SCRIPTING', 'PRODUCTION', 'EDITING', 'REVIEW', 'APPROVED'].map(s => (
                                                <option key={s} value={s}>{s}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="col-span-2 space-y-8">
                                <div className="p-8 bg-gradient-to-br from-purple-900/20 to-pink-900/10 border border-purple-500/20 rounded-3xl">
                                    <h4 className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                        <Layout size={14} /> Asset Metadata
                                    </h4>
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-purple-600/20 flex items-center justify-center text-purple-400">
                                                <User size={20} />
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-black text-gray-500 uppercase">Assigned To</p>
                                                <p className="text-sm font-bold text-white uppercase">{asset.assigned_to || 'Unassigned'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center text-blue-400">
                                                <Clock size={20} />
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-black text-gray-500 uppercase">Deadline</p>
                                                <p className="text-sm font-bold text-white">{asset.due_date ? new Date(asset.due_date).toLocaleDateString() : 'TBD'}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-8 pt-8 border-t border-white/5 flex gap-4">
                                        {!isEditing ? (
                                            <button
                                                onClick={() => setIsEditing(true)}
                                                className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                            >
                                                Modify Details
                                            </button>
                                        ) : (
                                            <button
                                                onClick={handleSave}
                                                className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-purple-900/20"
                                            >
                                                <Save size={12} className="inline mr-2" /> Save Intel
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="p-6 bg-white/5 rounded-3xl border border-white/5">
                                    <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">Moodboard / Assets</h4>
                                    {isEditing ? (
                                        <div className="space-y-2">
                                            <input
                                                type="url"
                                                placeholder="https://drive.google.com/..."
                                                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-purple-500/50"
                                                value={formData.moodboard_url || ''}
                                                onChange={e => setFormData({ ...formData, moodboard_url: e.target.value })}
                                            />
                                            <p className="text-[9px] text-gray-600">Paste Figma, Drive, or Pinterest link.</p>
                                        </div>
                                    ) : formData.moodboard_url ? (
                                        <a
                                            href={formData.moodboard_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="w-full py-4 bg-purple-600/10 border border-purple-500/30 rounded-2xl flex flex-col items-center gap-2 text-purple-400 hover:bg-purple-600/20 transition-all"
                                        >
                                            <ExternalLink size={20} />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Open Assets</span>
                                        </a>
                                    ) : (
                                        <div className="w-full py-6 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center gap-2 text-gray-600">
                                            <ExternalLink size={20} className="opacity-50" />
                                            <span className="text-[10px] font-black uppercase tracking-widest opacity-50">No Assets Linked</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="max-w-4xl mx-auto min-h-[400px]">
                            {!briefData ? (
                                <div className="flex flex-col items-center justify-center h-[400px] text-center space-y-8">
                                    <div className="relative">
                                        <div className="w-24 h-24 bg-purple-600/10 rounded-full flex items-center justify-center animate-pulse">
                                            <Sparkles className="text-purple-400" size={40} />
                                        </div>
                                        <motion.div
                                            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                                            transition={{ duration: 3, repeat: Infinity }}
                                            className="absolute inset-0 bg-purple-500/20 rounded-full blur-2xl"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Initialize Creative Brief</h3>
                                        <p className="text-gray-500 text-sm max-w-sm mx-auto leading-relaxed font-medium">
                                            Synthesize your prompt into a full production kit including messaging strategy, shot lists, and mood concepts.
                                        </p>
                                    </div>
                                    <button
                                        onClick={handleGenerateBrief}
                                        disabled={loading}
                                        className="px-10 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-full text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-purple-900/30 disabled:opacity-50"
                                    >
                                        {loading ? 'Synthesizing Production Logic...' : '✨ Generate AI Briefing'}
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-10">
                                    <div className="space-y-10">
                                        <section className="space-y-4">
                                            <h4 className="text-[10px] font-black text-purple-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                                <Sparkles size={14} /> Strategic Briefing
                                            </h4>
                                            <div className="prose prose-sm prose-invert p-8 bg-white/5 border border-white/5 rounded-3xl" dangerouslySetInnerHTML={{ __html: briefData.brief_html }} />
                                        </section>
                                        <section className="space-y-4">
                                            <h4 className="text-[10px] font-black text-pink-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                                <Palette size={14} /> Mood & Aesthetics
                                            </h4>
                                            <div className="prose prose-sm prose-invert p-8 bg-white/5 border border-white/5 rounded-3xl" dangerouslySetInnerHTML={{ __html: briefData.mood_html }} />
                                        </section>
                                    </div>
                                    <div className="space-y-10">
                                        <section className="space-y-4">
                                            <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                                <List size={14} /> Shot List / Elements
                                            </h4>
                                            <div className="prose prose-sm prose-invert p-8 bg-white/5 border border-white/5 rounded-3xl" dangerouslySetInnerHTML={{ __html: briefData.shot_list_html }} />
                                        </section>
                                        <div className="p-8 bg-purple-600/10 border border-purple-500/20 rounded-3xl">
                                            <h5 className="text-[10px] font-black text-white uppercase tracking-widest mb-4">Brief Approval</h5>
                                            <p className="text-xs text-gray-500 mb-6">Confirming the brief will move this asset to the Scripting phase.</p>
                                            <button className="w-full py-4 bg-purple-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-purple-900/20">
                                                Confirm & Start Production
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </motion.div >
        </div >
    );
};

export default CreativeModal;
