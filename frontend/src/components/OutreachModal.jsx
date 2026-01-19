import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Send, User, MapPin, Target, Edit, Save, Download, MessageSquare, Copy, CheckCircle, Mail, Linkedin, Globe, Search } from 'lucide-react';
import { generateEmail, updateSpeaker, refineEmail } from '../api';

const OutreachModal = ({ speaker, onClose, onUpdate }) => {
    const [loading, setLoading] = useState(false);
    const [emailData, setEmailData] = useState(null);
    const [activeTab, setActiveTab] = useState('details'); // details | outreach
    const [isEditing, setIsEditing] = useState(false);
    const [chatInput, setChatInput] = useState("");
    const [refining, setRefining] = useState(false);
    const [isDraftEditing, setIsDraftEditing] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        email: speaker.email || '',
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
        // Load persisted draft
        if (speaker.email_draft) {
            try {
                setEmailData(JSON.parse(speaker.email_draft));
            } catch (e) { console.error("Bad draft json", e); }
        }
    }, [speaker]);

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

        // Auto-Move Logic
        if (speaker.status === 'SCOUTED' && (formData.email || formData.contact_method)) {
            patches.status = 'EMAIL_ADDED';
        }
        if (['SCOUTED', 'EMAIL_ADDED'].includes(speaker.status) && formData.blurring_line_angle) {
            patches.status = 'RESEARCHED';
        }

        await updateSpeaker(speaker.id, patches);
        onUpdate(speaker.id, patches);
        setIsEditing(false);
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
                                        {isEditing ? <><Save size={12} /> Save Changes</> : <><Edit size={12} /> Edit Details</>}
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

                            <div className="grid grid-cols-3 gap-4 bg-white/5 p-4 rounded-lg border border-white/5">
                                <div className="space-y-1">
                                    <label className="text-xs text-gray-400 font-bold">EMAIL</label>
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
                                    <label className="text-xs text-gray-400 font-bold">LINKEDIN</label>
                                    {isEditing ? (
                                        <input
                                            placeholder="URL..."
                                            value={formData.linkedin_url}
                                            onChange={e => setFormData({ ...formData, linkedin_url: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white focus:border-red-500 outline-none"
                                        />
                                    ) : (
                                        formData.linkedin_url ? (
                                            <a href={formData.linkedin_url} target="_blank" rel="noreferrer" className="text-sm text-blue-400 hover:underline flex items-center gap-2">
                                                <Linkedin size={14} /> Profile
                                            </a>
                                        ) : (
                                            <p className="text-sm text-gray-600 italic">None</p>
                                        )
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-gray-400 font-bold">METHOD</label>
                                    {isEditing ? (
                                        <input
                                            placeholder="Phone etc"
                                            value={formData.contact_method}
                                            onChange={e => setFormData({ ...formData, contact_method: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white focus:border-red-500 outline-none"
                                        />
                                    ) : (
                                        <p className="text-sm text-white">{formData.contact_method || <span className="text-gray-600 italic">No info</span>}</p>
                                    )}
                                </div>
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
                                    <label className="text-xs text-gray-500">ASSIGNED SPOC</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={formData.spoc_name}
                                            onChange={(e) => setFormData({ ...formData, spoc_name: e.target.value })}
                                            placeholder="Enter team member name..."
                                            className={`flex-1 bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30 ${!isEditing ? 'opacity-80' : ''}`}
                                            readOnly={!isEditing}
                                        />
                                        {isEditing && (
                                            <button
                                                onClick={() => setFormData({ ...formData, spoc_name: localStorage.getItem('tedx_user') || '' })}
                                                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded text-sm font-medium transition-colors"
                                            >
                                                Me
                                            </button>
                                        )}
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
            </motion.div>
        </div>
    );
};

export default OutreachModal;
