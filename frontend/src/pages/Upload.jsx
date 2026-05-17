import { useState, useRef, useEffect } from "react";
import { Download, Upload as UploadIcon, FileSpreadsheet, ChevronLeft, Database, Info, FileText } from "lucide-react";
import toast from 'react-hot-toast';
import Header from "../components/common/Header";
import Footer from "../components/common/Footer";
import UploadForm from "../components/forms/UploadForm";
import BulkImport from "../components/forms/BulkImport";
import PublicationsTable from "../components/data/PublicationsTable";
import SidePanel from "../components/common/SidePanel";
import api from "../api/axios";

const Upload = () => {

  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);

  // Side Panel State
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [searchFilters, setSearchFilters] = useState({});

  const tableRef = useRef();

  // Unsaved changes warning
  const hasUnsavedChanges = useRef(false);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const handleSuccess = () => {
    hasUnsavedChanges.current = false;
    setRefreshTrigger((prev) => prev + 1);
  };

  const onFormChange = (formattedData) => {
    // Track unsaved changes
    const hasContent = Object.values(formattedData).some(v => v && String(v).trim().length > 0);
    hasUnsavedChanges.current = hasContent;

    const filters = {};
    let hasSearchable = false;

    if (formattedData.title && formattedData.title.length > 0) {
      filters.title = formattedData.title;
      hasSearchable = true;
    }
    if (formattedData.isbn && formattedData.isbn.length > 0) {
      filters.isbn = formattedData.isbn;
      hasSearchable = true;
    }

    if (formattedData.facultyName && formattedData.facultyName.length > 0) {
      filters.facultyName = formattedData.facultyName;
      hasSearchable = true;
    }

    if (formattedData.email && formattedData.email.length > 0) {
      filters.email = formattedData.email;
      hasSearchable = true;
    }

    if (formattedData.designation && formattedData.designation.length > 0) {
      filters.designation = formattedData.designation;
      if (formattedData.designation !== "Select Designation") {
        hasSearchable = true;
      }
    }

    if (formattedData.department && formattedData.department.length > 0) {
      filters.department = formattedData.department;
      if (formattedData.department !== "Select Department") {
        hasSearchable = true;
      }
    }

    if (hasSearchable) {
      setSearchFilters(filters);
      setIsPanelOpen(true);
    } else if (Object.keys(filters).length > 0 && isPanelOpen) {
      setSearchFilters(filters);
    }
  };

  const handleClearPanel = () => {
    setSearchFilters({});
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await api.get("/form/downloadTemplate", {
        responseType: "arraybuffer",
      });

      const excelMimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      const blob = new Blob([response.data], { type: excelMimeType });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "books_template.xlsx");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed", err);
      toast.error("Failed to download template");
    }
  };

  const [isExporting, setIsExporting] = useState(false);


  const handleExportData = async () => {
    if (isExporting) return;
    setIsExporting(true);

    try {
      // Get current filters from the table
      const currentFilters = tableRef.current?.getFilters() || {};
      const hasActiveFilters = Object.values(currentFilters).some(v => v && String(v).trim().length > 0);

      // Build query params
      const params = {};
      if (hasActiveFilters) {
        params.filters = JSON.stringify(currentFilters);
      }

      const response = await api.get("/form/downloadExcel", {
        params,
        responseType: "arraybuffer", // Important for binary data
      });

      const excelMimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      const blob = new Blob([response.data], { type: excelMimeType });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const filename = hasActiveFilters ? "books-filtered.xlsx" : "books.xlsx";
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      if (hasActiveFilters) {
        toast.success("Filtered database exported successfully");
      } else {
        toast.success("Database exported successfully");
      }
    } catch (err) {
      console.error("Export failed", err);
      toast.error("Failed to export database");
    } finally {
      setIsExporting(false);
    }
  };


  return (
    <div className="min-h-screen flex flex-col bg-[#FAFBFD]">
      <Header />

      <main className="flex-grow container mx-auto px-4 pt-28 pb-8 lg:pb-12 max-w-[1600px]">

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">
              Submit Book/Chapter Entry
            </h1>
            <p className="text-slate-400 mt-1">
              Enter details for a new book or book chapter record.
            </p>
          </div>

          <button
            onClick={() => window.location.href = '/'}
            className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-all"
          >
            <ChevronLeft size={16} />
            Back to Home
          </button>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* Main Form */}
          <div className="lg:col-span-8 space-y-6">
            <UploadForm onSuccess={handleSuccess} onFormChange={onFormChange} />
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-5 sticky top-24 h-fit">

            {/* Bulk Operations */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="p-1.5 bg-slate-100 text-slate-600 rounded-lg">
                  <Database size={18} />
                </div>
                <h3 className="font-bold text-slate-800 text-sm">Bulk Operations</h3>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => setIsBulkImportOpen(true)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100 hover:border-slate-200 hover:bg-slate-100/50 transition-all text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-white text-[#1B2845] flex items-center justify-center shrink-0 shadow-sm">
                    <UploadIcon size={15} />
                  </div>
                  <div>
                    <span className="block font-semibold text-slate-700 text-sm">Bulk Import</span>
                    <span className="text-xs text-slate-400">Upload via Excel file</span>
                  </div>
                </button>

                <button
                  onClick={handleDownloadTemplate}
                  className="w-full flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100 hover:border-slate-200 hover:bg-slate-100/50 transition-all text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-white text-[#1B2845] flex items-center justify-center shrink-0 shadow-sm">
                    <FileSpreadsheet size={15} />
                  </div>
                  <div>
                    <span className="block font-semibold text-slate-700 text-sm">Download Template</span>
                    <span className="text-xs text-slate-400">Get standard Excel format</span>
                  </div>
                </button>

                <div className="my-1.5 border-t border-slate-100" />

                <button
                  onClick={handleExportData}
                  className="w-full flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100 hover:border-slate-200 hover:bg-slate-100/50 transition-all text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-white text-[#1B2845] flex items-center justify-center shrink-0 shadow-sm">
                    <Download size={15} />
                  </div>
                  <div>
                    <span className="block font-semibold text-slate-700 text-sm">Export Database</span>
                    <span className="text-xs text-slate-400">Download all records</span>
                  </div>
                </button>

                <div className="my-1.5 border-t border-slate-100" />

                <button
                  onClick={() => setIsPanelOpen(!isPanelOpen)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${isPanelOpen
                      ? "bg-indigo-50 border-indigo-200"
                      : "bg-slate-50 border-slate-100 hover:border-slate-200 hover:bg-slate-100/50"
                    }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm ${isPanelOpen ? "bg-indigo-100 text-indigo-700" : "bg-white text-[#1B2845]"
                    }`}>
                    {isPanelOpen ? <ChevronLeft size={16} className="rotate-180" /> : <Database size={15} />}
                  </div>
                  <div>
                    <span className={`block font-semibold text-sm ${isPanelOpen ? "text-indigo-700" : "text-slate-700"}`}>
                      {isPanelOpen ? "Hide Duplicates" : "Check Duplicates"}
                    </span>
                    <span className={`text-xs ${isPanelOpen ? "text-indigo-500" : "text-slate-400"}`}>
                      {isPanelOpen ? "Close side panel" : "View similar entries"}
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* Info Card */}
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
              <div className="flex items-start gap-2.5">
                <Info size={16} className="text-slate-400 mt-0.5 shrink-0" />
                <p className="text-sm text-slate-500 leading-relaxed">
                  Complete all required fields marked with (*). The side panel activates automatically to check for duplicates as you type.
                </p>
              </div>
            </div>

          </div>
        </div>

      </main>

      <Footer />

      <BulkImport
        isOpen={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
        onSuccess={handleSuccess}
      />

      <SidePanel
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        title="Duplicate Check"
        onClear={handleClearPanel}
      >
        <div className="mb-4 text-sm text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-200 flex gap-2.5 items-center">
          <div className="w-1.5 h-1.5 bg-[#1B2845] rounded-full animate-pulse" />
          <span>Checking for similar entries...</span>
        </div>
        <PublicationsTable
          ref={tableRef}
          key={refreshTrigger}
          showActions={false}
          externalFilters={searchFilters}
        />
      </SidePanel>
    </div>
  );
};

export default Upload;