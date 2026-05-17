import { useState, useRef, useEffect } from 'react';
import { Download, Search, ChevronRight, Award, Filter, FileText, ChevronDown } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';
import PublicationsTable from '../components/data/PublicationsTable';
import LoginModal from '../components/auth/LoginModal';
import { useAuth } from '../context/AuthContext';
import { DEPARTMENTS } from '../config/constants';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

const Home = () => {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const tableRef = useRef();
  const exportMenuRef = useRef();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) {
        setIsExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const handleScrollToBooks = () => {
    const booksSection = document.getElementById('books');
    const header = document.querySelector('header');

    if (booksSection && header) {
      const headerHeight = header.offsetHeight;
      const elementPosition = booksSection.getBoundingClientRect().top + window.pageYOffset;
      const offsetPosition = elementPosition - headerHeight - 20;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  const handleRefresh = async () => {
    if (!tableRef.current || isRefreshing) return;

    setIsRefreshing(true);
    try {
      await tableRef.current.refresh();
    } catch (error) {
      console.error('Failed to refresh:', error);
      toast.error('Failed to refresh data');
    } finally {
      setTimeout(() => setIsRefreshing(false), 600);
    }
  };

  // Shared helper to build filter params
  const getExportParams = () => {
    const currentFilters = tableRef.current?.getFilters() || {};
    const hasActiveFilters = Object.values(currentFilters).some(v => v && String(v).trim().length > 0);
    const params = {};
    if (hasActiveFilters) params.filters = JSON.stringify(currentFilters);
    return { params, hasActiveFilters };
  };

  const handleExport = async () => {
    if (isExporting) return;
    setIsExporting(true);

    try {
      const { params, hasActiveFilters } = getExportParams();
      const response = await api.get("/form/downloadExcel", { params, responseType: "arraybuffer" });

      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", hasActiveFilters ? "books-filtered.xlsx" : "books.xlsx");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success(hasActiveFilters ? "Filtered data exported as Excel" : "All data exported as Excel");
    } catch (err) {
      console.error("Export failed", err);
      toast.error("Failed to export data");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPdf = async () => {
    if (isExportingPdf) return;
    setIsExportingPdf(true);

    try {
      const { params, hasActiveFilters } = getExportParams();
      params.limit = 10000;
      params.page = 1;

      const response = await api.get("/form/formGet", { params });
      
      const rawData = response.data?.data || response.data || [];
      const booksData = Array.isArray(rawData) ? rawData : (rawData.data || []);

      if (booksData.length === 0) {
        toast.error("No data available to export");
        return;
      }

      const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a3' });
      
      const subtitle = hasActiveFilters ? "Filtered Books and Books' Chapters Report" : "All Books and Books' Chapters Report";
      doc.setFontSize(14);
      doc.text("Dr. RVR NRI INSTITUTE OF TECHNOLOGY - Publications & Books and Books' Chapters", 20, 25);
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`${subtitle} • ${booksData.length} records • Generated: ${new Date().toLocaleDateString('en-IN')}`, 20, 40);

      const tableColumns = [
        "ID", "Email", "Faculty Name", "Department", "Designation",
        "ISBN/ISSN", "Book Title", "Co-Authors",
        "Type", "Publisher", "Year",
        "Document Link"
      ];
      
      const fmtDate = (val) => {
        if (!val) return '-';
        const d = new Date(val);
        return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
      };

      const baseUrl = window.location.origin;
      const fmtLink = (link) => {
        if (!link) return '-';
        if (link.startsWith('/uploads/')) return `${baseUrl}${link}`;
        return link;
      };

      const tableRows = booksData.map(p => [
        p.id || '-',
        p.email || '-',
        p.facultyName || '-',
        p.department || '-',
        p.designation || '-',
        p.isbn || '-',
        p.title || '-',
        p.coAuthors || '-',
        p.publicationType || '-',
        p.publisher || '-',
        p.yearOfPublication || '-',
        fmtLink(p.documentLink)
      ]);

      autoTable(doc, { 
        startY: 55,
        head: [tableColumns], 
        body: tableRows,
        theme: 'grid',
        headStyles: { fillColor: [27, 40, 69], fontSize: 6, halign: 'center' },
        styles: { fontSize: 5.5, cellPadding: 2, overflow: 'linebreak' },
        columnStyles: {
          0: { cellWidth: 25 },   // ID
          1: { cellWidth: 80 },   // Email
          2: { cellWidth: 70 },   // Faculty Name
          3: { cellWidth: 50 },   // Department
          4: { cellWidth: 60 },   // Designation
          5: { cellWidth: 60 },   // ISBN
          6: { cellWidth: 120 },  // Book Title
          7: { cellWidth: 80 },   // Co-Authors
          8: { cellWidth: 50 },   // Type
          9: { cellWidth: 80 },   // Publisher
          10: { cellWidth: 35 },  // Year
          11: { cellWidth: 100 }, // Document Link
        }
      });

      const filename = hasActiveFilters ? "books-filtered.pdf" : "books.pdf";
      doc.save(filename);
      toast.success(hasActiveFilters ? "Filtered data exported as PDF" : "All data exported as PDF");

    } catch (err) {
      console.error("PDF export failed", err);
      toast.error("Failed to generate PDF");
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFBFD] transition-colors duration-300">
      <Header />

      <main className="flex-grow">
        {/* HERO — Compact institutional banner */}
        <section className="relative bg-[#1B2845] text-white overflow-hidden">
          {/* Subtle pattern overlay */}
          <div className="absolute inset-0 opacity-[0.04]" style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: '32px 32px'
          }}></div>

          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-20 relative z-10">
            <div className="max-w-3xl mx-auto text-center">
              {/* Institution link */}
              <a
                href="https://nriit.edu.in"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/8 border border-white/12 text-[#C8A96E] text-sm font-medium hover:bg-white/12 transition-all mb-6"
              >
                <Award size={15} />
                <span>Dr. RVR NRI INSTITUTE OF TECHNOLOGY</span>
                <ChevronRight size={14} className="opacity-50" />
              </a>

              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 leading-tight tracking-tight text-white">
                Books and Books' Chapters
                <span className="block text-[#C8A96E] mt-1 text-2xl md:text-3xl lg:text-4xl font-semibold">Repository</span>
              </h1>

              <p className="text-slate-300 text-base md:text-lg max-w-xl mx-auto leading-relaxed mb-8">
                A digital archive of intellectual property and research contributions from our faculty and scholars.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={handleScrollToBooks}
                  className="group px-6 py-3 bg-[#C8A96E] hover:bg-[#B8994E] text-[#1B2845] rounded-lg font-semibold transition-all flex items-center gap-2"
                >
                  <Search size={18} />
                  Browse Repository
                  <ChevronRight size={16} className="opacity-60 group-hover:translate-x-0.5 transition-transform" />
                </button>

                {isAuthenticated && (
                  <button
                    onClick={() => navigate('/upload')}
                    className="px-6 py-3 bg-white/10 hover:bg-white/15 border border-white/15 text-white rounded-lg font-semibold transition-all flex items-center gap-2"
                  >
                    Submit Book/Chapter/Chapter
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* PATENTS TABLE SECTION */}
        <section id="books" className="py-10 md:py-14">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">

            {/* Table card */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
              {/* Toolbar */}
              <div className="border-b border-slate-100 px-5 md:px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Books & Book Chapters Database</h2>
                  <p className="text-sm text-slate-400 mt-0.5">Institutional repository records</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium transition-all active:scale-95 flex items-center gap-1.5"
                  >
                    <span className={isRefreshing ? 'animate-spin' : ''}>↻</span>
                    Refresh
                  </button>
                  <div className="relative" ref={exportMenuRef}>
                    <button
                      onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                      disabled={isExporting || isExportingPdf}
                      className={`px-4 py-2 flex items-center gap-2 rounded-lg text-sm font-semibold transition-all active:scale-95 disabled:opacity-60 text-white ${isExportMenuOpen
                        ? 'bg-[#243656]'
                        : 'bg-[#1B2845] hover:bg-[#243656]'
                        }`}
                      title="Export Options"
                    >
                      {(isExporting || isExportingPdf) ? (
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Download size={15} />
                      )}
                      <span className="hidden sm:inline">Export As</span>
                      <span className="sm:hidden">Export</span>
                      <ChevronDown size={14} className={`transition-transform duration-200 opacity-60 ${isExportMenuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Dropdown Menu */}
                    <div
                      className={`absolute right-0 mt-2 w-48 bg-white border border-slate-100 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] py-1.5 z-50 transition-all origin-top-right ${isExportMenuOpen
                        ? 'opacity-100 scale-100 pointer-events-auto transform-none'
                        : 'opacity-0 scale-95 pointer-events-none -translate-y-2'
                        }`}
                    >
                      <button
                        onClick={() => {
                          setIsExportMenuOpen(false);
                          handleExportPdf();
                        }}
                        disabled={isExporting || isExportingPdf}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-[#1B2845] transition-colors text-left group"
                      >
                        <div className="p-1.5 rounded-md bg-slate-100 text-slate-500 group-hover:bg-[#1B2845]/10 group-hover:text-[#1B2845] transition-colors">
                          <FileText size={14} />
                        </div>
                        PDF Document
                      </button>

                      <button
                        onClick={() => {
                          setIsExportMenuOpen(false);
                          handleExport();
                        }}
                        disabled={isExporting || isExportingPdf}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-emerald-600 transition-colors text-left group"
                      >
                        <div className="p-1.5 rounded-md bg-slate-100 text-slate-500 group-hover:bg-emerald-100 group-hover:text-emerald-600 transition-colors">
                          <Download size={14} />
                        </div>
                        Excel Spreadsheet
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <p className="px-5 md:px-6 pt-3 pb-1 text-xs text-slate-400 flex items-center gap-1">
                <Filter size={12} />
                Use column filters below to narrow results, then export to download filtered data.
              </p>

              {/* Table */}
              <div className="p-0">
                <PublicationsTable ref={tableRef} />
              </div>
            </div>

          </div>
        </section>
      </main>

      <Footer />
      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
    </div>
  );
};

export default Home;