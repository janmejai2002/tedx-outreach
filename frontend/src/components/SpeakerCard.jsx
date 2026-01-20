import React from 'react';
import { motion } from 'framer-motion';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { LayoutGrid, MapPin, Mail, Award, CheckCircle, Target, Phone, Tag } from 'lucide-react';

const SpeakerCard = ({ speaker, onClick, onStatusChange, isSelectMode, isSelected, onToggleSelect, compact = false, assignedName = null }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: speaker.id, disabled: isSelectMode }); // Disable drag when selecting

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const priorityColors = {
        'Tier 1': 'bg-red-500/20 text-red-300 border-red-500/30',
        'Tier 2': 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
        'Tier 3': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    };

    const handleClick = (e) => {
        if (isSelectMode) {
            e.stopPropagation();
            onToggleSelect(speaker.id);
        } else {
            onClick();
        }
    };

    return (
        <motion.div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            layoutId={speaker.id}
            onClick={handleClick}
            className={`glass glass-hover ${compact ? 'p-6 min-h-[160px]' : 'p-4 mb-3'} rounded-xl cursor-pointer group border-l-4 relative overflow-hidden transition-all 
                ${speaker.is_bounty ? 'border-red-600 bg-red-900/10' : 'border-l-transparent hover:border-l-red-500'}
                ${isSelected ? 'ring-2 ring-red-500 bg-red-500/5' : ''}
                ${compact ? 'w-full' : ''}
            `}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
        >
            {/* Selection Checkbox Overlay */}
            {isSelectMode && (
                <div className="absolute top-2 right-2 z-20">
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-red-600 border-red-600' : 'border-gray-500 bg-black/40'}`}>
                        {isSelected && <CheckCircle size={12} className="text-white" />}
                    </div>
                </div>
            )}

            {/* Bounty Badge */}
            {speaker.is_bounty && (
                <div className="absolute -right-4 top-2 bg-red-600 text-white text-[8px] font-bold px-6 py-0.5 rotate-45 shadow-lg shadow-red-600/50 z-10 flex items-center justify-center gap-1">
                    <Target size={8} /> WANTED
                </div>
            )}

            {/* Email/Phone Verification Nudge */}
            {speaker.status === 'SCOUTED' && !speaker.email && !speaker.phone && (
                <div className="absolute top-2 left-2 z-10 group/warn flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full bg-red-600/20 border border-red-500/50 flex items-center justify-center text-red-500 animate-[pulse_2s_infinite]">
                        <Mail size={10} />
                    </div>
                    <span className="text-[7px] font-black text-red-500 uppercase tracking-tighter opacity-0 group-hover/warn:opacity-100 transition-opacity bg-black/80 px-1 rounded">Missing Email (AI Hunt Ready)</span>
                </div>
            )}


            {/* Floating Remarks Tag */}
            {speaker.remarks && (
                <div className="absolute top-10 left-0 z-10 flex">
                    <div className="bg-red-600/90 text-white text-[7px] font-black px-1.5 py-0.5 rounded-r shadow-lg uppercase tracking-tighter flex items-center gap-1">
                        <Tag size={6} /> {speaker.remarks}
                    </div>
                </div>
            )}

            <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-white leading-tight pr-2 group-hover:text-red-400 transition-colors">{speaker.name}</h3>
                <div className="flex flex-col items-end gap-1">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${priorityColors[speaker.outreach_priority] || 'bg-gray-700 text-gray-300'}`}>
                        {speaker.outreach_priority || 'N/A'}
                    </span>
                </div>
            </div>

            <div className="text-[10px] text-gray-500 mb-2 line-clamp-2">
                {speaker.primary_domain}
            </div>

            <div className="flex items-center justify-between mt-4">
                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                        <MapPin size={12} />
                        <span className="truncate max-w-[80px]">{speaker.location || 'Unknown'}</span>
                    </div>

                    {speaker.email && (
                        <div className="flex items-center gap-1 text-green-500/70" title={speaker.email}>
                            <Mail size={10} />
                        </div>
                    )}
                    {speaker.phone && (
                        <div className="flex items-center gap-1 text-green-500/70" title={speaker.phone}>
                            <Phone size={10} />
                        </div>
                    )}

                    {speaker.assigned_to ? (
                        <div className="flex items-center gap-1.5 text-blue-400">
                            <div className="w-4 h-4 rounded-full bg-blue-900/50 border border-blue-500/30 flex items-center justify-center text-[8px] font-black shadow-[0_0_8px_rgba(59,130,246,0.3)] shrink-0">
                                {assignedName ? assignedName[0].toUpperCase() : speaker.assigned_to[0].toUpperCase()}
                            </div>
                            <span className="text-[9px] font-bold uppercase tracking-tight truncate max-w-[60px] md:max-w-[100px]">{assignedName || speaker.assigned_to}</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 text-gray-600">
                            <div className="w-4 h-4 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-[10px] font-bold">
                                ?
                            </div>
                            <span className="text-[9px] font-medium italic">Yet to be assigned</span>
                        </div>
                    )}
                </div>

                {/* Quick Status Selector - Hidden in Select Mode */}
                {!isSelectMode && (
                    <select
                        value={speaker.status}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                            e.stopPropagation();
                            if (onStatusChange) onStatusChange(e.target.value);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 border border-white/10 rounded px-1.5 py-0.5 text-[10px] font-bold text-gray-400 hover:text-white hover:border-white/30 outline-none cursor-pointer"
                    >
                        <option value="SCOUTED">Scouted</option>
                        <option value="EMAIL_ADDED">Email</option>
                        <option value="RESEARCHED">Researched</option>
                        <option value="DRAFTED">Drafted</option>
                        <option value="CONTACT_INITIATED">Sent</option>
                        <option value="CONNECTED">Connected</option>
                        <option value="IN_TALKS">Talks</option>
                        <option value="LOCKED">Locked</option>
                    </select>
                )}
            </div>
        </motion.div>
    );
};

export default SpeakerCard;
