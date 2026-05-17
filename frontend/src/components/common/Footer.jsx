import { useState } from 'react';
import { Code, ArrowUp } from 'lucide-react';
import DeveloperModal from './DeveloperModal';

const Footer = () => {
  const [isDevOpen, setIsDevOpen] = useState(false);
  const currentYear = new Date().getFullYear();

  return (
    <>
      <footer className="bg-[#1B2845] text-white mt-auto border-t border-[#243656] transition-colors duration-300">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">

            {/* Logo + Copyright */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center p-0.5 overflow-hidden">
                <img src="/NRI-logo.png" alt="NRI Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <span className="text-sm font-semibold text-white">Dr. RVR NRI INSTITUTE OF TECHNOLOGY</span>
                <span className="text-xs text-slate-400 ml-2">&copy; {currentYear}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsDevOpen(true)}
                className="px-3.5 py-2 bg-white/8 hover:bg-white/12 border border-white/10 text-slate-300 hover:text-white rounded-lg text-sm font-medium transition-all flex items-center gap-2"
              >
                <Code size={14} />
                <span>Developer</span>
              </button>
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/8 hover:bg-white/12 text-slate-400 hover:text-white transition-all"
              >
                <ArrowUp size={16} />
              </button>
            </div>

          </div>
        </div>
      </footer>

      <DeveloperModal isOpen={isDevOpen} onClose={() => setIsDevOpen(false)} />
    </>
  );
};

export default Footer;
