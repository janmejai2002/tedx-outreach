import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Building2, Mail, Globe, Briefcase, CheckCircle,
    Send, X, Activity, DollarSign, Target, User, Sparkles,
    Linkedin, ExternalLink, Smartphone, Save
} from 'lucide-react';
import { generateSponsorEmail, updateSponsor } from '../api';

const SponsorModal = ({ sponsor, onClose, onUpdate, authorizedUsers = [], currentUser = null }) => {
    const [loading, setLoading] = useState(false);
    const [emailData, setEmailData] = useState(null);
    const [activeTab, setActiveTab] = useState('details');
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        company_name: sponsor.company_name || '',
        industry: sponsor.industry || '',
        contact_person: sponsor.contact_person || '',
        email: sponsor.email || '',
        phone: sponsor.phone || '',
        website: sponsor.website || '',
        linkedin_url: sponsor.linkedin_url || '',
        target_amount: sponsor.target_amount || '',
        partnership_tier: sponsor.partnership_tier || '',
        notes: sponsor.notes || ''
    });

    useEffect(() => {
        if (sponsor.email_draft) {
            try {
                setEmailData(JSON.parse(sponsor.email_draft));
            } catch (e) { console.error("Bad draft json", e); }
        }
    }, [sponsor]);

    const handleSave = async () => {
        setLoading(true);
        try {
            const patches = { ...formData };
            if (patches.target_amount) patches.target_amount = parseFloat(patches.target_amount);

            await updateSponsor(sponsor.id, patches);
            onUpdate(sponsor.id, patches);
            setIsEditing(false);
        } catch (e) {
            console.error("Update failed", e);
            alert("Failed to update sponsor");
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async () => {
        setLoading(true);
        try {
            const data = await generateSponsorEmail(sponsor.id);
            setEmailData(data);
            onUpdate(sponsor.id, { status: 'PITCHED', email_draft: JSON.stringify(data) });
        } catch (error) {
            console.error("Failed to generate", error);
            alert("AI Generation Failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="w-full max-w-5xl bg-[#050b15] border border-emerald-500/20 rounded-2xl shadow-[0_0_50px_rgba(16,185,129,0.1)] overflow-hidden flex flex-col max-h-[90vh]"
            >
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex justify-between items-start bg-gradient-to-r from-emerald-900/20 to-transparent">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Building2 className="text-emerald-500" size={18} />
                            <h2 className="text-2xl font-black text-white uppercase tracking-tighter">{sponsor.company_name}</h2>
                        </div>
                        <div className="flex gap-3 text-[10px] font-black uppercase tracking-widest text-emerald-500/60">
                            <span>{sponsor.industry || 'General Industry'}</span>
                            <span>•</span>
                            <span>{sponsor.partnership_tier || 'Partner Prospect'}</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-500 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-white/5 px-2">
                    {['details', 'outreach'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`p-4 text-[11px] font-black uppercase tracking-widest transition-all relative ${activeTab === tab ? 'text-emerald-400' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            {tab === 'details' ? 'Corporate Profile' : 'Partnership Pitch'}
                            {activeTab === tab && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-4 right-4 h-0.5 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {activeTab === 'details' ? (
                        <div className="grid grid-cols-3 gap-8">
                            <div className="col-span-2 space-y-8">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-xs font-black text-emerald-500 uppercase tracking-[0.2em]">Sponsor Intel</h3>
                                    <button
                                        onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                                        className="text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-emerald-400 flex items-center gap-2 transition-colors"
                                    >
                                        {isEditing ? <><Save size={12} /> Save Intel</> : <><Target size={12} /> Modify Brief</>}
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    {[
                                        { label: 'Company Name', key: 'company_name', icon: <Building2 size={12} /> },
                                        { label: 'Industry', key: 'industry', icon: <Briefcase size={12} /> },
                                        { label: 'Contact Person', key: 'contact_person', icon: <User size={12} /> },
                                        { label: 'Email Address', key: 'email', icon: <Mail size={12} /> },
                                        { label: 'Phone', key: 'phone', icon: <Smartphone size={12} /> },
                                        { label: 'Website', key: 'website', icon: <Globe size={12} /> },
                                        { label: 'Target Amount ($)', key: 'target_amount', icon: <DollarSign size={12} /> },
                                        { label: 'Partnership Tier', key: 'partnership_tier', icon: <Target size={12} /> },
                                    ].map(field => (
                                        <div key={field.key} className="space-y-1.5">
                                            <label className="text-[9px] font-black text-gray-600 uppercase flex items-center gap-2">
                                                {field.icon} {field.label}
                                            </label>
                                            {isEditing ? (
                                                <input
                                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                                                    value={formData[field.key]}
                                                    onChange={e => setFormData({ ...formData, [field.key]: e.target.value })}
                                                />
                                            ) : (
                                                <div className="text-sm text-gray-300 font-medium">
                                                    {field.key === 'website' && formData[field.key] ? (
                                                        <a href={formData[field.key]} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline flex items-center gap-1">
                                                            {formData[field.key]} <ExternalLink size={10} />
                                                        </a>
                                                    ) : formData[field.key] || '---'}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-gray-600 uppercase">Strategic Notes</label>
                                    {isEditing ? (
                                        <textarea
                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white h-32 focus:outline-none focus:border-emerald-500/50"
                                            value={formData.notes}
                                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                        />
                                    ) : (
                                        <p className="text-sm text-gray-400 leading-relaxed bg-white/5 p-4 rounded-xl border border-white/5 italic">
                                            {formData.notes || "No strategic notes entered yet."}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-6">
                                    <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <Activity size={12} /> Outreach Status
                                    </h4>
                                    <div className="space-y-3">
                                        {['PROSPECT', 'CONTACTED', 'PITCHED', 'NEGOTIATING', 'SIGNED'].map((s, idx) => (
                                            <div key={s} className="flex items-center gap-3">
                                                <div className={`w-1.5 h-1.5 rounded-full ${sponsor.status === s ? 'bg-emerald-500 ring-4 ring-emerald-500/20' : idx < ['PROSPECT', 'CONTACTED', 'PITCHED', 'NEGOTIATING', 'SIGNED'].indexOf(sponsor.status) ? 'bg-emerald-900' : 'bg-white/10'}`} />
                                                <span className={`text-[10px] font-black uppercase tracking-widest ${sponsor.status === s ? 'text-emerald-400' : 'text-gray-600'}`}>
                                                    {s}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="bg-blue-500/5 border border-blue-500/10 rounded-2xl p-6">
                                    <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <User size={12} /> Assigned Negotiator
                                    </h4>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-emerald-600 flex items-center justify-center font-black text-white border border-white/10">
                                            {sponsor.assigned_to ? sponsor.assigned_to[0].toUpperCase() : '?'}
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-white uppercase tracking-tight">{sponsor.assigned_to || "Unassigned"}</p>
                                            <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Campaign Lead</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[400px]">
                            {!emailData ? (
                                <div className="text-center space-y-6">
                                    <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(16,185,129,0.1)]">
                                        <Sparkles className="text-emerald-400" size={32} />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-xl font-black text-white uppercase tracking-tighter">Draft Partnership Proposal</h3>
                                        <p className="text-sm text-gray-500 max-w-sm mx-auto">
                                            Our corporate AI will draft a customized pitch highlighting the strategic alignment between TEDxXLRI and {sponsor.company_name}.
                                        </p>
                                    </div>
                                    <button
                                        onClick={handleGenerate}
                                        disabled={loading}
                                        className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-emerald-900/20 disabled:opacity-50"
                                    >
                                        {loading ? 'Synthesizing Pitch...' : '✨ Generate Proposal Draft'}
                                    </button>
                                </div>
                            ) : (
                                <div className="w-full space-y-6">
                                    <div className="flex justify-between items-center bg-white/5 border border-white/5 rounded-2xl p-6">
                                        <div className="flex items-center gap-4">
                                            <div className="bg-emerald-600/20 p-3 rounded-xl border border-emerald-500/30">
                                                <Mail className="text-emerald-400" size={24} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Target Subject</p>
                                                <h4 className="text-lg font-bold text-white leading-tight">{emailData.subject}</h4>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => window.open(`mailto:${formData.email}?subject=${encodeURIComponent(emailData.subject)}&body=${encodeURIComponent(emailData.body_html.replace(/<[^>]*>?/gm, ''))}`)}
                                            className="px-6 py-2 bg-white text-black rounded-xl text-[10px] font-black uppercase transition-all hover:scale-105 active:scale-95"
                                        >
                                            Send Now
                                        </button>
                                    </div>

                                    <div className="bg-white p-8 rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
                                        <div className="prose prose-sm prose-invert max-w-none text-gray-800" dangerouslySetInnerHTML={{ __html: emailData.body_html }} />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default SponsorModal;
