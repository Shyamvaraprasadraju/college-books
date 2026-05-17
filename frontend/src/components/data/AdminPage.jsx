import { useState, useEffect } from "react";
import {
    Trash2, Shield, AlertCircle,
    ChevronLeft, ChevronRight, RefreshCw, Activity,
    Users, Lock, Search, Key, UserPlus,
    Building2, Eye, EyeOff, FileText
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import api from "../../api/axios";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Header from "../common/Header";
import Footer from "../common/Footer";
import NumericPagination from "../common/NumericPagination";
import { DEPARTMENTS } from "../../config/constants";
import SystemActions from "../admin/SystemActions";
import AuditLogsTable from "../admin/AuditLogsTable";

const AdminPage = () => {
    const { user, isSuperAdmin, isAnyAdmin, isAuthenticated, loading: authLoading } = useAuth();
    const navigate = useNavigate();

    const [admins, setAdmins] = useState([]);
    const [adminPage, setAdminPage] = useState(1);
    const [adminTotalPages, setAdminTotalPages] = useState(1);
    const [logs, setLogs] = useState([]);
    const [logPage, setLogPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Stats
    const [stats, setStats] = useState({ totalBooks: 0, totalAdmins: 0, totalLogs: 0, totalDepartments: 0, department: null });

    // Admin Creation States
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [adminType, setAdminType] = useState('sub_admin');
    const [newAdminEmail, setNewAdminEmail] = useState("");
    const [newAdminPassword, setNewAdminPassword] = useState("");
    const [newAdminDepartment, setNewAdminDepartment] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    // Password Reset States
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [selectedAdmin, setSelectedAdmin] = useState(null);
    const [newPassword, setNewPassword] = useState("");
    const [isResetting, setIsResetting] = useState(false);

    // Department Change States
    const [showDepartmentModal, setShowDepartmentModal] = useState(false);
    const [newDepartment, setNewDepartment] = useState("");
    const [isChangingDept, setIsChangingDept] = useState(false);

    // Change My Password States
    const [showMyPasswordModal, setShowMyPasswordModal] = useState(false);
    const [currentPassword, setCurrentPassword] = useState("");
    const [myNewPassword, setMyNewPassword] = useState("");
    const [isChangingMyPwd, setIsChangingMyPwd] = useState(false);
    const [showCurrentPwd, setShowCurrentPwd] = useState(false);
    const [showNewPwd, setShowNewPwd] = useState(false);
    const [isBackingUp, setIsBackingUp] = useState(false);

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            navigate("/");
        }
    }, [isAuthenticated, authLoading, navigate]);

    useEffect(() => {
        if (!authLoading && isAnyAdmin()) {
            fetchStats();
            if (isSuperAdmin()) {
                fetchAdmins();
            }
            fetchLogs();
        }
    }, [authLoading, isAnyAdmin, isSuperAdmin]);

    if (authLoading) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1B2845]"></div>
        </div>
    );

    if (!isAnyAdmin()) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200 text-center max-w-md w-full"
                >
                    <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Shield size={40} className="text-red-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 mb-2 font-heading">Access Restricted</h1>
                    <p className="text-slate-500 mb-8 leading-relaxed">
                        This area is reserved for system administrators. Please contact the IT department if you believe this is an error.
                    </p>
                    <button onClick={() => navigate("/")} className="w-full py-3 bg-[#1B2845] text-white rounded-xl font-medium hover:bg-[#243656] transition-colors">
                        Return to Home
                    </button>
                </motion.div>
            </div>
        );
    }

    const fetchStats = async () => {
        try {
            const response = await api.get("/admin/stats");
            setStats(response.data);
        } catch (err) {
            console.error("Failed to fetch stats", err);
        }
    };

    const fetchLogs = async (page = 1, withAnimation = false) => {
        try {
            if (withAnimation) setIsRefreshing(true);
            const response = await api.get(`/admin/logs?page=${page}&limit=10`);
            setLogs(response.data.logs);
            setTotalPages(response.data.totalPages);
            setLogPage(page);
        } catch (err) {
            console.error("Failed to fetch logs", err);
        } finally {
            if (withAnimation) setTimeout(() => setIsRefreshing(false), 800);
        }
    };

    const fetchAdmins = async (page = 1) => {
        try {
            setLoading(true);
            const response = await api.get(`/admin/admins?page=${page}&limit=10`);
            if (response.data && response.data.pagination) {
                setAdmins(response.data.data);
                setAdminTotalPages(response.data.pagination.totalPages);
                setAdminPage(page);
            } else {
                setAdmins(response.data);
                setAdminTotalPages(1);
                setAdminPage(1);
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed to fetch admins");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateAdmin = async (e) => {
        e.preventDefault();

        if (!newAdminEmail || !newAdminPassword) {
            toast.error("Email and password are required");
            return;
        }

        if (adminType === 'sub_admin' && !newAdminDepartment) {
            toast.error("Department is required for Sub Admin");
            return;
        }

        try {
            setIsCreating(true);
            const endpoint = adminType === 'super_admin' ? '/admin/super-admin' : '/admin/sub-admin';
            const payload = {
                email: newAdminEmail,
                password: newAdminPassword,
                ...(adminType === 'sub_admin' && { department: newAdminDepartment })
            };

            await api.post(endpoint, payload);

            toast.success(`${adminType === 'super_admin' ? 'Super Admin' : 'Sub Admin'} created successfully`);
            setShowCreateModal(false);
            setNewAdminEmail("");
            setNewAdminPassword("");
            setNewAdminDepartment("");
            setAdminType('sub_admin');
            fetchAdmins();
            fetchStats();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to create admin");
        } finally {
            setIsCreating(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();

        if (!newPassword) {
            toast.error("New password is required");
            return;
        }

        try {
            setIsResetting(true);
            await api.put(`/admin/${selectedAdmin.id}/password`, { newPassword });
            toast.success(`Password reset successfully for ${selectedAdmin.email}`);
            setShowPasswordModal(false);
            setSelectedAdmin(null);
            setNewPassword("");
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to reset password");
        } finally {
            setIsResetting(false);
        }
    };

    const handleChangeDepartment = async (e) => {
        e.preventDefault();

        if (!newDepartment) {
            toast.error("Department is required");
            return;
        }

        try {
            setIsChangingDept(true);
            await api.put(`/admin/${selectedAdmin.id}/department`, { department: newDepartment });
            toast.success(`Department changed to ${newDepartment} for ${selectedAdmin.email}`);
            setShowDepartmentModal(false);
            setSelectedAdmin(null);
            setNewDepartment("");
            fetchAdmins();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to change department");
        } finally {
            setIsChangingDept(false);
        }
    };

    const handleChangeMyPassword = async (e) => {
        e.preventDefault();

        if (!currentPassword || !myNewPassword) {
            toast.error("Both current and new passwords are required");
            return;
        }
        if (myNewPassword.length < 6) {
            toast.error("New password must be at least 6 characters");
            return;
        }

        try {
            setIsChangingMyPwd(true);
            await api.put("/admin/my-password", { currentPassword, newPassword: myNewPassword });
            toast.success("Password changed successfully");
            setShowMyPasswordModal(false);
            setCurrentPassword("");
            setMyNewPassword("");
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to change password");
        } finally {
            setIsChangingMyPwd(false);
        }
    };

    const handleDeleteAdmin = async (admin) => {
        if (!window.confirm(`Are you sure you want to delete ${admin.email}?\n\nThis action cannot be undone.`)) return;

        try {
            await api.delete(`/admin/${admin.id}`);
            toast.success(`Admin ${admin.email} deleted successfully`);
            fetchAdmins();
            fetchStats();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to delete admin");
        }
    };

    const handleManualBackup = async () => {
        try {
            setIsBackingUp(true);
            toast.loading("Creating backup... This may take a moment.", { id: 'backupToast' });
            const response = await api.post("/admin/backup");
            toast.success(`Backup created: ${response.data.file}`, { id: 'backupToast' });
            fetchLogs(1, true);
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || "Failed to create backup", { id: 'backupToast' });
        } finally {
            setIsBackingUp(false);
        }
    };

    // Stat cards data based on role
    const statCards = isSuperAdmin() ? [
        { title: "Books & Chapters", value: stats.totalBooks, icon: FileText, bg: "bg-blue-50", text: "text-blue-600" },
        { title: "Administrators", value: stats.totalAdmins, icon: Users, bg: "bg-slate-100", text: "text-slate-600" },
        { title: "Departments", value: stats.totalDepartments, icon: Building2, bg: "bg-amber-50", text: "text-amber-600" },
        { title: "Audit Events", value: stats.totalLogs, icon: Activity, bg: "bg-emerald-50", text: "text-emerald-600" },
    ] : [
        { title: `${stats.department || 'Dept'} Books`, value: stats.totalBooks, icon: FileText, bg: "bg-blue-50", text: "text-blue-600" },
        { title: "Your Department", value: stats.department || '—', icon: Building2, bg: "bg-amber-50", text: "text-amber-600" },
        { title: "Audit Events", value: stats.totalLogs, icon: Activity, bg: "bg-emerald-50", text: "text-emerald-600" },
    ];

    return (
        <div className="min-h-screen bg-[#F8FAFC] transition-colors duration-300">
            <Header />
            <div className="h-32"></div>

            <main className="max-w-[1600px] mx-auto p-6 lg:p-10 space-y-8">

                {/* Dashboard Header */}
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 font-heading tracking-tight sm:text-4xl">
                            Admin Dashboard
                        </h1>
                        <p className="text-slate-500 mt-2 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            {isSuperAdmin() ? 'Super Admin' : `Sub Admin • ${stats.department || ''}`} • {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowMyPasswordModal(true)}
                            className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2"
                        >
                            <Key size={16} /> Change Password
                        </button>
                        <button
                            onClick={() => navigate('/')}
                            className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2"
                        >
                            <ChevronLeft size={18} /> Exit
                        </button>
                    </div>
                </header>

                {/* Stats Grid — real data */}
                <div className={`grid grid-cols-1 md:grid-cols-2 ${isSuperAdmin() ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-5`}>
                    {statCards.map((card, i) => (
                        <motion.div
                            key={card.title}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: i * 0.08 }}
                            className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all"
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">{card.title}</p>
                                    <h3 className="text-2xl font-bold text-slate-800">{card.value}</h3>
                                </div>
                                <div className={`p-3 rounded-xl ${card.bg}`}>
                                    <card.icon size={20} className={card.text} />
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

                    {/* Left Column: Admin Management */}
                    <div className="space-y-6 xl:col-span-1">

                        {/* Create Admin Card - Super Admin Only */}
                        {isSuperAdmin() && (
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.4 }}
                                className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden"
                            >
                                <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                                    <h2 className="text-base font-bold text-slate-700 flex items-center gap-2">
                                        <UserPlus size={18} className="text-slate-500" />
                                        Admin Management
                                    </h2>
                                </div>
                                <div className="p-5 space-y-3">
                                    <button
                                        onClick={() => { setAdminType('super_admin'); setShowCreateModal(true); }}
                                        className="w-full py-2.5 bg-[#1B2845] text-white rounded-xl font-semibold shadow-sm hover:bg-[#243656] transition-all flex items-center justify-center gap-2 text-sm"
                                    >
                                        <Shield size={16} />
                                        Create Super Admin
                                    </button>
                                    <button
                                        onClick={() => { setAdminType('sub_admin'); setShowCreateModal(true); }}
                                        className="w-full py-2.5 bg-[#C8A96E] text-[#1B2845] rounded-xl font-semibold shadow-sm hover:bg-[#B8994E] transition-all flex items-center justify-center gap-2 text-sm"
                                    >
                                        <Building2 size={16} />
                                        Create Sub Admin
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* Current Admins List */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.5 }}
                            className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden"
                        >
                            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <h2 className="text-base font-bold text-slate-700">Administrators</h2>
                                <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded text-xs font-bold">{admins.length}</span>
                            </div>
                            <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto custom-scrollbar">
                                {loading ? (
                                    [1, 2, 3].map(i => <div key={i} className="p-4 animate-pulse bg-slate-50 h-20 w-full"></div>)
                                ) : (
                                    admins.map(admin => (
                                        <div key={admin.id} className="p-4 hover:bg-slate-50 transition-colors group">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-start gap-3 flex-1 min-w-0">
                                                    <div className={`w-10 h-10 rounded-full ${admin.role === 'super_admin' ? 'bg-[#1B2845] text-white' : 'bg-[#C8A96E]/20 text-[#1B2845]'} flex items-center justify-center font-bold text-sm shadow-sm`}>
                                                        {admin.email.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="flex flex-col min-w-0 flex-1">
                                                        <span className="text-sm font-semibold text-slate-700 truncate">{admin.email}</span>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded border ${admin.role === 'super_admin' ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                                                {admin.role === 'super_admin' ? 'Super Admin' : 'Sub Admin'}
                                                            </span>
                                                            {admin.department && (
                                                                <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                                                                    {admin.department}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Action Buttons - Super Admin Only */}
                                                {isSuperAdmin() && admin.email !== user?.userEmail && (
                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => { setSelectedAdmin(admin); setShowPasswordModal(true); }}
                                                            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all"
                                                            title="Reset Password"
                                                            aria-label={`Reset password for ${admin.email}`}
                                                        >
                                                            <Key size={16} />
                                                        </button>
                                                        {admin.role === 'sub_admin' && (
                                                            <button
                                                                onClick={() => { setSelectedAdmin(admin); setNewDepartment(admin.department || ''); setShowDepartmentModal(true); }}
                                                                className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                                                                title="Change Department"
                                                                aria-label={`Change department for ${admin.email}`}
                                                            >
                                                                <Building2 size={16} />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleDeleteAdmin(admin)}
                                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                            title="Delete Admin"
                                                            aria-label={`Delete admin ${admin.email}`}
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                )}

                                                {admin.email === user?.userEmail && (
                                                    <span className="text-[10px] font-bold bg-emerald-50 text-emerald-600 px-2 py-1 rounded-md border border-emerald-200">YOU</span>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                            
                            {/* Admin List Pagination */}
                            <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                                <NumericPagination
                                    currentPage={adminPage}
                                    totalPages={adminTotalPages}
                                    onPageChange={(page) => fetchAdmins(page)}
                                    disabled={loading}
                                />
                            </div>
                        </motion.div>

                        <SystemActions 
                            isSuperAdmin={isSuperAdmin()} 
                            handleManualBackup={handleManualBackup} 
                            isBackingUp={isBackingUp} 
                            api={api} 
                            toast={toast} 
                            fetchLogs={fetchLogs} 
                            fetchStats={fetchStats} 
                        />
                    </div>

                    {/* Right Column: Activity Logs */}
                    <div className="xl:col-span-2 flex flex-col">
                        <AuditLogsTable 
                            logs={logs} 
                            fetchLogs={fetchLogs} 
                            logPage={logPage} 
                            totalPages={totalPages} 
                            isRefreshing={isRefreshing} 
                        />
                    </div>
                </div>
            </main>

            {/* Create Admin Modal */}
            <AnimatePresence>
                {showCreateModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setShowCreateModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.96, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.96, opacity: 0 }}
                            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-7"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h2 className="text-xl font-bold text-slate-900 mb-5 flex items-center gap-2">
                                {adminType === 'super_admin' ? <Shield size={20} className="text-slate-600" /> : <Building2 size={20} className="text-amber-600" />}
                                Create {adminType === 'super_admin' ? 'Super Admin' : 'Sub Admin'}
                            </h2>

                            <form onSubmit={handleCreateAdmin} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-600 mb-1.5">Email Address</label>
                                    <input
                                        type="email"
                                        value={newAdminEmail}
                                        onChange={(e) => setNewAdminEmail(e.target.value)}
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-400 transition-all text-sm"
                                        placeholder="admin@nriit.edu.in"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-600 mb-1.5">Password</label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={newAdminPassword}
                                            onChange={(e) => setNewAdminPassword(e.target.value)}
                                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-400 pr-12 transition-all text-sm"
                                            placeholder="Strong password"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>

                                {adminType === 'sub_admin' && (
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-600 mb-1.5">Department</label>
                                        <select
                                            value={newAdminDepartment}
                                            onChange={(e) => setNewAdminDepartment(e.target.value)}
                                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-400 transition-all text-sm"
                                            required
                                        >
                                            <option value="">Select Department</option>
                                            {DEPARTMENTS.map(dept => (
                                                <option key={dept} value={dept}>{dept}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <div className="flex gap-3 pt-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateModal(false)}
                                        className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50 transition-colors text-sm"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isCreating}
                                        className="flex-1 py-2.5 bg-[#1B2845] hover:bg-[#243656] text-white rounded-xl font-semibold transition-all disabled:opacity-50 text-sm"
                                    >
                                        {isCreating ? "Creating..." : "Create Admin"}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Reset Password Modal */}
            <AnimatePresence>
                {showPasswordModal && selectedAdmin && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setShowPasswordModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.96, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.96, opacity: 0 }}
                            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-7"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h2 className="text-xl font-bold text-slate-900 mb-1 flex items-center gap-2">
                                <Key size={20} className="text-slate-600" />
                                Reset Password
                            </h2>
                            <p className="text-slate-500 text-sm mb-5">For <span className="font-semibold text-slate-700">{selectedAdmin.email}</span></p>

                            <form onSubmit={handleResetPassword} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-600 mb-1.5">New Password</label>
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-400 transition-all text-sm"
                                        placeholder="Enter new password"
                                        required
                                    />
                                </div>

                                <div className="flex gap-3 pt-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowPasswordModal(false)}
                                        className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50 transition-colors text-sm"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isResetting}
                                        className="flex-1 py-2.5 bg-[#1B2845] hover:bg-[#243656] text-white rounded-xl font-semibold transition-all disabled:opacity-50 text-sm"
                                    >
                                        {isResetting ? "Resetting..." : "Reset Password"}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Change Department Modal */}
            <AnimatePresence>
                {showDepartmentModal && selectedAdmin && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setShowDepartmentModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.96, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.96, opacity: 0 }}
                            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-7"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h2 className="text-xl font-bold text-slate-900 mb-1 flex items-center gap-2">
                                <Building2 size={20} className="text-amber-600" />
                                Change Department
                            </h2>
                            <p className="text-slate-500 text-sm mb-5">For <span className="font-semibold text-slate-700">{selectedAdmin.email}</span></p>

                            <form onSubmit={handleChangeDepartment} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-600 mb-1.5">New Department</label>
                                    <select
                                        value={newDepartment}
                                        onChange={(e) => setNewDepartment(e.target.value)}
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-400 transition-all text-sm"
                                        required
                                    >
                                        <option value="">Select Department</option>
                                        {DEPARTMENTS.map(dept => (
                                            <option key={dept} value={dept}>{dept}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex gap-3 pt-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowDepartmentModal(false)}
                                        className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50 transition-colors text-sm"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isChangingDept}
                                        className="flex-1 py-2.5 bg-[#1B2845] hover:bg-[#243656] text-white rounded-xl font-semibold transition-all disabled:opacity-50 text-sm"
                                    >
                                        {isChangingDept ? "Updating..." : "Change Department"}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Change My Password Modal */}
            <AnimatePresence>
                {showMyPasswordModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setShowMyPasswordModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.96, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.96, opacity: 0 }}
                            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-7"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h2 className="text-xl font-bold text-slate-900 mb-1 flex items-center gap-2">
                                <Lock size={20} className="text-slate-600" />
                                Change Your Password
                            </h2>
                            <p className="text-slate-500 text-sm mb-5">Enter your current password and a new one</p>

                            <form onSubmit={handleChangeMyPassword} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-600 mb-1.5">Current Password</label>
                                    <div className="relative">
                                        <input
                                            type={showCurrentPwd ? "text" : "password"}
                                            value={currentPassword}
                                            onChange={(e) => setCurrentPassword(e.target.value)}
                                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-400 pr-12 transition-all text-sm"
                                            placeholder="Enter current password"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowCurrentPwd(!showCurrentPwd)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                        >
                                            {showCurrentPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-600 mb-1.5">New Password</label>
                                    <div className="relative">
                                        <input
                                            type={showNewPwd ? "text" : "password"}
                                            value={myNewPassword}
                                            onChange={(e) => setMyNewPassword(e.target.value)}
                                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-400 pr-12 transition-all text-sm"
                                            placeholder="Enter new password (min 6 chars)"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowNewPwd(!showNewPwd)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                        >
                                            {showNewPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowMyPasswordModal(false)}
                                        className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50 transition-colors text-sm"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isChangingMyPwd}
                                        className="flex-1 py-2.5 bg-[#1B2845] hover:bg-[#243656] text-white rounded-xl font-semibold transition-all disabled:opacity-50 text-sm"
                                    >
                                        {isChangingMyPwd ? "Changing..." : "Update Password"}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <Footer />
        </div>
    );
};

export default AdminPage;
