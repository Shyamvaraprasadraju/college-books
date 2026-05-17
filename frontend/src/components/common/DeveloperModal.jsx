import { motion, AnimatePresence } from 'framer-motion';
import { X, Code, Mail, User } from 'lucide-react';

const DeveloperModal = ({ isOpen, onClose }) => {
  const developers = [
    { name: 'Amman Fawaz', email: 'ammanfawaz272@gmail.com' },
    { name: 'Mukesh Babu', email: 'nmbabu309@gmail.com' },
    { name: 'Rahul Dovari', email: 'rahuldovari90@gmail.com' },
    { name: 'Shyam Raju', email: 'shyamraju1012@gmail.com' },
    { name: 'Sekhar Varma', email: 'varma07a@gmail.com' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />

          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative bg-white rounded-xl shadow-2xl p-8 max-w-4xl w-full text-center overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-20 bg-gradient-to-r from-[#1B2845] to-[#243656] opacity-[0.06]" />

            <div className="relative z-10">
              <div className="w-14 h-14 bg-[#1B2845] rounded-xl shadow-lg mx-auto flex items-center justify-center mb-6 text-[#C8A96E]">
                <Code size={32} />
              </div>

              <h3 className="text-xl font-bold font-heading text-slate-900 mb-2">Designed & Developed by</h3>
              <p className="text-slate-500 text-sm mb-8">
                Department of Computer Science & Engineering CSE Batch of 2027
              </p>

              <div className="flex flex-wrap justify-center gap-6 md:gap-8">
                {developers.map((dev, index) => (
                  <div key={index} className="flex flex-col items-center group">
                    <h4 className="font-bold text-slate-900 mb-1">{dev.name}</h4>
                    <a
                      href={`mailto:${dev.email}`}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 border border-slate-100 hover:border-primary/30 hover:bg-white hover:text-primary transition-all group/email"
                    >
                      <Mail size={10} className="text-slate-400 group-hover/email:text-primary transition-colors" />
                      <span className="text-xs text-slate-500 group-hover/email:text-primary transition-colors">{dev.email}</span>
                    </a>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-all"
            >
              <X size={20} />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default DeveloperModal;
