import { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

const CustomDatePicker = ({ value, onChange, label, required, maxDate, error }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [viewDate, setViewDate] = useState(new Date()); // Current view in calendar
    const containerRef = useRef(null);

    // Sync viewDate with value if provided
    useEffect(() => {
        if (value) {
            const date = new Date(value);
            if (!isNaN(date.getTime())) {
                setViewDate(date);
            }
        }
    }, [isOpen, value]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handlePrevMonth = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
    };

    const handleNextMonth = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
    };

    const handlePrevYear = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setViewDate(new Date(viewDate.getFullYear() - 1, viewDate.getMonth(), 1));
    };

    const handleNextYear = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setViewDate(new Date(viewDate.getFullYear() + 1, viewDate.getMonth(), 1));
    };

    const handleToday = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const today = new Date();
        setViewDate(today);

        // Optional: Select today automatically?
        // onChange(today.toISOString().split('T')[0]);
        // setIsOpen(false);
    };

    const handleDateSelect = (day) => {
        const selectedDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
        const offset = selectedDate.getTimezoneOffset();
        const localDate = new Date(selectedDate.getTime() - (offset * 60 * 1000));
        const dateStr = localDate.toISOString().split('T')[0];

        if (maxDate && new Date(dateStr) > new Date(maxDate)) {
            return;
        }

        onChange(dateStr);
        setIsOpen(false);
    };

    const formatDateDisplay = (dateStr) => {
        if (!dateStr) return 'Select a date...';
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return 'Select a date...';
        return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    };

    const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

    const renderDays = () => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        const daysInMonth = getDaysInMonth(year, month);
        const firstDay = getFirstDayOfMonth(year, month);

        const daysArray = [];

        // Empty slots
        for (let i = 0; i < firstDay; i++) {
            daysArray.push(<div key={`empty-${i}`} className="aspect-square"></div>);
        }

        // Days
        for (let day = 1; day <= daysInMonth; day++) {
            const currentDayDate = new Date(year, month, day);
            const offset = currentDayDate.getTimezoneOffset();
            const localDate = new Date(currentDayDate.getTime() - (offset * 60 * 1000));
            const dateStr = localDate.toISOString().split('T')[0];

            const isSelected = value === dateStr;
            const isToday = new Date().toDateString() === currentDayDate.toDateString();
            const isFuture = maxDate && new Date(dateStr) > new Date(maxDate);

            daysArray.push(
                <div
                    key={day}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (!isFuture) handleDateSelect(day);
                    }}
                    className={`
                        aspect-square flex items-center justify-center text-sm font-medium rounded-xl transition-all duration-200 relative
                        ${isSelected
                            ? 'bg-blue-600 text-white font-semibold shadow-md'
                            : isFuture
                                ? 'text-slate-300 cursor-default'
                                : 'text-slate-700 hover:bg-blue-50 hover:text-blue-600 cursor-pointer'
                        }
                        ${!isSelected && isToday ? 'text-blue-600 font-bold after:content-[""] after:absolute after:bottom-1.5 after:w-1 after:h-1 after:bg-blue-600 after:rounded-full' : ''}
                    `}
                >
                    {day}
                </div>
            );
        }
        return daysArray;
    };

    return (
        <div className="relative w-full" ref={containerRef}>
            {label && (
                <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5 mb-2">
                    {label}
                    {required && <span className="text-red-500">*</span>}
                </label>
            )}

            {/* Input Trigger */}
            <div
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    w-full bg-white border-2 rounded-xl px-4 py-3 flex items-center gap-3 cursor-pointer transition-all duration-200 select-none
                    ${error ? 'border-red-300 bg-red-50/10' : (isOpen ? 'border-blue-600 shadow-[0_0_0_4px_rgba(37,99,235,0.1)]' : 'border-slate-200 hover:border-blue-600')}
                `}
            >
                <Calendar size={20} className={error ? "text-red-400" : "text-slate-500"} />
                <span className={`flex-grow text-[0.95rem] font-medium ${value ? 'text-slate-800' : 'text-slate-500'}`}>
                    {formatDateDisplay(value)}
                </span>
                <ChevronDown size={16} className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </div>
            {error && <span className="text-xs text-red-500 mt-1 block">{error}</span>}

            {/* Calendar Card */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="absolute top-[calc(100%+12px)] left-0 w-full sm:w-[340px] bg-white border border-slate-200 rounded-2xl shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1),0_4px_6px_-2px_rgba(0,0,0,0.05)] p-5 z-50 select-none"
                    >
                        {/* Header */}
                        <div className="flex justify-between items-center mb-4">
                            <div className="font-bold text-slate-800 text-[0.95rem] whitespace-nowrap px-1">
                                {months[viewDate.getMonth()]} {viewDate.getFullYear()}
                            </div>
                            <div className="flex gap-0.5 sm:gap-1">
                                <button
                                    type="button"
                                    onClick={handlePrevYear}
                                    title="Previous Year"
                                    className="p-1 sm:p-1.5 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-blue-600 transition-colors"
                                >
                                    <ChevronsLeft size={18} />
                                </button>
                                <button
                                    type="button"
                                    onClick={handlePrevMonth}
                                    title="Previous Month"
                                    className="p-1 sm:p-1.5 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-blue-600 transition-colors"
                                >
                                    <ChevronLeft size={18} />
                                </button>
                                <button
                                    type="button"
                                    onClick={handleNextMonth}
                                    title="Next Month"
                                    className="p-1 sm:p-1.5 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-blue-600 transition-colors"
                                >
                                    <ChevronRight size={18} />
                                </button>
                                <button
                                    type="button"
                                    onClick={handleNextYear}
                                    title="Next Year"
                                    className="p-1 sm:p-1.5 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-blue-600 transition-colors"
                                >
                                    <ChevronsRight size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Grid */}
                        <div className="grid grid-cols-7 gap-1 mb-2">
                            {/* Weekday Headers */}
                            {daysOfWeek.map(day => (
                                <div key={day} className="text-center text-[0.75rem] font-bold text-slate-400 uppercase py-2">
                                    {day}
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-7 gap-1">
                            {renderDays()}
                        </div>

                        {/* Footer */}
                        <div className="mt-4 pt-4 border-t border-slate-100 flex justify-center">
                            <button
                                type="button"
                                onClick={handleToday}
                                className="text-sm font-semibold text-blue-600 bg-transparent hover:bg-blue-50 px-4 py-2 rounded-lg transition-colors"
                            >
                                Jump to Today
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CustomDatePicker;
