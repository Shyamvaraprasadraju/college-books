import { useState } from 'react';
import { Folder, Trash2, ScanSearch, CheckSquare, Square, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../../api/axios';

const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const OrphanedFilesPanel = () => {
    const [scanning, setScanning] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [orphans, setOrphans] = useState(null); // null = not scanned yet
    const [selected, setSelected] = useState(new Set());
    const [showConfirm, setShowConfirm] = useState(false);
    const [lastResult, setLastResult] = useState(null);

    const handleScan = async () => {
        setScanning(true);
        setOrphans(null);
        setSelected(new Set());
        setLastResult(null);
        try {
            const res = await api.get('/admin/orphaned-files');
            setOrphans(res.data.orphaned);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Scan failed');
        } finally {
            setScanning(false);
        }
    };

    const toggleSelect = (key) => {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    const toggleAll = () => {
        if (selected.size === orphans.length) {
            setSelected(new Set());
        } else {
            setSelected(new Set(orphans.map(f => `${f.folder}/${f.filename}`)));
        }
    };

    const handleDeleteSelected = async () => {
        setShowConfirm(false);
        setDeleting(true);
        try {
            const files = orphans
                .filter(f => selected.has(`${f.folder}/${f.filename}`))
                .map(f => ({ filename: f.filename, folder: f.folder }));

            const res = await api.delete('/admin/orphaned-files', { data: { files } });
            const { deleted, skipped } = res.data;

            setLastResult({ deleted: deleted.length, skipped: skipped.length });
            toast.success(`Deleted ${deleted.length} orphaned file(s)`);

            // Re-scan to refresh list
            const scanRes = await api.get('/admin/orphaned-files');
            setOrphans(scanRes.data.orphaned);
            setSelected(new Set());
        } catch (err) {
            toast.error(err.response?.data?.message || 'Delete failed');
        } finally {
            setDeleting(false);
        }
    };

    const fileKey = (f) => `${f.folder}/${f.filename}`;
    const allSelected = orphans && orphans.length > 0 && selected.size === orphans.length;
    const noneSelected = selected.size === 0;

    return (
        <div className="pt-4 border-t border-red-100">
            <div className="flex items-center justify-between mb-2">
                <div>
                    <p className="text-xs font-semibold text-slate-600 mb-0.5">Orphaned File Cleanup</p>
                    <p className="text-xs text-slate-400">Find &amp; remove files on disk that have no database record.</p>
                </div>
                <button
                    onClick={handleScan}
                    disabled={scanning || deleting}
                    className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-all disabled:opacity-50 shrink-0"
                >
                    {scanning ? <RefreshCw size={14} className="animate-spin" /> : <ScanSearch size={14} />}
                    {scanning ? 'Scanning...' : 'Scan'}
                </button>
            </div>

            <AnimatePresence mode="wait">
                {/* Not yet scanned */}
                {orphans === null && !scanning && (
                    <motion.p
                        key="prompt"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-xs text-slate-400 italic text-center py-3"
                    >
                        Click <strong>Scan</strong> to check for orphaned files.
                    </motion.p>
                )}

                {/* No orphans */}
                {orphans !== null && orphans.length === 0 && (
                    <motion.div
                        key="clean"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-700 text-xs font-medium"
                    >
                        <CheckCircle2 size={15} />
                        No orphaned files found. All files are linked to database records.
                    </motion.div>
                )}

                {/* Orphans found */}
                {orphans !== null && orphans.length > 0 && (
                    <motion.div
                        key="orphanList"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="space-y-2"
                    >
                        {/* Last result banner */}
                        {lastResult && (
                            <div className="text-xs text-slate-500 bg-slate-50 rounded-lg p-2 border border-slate-100">
                                Last cleanup: deleted {lastResult.deleted}, skipped {lastResult.skipped}
                            </div>
                        )}

                        {/* Warning banner */}
                        <div className="flex items-center gap-2 p-2.5 bg-amber-50 border border-amber-100 rounded-xl text-amber-700 text-xs">
                            <AlertTriangle size={13} className="shrink-0" />
                            <span>{orphans.length} orphaned file{orphans.length > 1 ? 's' : ''} found. Verify before deleting.</span>
                        </div>

                        {/* Select All */}
                        <div className="flex items-center justify-between px-1">
                            <button
                                onClick={toggleAll}
                                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700"
                            >
                                {allSelected ? <CheckSquare size={14} className="text-red-500" /> : <Square size={14} />}
                                {allSelected ? 'Deselect All' : 'Select All'}
                            </button>
                            <span className="text-xs text-slate-400">{selected.size} of {orphans.length} selected</span>
                        </div>

                        {/* File list */}
                        <div className="max-h-44 overflow-y-auto space-y-1.5 border border-slate-100 rounded-xl p-2 bg-slate-50/50 custom-scrollbar">
                            {orphans.map(f => {
                                const key = fileKey(f);
                                const isSelected = selected.has(key);
                                return (
                                    <button
                                        key={key}
                                        onClick={() => toggleSelect(key)}
                                        className={`w-full flex items-start gap-2 p-2 rounded-lg text-left transition-colors text-xs ${isSelected ? 'bg-red-50 border border-red-200' : 'bg-white border border-slate-100 hover:border-slate-200'}`}
                                    >
                                        {isSelected
                                            ? <CheckSquare size={14} className="text-red-500 shrink-0 mt-0.5" />
                                            : <Square size={14} className="text-slate-300 shrink-0 mt-0.5" />
                                        }
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-slate-700 truncate">{f.filename}</p>
                                            <p className="text-slate-400 flex items-center gap-1 mt-0.5">
                                                <Folder size={10} />
                                                {f.folder} &bull; {formatBytes(f.size)} &bull; {new Date(f.lastModified).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Delete button */}
                        <button
                            onClick={() => setShowConfirm(true)}
                            disabled={noneSelected || deleting}
                            className="w-full py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                        >
                            <Trash2 size={14} />
                            {deleting ? 'Deleting...' : `Delete Selected (${selected.size})`}
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Confirm Modal */}
            <AnimatePresence>
                {showConfirm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
                        onClick={() => setShowConfirm(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.94, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.94, opacity: 0 }}
                            className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2.5 bg-red-100 rounded-xl">
                                    <AlertTriangle size={20} className="text-red-600" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 text-sm">Confirm Permanent Deletion</h3>
                                    <p className="text-xs text-slate-500">This cannot be undone</p>
                                </div>
                            </div>
                            <p className="text-sm text-slate-600 mb-5">
                                You are about to permanently delete <strong className="text-red-600">{selected.size} file{selected.size > 1 ? 's' : ''}</strong> from disk. These files have no database record and cannot be recovered.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowConfirm(false)}
                                    className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeleteSelected}
                                    className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-all"
                                >
                                    Yes, Delete
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default OrphanedFilesPanel;
