import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import {
  Search,
  Loader2,
  Trash2,
  AlertCircle,
  Edit,
  FileText,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Inbox
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import api, { getBaseUrl } from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import EditPublicationModal from "../forms/EditPublicationModal";
import LoadingSkeleton from "../common/LoadingSkeleton";

const openPdfBlob = async (fileUrl) => {
  try {
    let filePath = fileUrl;
    try { filePath = new URL(fileUrl).pathname; } catch { }

    const response = await api.get('/form/pdf-preview', { params: { file: filePath } });
    const { data: base64 } = response.data;

    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const blobUrl = URL.createObjectURL(blob);

    const win = window.open(blobUrl, '_blank');
    setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
    if (!win) toast.error('Popup blocked — please allow popups for this site.');
  } catch (err) {
    console.error('PDF open error:', err);
    toast.error('Failed to open PDF. Please try again.');
  }
};

const PublicationsTable = forwardRef(({ showActions = false, externalFilters = {} }, ref) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(externalFilters);
  const { user, isAuthenticated, isAnyAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    setFilters(externalFilters);
    setCurrentPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(externalFilters)]);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const [deleteId, setDeleteId] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  useImperativeHandle(ref, () => ({
    refresh: fetchData,
    getFilters: () => filters,
    getTotalRecords: () => totalRecords,
  }));

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchData();
    }, 400); 
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isAnyAdmin, currentPage, itemsPerPage, filters, sortConfig]);

  const fetchData = async () => {
    try {
      setLoading(true);

      const response = await api.get("/form/formGet", {
        params: {
          page: currentPage,
          limit: itemsPerPage,
          filters: JSON.stringify(filters),
          sortKey: sortConfig.key || '',
          sortDirection: sortConfig.direction || 'asc'
        }
      });

      if (response.data.data) {
        setData(response.data.data);
        setTotalRecords(response.data.pagination.total);
        setTotalPages(response.data.pagination.totalPages);
      } else {
        setData(response.data);
        setTotalRecords(response.data.length);
        setTotalPages(Math.ceil(response.data.length / itemsPerPage));
      }
    } catch (err) {
      setError("Failed to load books.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (row) => {
    if (!isAuthenticated) {
      navigate("/");
      return;
    }
    setDeleteId(row.id);
  };

  const handleEditClick = (row) => {
    if (!isAuthenticated) {
      navigate("/");
      return;
    }
    setEditItem(row);
    setIsEditOpen(true);
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/form/deleteEntry/${deleteId}`);
      setData((prev) => prev.filter((item) => item.id !== deleteId));
      setDeleteId(null);
      toast.success("Book entry deleted successfully");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete book");
    }
  };

  const handleEditSuccess = () => {
    fetchData(); 
    setIsEditOpen(false);
    setEditItem(null);
  };

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    setCurrentPage(1); 
  };

  const columns = [
    { key: "facultyName", label: "Faculty Name", minWidth: "180px" },
    { key: "email", label: "Email", minWidth: "150px" },
    { key: "department", label: "Department", minWidth: "120px" },
    { key: "designation", label: "Designation", minWidth: "150px" },
    { key: "isbn", label: "ISBN/ISSN", minWidth: "140px" },
    { key: "title", label: "Book Title", minWidth: "250px" },
    { key: "coAuthors", label: "Co-Authors", minWidth: "150px" },
    { key: "publicationType", label: "Publication Type", minWidth: "140px" },
    { key: "publisher", label: "Publisher", minWidth: "150px" },
    { key: "yearOfPublication", label: "Year", minWidth: "100px" },
    { key: "documentLink", label: "Document", isLink: true, minWidth: "120px" },
  ];

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
    setCurrentPage(1); 
  };

  const currentItems = data;
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  if (loading) {
    return <LoadingSkeleton rows={itemsPerPage} />;
  }

  if (error) {
    return <div className="text-center py-20 text-red-500">{error}</div>;
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-xl shadow-slate-400/20 border border-slate-300/50 overflow-hidden flex flex-col h-full"
      >
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-sm text-left">
            <thead className="bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 text-slate-900 font-bold uppercase tracking-wider text-xs border-b-2 border-slate-300 sticky top-0 z-10 shadow-md">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className="px-4 py-3.5 align-top bg-slate-100/80 text-slate-600 font-semibold text-xs uppercase tracking-wider cursor-pointer border-b border-slate-200 hover:bg-slate-200/80 hover:text-indigo-600 transition-colors duration-200 group select-none first:rounded-tl-xl"
                    style={{ minWidth: col.minWidth }}
                    onClick={() => requestSort(col.key)}
                  >
                    <div className="flex items-center gap-1 mb-2">
                      {col.label}
                      <span className="text-gray-400">
                        {sortConfig.key === col.key ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-primary" /> : <ArrowDown size={14} className="text-primary" />
                        ) : (
                          <ArrowUpDown size={14} className="opacity-0 group-hover:opacity-50 transition-opacity" />
                        )}
                      </span>
                    </div>
                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                      <Search
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
                        size={12}
                      />
                      <input
                        type="text"
                        placeholder={`Search...`}
                        className="w-full pl-8 pr-2 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium shadow-sm placeholder:text-slate-400 hover:border-slate-300"
                        value={filters[col.key] || ""}
                        onChange={(e) =>
                          handleFilterChange(col.key, e.target.value)
                        }
                      />
                    </div>
                  </th>
                ))}
                {(showActions || isAuthenticated) && (
                  <th className="px-4 py-3.5 w-24 align-top bg-slate-100/90 sticky right-0 z-20 shadow-[-5px_0_10px_-5px_rgb(0,0,0,0.1)] backdrop-blur-sm border-b border-slate-200 rounded-tr-xl">
                    <div className="mb-2 text-center text-slate-600 font-semibold text-xs uppercase tracking-wider">Actions</div>
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentItems.length > 0 ? (
                currentItems.map((row, index) => {
                  const isOwnEntry = isAuthenticated && user?.userEmail === row.email;

                  return (
                    <motion.tr
                      key={row.id}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-50px" }}
                      transition={{
                        duration: 0.3,
                        delay: index * 0.05,
                        ease: "easeOut"
                      }}
                      className={`hover:bg-gradient-to-r hover:from-indigo-50/60 hover:via-slate-50/30 hover:to-transparent transition-all duration-300 group cursor-pointer ${isOwnEntry ? "bg-indigo-50/50 border-l-[4px] border-l-indigo-500 shadow-sm" : "border-l-[4px] border-l-transparent hover:border-l-slate-300"
                        }`}
                    >
                      {columns.map((col) => (
                        <td
                          key={`${row.id}-${col.key}`}
                          className="px-4 py-4 text-slate-700 border-b border-slate-50 last:border-0 align-middle"
                        >
                          {col.isLink ? (
                            row[col.key] ? (
                              <button
                                onClick={() => openPdfBlob(row[col.key].startsWith('http') ? row[col.key] : `${getBaseUrl()}${row[col.key]}`)}
                                className="text-primary-600 hover:text-primary-700 font-medium inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 rounded-full hover:bg-primary-100 transition-colors text-xs border border-primary-100"
                              >
                                <FileText size={14} className="stroke-[2.5]" /> View
                              </button>
                            ) : (
                              <span className="text-slate-300 ml-2">-</span>
                            )
                          ) : (
                            <div
                              className="whitespace-normal break-words"
                              style={{ minWidth: col.minWidth, maxWidth: "300px" }}
                            >
                              {col.key === 'email' && isOwnEntry ? (
                                <span className="font-semibold text-primary-700 flex items-center gap-1">
                                  {row[col.key]}
                                  <span className="text-[10px] bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded shadow-sm border border-primary-200 font-bold">YOU</span>
                                </span>
                              ) : col.key === 'publicationType' ? (
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${row[col.key] === 'Book'
                                  ? 'bg-indigo-100 text-indigo-700 border-indigo-200'
                                  : 'bg-purple-100 text-purple-700 border-purple-200'
                                  }`}>
                                  {row[col.key] === 'Book' && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mr-1.5"></span>}
                                  {row[col.key] === 'Book Chapter' && <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mr-1.5"></span>}
                                  {row[col.key] || 'Book'}
                                </span>
                              ) : col.key === 'department' ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                  {row[col.key]}
                                </span>
                              ) : col.key === 'facultyName' ? (
                                <div className="flex items-center gap-2">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm ${['bg-blue-500', 'bg-indigo-500', 'bg-purple-500', 'bg-pink-500', 'bg-teal-500', 'bg-orange-500'][row.facultyName?.length % 6] || 'bg-slate-500'
                                    }`}>
                                    {row.facultyName?.charAt(0) || '?'}
                                  </div>
                                  <span className="font-semibold text-slate-800">{row.facultyName}</span>
                                </div>
                              ) : (
                                row[col.key] || <span className="text-slate-300">-</span>
                              )}
                            </div>
                          )}
                        </td>
                      ))}
                      {(showActions || isAuthenticated) && (
                        <td className="px-4 py-3 text-center sticky right-0 bg-white group-hover:bg-slate-50 shadow-[-5px_0_10px_-5px_rgb(0,0,0,0.05)] border-l border-transparent z-10">
                          <div className="flex items-center justify-center gap-1">
                            {isAuthenticated &&
                              (isAnyAdmin() || user?.userEmail === row.email) ? (
                              <>
                                <button
                                  onClick={() => handleEditClick(row)}
                                  className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50/80 rounded-lg transition-all hover:scale-105 active:scale-95"
                                  title="Edit Entry"
                                  aria-label={`Edit book ${row.title || row.isbn}`}
                                >
                                  <Edit size={16} />
                                </button>
                                <button
                                  onClick={() => handleDeleteClick(row)}
                                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50/80 rounded-lg transition-all hover:scale-105 active:scale-95"
                                  title="Delete Entry"
                                  aria-label={`Delete book ${row.title || row.isbn}`}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </>
                            ) : (
                              <span className="text-slate-200 text-xs px-2">
                                Read-only
                              </span>
                            )}
                          </div>
                        </td>
                      )}
                    </motion.tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={columns.length + (showActions || isAuthenticated ? 1 : 0)}
                    className="p-12 text-center"
                  >
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                        <Inbox size={32} className="text-slate-300" />
                      </div>
                      <h3 className="text-lg font-semibold text-slate-600 mb-1">No books found</h3>
                      <p className="text-sm text-slate-500 max-w-xs mx-auto">
                        {Object.keys(filters).length > 0
                          ? "Try adjusting your search filters to find what you're looking for."
                          : "Be the first faculty member to submit a book entry!"}
                      </p>
                      {Object.keys(filters).length > 0 && (
                        <button
                          onClick={() => setFilters({})}
                          className="mt-4 text-sm text-primary font-medium hover:underline"
                        >
                          Clear all filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="p-3 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0">
          <div className="flex items-center gap-4 text-xs text-slate-600 font-medium">
            <div className="flex items-center gap-2">
              <span className="text-slate-500">Rows per page:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer shadow-sm hover:border-slate-400 transition-colors"
              >
                {[10, 25, 50, 100].map(size => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </div>
            <span className="text-slate-500">
              Showing {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, totalRecords)} of {totalRecords} records
            </span>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => paginate(currentPage - 1)}
                disabled={currentPage === 1}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <div className="flex gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => paginate(pageNum)}
                      className={`w-8 h-8 flex items-center justify-center text-xs font-medium rounded-lg border transition-all shadow-sm ${currentPage === pageNum
                        ? "bg-primary text-white border-primary shadow-primary/25 ring-2 ring-primary/20"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                        }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => paginate(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </motion.div >

      < AnimatePresence >
        {deleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/20 backdrop-blur-sm"
              onClick={() => setDeleteId(null)}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white rounded-xl shadow-xl w-full max-w-sm p-6 border border-slate-100"
            >
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center text-red-500">
                  <AlertCircle size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Delete Book?
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    This action cannot be undone.
                  </p>
                </div>
                <div className="flex w-full gap-3 mt-2">
                  <button
                    onClick={() => setDeleteId(null)}
                    className="flex-1 btn bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="flex-1 btn bg-red-600 text-white hover:bg-red-700 shadow-md shadow-red-500/20"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )
        }
      </AnimatePresence >

      < EditPublicationModal
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setEditItem(null);
        }}
        publication={editItem}
        onSuccess={handleEditSuccess}
      />
    </>
  );
});

PublicationsTable.displayName = 'PublicationsTable';

export default PublicationsTable;
