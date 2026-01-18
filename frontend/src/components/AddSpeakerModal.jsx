import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Plus, Save } from 'lucide-react';
import { createSpeaker } from '../api';

const AddSpeakerModal = ({ onClose, onAdd }) => {
    const [formData, setFormData] = useState({
        name: '',
        primary_domain: '',
        blurring_line_angle: '',
        location: '',
        outreach_priority: 'Tier 3',
        batch: 'NEW ADDITIONS',
        status: 'SCOUTED'
    });
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const newSpeaker = await createSpeaker(formData);
            onAdd(newSpeaker);
            onClose();
        } catch (error) {
            console.error("Failed to add speaker", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="w-full max-w-lg bg-[#0f0f0f] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
            >
                <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/5">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2"><Plus size={18} /> Add New Speaker</h2>
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                        <X size={20} className="text-gray-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="text-xs text-gray-500 block mb-1">NAME</label>
                        <input
                            name="name" required
                            value={formData.name} onChange={handleChange}
                            className="w-full bg-black/30 border border-white/10 rounded px-3 py-2 text-white focus:border-red-500 outline-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs text-gray-500 block mb-1">DOMAIN</label>
                            <input
                                name="primary_domain" required
                                value={formData.primary_domain} onChange={handleChange}
                                className="w-full bg-black/30 border border-white/10 rounded px-3 py-2 text-white focus:border-red-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 block mb-1">LOCATION</label>
                            <input
                                name="location"
                                value={formData.location} onChange={handleChange}
                                className="w-full bg-black/30 border border-white/10 rounded px-3 py-2 text-white focus:border-red-500 outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs text-red-400 font-bold block mb-1">BLURRING LINES ANGLE</label>
                        <textarea
                            name="blurring_line_angle"
                            value={formData.blurring_line_angle} onChange={handleChange}
                            placeholder="Why do they fit the theme?"
                            className="w-full bg-black/30 border border-white/10 rounded px-3 py-2 text-white focus:border-red-500 outline-none h-20 resize-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs text-gray-500 block mb-1">PRIORITY</label>
                            <select
                                name="outreach_priority"
                                value={formData.outreach_priority} onChange={handleChange}
                                className="w-full bg-black/30 border border-white/10 rounded px-3 py-2 text-white focus:border-red-500 outline-none"
                            >
                                <option>Tier 1</option>
                                <option>Tier 2</option>
                                <option>Tier 3</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 block mb-1">BATCH</label>
                            <input
                                name="batch"
                                value={formData.batch} onChange={handleChange}
                                className="w-full bg-black/30 border border-white/10 rounded px-3 py-2 text-white focus:border-red-500 outline-none"
                            />
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end">
                        <button
                            type="submit" disabled={loading}
                            className="px-6 py-2 bg-white text-black font-bold rounded hover:bg-gray-200 transition-colors flex items-center gap-2"
                        >
                            {loading ? 'Adding...' : <><Save size={16} /> Save Speaker</>}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

export default AddSpeakerModal;
