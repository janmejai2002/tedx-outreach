import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Building2, Briefcase, Mail, Target, DollarSign, Plus } from 'lucide-react';
import { createSponsor } from '../api';

const AddSponsorModal = ({ isOpen, onClose, onAdd }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        company_name: '',
        industry: '',
        contact_person: '',
        email: '',
        partnership_tier: 'Gold',
        target_amount: ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const data = { ...formData };
            if (data.target_amount) data.target_amount = parseFloat(data.target_amount);
            const newSponsor = await createSponsor(data);
            onAdd(newSponsor);
            onClose();
            setFormData({ company_name: '', industry: '', contact_person: '', email: '', partnership_tier: 'Gold', target_amount: '' });
        } catch (error) {
            console.error("Failed to add sponsor", error);
            alert("Failed to add sponsor");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="w-full max-w-lg bg-[#050b15] border border-emerald-500/30 rounded-3xl shadow-[0_0_50px_rgba(16,185,129,0.2)] overflow-hidden"
            >
                <div className="p-8 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-emerald-600/10 to-transparent">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-900/40">
                            <Plus size={20} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white uppercase tracking-tighter">New Sponsor Prospect</h2>
                            <p className="text-[10px] text-emerald-500/60 font-black uppercase tracking-widest">Adding to Corporate Funnel</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-500 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5 col-span-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                    <Building2 size={12} className="text-emerald-500" /> Company Name *
                                </label>
                                <input
                                    autoFocus
                                    required
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-all font-medium"
                                    placeholder="e.g., Google India"
                                    value={formData.company_name}
                                    onChange={e => setFormData({ ...formData, company_name: e.target.value })}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                    <Briefcase size={12} className="text-emerald-500" /> Industry
                                </label>
                                <input
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-all font-medium"
                                    placeholder="Tech, FMGC..."
                                    value={formData.industry}
                                    onChange={e => setFormData({ ...formData, industry: e.target.value })}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                    <Mail size={12} className="text-emerald-500" /> Contact Email
                                </label>
                                <input
                                    type="email"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-all font-medium"
                                    placeholder="partner@company.com"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                    <Target size={12} className="text-emerald-500" /> Tier
                                </label>
                                <select
                                    className="w-full bg-[#0a0f1a] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-all font-medium appearance-none"
                                    value={formData.partnership_tier}
                                    onChange={e => setFormData({ ...formData, partnership_tier: e.target.value })}
                                >
                                    <option value="Title">Title</option>
                                    <option value="Platinum">Platinum</option>
                                    <option value="Gold">Gold</option>
                                    <option value="Silver">Silver</option>
                                    <option value="Associate">Associate</option>
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                    <DollarSign size={12} className="text-emerald-500" /> Target Amount
                                </label>
                                <input
                                    type="number"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-all font-medium"
                                    placeholder="500000"
                                    value={formData.target_amount}
                                    onChange={e => setFormData({ ...formData, target_amount: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-3 border border-white/10 rounded-xl text-xs font-black uppercase tracking-widest text-gray-500 hover:bg-white/5 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-[2] px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-900/20"
                        >
                            {loading ? 'Adding...' : 'Initialize Prospect'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

export default AddSponsorModal;
