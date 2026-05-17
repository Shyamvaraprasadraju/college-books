import { AlertCircle, FileText, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import OrphanedFilesPanel from './OrphanedFilesPanel';

const SystemActions = ({ isSuperAdmin, handleManualBackup, isBackingUp, api, toast, fetchLogs, fetchStats }) => {
    if (!isSuperAdmin) return null;

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white rounded-2xl shadow-sm border border-red-100 overflow-hidden mt-6"
        >
            <div className="p-5 bg-red-50/50 border-b border-red-100">
                <h2 className="text-base font-bold text-red-800 flex items-center gap-2">
                    <AlertCircle size={18} className="text-red-500" />
                    Danger Zone & System Actions
                </h2>
            </div>
            <div className="p-5 space-y-5">
                {/* Manual Backup */}
                <div>
                    <p className="text-xs text-slate-500 mb-2">
                        Manually trigger a full system backup (Database & Uploads).
                    </p>
                    <button
                        onClick={handleManualBackup}
                        disabled={isBackingUp}
                        className="w-full py-2.5 bg-white border border-emerald-200 text-emerald-600 rounded-xl text-sm font-semibold hover:bg-emerald-50 hover:border-emerald-300 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        <FileText size={16} />
                        {isBackingUp ? "Backing up..." : "Create Backup"}
                    </button>
                </div>

                {/* Orphaned File Cleanup */}
                <OrphanedFilesPanel />

                {/* Reset Database */}
                <div className="pt-4 border-t border-red-100">
                    <p className="text-xs text-slate-500 mb-3">
                        Permanently wipe all book entries. Ensure a backup has been exported first.
                    </p>
                    <button
                        onClick={() => {
                            const confirm = window.prompt("Type 'DELETE' to confirm destructive action:");
                            if (confirm === "DELETE") {
                                api.post("/admin/deleteAll")
                                    .then(() => {
                                        toast.success("Database reset complete");
                                        fetchLogs();
                                        fetchStats();
                                    })
                                    .catch(err => toast.error("Reset failed: " + (err.response?.data?.message || err.message)));
                            }
                        }}
                        className="w-full py-2.5 bg-white border border-red-200 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-50 hover:border-red-300 transition-all flex items-center justify-center gap-2"
                    >
                        <Trash2 size={16} />
                        Reset Database
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

export default SystemActions;
