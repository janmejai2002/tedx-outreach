import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import SpeakerCard from './SpeakerCard';
import { LayoutGrid, Search } from 'lucide-react';

const SpeakerColumn = ({ id, title, speakers, onSpeakerClick, onStatusChange, isSelectMode, selectedIds, onToggleSelect, viewMode = 'kanban', onToggleView, userMap = {} }) => {
    const { setNodeRef, isOver } = useDroppable({ id });

    return (
        <div ref={setNodeRef} className={`${viewMode === 'gallery' ? 'w-full' : 'w-[85vw] md:w-80'} flex-shrink-0 flex flex-col rounded-xl transition-all duration-300 ${isOver ? 'bg-white/[0.05] border border-red-500/30' : 'bg-transparent'}`}>
            <div className="p-4 flex items-center justify-between sticky top-0 bg-[#050505]/95 backdrop-blur-sm z-10 border-b border-white/5 rounded-t-xl">
                <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${id === 'LOCKED' ? 'bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.5)]' : 'bg-gray-600'}`} />
                    <h3 className="font-bold text-xs md:text-sm tracking-wide text-gray-200 uppercase tracking-tighter">{title}</h3>
                    <button
                        onClick={onToggleView}
                        className="p-1 hover:bg-white/10 rounded-md text-gray-600 hover:text-white transition-all ml-1"
                        title={viewMode === 'gallery' ? "Switch to Kanban" : "Switch to Gallery"}
                    >
                        {viewMode === 'gallery' ? <LayoutGrid size={12} /> : <Search size={12} />}
                    </button>
                </div>
                <span className="text-xs font-bold text-gray-600 bg-white/5 px-2 py-0.5 rounded-full">{speakers.length}</span>
            </div>

            <div className={`flex-1 p-3 overflow-y-auto custom-scrollbar ${viewMode === 'gallery' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4' : 'space-y-3'}`}>
                <SortableContext items={speakers.map(s => s.id)} strategy={verticalListSortingStrategy}>
                    {speakers.map(speaker => (
                        <SpeakerCard
                            key={speaker.id}
                            speaker={speaker}
                            onClick={() => onSpeakerClick(speaker)}
                            onStatusChange={(newStatus) => onStatusChange(speaker.id, { status: newStatus })}
                            isSelectMode={isSelectMode}
                            isSelected={selectedIds.has(speaker.id)}
                            onToggleSelect={onToggleSelect}
                            compact={viewMode === 'gallery'}
                            assignedName={userMap[speaker.assigned_to] || speaker.assigned_to}
                        />
                    ))}
                </SortableContext>
                {speakers.length === 0 && (
                    <div className="h-24 border-2 border-dashed border-white/5 rounded-xl flex items-center justify-center text-xs text-gray-700 font-medium col-span-full">
                        {isOver ? "Drop to update status" : "Empty"}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SpeakerColumn;
