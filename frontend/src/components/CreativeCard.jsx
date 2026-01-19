import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import {
    Video, Image as ImageIcon, FileText, Share2,
    Clock, AlertCircle, CheckCircle2, MoreHorizontal
} from 'lucide-react';

const CreativeCard = ({ asset, onClick, onStatusChange }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: asset.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
        zIndex: isDragging ? 100 : 1,
    };

    const getTypeIcon = () => {
        switch (asset.asset_type?.toLowerCase()) {
            case 'video': return <Video size={14} className="text-purple-400" />;
            case 'social post': return <Share2 size={14} className="text-blue-400" />;
            case 'poster': return <ImageIcon size={14} className="text-pink-400" />;
            default: return <FileText size={14} className="text-gray-400" />;
        }
    };

    const getPriorityColor = () => {
        switch (asset.priority) {
            case 'HIGH': return 'bg-red-500/10 text-red-500 border-red-500/20';
            case 'MEDIUM': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
            default: return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
        }
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onClick={onClick}
            className="group relative bg-[#11111b]/80 backdrop-blur-sm border border-white/5 p-4 rounded-xl mb-3 cursor-grab active:cursor-grabbing hover:border-purple-500/30 transition-all hover:translate-y-[-2px] hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)]"
        >
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-white/5 border border-white/10 group-hover:border-purple-500/20 transition-colors">
                        {getTypeIcon()}
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">{asset.asset_type}</span>
                </div>
                <div className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${getPriorityColor()}`}>
                    {asset.priority}
                </div>
            </div>

            <h4 className="text-sm font-bold text-white mb-2 leading-tight group-hover:text-purple-300 transition-colors">{asset.title}</h4>
            <p className="text-xs text-gray-500 line-clamp-2 mb-4 font-medium leading-relaxed">{asset.description || 'No description provided.'}</p>

            <div className="flex items-center justify-between pt-3 border-t border-white/5">
                <div className="flex -space-x-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 border-2 border-[#11111b] flex items-center justify-center text-[8px] font-black text-white shadow-lg">
                        {asset.assigned_to ? asset.assigned_to[0].toUpperCase() : '?'}
                    </div>
                </div>

                <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-gray-600">
                    <Clock size={10} /> {asset.due_date ? new Date(asset.due_date).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'ASAP'}
                </div>
            </div>

            {/* Glowing accent */}
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        </div>
    );
};

export default CreativeCard;
