import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Lightbulb, CheckCircle, AlertCircle } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const IngestionModal = ({ onClose }) => {
    const [rawText, setRawText] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [result, setResult] = useState(null);

    const handleIngest = async () => {
        if (!rawText.trim()) {
            alert("Please paste some text first!");
            return;
        }

        setIsProcessing(true);
        setResult(null);

        try {
            const token = localStorage.getItem('tedx_token');
            const res = await axios.post(`${API_URL}/admin/ingest-ai`,
                { raw_text: rawText },
                { headers: { 'Authorization': `Bearer ${token}` } }
            );

            setResult({
                success: true,
                message: res.data.message,
                count: res.data.count,
                skipped: res.data.skipped,
                duplicates: res.data.duplicates || []
            });

            setRawText('');

            // Reload after 2 seconds
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        } catch (e) {
            setResult({
                success: false,
                message: e.response?.data?.detail || "Processing failed. Please try again."
            });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="w-full max-w-3xl bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
            >
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-yellow-600/10 to-transparent">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-yellow-600 rounded-xl flex items-center justify-center shadow-lg shadow-yellow-900/20">
                            <Sparkles className="text-white" size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black tracking-tight text-white uppercase">AI Bulk Import</h2>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Transform messy notes into organized cards</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Tips Section */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="bg-blue-600/10 border border-blue-500/20 rounded-xl p-3">
                            <div className="flex items-center gap-2 mb-2">
                                <Lightbulb size={14} className="text-blue-400" />
                                <h4 className="text-[9px] font-black text-blue-400 uppercase">Tip: Include Context</h4>
                            </div>
                            <p className="text-[10px] text-gray-400 leading-relaxed">
                                "Rahul from Bangalore, works in AI" is better than just "Rahul"
                            </p>
                        </div>
                        <div className="bg-green-600/10 border border-green-500/20 rounded-xl p-3">
                            <div className="flex items-center gap-2 mb-2">
                                <CheckCircle size={14} className="text-green-400" />
                                <h4 className="text-[9px] font-black text-green-400 uppercase">Auto-Assignment</h4>
                            </div>
                            <p className="text-[10px] text-gray-400 leading-relaxed">
                                Cards are automatically distributed among your team members
                            </p>
                        </div>
                        <div className="bg-purple-600/10 border border-purple-500/20 rounded-xl p-3">
                            <div className="flex items-center gap-2 mb-2">
                                <AlertCircle size={14} className="text-purple-400" />
                                <h4 className="text-[9px] font-black text-purple-400 uppercase">Duplicate Safe</h4>
                            </div>
                            <p className="text-[10px] text-gray-400 leading-relaxed">
                                The AI skips anyone already in your database
                            </p>
                        </div>
                    </div>

                    {/* Text Area */}
                    <div>
                        <label className="text-xs text-gray-400 font-bold uppercase mb-2 block">Paste Your Raw Data</label>
                        <textarea
                            value={rawText}
                            onChange={(e) => setRawText(e.target.value)}
                            placeholder="Example:
- Dr. Priya Sharma from Mumbai, expert in neuroscience
- Arjun Patel, tech entrepreneur based in Bangalore
- Contact: jane@example.com, works at Google NY
- Rahul (AI researcher, IIT Delhi)

The AI will extract names, domains, locations, and even emails/phones if mentioned!"
                            className="w-full h-64 bg-black border border-white/10 rounded-xl p-4 text-xs text-white focus:outline-none focus:border-yellow-500 transition-all font-mono placeholder:text-gray-700 resize-none"
                        />
                    </div>

                    {/* Result Display */}
                    <AnimatePresence>
                        {result && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className={`p-4 rounded-xl border ${result.success ? 'bg-green-600/10 border-green-500/30' : 'bg-red-600/10 border-red-500/30'}`}
                            >
                                <p className={`text-sm font-bold ${result.success ? 'text-green-400' : 'text-red-400'} mb-2`}>
                                    {result.message}
                                </p>
                                {result.success && result.duplicates && result.duplicates.length > 0 && (
                                    <div className="mt-2 text-[10px] text-gray-400">
                                        <p className="font-bold mb-1">Duplicates skipped:</p>
                                        <ul className="list-disc list-inside space-y-0.5">
                                            {result.duplicates.map((d, i) => (
                                                <li key={i}>{d.name} (matched by {d.reason})</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Action Button */}
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={onClose}
                            className="px-6 py-2.5 bg-white/5 hover:bg-white/10 text-gray-400 rounded-xl text-xs font-bold uppercase transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleIngest}
                            disabled={isProcessing || !rawText.trim()}
                            className="px-6 py-2.5 bg-yellow-600 hover:bg-yellow-500 text-black rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-yellow-900/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isProcessing ? (
                                <>
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                    >
                                        <Sparkles size={14} />
                                    </motion.div>
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <Sparkles size={14} />
                                    Inject into Pipeline
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default IngestionModal;
