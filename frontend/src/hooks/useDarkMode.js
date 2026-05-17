import { useState, useEffect } from 'react';
/* eslint-disable react-hooks/set-state-in-effect */

/**
 * useDarkMode - Custom hook for dark mode state management
 * Priority: localStorage → system preference → light
 */
const useDarkMode = () => {
    const [isDark, setIsDark] = useState(() => {
        // Server-safe: return false initially
        return false;
    });

    useEffect(() => {
        // On mount, determine initial preference
        const stored = localStorage.getItem('theme');
        if (stored === 'dark') {
            setIsDark(true);
        } else if (stored === 'light') {
            setIsDark(false);
        } else {
            // Fall back to system preference
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            setIsDark(prefersDark);
        }
    }, []);

    useEffect(() => {
        const root = document.documentElement;
        if (isDark) {
            root.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            root.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [isDark]);

    const toggleDark = () => setIsDark(prev => !prev);

    return [isDark, toggleDark];
};

export default useDarkMode;
