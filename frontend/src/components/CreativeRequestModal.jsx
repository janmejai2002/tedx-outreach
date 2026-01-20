import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Calendar, Zap, FileText } from 'lucide-react';
import { createCreativeRequest } from '../api';

const CreativeRequestModal = ({ onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        priority: 'MEDIUM',
        due_date: '',
        notes: ''
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await createCreativeRequest(formData);
            if (onSuccess) onSuccess();
            onClose();
        } catch (error) {
            console.error("Failed to submit request", error);
            alert("Failed to submit creative request.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-lg bg-[#0a0a0f] border border-purple-500/30 rounded-3xl p-6 shadow-2xl overflow-hidden relative"
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                            <Sparkles className="text-purple-400" size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-white uppercase tracking-tighter">Request Creative</h2>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">PR & Marketing</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X size={20} className="text-gray-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Title</label>
                        <input
                            required
                            placeholder="e.g. Speaker Announcement Post"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500/50 transition-all font-medium"
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2"><Zap size={10} /> Priority</label>
                            <select
                                className="w-full bg-[#0a0a0f] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500/50"
                                value={formData.priority}
                                onChange={e => setFormData({ ...formData, priority: e.target.value })}
                            >
                                {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map(p => (
                                    <option key={p} value={p}>{p}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2"><Calendar size={10} /> Due Date</label>
                            <input
                                type="date"
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500/50"
                                value={formData.due_date}
                                onChange={e => setFormData({ ...formData, due_date: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Description</label>
                        <textarea
                            required
                            placeholder="Describe what you need..."
                            rows={4}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500/50 resize-none"
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Additional Notes</label>
                        <input
                            placeholder="Brand guidelines, references..."
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500/50"
                            value={formData.notes}
                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-purple-600 hover:bg-purple-500 text-white font-black uppercase tracking-widest py-4 rounded-2xl shadow-lg shadow-purple-900/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                    >
                        {loading ? 'Submitting...' : 'Submit Request'}
                    </button>
                </form>
            </motion.div>
        </div>
    );
};

export default CreativeRequestModal;
