import { useState } from 'react';
import { X, LogIn, Lock, Mail, ChevronRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import { motion, AnimatePresence } from 'framer-motion';

const LoginModal = ({ isOpen, onClose }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/login', {
        email: email.trim(),
        password
      });

      const { user } = response.data;
      login(user);

      setEmail('');
      setPassword('');
      onClose();
    } catch (err) {
      console.error('Login error:', err);
      const status = err.response?.status;
      const message = err.response?.data?.message || 'Login failed.';

      if (status) {
        setError(`[Error ${status}] ${message}`);
      } else {
        setError('Network Error: Cannot reach server. Please check your connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
          />

          {/* Modal */}
            <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            className="relative w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-100"
          >
            {/* Header */}
            <div className="px-8 pt-8 pb-5 text-center relative">
              <button
                onClick={onClose}
                className="absolute right-4 top-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all"
              >
                <X size={18} />
              </button>

              <div className="w-12 h-12 bg-[#1B2845] rounded-xl flex items-center justify-center mx-auto mb-4">
                <Lock size={20} className="text-[#C8A96E]" />
              </div>

              <h2 className="text-xl font-bold text-slate-800">Admin Login</h2>
              <p className="text-slate-400 text-sm mt-1">Institutional access portal</p>
            </div>

            {/* Form */}
            <div className="px-8 pb-8">
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm"
                  >
                    {error}
                  </motion.div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-[#1B2845] focus:ring-2 focus:ring-[#1B2845]/10 outline-none transition-all text-sm"
                      placeholder="admin@nriit.edu.in"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-[#1B2845] focus:ring-2 focus:ring-[#1B2845]/10 outline-none transition-all text-sm"
                      placeholder="••••••••••••"
                      required
                    />
                  </div>
                </div>

                <div className="pt-1">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-[#1B2845] hover:bg-[#243656] text-white rounded-lg font-semibold transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Sign In</span>
                        <ChevronRight size={16} className="opacity-70" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
export default LoginModal;
