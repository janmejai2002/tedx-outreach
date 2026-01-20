import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Target, Mail, Globe, Linkedin, MapPin, AlertCircle,
    Trash2, ExternalLink, Download, Send, Smartphone,
    User, Sparkles, X, Activity, Users, TrendingUp,
    Pencil, Save, CheckCircle
} from 'lucide-react';
import { getSpeakerLogs, assignSpeaker, unassignSpeaker, generateEmail, updateSpeaker, refineEmail, getAiPrompt } from '../api';
import { Copy, Check } from 'lucide-react';

const OutreachModal = ({ speaker, onClose, onUpdate, authorizedUsers = [], currentUser = null }) => {
    const [assigning, setAssigning] = useState(false);
    const [loading, setLoading] = useState(false);
    const [emailData, setEmailData] = useState(null);
    const [activeTab, setActiveTab] = useState('details'); // details | outreach
    const [aiPrompt, setAiPrompt] = useState(null);
    const [copiedPrompt, setCopiedPrompt] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [chatInput, setChatInput] = useState("");
    const [refining, setRefining] = useState(false);
    const [isDraftEditing, setIsDraftEditing] = useState(false);
    const [history, setHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        email: speaker.email || '',
        phone: speaker.phone || '',
        remarks: speaker.remarks || '',
        contact_method: speaker.contact_method || '',
        notes: speaker.notes || '',
        spoc_name: speaker.spoc_name || '',
        location: speaker.location || '',
        primary_domain: speaker.primary_domain || '',
        blurring_line_angle: speaker.blurring_line_angle || '',
        is_bounty: speaker.is_bounty || false,
        linkedin_url: speaker.linkedin_url || ''
    });

    useEffect(() => {
        setFormData({
            email: speaker.email || '',
            phone: speaker.phone || '',
            remarks: speaker.remarks || '',
            contact_method: speaker.contact_method || '',
            notes: speaker.notes || '',
            spoc_name: speaker.spoc_name || '',
            location: speaker.location || '',
            primary_domain: speaker.primary_domain || '',
            blurring_line_angle: speaker.blurring_line_angle || '',
            is_bounty: speaker.is_bounty || false,
            linkedin_url: speaker.linkedin_url || ''
        });
    }, [speaker]);

    useEffect(() => {
        // Load persisted draft
        if (speaker.email_draft) {
            try {
                setEmailData(JSON.parse(speaker.email_draft));
            } catch (e) { console.error("Bad draft json", e); }
        }

        if (speaker.id) {
            fetchHistory();
        }
    }, [speaker]);

    const fetchHistory = async () => {
        setLoadingHistory(true);
        try {
            const logs = await getSpeakerLogs(speaker.id);
            setHistory(logs);
        } catch (e) {
            console.error("Failed to fetch speaker logs", e);
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleGenerate = async () => {
        setLoading(true);
        try {
            const data = await generateEmail(speaker.id);
            setEmailData(data);
            onUpdate(speaker.id, { status: 'DRAFTED', email_draft: JSON.stringify(data) });
        } catch (error) {
            console.error("Failed to generate", error);
            const errorMsg = error.response?.data?.detail || error.message || "Unknown error occurred";
            alert(`Ghostwriter AI Error: ${errorMsg}\n\nPlease check:\n1. Backend is running\n2. PERPLEXITY_API_KEY is set in .env\n3. Speaker has required fields filled`);
        } finally {
            setLoading(false);
        }
    };

    const handleRefine = async (overrideInput = null) => {
        const instruction = overrideInput || chatInput;
        if (!instruction.trim()) return;
        setRefining(true);
        try {
            const newData = await refineEmail(emailData, instruction);
            setEmailData(newData);
            setChatInput("");
            onUpdate(speaker.id, { email_draft: JSON.stringify(newData) });
        } catch (e) {
            console.error("Refine failed", e);
        } finally {
            setRefining(false);
        }
    };


    const handleDownload = () => {
        const blob = new Blob([emailData.body_html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invite_${speaker.name.replace(/\s+/g, '_')}.html`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleMailSent = async () => {
        await updateSpeaker(speaker.id, { status: 'CONTACT_INITIATED' });
        onUpdate(speaker.id, { status: 'CONTACT_INITIATED' });
        onClose();
    };

    const handleSaveProfile = async () => {
        let patches = { ...formData };

        // Auto-Move Logic: Move to EMAIL_ADDED if contact info added
        if (speaker.status === 'SCOUTED' && (formData.email || formData.phone)) {
            patches.status = 'EMAIL_ADDED';
        }

        // Research Move
        if (['SCOUTED', 'EMAIL_ADDED'].includes(speaker.status) && formData.blurring_line_angle) {
            patches.status = 'RESEARCHED';
        }

        await updateSpeaker(speaker.id, patches);
        onUpdate(speaker.id, patches);
        setIsEditing(false);
    };

    const handleAssign = async (roll) => {
        setAssigning(true);
        try {
            await assignSpeaker(speaker.id, roll);
            onUpdate(speaker.id, { assigned_to: roll });
        } catch (e) {
            console.error("Assignment failed", e);
            alert("Failed to assign speaker");
        } finally {
            setAssigning(false);
        }
    };

    const handleUnassign = async () => {
        setAssigning(true);
        try {
            await unassignSpeaker(speaker.id);
            onUpdate(speaker.id, { assigned_to: null });
        } catch (e) {
            console.error("Unassignment failed", e);
            alert("Failed to unassign speaker");
        } finally {
            setAssigning(false);
        }
    };

    const handleGetPrompt = async () => {
        try {
            const data = await getAiPrompt(speaker.id);
            setAiPrompt(data.prompt);
        } catch (error) {
            console.error("Failed to get prompt", error);
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        setCopiedPrompt(true);
        setTimeout(() => setCopiedPrompt(false), 2000);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="w-full max-w-5xl bg-[#0f0f0f] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex justify-between items-start bg-gradient-to-r from-red-900/10 to-transparent flex-shrink-0">
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-1">{speaker.name}</h2>
                        <div className="flex gap-2 text-sm text-gray-400">
                            <span className="px-2 py-0.5 rounded border border-white/10 bg-white/5">{speaker.batch}</span>
                            <select
                                value={speaker.status}
                                onChange={(e) => {
                                    const newStatus = e.target.value;
                                    onUpdate(speaker.id, { status: newStatus });
                                }}
                                className={`px-2 py-0.5 rounded border border-white/10 text-xs font-bold uppercase outline-none cursor-pointer ${speaker.status === 'LOCKED' ? 'bg-green-600 text-white' : 'bg-white/10 text-gray-400 hover:text-white hover:bg-white/20'}`}
                            >
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
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X size={20} className="text-gray-400" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-white/5 flex-shrink-0">
                    <button
                        onClick={() => setActiveTab('details')}
                        className={`flex-1 p-3 text-sm font-medium transition-colors relative ${activeTab === 'details' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        Speaker Profile
                        {activeTab === 'details' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600" />}
                    </button>
                    <button
                        onClick={() => setActiveTab('outreach')}
                        className={`flex-1 p-3 text-sm font-medium transition-colors relative ${activeTab === 'outreach' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        Ghostwriter AI
                        {activeTab === 'outreach' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600" />}
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`flex-1 p-3 text-sm font-medium transition-colors relative ${activeTab === 'history' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        Activity Timeline
                        {activeTab === 'history' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600" />}
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-[#0a0a0a]">
                    {activeTab === 'details' ? (
                        <div className="space-y-6 max-w-3xl mx-auto">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-bold text-white">Contact & Notes</h3>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => isEditing ? handleSaveProfile() : setIsEditing(true)}
                                        className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${isEditing ? 'bg-green-600 hover:bg-green-500 text-white' : 'bg-white/10 hover:bg-white/20 text-gray-300'}`}
                                    >
                                        {isEditing ? <><Save size={12} /> Save Changes</> : <><Pencil size={12} /> Edit Details</>}
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs text-gray-500 flex items-center gap-1"><Target size={10} /> PRIMARY DOMAIN</label>
                                    {isEditing ? (
                                        <input
                                            value={formData.primary_domain}
                                            onChange={e => setFormData({ ...formData, primary_domain: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white focus:border-red-500 outline-none"
                                        />
                                    ) : (
                                        <p className="text-sm font-medium text-gray-200">{formData.primary_domain}</p>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-gray-500 flex items-center gap-1"><MapPin size={10} /> LOCATION</label>
                                    {isEditing ? (
                                        <input
                                            value={formData.location}
                                            onChange={e => setFormData({ ...formData, location: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white focus:border-red-500 outline-none"
                                        />
                                    ) : (
                                        <p className="text-sm font-medium text-gray-200">{formData.location}</p>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 bg-white/5 p-4 rounded-lg border border-white/5">
                                <div className="space-y-1">
                                    <label className="text-xs text-gray-400 font-bold uppercase flex items-center gap-1"><Mail size={10} /> Email</label>
                                    {isEditing ? (
                                        <input
                                            placeholder="speaker@example.com"
                                            value={formData.email}
                                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white focus:border-red-500 outline-none"
                                        />
                                    ) : (
                                        <p className="text-sm text-white break-all">{formData.email || <span className="text-gray-600 italic">No email</span>}</p>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-gray-400 font-bold uppercase flex items-center gap-1"><Smartphone size={10} /> Phone</label>
                                    {isEditing ? (
                                        <input
                                            placeholder="+91..."
                                            value={formData.phone}
                                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white focus:border-red-500 outline-none"
                                        />
                                    ) : (
                                        <p className="text-sm text-white">{formData.phone || <span className="text-gray-600 italic">No phone</span>}</p>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs text-gray-400 font-bold uppercase flex items-center gap-1"><Send size={10} /> Contact Method</label>
                                    {isEditing ? (
                                        <input
                                            placeholder="Instagram, WA, etc"
                                            value={formData.contact_method}
                                            onChange={e => setFormData({ ...formData, contact_method: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white focus:border-red-500 outline-none"
                                        />
                                    ) : (
                                        <p className="text-sm text-white">{formData.contact_method || <span className="text-gray-600 italic">No method</span>}</p>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-red-500 font-black uppercase flex items-center gap-1"><Activity size={10} /> Quick Remark (Floating Tag)</label>
                                    {isEditing ? (
                                        <input
                                            placeholder="VIP, Hot, Need Help..."
                                            value={formData.remarks}
                                            onChange={e => setFormData({ ...formData, remarks: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white focus:border-red-500 outline-none font-black"
                                        />
                                    ) : (
                                        <p className="text-xs font-black text-red-500 uppercase tracking-tighter">{formData.remarks || <span className="text-gray-600 italic">None</span>}</p>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-1 bg-white/[0.02] p-4 rounded-xl border border-white/5">
                                <label className="text-xs text-gray-400 font-bold flex items-center gap-1"><Linkedin size={10} /> LINKEDIN PROFILE</label>
                                {isEditing ? (
                                    <input
                                        placeholder="LinkedIn URL..."
                                        value={formData.linkedin_url}
                                        onChange={e => setFormData({ ...formData, linkedin_url: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white focus:border-red-500 outline-none"
                                    />
                                ) : (
                                    formData.linkedin_url ? (
                                        <a href={formData.linkedin_url} target="_blank" rel="noreferrer" className="text-sm text-blue-400 hover:underline flex items-center gap-2">
                                            {formData.linkedin_url} <ExternalLink size={12} />
                                        </a>
                                    ) : (
                                        <p className="text-sm text-gray-600 italic">No URL</p>
                                    )
                                )}
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs text-red-400 font-bold uppercase tracking-wider">Blurring Lines Angle</label>
                                {isEditing ? (
                                    <textarea
                                        value={formData.blurring_line_angle}
                                        onChange={e => setFormData({ ...formData, blurring_line_angle: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white resize-none h-32 focus:border-red-500 outline-none"
                                    />
                                ) : (
                                    <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{formData.blurring_line_angle}</p>
                                )}
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs text-gray-500 flex items-center gap-1 font-bold uppercase tracking-wider">
                                        <User size={12} className="text-red-500" />
                                        {speaker.assigned_to ? 'Handling this Lead' : 'Lead Assignment'}
                                    </label>

                                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between gap-4">
                                        {speaker.assigned_to ? (
                                            <>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-500 font-black">
                                                        {speaker.assigned_to[0].toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-white uppercase tracking-tight">{speaker.assigned_to}</p>
                                                        <p className="text-[10px] text-gray-500 font-bold uppercase">Assigned SPOC</p>
                                                    </div>
                                                </div>
                                                {currentUser?.isAdmin && (
                                                    <button
                                                        onClick={handleUnassign}
                                                        disabled={assigning}
                                                        className="text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-red-500 transition-colors"
                                                    >
                                                        {assigning ? '...' : 'Remove'}
                                                    </button>
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                <div className="flex items-center gap-3 opacity-60">
                                                    <div className="w-10 h-10 rounded-full bg-gray-800 border border-white/10 flex items-center justify-center text-gray-600 font-black">
                                                        ?
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-gray-600 uppercase tracking-tight italic">Yet to be assigned</p>
                                                        <p className="text-[10px] text-gray-600 font-bold uppercase">Open Lead</p>
                                                    </div>
                                                </div>
                                                {currentUser?.isAdmin && authorizedUsers.length > 0 && (
                                                    <select
                                                        disabled={assigning}
                                                        onChange={(e) => e.target.value && handleAssign(e.target.value)}
                                                        className="bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-gray-400 focus:outline-none focus:border-red-500 transition-all cursor-pointer hover:bg-black/60"
                                                    >
                                                        <option value="">Assign To...</option>
                                                        {authorizedUsers.map(u => (
                                                            <option key={u.roll_number} value={u.roll_number}>{u.name} ({u.roll_number})</option>
                                                        ))}
                                                    </select>
                                                )}
                                            </>
                                        )}
                                    </div>

                                    {/* Legacy SPOC Field for reference/custom names */}
                                    <div className="mt-2">
                                        <label className="text-[9px] text-gray-600 font-bold mb-1 block">MANUAL OVERRIDE / NOTES</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={formData.spoc_name}
                                                onChange={(e) => setFormData({ ...formData, spoc_name: e.target.value })}
                                                placeholder="Additional names..."
                                                className={`flex-1 bg-white/5 border border-white/10 rounded px-3 py-2 text-[11px] text-gray-400 focus:outline-none focus:border-white/30 ${!isEditing ? 'opacity-50' : ''}`}
                                                readOnly={!isEditing}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {isEditing && (
                                    <div className="flex items-center gap-3 p-3 bg-red-900/10 border border-red-500/20 rounded-lg">
                                        <div className={`w-8 h-4 rounded-full p-0.5 cursor-pointer transition-colors ${formData.is_bounty ? 'bg-red-500' : 'bg-gray-700'}`}
                                            onClick={() => setFormData({ ...formData, is_bounty: !formData.is_bounty })}
                                        >
                                            <div className={`w-3 h-3 bg-white rounded-full shadow-sm transition-transform ${formData.is_bounty ? 'translate-x-4' : 'translate-x-0'}`} />
                                        </div>
                                        <div>
                                            <span className="text-xs font-bold text-white flex items-center gap-1.5"><Target size={12} className="text-red-500" /> High Value Bounty</span>
                                            <p className="text-[10px] text-gray-400">Marking as bounty awards 2x XP for all actions.</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : activeTab === 'history' ? (
                        <div className="max-w-2xl mx-auto space-y-6">
                            <h3 className="text-lg font-bold text-white mb-4">Lead History</h3>
                            {loadingHistory ? (
                                <div className="text-center py-12 text-gray-500 animate-pulse uppercase tracking-widest text-xs font-black">
                                    Reconstructing timeline...
                                </div>
                            ) : (!Array.isArray(history) || history.length === 0) ? (
                                <div className="text-center py-12 text-gray-700 bg-white/5 border border-dashed border-white/5 rounded-2xl">
                                    <Activity size={32} className="mx-auto mb-3 opacity-20" />
                                    <p className="text-sm">No activity recorded for this lead yet.</p>
                                </div>
                            ) : (
                                <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-red-600/50 before:via-white/5 before:to-transparent">
                                    {history.map((log, idx) => (
                                        <div key={log.id} className="relative flex items-start gap-6 group">
                                            <div className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center z-10 shadow-lg ${idx === 0 ? 'bg-red-600 text-white shadow-red-900/40 scale-110' : 'bg-[#151515] text-gray-500 border border-white/10'}`}>
                                                {log.action === 'ASSIGN_SPEAKER' ? <Users size={16} /> :
                                                    log.action === 'MOVE' ? <TrendingUp size={16} /> :
                                                        <Activity size={16} />}
                                            </div>
                                            <div className="flex-1 pt-1 pb-4 border-b border-white/[0.03]">
                                                <div className="flex justify-between items-start mb-1">
                                                    <h4 className="text-sm font-bold text-gray-200 group-hover:text-white transition-colors">
                                                        {log.details}
                                                    </h4>
                                                    <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded">
                                                        {new Date(log.timestamp + "Z").toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                                    <span className="text-red-500/70">Performed by</span>
                                                    <span className="bg-white/5 text-gray-400 px-1.5 rounded">{log.user_name}</span>
                                                    <span className="text-gray-700 ml-auto">{new Date(log.timestamp + "Z").toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="h-full flex gap-6">
                            {/* Left Column: Chat & Controls */}
                            <div className="w-1/3 flex flex-col gap-4 border-r border-white/10 pr-6">
                                {!emailData ? (
                                    <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-purple-500/20 to-blue-500/20 flex items-center justify-center mb-2">
                                            <Sparkles className="text-purple-400" size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-base font-bold text-white">Ghostwriter 2.0</h3>
                                            <p className="text-xs text-gray-400">Generates HTML email with correct date & theme.</p>
                                        </div>
                                        <button
                                            onClick={handleGenerate}
                                            disabled={loading}
                                            className="px-6 py-2 bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 text-white rounded-full font-medium transition-all shadow-lg shadow-red-900/20 flex items-center gap-2 text-sm"
                                        >
                                            {loading ? 'Thinking...' : '✨ Generate HTML Draft'}
                                        </button>

                                        {!aiPrompt ? (
                                            <button
                                                onClick={handleGetPrompt}
                                                className="text-[10px] text-gray-500 hover:text-white uppercase font-black tracking-widest transition-colors flex items-center gap-1.5"
                                            >
                                                <Copy size={12} /> Get Manual AI Prompt
                                            </button>
                                        ) : (
                                            <div className="mt-4 p-4 bg-white/5 border border-white/10 rounded-xl text-left w-full max-w-sm">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-[9px] font-black text-gray-500 uppercase">External Tool Prompt</span>
                                                    <button
                                                        onClick={() => copyToClipboard(aiPrompt)}
                                                        className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-all flex items-center gap-1 text-[10px]"
                                                    >
                                                        {copiedPrompt ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                                                        {copiedPrompt ? 'COPIED' : 'COPY'}
                                                    </button>
                                                </div>
                                                <p className="text-[10px] text-gray-400 font-mono leading-relaxed line-clamp-4">{aiPrompt}</p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <>
                                        <div className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-4">
                                            <div>
                                                <label className="text-xs text-gray-500 font-bold uppercase mb-2 block">Refine with AI</label>
                                                <div className="flex gap-2">
                                                    <input
                                                        className="flex-1 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500 transition-all"
                                                        placeholder='e.g., "Add a mention of our recent talk"'
                                                        value={chatInput}
                                                        onChange={e => setChatInput(e.target.value)}
                                                        onKeyDown={e => e.key === 'Enter' && handleRefine()}
                                                    />
                                                    <button
                                                        onClick={handleRefine}
                                                        disabled={refining}
                                                        className="p-2 bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white rounded-lg transition-all"
                                                    >
                                                        {refining ? <Sparkles size={14} className="animate-spin" /> : <Send size={14} />}
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap gap-2">
                                                {[
                                                    { label: '✂️ Shorter', hint: 'Make it concise' },
                                                    { label: '🏛️ More Formal', hint: 'Professional tone' },
                                                    { label: '🔥 TED Spirit', hint: 'Passionate and visionary' },
                                                    { label: '🤝 Personalized', hint: 'Emphasis on their work' }
                                                ].map(tweak => (
                                                    <button
                                                        key={tweak.label}
                                                        onClick={() => {
                                                            handleRefine(tweak.hint);
                                                        }}
                                                        className="px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/5 rounded-md text-[10px] text-gray-400 hover:text-white transition-all"
                                                    >
                                                        {tweak.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="flex-1 overflow-y-auto space-y-3">
                                            <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-lg">
                                                <h4 className="text-xs font-bold text-blue-300 flex items-center gap-1 mb-1"><Download size={12} /> Sending Instructions</h4>
                                                <ol className="text-[10px] text-gray-300 list-decimal list-inside space-y-1">
                                                    <li>Click <strong>Download HTML</strong> below.</li>
                                                    <li>Open file in Chrome/Edge.</li>
                                                    <li>Press <strong>Ctrl+A</strong> then <strong>Ctrl+C</strong>.</li>
                                                    <li>Paste into Gmail Compose.</li>
                                                </ol>
                                            </div>
                                        </div>

                                        <div className="space-y-2 mt-auto">
                                            <button
                                                onClick={handleDownload}
                                                className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                                            >
                                                <Download size={14} /> Download .html
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const subject = encodeURIComponent(emailData.subject || '');
                                                    const body = encodeURIComponent(emailData.body_text || '');
                                                    window.open(`mailto:${speaker.email || ''}?subject=${subject}&body=${body}`);
                                                }}
                                                className="w-full py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                                            >
                                                <Mail size={14} /> Quick Open (Plain Text)
                                            </button>
                                            <button
                                                onClick={handleMailSent}
                                                className="w-full py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg font-bold flex items-center justify-center gap-2 shadow-lg shadow-green-900/20"
                                            >
                                                <CheckCircle size={16} /> Confirm Mail Sent
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Right Column: Preview/Edit */}
                            <div className="flex-1 flex flex-col bg-white rounded-xl overflow-hidden shadow-2xl">
                                <div className="bg-gray-100 border-b border-gray-200 px-4 py-2 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="flex gap-1.5">
                                            <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                                            <div className="w-2.5 h-2.5 rounded-full bg-yellow-400"></div>
                                            <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
                                        </div>
                                        <span className="text-xs text-gray-500 bg-white px-3 py-0.5 rounded shadow-sm">
                                            {isDraftEditing ? 'Editing Mode' : `Preview: ${speaker.email || 'No Email Set'}`}
                                        </span>
                                    </div>
                                    {emailData && (
                                        <button
                                            onClick={() => {
                                                if (isDraftEditing) {
                                                    // Save changes
                                                    onUpdate(speaker.id, { email_draft: JSON.stringify(emailData) });
                                                    setIsDraftEditing(false);
                                                } else {
                                                    setIsDraftEditing(true);
                                                }
                                            }}
                                            className={`text-xs px-3 py-1 rounded font-bold transition-colors ${isDraftEditing ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
                                        >
                                            {isDraftEditing ? 'Save Changes' : 'Edit Draft'}
                                        </button>
                                    )}
                                </div>
                                <div className="flex-1 bg-white relative overflow-hidden">
                                    {emailData ? (
                                        isDraftEditing ? (
                                            <div className="p-4 h-full flex flex-col gap-4 overflow-y-auto">
                                                <div>
                                                    <label className="text-xs font-bold text-gray-400 uppercase">Subject Line</label>
                                                    <input
                                                        value={emailData.subject}
                                                        onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
                                                        className="w-full border-b border-gray-200 py-1 text-sm font-medium focus:outline-none focus:border-red-500 text-gray-800"
                                                    />
                                                </div>
                                                <div className="flex-1 flex flex-col">
                                                    <label className="text-xs font-bold text-gray-400 uppercase mb-1">Email Body (HTML)</label>
                                                    <textarea
                                                        value={emailData.body_html}
                                                        onChange={(e) => setEmailData({ ...emailData, body_html: e.target.value, body_text: e.target.value.replace(/<[^>]*>?/gm, '') })}
                                                        className="flex-1 w-full border border-gray-200 rounded p-2 text-xs font-mono text-gray-600 focus:outline-none focus:border-red-500 resize-none"
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <iframe
                                                srcDoc={emailData.body_html}
                                                className="w-full h-full border-none"
                                                title="Email Preview"
                                            />
                                        )
                                    ) : (
                                        <div className="absolute inset-0 flex items-center justify-center text-gray-300">
                                            <span className="text-4xl font-black opacity-10">PREVIEW</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </motion.div >
        </div >
    );
};

export default OutreachModal;
