import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search } from 'lucide-react';

const SidePanel = ({ isOpen, onClose, title, children, onClear }) => {
    const [width, setWidth] = useState(600);
    const [height, setHeight] = useState(window.innerHeight - 200);

    const isResizingWidth = useRef(false);
    const isResizingHeight = useRef(false);

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (isResizingWidth.current) {
                const newWidth = window.innerWidth - e.clientX;
                if (newWidth > 300 && newWidth < window.innerWidth - 50) {
                    setWidth(newWidth);
                }
            }
            if (isResizingHeight.current) {
                // Calculate height from the top of the panel (top: 80px approx)
                // e.clientY gives vertical position. Top is fixed at 80px (approx 5rem top-20)
                const newHeight = e.clientY - 80;
                if (newHeight > 200 && newHeight < window.innerHeight - 80) {
                    setHeight(newHeight);
                }
            }
        };

        const handleMouseUp = () => {
            isResizingWidth.current = false;
            isResizingHeight.current = false;
            document.body.style.cursor = 'default';
            document.body.style.userSelect = 'auto';
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, []);

    const startResizeWidth = (e) => {
        e.preventDefault();
        isResizingWidth.current = true;
        document.body.style.cursor = 'ew-resize';
        document.body.style.userSelect = 'none';
    };

    const startResizeHeight = (e) => {
        e.preventDefault();
        isResizingHeight.current = true;
        document.body.style.cursor = 'ns-resize';
        document.body.style.userSelect = 'none';
    };


    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ x: "100%", opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: "100%", opacity: 0 }}
                    transition={{ type: "spring", damping: 25, stiffness: 200 }}
                    className="fixed right-0 top-[130px] z-40 bg-white shadow-2xl border-l border-b border-slate-200 flex flex-col rounded-l-xl rounded-b-xl overflow-hidden"
                    style={{
                        width: `${width}px`,
                        height: `${height}px`,
                    }}
                >
                    {/* Resize Handle (Left - Width) */}
                    <div
                        onMouseDown={startResizeWidth}
                        className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-slate-400/30 transition-colors z-50 flex items-center justify-center group"
                    >
                        <div className="h-8 w-1 bg-slate-300 rounded-full group-hover:bg-slate-500 transition-colors" />
                    </div>

                    {/* Resize Handle (Bottom - Height) */}
                    <div
                        onMouseDown={startResizeHeight}
                        className="absolute left-0 bottom-0 right-0 h-1.5 cursor-ns-resize hover:bg-slate-400/30 transition-colors z-50 flex items-center justify-center group"
                    >
                        <div className="w-8 h-1 bg-slate-300 rounded-full group-hover:bg-slate-500 transition-colors" />
                    </div>

                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50 shrink-0">
                        <div className="flex items-center gap-2 text-slate-700 ml-2">
                            <Search className="w-5 h-5 text-slate-500" />
                            <h2 className="font-bold text-lg">{title}</h2>
                        </div>
                        <div className="flex items-center gap-2">
                            {onClear && (
                                <button
                                    onClick={onClear}
                                    className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
                                >
                                    Clear Search
                                </button>
                            )}
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500 hover:text-slate-700"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50 mb-1">
                        {children}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default SidePanel;
