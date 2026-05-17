import { motion, AnimatePresence } from 'framer-motion';
import { X, Edit } from 'lucide-react';
import UploadForm from './UploadForm';

const EditPublicationModal = ({ isOpen, onClose, publication, onSuccess }) => {
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
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative w-full max-w-2xl bg-white border border-white/20 shadow-premium rounded-2xl overflow-hidden z-10 max-h-[90vh] flex flex-col"
          >
            {/* Header */}
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 rounded-xl border border-indigo-100">
                  <Edit size={20} className="text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800 leading-tight">Edit Book</h2>
                  <p className="text-xs font-medium text-slate-500">Update the book details</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 border border-transparent hover:border-slate-200 rounded-lg transition-all duration-200 group"
                aria-label="Close modal"
              >
                <X size={20} className="group-hover:scale-110 transition-transform" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto">
              <UploadForm
                initialData={publication}
                onSuccess={onSuccess}
                onClose={onClose}
              />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default EditPublicationModal;
