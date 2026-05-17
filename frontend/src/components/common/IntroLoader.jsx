import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const IntroLoader = ({ onComplete }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Hide the loader after 2.5 seconds
    const timer = setTimeout(() => {
      setIsVisible(false);
      // Wait for exit animation to complete before unmounting
      setTimeout(() => {
        onComplete();
      }, 800); 
    }, 2500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-[9999] bg-[#FAFBFD] flex items-center justify-center flex-col"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
        >
          {/* Logo Animation */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ 
              duration: 1, 
              ease: "easeOut",
              delay: 0.2
            }}
            className="w-40 h-40 md:w-56 md:h-56 bg-white rounded-3xl shadow-xl border border-slate-100 flex items-center justify-center p-4"
          >
            <img 
              src="/NRI-logo.png" 
              alt="NRI Logo" 
              className="w-full h-full object-contain"
            />
          </motion.div>

          {/* Text Animation */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1 }}
            className="mt-8 text-center"
          >
            <h1 className="text-2xl md:text-3xl font-bold text-[#1B2845] tracking-tight">
              Dr. RVR NRI INSTITUTE OF TECHNOLOGY
            </h1>
            <p className="mt-2 text-slate-500 font-medium">
              Books and Books' Chapters Portal
            </p>
          </motion.div>

          {/* Loading line */}
          <motion.div
            className="mt-10 h-1 bg-slate-200 rounded-full w-48 overflow-hidden relative"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
          >
            <motion.div 
              className="absolute top-0 left-0 h-full bg-[#1B2845]"
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 1.5, ease: "easeInOut", delay: 1.2 }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default IntroLoader;
