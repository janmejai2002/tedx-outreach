import React from 'react';
import { motion } from 'framer-motion';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Building2, Mail, Globe, Briefcase, CheckCircle, TrendingUp, DollarSign } from 'lucide-react';

const SponsorCard = ({ sponsor, onClick, onStatusChange, isSelectMode, isSelected, onToggleSelect }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: sponsor.id, disabled: isSelectMode });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const tierColors = {
        'Title': 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
        'Platinum': 'bg-gray-300/20 text-gray-200 border-gray-300/30',
        'Gold': 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30',
        'Silver': 'bg-gray-400/20 text-gray-400 border-gray-400/30',
    };

    const handleClick = (e) => {
        if (isSelectMode) {
            e.stopPropagation();
            onToggleSelect(sponsor.id);
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
            layoutId={`sponsor-${sponsor.id}`}
            onClick={handleClick}
            className={`glass glass-hover p-4 rounded-xl mb-3 cursor-pointer group border-l-4 relative overflow-hidden transition-all 
                ${isSelected ? 'ring-2 ring-emerald-500 bg-emerald-500/5 border-l-emerald-500' : 'border-l-transparent hover:border-l-emerald-500'}
            `}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
        >
            {/* Selection Checkbox Overlay */}
            {isSelectMode && (
                <div className="absolute top-2 right-2 z-20">
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-emerald-600 border-emerald-600' : 'border-gray-500 bg-black/40'}`}>
                        {isSelected && <CheckCircle size={12} className="text-white" />}
                    </div>
                </div>
            )}

            <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-white leading-tight pr-2 group-hover:text-emerald-400 transition-colors uppercase tracking-tight">{sponsor.company_name}</h3>
                <div className="flex flex-col items-end gap-1">
                    {sponsor.partnership_tier && (
                        <span className={`text-[9px] px-2 py-0.5 rounded-full border font-black uppercase tracking-tighter ${tierColors[sponsor.partnership_tier] || 'bg-gray-700 text-gray-300'}`}>
                            {sponsor.partnership_tier}
                        </span>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-2 text-[10px] text-gray-400 mb-3">
                <Building2 size={10} className="text-emerald-500" />
                <span>{sponsor.industry || 'General Industry'}</span>
            </div>

            <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
                <div className="flex items-center gap-3 text-xs text-gray-500">
                    {sponsor.target_amount && (
                        <div className="flex items-center gap-1 text-emerald-400 font-bold">
                            <DollarSign size={10} />
                            <span>{sponsor.target_amount.toLocaleString()}</span>
                        </div>
                    )}
                    {sponsor.assigned_to ? (
                        <div className="flex items-center gap-1.5 text-blue-400">
                            <div className="w-4 h-4 rounded-full bg-blue-900/50 border border-blue-500/30 flex items-center justify-center text-[8px] font-black shadow-[0_0_8px_rgba(59,130,246,0.3)]">
                                {sponsor.assigned_to[0].toUpperCase()}
                            </div>
                            <span className="text-[9px] font-bold uppercase tracking-tight">{sponsor.assigned_to}</span>
                        </div>
                    ) : (
                        <span className="text-[9px] font-medium italic text-gray-600 px-2 py-0.5 bg-white/5 rounded">Unassigned</span>
                    )}
                </div>

                {!isSelectMode && (
                    <select
                        value={sponsor.status}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                            e.stopPropagation();
                            if (onStatusChange) onStatusChange(e.target.value);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 border border-emerald-500/30 rounded px-1.5 py-0.5 text-[10px] font-black text-emerald-400 hover:text-white hover:bg-emerald-600 transition-all outline-none cursor-pointer uppercase"
                    >
                        <option value="PROSPECT">Prospect</option>
                        <option value="CONTACTED">Contacted</option>
                        <option value="PITCHED">Pitched</option>
                        <option value="NEGOTIATING">In Negotiation</option>
                        <option value="SIGNED">Signed</option>
                        <option value="ONBOARDED">Onboarded</option>
                        <option value="REJECTED">Lost</option>
                    </select>
                )}
            </div>
        </motion.div>
    );
};

export default SponsorCard;
