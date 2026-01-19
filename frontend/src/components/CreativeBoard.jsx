import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Palette, Search, Plus, ArrowLeftRight,
    Sparkles, Layout, Video, Share2,
    Image as ImageIcon, MoreVertical, TrendingUp, Users
} from 'lucide-react';
import {
    DndContext, closestCorners, DragOverlay, useDroppable,
    useSensor, useSensors, PointerSensor
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import CreativeCard from './CreativeCard';
import CreativeModal from './CreativeModal';
import { getCreatives, updateCreative, createCreative } from '../api';
import confetti from 'canvas-confetti';

const CREATIVE_SECTIONS = {
    CONCEPT: 'Concept & Brainstorm 💡',
    SCRIPTING: 'Scripting & Briefing ✍️',
    PRODUCTION: 'In Production 🎥',
    EDITING: 'Post-Production ✂️',
    REVIEW: 'Team Review 👀',
    APPROVED: 'Final Approved ✅'
};

const CreativeBoard = ({ onSwitchMode }) => {
    const [assets, setAssets] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedAsset, setSelectedAsset] = useState(null);
    const [isAdding, setIsAdding] = useState(false);
    const [currentUser] = useState(() => JSON.parse(localStorage.getItem('tedx_user_obj')));
    const [activeId, setActiveId] = useState(null);
    const [isFilterMe, setIsFilterMe] = useState(false);

    const [newAssetData, setNewAssetData] = useState({
        title: '',
        asset_type: 'Video',
        description: '',
        priority: 'MEDIUM'
    });

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
    );

    useEffect(() => {
        fetchAssets();
    }, []);

    const fetchAssets = async () => {
        try {
            const data = await getCreatives();
            setAssets(data);
        } catch (e) {
            console.error("Fetch failed", e);
        }
    };

    const handleDragEnd = async (event) => {
        const { active, over } = event;
        if (!over) return;

        const activeItem = assets.find(a => a.id === active.id);
        const overId = over.id;

        let newStatus = null;
        if (CREATIVE_SECTIONS[overId]) {
            newStatus = overId;
        } else {
            const overItem = assets.find(a => a.id === overId);
            if (overItem) newStatus = overItem.status;
        }

        if (newStatus && activeItem.status !== newStatus) {
            setAssets(prev => prev.map(a => a.id === active.id ? { ...a, status: newStatus } : a));
            try {
                await updateCreative(active.id, { status: newStatus });
                if (newStatus === 'APPROVED') {
                    confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#a855f7', '#ec4899', '#ffffff'] });
                }
            } catch (e) {
                console.error("Update failed", e);
                fetchAssets();
            }
        }
        setActiveId(null);
    };

    const handleUpdate = async (id, updates) => {
        setAssets(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
        try {
            await updateCreative(id, updates);
        } catch (e) {
            console.error("Update failed", e);
        }
    };

    const handleAddAsset = async (e) => {
        e.preventDefault();
        try {
            const newAsset = await createCreative(newAssetData);
            setAssets([...assets, newAsset]);
            setIsAdding(false);
            setNewAssetData({ title: '', asset_type: 'Video', description: '', priority: 'MEDIUM' });
        } catch (e) {
            alert("Failed to add asset");
        }
    };

    const filteredAssets = assets.filter(a => {
        const matchesSearch = a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            a.asset_type?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = isFilterMe ? a.assigned_to === currentUser?.roll : true;
        return matchesSearch && matchesFilter;
    });

    return (
        <div className="h-screen flex flex-col bg-[#050510] text-white overflow-hidden font-sans">
            {/* Artistic Header */}
            <header className="h-20 border-b border-purple-500/10 flex items-center justify-between px-8 bg-[#0a0a0f]/80 backdrop-blur-3xl z-20">
                <div className="flex items-center gap-8">
                    <div className="flex items-center gap-4">
                        <div className="w-11 h-11 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center font-black shadow-lg shadow-purple-900/40 transform hover:rotate-12 transition-transform cursor-pointer">C</div>
                        <div>
                            <h1 className="text-xl font-black tracking-tighter leading-none flex items-center gap-2">
                                CREATIVE<span className="text-purple-500 font-medium italic">VOGUE</span>
                            </h1>
                            <p className="text-[10px] text-purple-500/50 font-black tracking-[0.3em] uppercase mt-1">Production Hub 2026</p>
                        </div>
                    </div>

                    <button
                        onClick={onSwitchMode}
                        className="px-4 py-1.5 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-all flex items-center gap-2 border border-white/5"
                    >
                        <ArrowLeftRight size={14} /> Switch Studio
                    </button>
                </div>

                <div className="flex-1 max-w-xl mx-12">
                    <div className="relative group">
                        <Search className="absolute left-4 top-3 text-purple-500/40 group-focus-within:text-purple-500 transition-colors" size={16} />
                        <input
                            type="text"
                            placeholder="Find assets, campaign stories, or briefs..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-white/5 border border-white/5 rounded-2xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:border-purple-500/30 focus:bg-white/10 transition-all font-medium placeholder:text-gray-700"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="hidden xl:flex flex-col items-end border-r border-white/10 pr-8">
                        <span className="text-[9px] font-black text-purple-500 uppercase tracking-widest mb-1">Weekly Output</span>
                        <div className="flex items-center gap-2 text-sm font-black text-white">
                            <TrendingUp size={14} className="text-green-500" /> +{assets.filter(a => a.status === 'APPROVED').length} Approved
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsAdding(true)}
                            className="px-5 h-11 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-xl shadow-purple-900/20 active:scale-95"
                        >
                            <Plus size={16} /> New Asset
                        </button>
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center font-black text-sm border border-white/10 shadow-lg">
                            {currentUser?.name?.[0].toUpperCase() || '?'}
                        </div>
                    </div>
                </div>
            </header>

            {/* Dashboard Sub-nav */}
            <div className="h-12 border-b border-white/5 px-8 flex items-center justify-between bg-[#050510]">
                <div className="flex gap-8">
                    {[
                        { label: 'All Operations', active: !isFilterMe, onClick: () => setIsFilterMe(false) },
                        { label: 'My Studio', active: isFilterMe, onClick: () => setIsFilterMe(true) }
                    ].map(tab => (
                        <button
                            key={tab.label}
                            onClick={tab.onClick}
                            className={`text-[10px] font-black uppercase tracking-[0.2em] transition-all relative ${tab.active ? 'text-white' : 'text-gray-600 hover:text-gray-400'}`}
                        >
                            {tab.label}
                            {tab.active && <motion.div layoutId="subnav" className="absolute -bottom-[17px] left-0 right-0 h-0.5 bg-purple-500" />}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-6 text-[9px] font-black text-gray-500 uppercase tracking-widest">
                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" /> Live Collaboration</div>
                    <div className="flex items-center gap-2 border-l border-white/10 pl-6"><Users size={12} /> {assets.length} Total Projects</div>
                </div>
            </div>

            {/* Studio Kanban */}
            <DndContext
                sensors={sensors}
                onDragStart={(e) => setActiveId(e.active.id)}
                onDragEnd={handleDragEnd}
                collisionDetection={closestCorners}
            >
                <div className="flex-1 overflow-x-auto p-8 custom-scrollbar-x snap-x snap-mandatory">
                    <div className="flex gap-8 h-full min-w-max">
                        {Object.entries(CREATIVE_SECTIONS).map(([key, title]) => (
                            <Column
                                key={key}
                                id={key}
                                title={title}
                                assets={filteredAssets.filter(a => a.status === key)}
                                onClick={setSelectedAsset}
                                onStatusChange={handleUpdate}
                            />
                        ))}
                    </div>
                </div>
                <DragOverlay>
                    {activeId ? <CreativeCard asset={assets.find(a => a.id === activeId)} /> : null}
                </DragOverlay>
            </DndContext>

            {selectedAsset && (
                <CreativeModal
                    asset={selectedAsset}
                    onClose={() => setSelectedAsset(null)}
                    onUpdate={handleUpdate}
                    currentUser={currentUser}
                />
            )}

            {/* Add Asset Modal */}
            <AnimatePresence>
                {isAdding && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="w-full max-w-lg bg-[#0a0a0f] border border-purple-500/30 rounded-3xl p-8 shadow-2xl"
                        >
                            <h2 className="text-xl font-black text-white uppercase tracking-tighter mb-8 flex items-center gap-3">
                                <Sparkles className="text-purple-400" /> New Content Project
                            </h2>
                            <form onSubmit={handleAddAsset} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Asset Title</label>
                                    <input
                                        required
                                        autoFocus
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500/50"
                                        placeholder="e.g., Theme Reveal Trailer"
                                        value={newAssetData.title}
                                        onChange={e => setNewAssetData({ ...newAssetData, title: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Type</label>
                                        <select
                                            className="w-full bg-[#0a0a10] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500/50"
                                            value={newAssetData.asset_type}
                                            onChange={e => setNewAssetData({ ...newAssetData, asset_type: e.target.value })}
                                        >
                                            {['Video', 'Social Post', 'Poster', 'Blog', 'Experience'].map(t => <option key={t}>{t}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Priority</label>
                                        <select
                                            className="w-full bg-[#0a0a10] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500/50"
                                            value={newAssetData.priority}
                                            onChange={e => setNewAssetData({ ...newAssetData, priority: e.target.value })}
                                        >
                                            {['LOW', 'MEDIUM', 'HIGH'].map(p => <option key={p}>{p}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Description</label>
                                    <textarea
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500/50 h-24"
                                        placeholder="Initial idea or project brief..."
                                        value={newAssetData.description}
                                        onChange={e => setNewAssetData({ ...newAssetData, description: e.target.value })}
                                    />
                                </div>
                                <div className="flex gap-4 pt-4">
                                    <button type="button" onClick={() => setIsAdding(false)} className="flex-1 py-4 text-xs font-black uppercase tracking-widest text-gray-600 hover:text-white transition-all">Cancel</button>
                                    <button type="submit" className="flex-[2] py-4 bg-purple-600 hover:bg-purple-500 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-purple-900/20">Initialize Studio Project</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

const Column = ({ id, title, assets, onClick, onStatusChange }) => {
    const { setNodeRef, isOver } = useDroppable({ id });

    return (
        <div ref={setNodeRef} className={`w-80 flex-shrink-0 flex flex-col rounded-3xl transition-all duration-500 ${isOver ? 'bg-purple-500/5 ring-1 ring-purple-500/20 translate-y-[-4px]' : 'bg-transparent'}`}>
            <div className="p-5 flex items-center justify-between sticky top-0 bg-[#050510] z-10 rounded-t-3xl mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]" />
                    <h3 className="font-black text-[11px] uppercase tracking-[0.2em] text-gray-400 italic">{title}</h3>
                </div>
                <span className="text-[10px] font-black text-purple-400 bg-purple-400/10 px-3 py-1 rounded-full border border-purple-400/20">{assets.length}</span>
            </div>

            <div className="flex-1 px-2 overflow-y-auto custom-scrollbar-y">
                <SortableContext items={assets.map(a => a.id)} strategy={verticalListSortingStrategy}>
                    {assets.map(asset => (
                        <CreativeCard
                            key={asset.id}
                            asset={asset}
                            onClick={() => onClick(asset)}
                            onStatusChange={(status) => onStatusChange(asset.id, { status })}
                        />
                    ))}
                </SortableContext>
                {assets.length === 0 && (
                    <div className="h-40 border-2 border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center text-gray-800 transition-all group-hover:border-purple-500/10">
                        <Layout size={24} className="mb-2 opacity-5" />
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-20">Clear for Concept</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CreativeBoard;
