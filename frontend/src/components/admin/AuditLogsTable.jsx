import { Activity, RefreshCw, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import NumericPagination from '../common/NumericPagination';

const AuditLogsTable = ({ logs, fetchLogs, logPage, totalPages, isRefreshing }) => {
    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-2xl shadow-sm border border-slate-200/80 flex flex-col overflow-hidden"
        >
            <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-slate-100 text-slate-600 rounded-xl">
                        <Activity size={22} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Audit Trail</h2>
                        <p className="text-xs text-slate-400">System activity log</p>
                    </div>
                </div>
                <button
                    onClick={() => fetchLogs(1, true)}
                    disabled={isRefreshing}
                    className={`p-2.5 bg-[#1B2845] text-white rounded-xl shadow-sm hover:bg-[#243656] transition-all ${isRefreshing ? 'opacity-80' : ''}`}
                    aria-label="Refresh audit logs"
                >
                    <RefreshCw size={18} className={isRefreshing ? "animate-spin" : ""} />
                </button>
            </div>

            <div className="flex-1 overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-slate-100">
                            <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-50/50 w-24">Action</th>
                            <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-50/50 w-56">User</th>
                            <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-50/50">Details</th>
                            <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-50/50 w-40 text-right">Time</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {logs.length === 0 ? (
                            <tr>
                                <td colSpan="4" className="px-6 py-16 text-center">
                                    <div className="flex flex-col items-center justify-center gap-3 opacity-50">
                                        <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center">
                                            <Search size={28} className="text-slate-400" />
                                        </div>
                                        <p className="text-slate-500 font-medium text-sm">No activity recorded yet</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            logs.map((log, index) => (
                                <motion.tr
                                    key={log.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.03 }}
                                    className="hover:bg-slate-50/80 transition-colors"
                                >
                                    <td className="px-6 py-4 align-top">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase border ${log.action === 'DELETE' || log.action === 'DELETE_ALL' ? 'bg-red-50 text-red-600 border-red-100' :
                                            log.action === 'CREATE' || log.action.includes('CREATE') ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                log.action === 'UPDATE' || log.action === 'BATCH_UPDATE' || log.action.includes('UPDATE') || log.action.includes('PASSWORD') ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                    'bg-slate-50 text-slate-600 border-slate-100'
                                            }`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${log.action === 'DELETE' || log.action === 'DELETE_ALL' ? 'bg-red-500' :
                                                log.action === 'CREATE' || log.action.includes('CREATE') ? 'bg-emerald-500' :
                                                    log.action === 'UPDATE' || log.action === 'BATCH_UPDATE' || log.action.includes('UPDATE') || log.action.includes('PASSWORD') ? 'bg-amber-500' :
                                                        'bg-slate-500'
                                                }`}></span>
                                            {log.action}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 align-top">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
                                                {log.user_email?.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="text-sm font-medium text-slate-700">{log.user_email}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600 leading-relaxed">
                                        {log.details}
                                    </td>
                                    <td className="px-6 py-4 text-xs text-slate-400 font-mono text-right whitespace-nowrap">
                                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        <br />
                                        <span className="opacity-75">{new Date(log.timestamp).toLocaleDateString()}</span>
                                    </td>
                                </motion.tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                <NumericPagination
                    currentPage={logPage}
                    totalPages={totalPages}
                    onPageChange={(page) => fetchLogs(page)}
                    disabled={isRefreshing}
                />
            </div>
        </motion.div>
    );
};

export default AuditLogsTable;
