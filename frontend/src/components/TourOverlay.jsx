import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, ArrowLeft } from 'lucide-react';

const TOUR_STEPS = [
    {
        target: 'header',  // Just a general center modal for intro
        title: "Welcome to TEDx Outreach",
        content: "Let's take a quick tour of your new command center.",
        position: 'center'
    },
    {
        target: '[data-tour="add-btn"]',
        title: "Add Speakers",
        content: "Found someone interesting? Add them to your pipeline here.",
        position: 'bottom'
    },
    {
        target: '[data-tour="focus-btn"]',
        title: "Focus Mode",
        content: "Need to scout fast? Enter Zen Mode for rapid-fire data entry.",
        position: 'bottom'
    },
    {
        target: '[data-tour="guide-btn"]',
        title: "The Playbook",
        content: "Not sure what to do? The Guide has all the strategies and tools you need.",
        position: 'bottom-left'
    },
    {
        target: '[data-tour="kanban"]',
        title: "The Board",
        content: "Drag & Drop speakers to move them through the pipeline. Changes save automatically.",
        position: 'top'
    }
];

const TourOverlay = ({ isOpen, onClose }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [rect, setRect] = useState(null);

    useEffect(() => {
        if (!isOpen) return;

        const updateRect = () => {
            const step = TOUR_STEPS[currentStep];
            if (step.position === 'center') {
                setRect(null);
                return;
            }

            const element = document.querySelector(step.target);
            if (element) {
                const r = element.getBoundingClientRect();
                setRect({
                    top: r.top,
                    left: r.left,
                    width: r.width,
                    height: r.height,
                    bottom: r.bottom,
                    right: r.right
                });
            }
        };

        updateRect();
        window.addEventListener('resize', updateRect);
        // Small delay to ensure render
        setTimeout(updateRect, 100);

        return () => window.removeEventListener('resize', updateRect);
    }, [currentStep, isOpen]);

    if (!isOpen) return null;

    const step = TOUR_STEPS[currentStep];

    const handleNext = () => {
        if (currentStep < TOUR_STEPS.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            onClose();
        }
    };

    const handlePrev = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] overflow-hidden">
                {/* Backdrop with cutout effect using clip-path or huge borders? 
                    Easier approach: 4 divs for dimming around the rect */}
                {rect && (
                    <>
                        {/* Top */}
                        <div className="absolute top-0 left-0 right-0 bg-black/80 transition-all duration-300" style={{ height: rect.top }} />
                        {/* Bottom */}
                        <div className="absolute left-0 right-0 bottom-0 bg-black/80 transition-all duration-300" style={{ top: rect.bottom }} />
                        {/* Left */}
                        <div className="absolute left-0 top-0 bottom-0 bg-black/80 transition-all duration-300" style={{ width: rect.left, top: rect.top, bottom: window.innerHeight - rect.bottom }} />
                        {/* Right */}
                        <div className="absolute right-0 top-0 bottom-0 bg-black/80 transition-all duration-300" style={{ left: rect.right, top: rect.top, bottom: window.innerHeight - rect.bottom }} />

                        {/* Highlight Border */}
                        <motion.div
                            layoutId="tour-highlight"
                            className="absolute border-2 border-red-500 rounded-lg shadow-[0_0_30px_rgba(239,68,68,0.5)] bg-transparent pointer-events-none transition-all duration-300"
                            style={{
                                top: rect.top - 4,
                                left: rect.left - 4,
                                width: rect.width + 8,
                                height: rect.height + 8
                            }}
                        />
                    </>
                )}

                {!rect && (
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
                )}

                {/* Tooltip Card */}
                <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3 }}
                    className="absolute bg-[#1a1a1a] border border-white/10 rounded-xl p-6 w-96 shadow-2xl"
                    style={{
                        top: rect ? (step.position === 'bottom' ? rect.bottom + 20 :
                            step.position === 'top' ? rect.top - 200 :
                                step.position === 'bottom-left' ? rect.bottom + 20 :
                                    '50%') : '50%',
                        left: rect ? (step.position === 'bottom-left' ? rect.right - 384 :
                            step.position === 'center' ? '50%' :
                                rect.left + (rect.width / 2) - 192) : '50%',
                        transform: rect ? 'none' : 'translate(-50%, -50%)',
                        // Safety Constraints
                        ...(rect && step.position === 'bottom-left' ? { left: 'auto', right: window.innerWidth - rect.right } : {})
                    }}
                >
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <span className="text-xs font-bold text-red-500 uppercase tracking-widest">Step {currentStep + 1}/{TOUR_STEPS.length}</span>
                            <h3 className="text-xl font-bold text-white mt-1">{step.title}</h3>
                        </div>
                        <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={16} /></button>
                    </div>

                    <p className="text-gray-300 text-sm leading-relaxed mb-6">
                        {step.content}
                    </p>

                    <div className="flex items-center justify-between">
                        <button
                            onClick={handlePrev}
                            disabled={currentStep === 0}
                            className={`flex items-center gap-2 text-sm font-bold ${currentStep === 0 ? 'text-gray-600 cursor-not-allowed' : 'text-gray-400 hover:text-white'}`}
                        >
                            <ArrowLeft size={14} /> Back
                        </button>

                        <button
                            onClick={handleNext}
                            className="bg-red-600 hover:bg-red-500 text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg shadow-red-900/20 flex items-center gap-2"
                        >
                            {currentStep === TOUR_STEPS.length - 1 ? 'Finish' : 'Next'} <ArrowRight size={14} />
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default TourOverlay;
