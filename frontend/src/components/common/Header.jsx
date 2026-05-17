import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn, LogOut, Upload, Menu, X, Building2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import LoginModal from '../auth/LoginModal';
import { AnimatePresence, motion } from 'framer-motion';

const Header = () => {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const { logout, isAuthenticated, isAnyAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-b border-slate-200 shadow-sm z-50 transition-colors duration-300">
        <div className="w-full py-3">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">

            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-11 h-11 md:w-12 md:h-12 bg-white rounded-lg shadow-sm border border-slate-100 flex items-center justify-center p-1 transition-transform group-hover:scale-105 duration-200">
                <img src="/NRI-logo.png" alt="NRI Logo" className="w-full h-full object-contain" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-sm md:text-base leading-tight text-[#1B2845] tracking-tight">
                  Dr. RVR NRI INSTITUTE OF TECHNOLOGY
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  Books and Books' Chapters
                </span>
              </div>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-3">
              {isAuthenticated ? (
                <>
                  {isAnyAdmin() && (
                    <Link to="/admin-dashboard" className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-600 hover:text-[#1B2845] hover:bg-slate-50 rounded-lg transition-colors">
                      <Building2 size={16} />
                      <span>Admin</span>
                    </Link>
                  )}

                  <Link to="/upload" className="flex items-center gap-2 px-4 py-2 bg-[#1B2845] hover:bg-[#243656] text-white text-sm font-semibold rounded-lg transition-all">
                    <Upload size={15} />
                    <span>Submit Book/Chapter</span>
                  </Link>

                  <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors ml-1" title="Logout" aria-label="Logout">
                    <LogOut size={17} />
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsLoginOpen(true)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#1B2845] hover:bg-[#243656] text-white text-sm font-semibold rounded-lg transition-all"
                >
                  <LogIn size={16} />
                  <span>Login</span>
                </button>
              )}
            </nav>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center gap-2">
              <button
                className="p-2 text-slate-500 hover:bg-slate-50 rounded-lg transition-colors"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
              >
                {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Nav */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full left-0 w-full bg-white border-b border-slate-200 shadow-lg md:hidden"
            >
              <div className="p-4 space-y-2">
                {isAuthenticated ? (
                  <>
                    {isAnyAdmin() && (
                      <Link to="/admin-dashboard" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 p-3 text-slate-700 hover:bg-slate-50 rounded-lg font-medium">
                        <Building2 size={18} />
                        Admin
                      </Link>
                    )}

                    <Link to="/upload" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 p-3 bg-[#1B2845] text-white rounded-lg font-medium">
                      <Upload size={18} />
                      Submit Book/Chapter
                    </Link>

                    <button onClick={handleLogout} className="flex items-center gap-3 w-full p-3 text-red-500 hover:bg-red-50 rounded-lg font-medium">
                      <LogOut size={18} />
                      Logout
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      setIsLoginOpen(true);
                      setIsMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-3 w-full p-3 bg-[#1B2845] text-white rounded-lg font-semibold"
                  >
                    <LogIn size={18} />
                    Login
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
    </>
  );
};

export default Header;

