import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Building2, Search, Filter, Briefcase, DollarSign,
    Target, Plus, CheckSquare, Download, Bell, Shield,
    X, ArrowLeftRight, TrendingUp, Zap, Users, Trophy
} from 'lucide-react';
import {
    DndContext, closestCorners, DragOverlay, useDroppable,
    useSensor, useSensors, PointerSensor
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import SponsorCard from './SponsorCard';
import SponsorModal from './SponsorModal';
import AddSponsorModal from './AddSponsorModal';
import { getSponsors, updateSponsor } from '../api';
import confetti from 'canvas-confetti';

const SPONSOR_SECTIONS = {
    PROSPECT: 'Prospecting',
    CONTACTED: 'First Contact 📧',
    PITCHED: 'Proposal Sent 📑',
    NEGOTIATING: 'Negotiation 💸',
    SIGNED: 'Signed ✍️',
    ONBOARDED: 'Onboarded 🚀'
};

const SponsorBoard = ({ onSwitchMode }) => {
    const [sponsors, setSponsors] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSponsor, setSelectedSponsor] = useState(null);
    const [isAdding, setIsAdding] = useState(false);
    const [currentUser] = useState(() => JSON.parse(localStorage.getItem('tedx_user_obj')));
    const [activeId, setActiveId] = useState(null);
    const [isSelectMode, setIsSelectMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState(new Set());

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
    );

    useEffect(() => {
        fetchSponsors();
    }, []);

    const fetchSponsors = async () => {
        try {
            const data = await getSponsors();
            setSponsors(data);
        } catch (e) {
            console.error("Fetch failed", e);
        }
    };

    const handleDragEnd = async (event) => {
        const { active, over } = event;
        if (!over) return;

        const activeItem = sponsors.find(s => s.id === active.id);
        const overId = over.id;

        let newStatus = null;
        if (SPONSOR_SECTIONS[overId]) {
            newStatus = overId;
        } else {
            const overItem = sponsors.find(s => s.id === overId);
            if (overItem) newStatus = overItem.status;
        }

        if (newStatus && activeItem.status !== newStatus) {
            setSponsors(prev => prev.map(s => s.id === active.id ? { ...s, status: newStatus } : s));
            try {
                await updateSponsor(active.id, { status: newStatus });
                if (newStatus === 'SIGNED') {
                    confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#10b981', '#ffffff'] });
                }
            } catch (e) {
                console.error("Update failed", e);
                fetchSponsors();
            }
        }
        setActiveId(null);
    };

    const handleUpdate = async (id, updates) => {
        setSponsors(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
        try {
            await updateSponsor(id, updates);
        } catch (e) {
            console.error("Update failed", e);
        }
    };

    const filteredSponsors = sponsors.filter(s =>
        s.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.industry?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalSignedValue = sponsors
        .filter(s => s.status === 'SIGNED' || s.status === 'ONBOARDED')
        .reduce((sum, s) => sum + (s.target_amount || 0), 0);

    return (
        <div className="h-screen flex flex-col bg-[#020617] text-white overflow-hidden font-sans">
            {/* Corporate Header */}
            <header className="h-16 border-b border-emerald-500/10 flex items-center justify-between px-6 bg-[#050b15]/80 backdrop-blur-xl z-20">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center font-black shadow-lg shadow-emerald-900/20 transform hover:-rotate-6 transition-transform cursor-pointer">S</div>
                        <div>
                            <h1 className="text-lg font-black tracking-tighter leading-none flex items-center gap-1">
                                SPONSOR<span className="text-emerald-500 font-medium tracking-normal">HUB</span>
                            </h1>
                            <p className="text-[9px] text-emerald-500/50 font-black tracking-widest uppercase italic">Corporate Outreach v1.0</p>
                        </div>
                    </div>

                    <button
                        onClick={onSwitchMode}
                        className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white transition-all flex items-center gap-2 border border-white/5"
                    >
                        <ArrowLeftRight size={12} /> Switch to Speakers
                    </button>
                </div>

                <div className="flex-1 max-w-xl mx-12">
                    <div className="relative group">
                        <Search className="absolute left-3.5 top-2.5 text-emerald-500/50 group-focus-within:text-emerald-500 transition-colors" size={15} />
                        <input
                            type="text"
                            placeholder="Search by company, industry or negotiator..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-emerald-500/30 focus:bg-white/10 transition-all"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="hidden lg:flex flex-col items-end border-r border-white/10 pr-6">
                        <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Revenue Forecast</span>
                        <span className="text-sm font-black text-white">₹ {totalSignedValue.toLocaleString()}</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsAdding(true)}
                            className="px-4 h-9 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg shadow-emerald-900/20"
                        >
                            <Plus size={14} /> Add Prospect
                        </button>
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-emerald-700 flex items-center justify-center font-black text-xs border border-white/20">
                            {currentUser?.name?.[0].toUpperCase() || '?'}
                        </div>
                    </div>
                </div>
            </header>

            {/* Pipeline Metrics */}
            <div className="bg-[#10b981]/5 border-b border-emerald-500/10 h-12 px-6 flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                <div className="flex gap-8">
                    <div className="flex items-center gap-2">
                        <span className="text-gray-500 font-bold tracking-tight">Active Pipeline:</span>
                        <span className="text-emerald-400">{filteredSponsors.length} Companies</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-gray-500 font-bold tracking-tight">Conversion:</span>
                        <span className="text-white">{Math.round((sponsors.filter(s => s.status === 'SIGNED').length / (sponsors.length || 1)) * 100)}%</span>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-emerald-500">
                    <TrendingUp size={14} /> Global Priority Alpha
                </div>
            </div>

            {/* Kanban Board */}
            <DndContext
                sensors={sensors}
                onDragStart={(e) => setActiveId(e.active.id)}
                onDragEnd={handleDragEnd}
                collisionDetection={closestCorners}
            >
                <div className="flex-1 overflow-x-auto p-6 custom-scrollbar-x">
                    <div className="flex gap-6 h-full min-w-max">
                        {Object.entries(SPONSOR_SECTIONS).map(([key, title]) => (
                            <Column
                                key={key}
                                id={key}
                                title={title}
                                sponsors={filteredSponsors.filter(s => s.status === key)}
                                onClick={setSelectedSponsor}
                                onStatusChange={handleUpdate}
                            />
                        ))}
                    </div>
                </div>
                <DragOverlay>
                    {activeId ? <SponsorCard sponsor={sponsors.find(s => s.id === activeId)} /> : null}
                </DragOverlay>
            </DndContext>

            {selectedSponsor && (
                <SponsorModal
                    sponsor={selectedSponsor}
                    onClose={() => setSelectedSponsor(null)}
                    onUpdate={handleUpdate}
                    currentUser={currentUser}
                />
            )}

            {isAdding && (
                <AddSponsorModal
                    isOpen={isAdding}
                    onClose={() => setIsAdding(false)}
                    onAdd={(newS) => setSponsors([...sponsors, newS])}
                />
            )}
        </div>
    );
};

const Column = ({ id, title, sponsors, onClick, onStatusChange }) => {
    const { setNodeRef, isOver } = useDroppable({ id });

    return (
        <div ref={setNodeRef} className={`w-80 flex-shrink-0 flex flex-col rounded-2xl transition-all duration-300 ${isOver ? 'bg-emerald-500/5 ring-1 ring-emerald-500/30' : 'bg-transparent'}`}>
            <div className="p-4 flex items-center justify-between sticky top-0 bg-[#020617] z-10 rounded-t-2xl border-b border-white/5 mb-3">
                <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${id === 'SIGNED' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-gray-600'}`} />
                    <h3 className="font-black text-[11px] uppercase tracking-widest text-gray-400">{title}</h3>
                </div>
                <span className="text-[10px] font-black text-gray-600 bg-white/5 px-2 py-0.5 rounded-full">{sponsors.length}</span>
            </div>

            <div className="flex-1 px-1 overflow-y-auto custom-scrollbar-y">
                <SortableContext items={sponsors.map(s => s.id)} strategy={verticalListSortingStrategy}>
                    {sponsors.map(sponsor => (
                        <SponsorCard
                            key={sponsor.id}
                            sponsor={sponsor}
                            onClick={() => onClick(sponsor)}
                            onStatusChange={(status) => onStatusChange(sponsor.id, { status })}
                        />
                    ))}
                </SortableContext>
                {sponsors.length === 0 && (
                    <div className="h-20 border-2 border-dashed border-white/5 rounded-2xl flex items-center justify-center text-[10px] font-black text-gray-700 uppercase tracking-widest">
                        {isOver ? "Release to Move" : "No Leads"}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SponsorBoard;
