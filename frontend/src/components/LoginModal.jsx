import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, ArrowRight, AlertCircle } from 'lucide-react';
import { loginUser } from '../api';

const LoginModal = ({ onLogin }) => {
    const [rollNumber, setRollNumber] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const data = await loginUser(rollNumber);
            onLogin(data.user_name, data.roll_number, data.is_admin);
        } catch (err) {
            setError(err.response?.data?.detail || 'Access Denied. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md bg-[#0f0f0f] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
            >
                <div className="p-8 text-center">
                    <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/30">
                        <Lock className="text-red-500" size={32} />
                    </div>

                    <h2 className="text-2xl font-bold text-white mb-2">Restricted Access</h2>
                    <p className="text-gray-400 text-sm mb-8">
                        Enter your XLRI Roll Number or First Name.
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Roll No or First Name"
                                value={rollNumber}
                                onChange={(e) => {
                                    setRollNumber(e.target.value);
                                    setError('');
                                }}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all text-center tracking-wider"
                            />
                        </div>

                        <AnimatePresence>
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="text-red-400 text-xs flex items-center justify-center gap-2"
                                >
                                    <AlertCircle size={12} /> {error}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <button
                            type="submit"
                            disabled={!rollNumber.trim() || isLoading}
                            className="w-full bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-red-900/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {isLoading ? 'Authenticating...' : (
                                <>Enter Dashboard <ArrowRight size={16} /></>
                            )}
                        </button>
                    </form>
                </div>

                <div className="bg-white/5 p-4 text-center border-t border-white/5">
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest">Authorized Personnel Only</p>
                </div>
            </motion.div>
        </div>
    );
};

export default LoginModal;
