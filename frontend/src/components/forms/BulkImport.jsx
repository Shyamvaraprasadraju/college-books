import { useState, useRef, useEffect } from 'react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, X, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { isValidEmailDomain, getEmailDomainError, DEPARTMENTS } from '../../config/constants';
import api from '../../api/axios';

const BulkImport = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ total: 0, success: 0, failed: 0 });
  const [errors, setErrors] = useState([]);
  const [resultData, setResultData] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleWindowDragEnter = (e) => {
      if (e.dataTransfer?.types?.includes('Files')) {
        e.preventDefault();
        setIsDragging(true);
      }
    };

    const handleWindowDragOver = (e) => {
      if (e.dataTransfer?.types?.includes('Files')) {
        e.preventDefault();
      }
    };

    const handleWindowDragLeave = (e) => {
      if (e.clientX === 0 && e.clientY === 0) {
        setIsDragging(false);
      }
    };

    const handleWindowDrop = (e) => {
      e.preventDefault();
      setIsDragging(false);
    };

    window.addEventListener('dragenter', handleWindowDragEnter);
    window.addEventListener('dragover', handleWindowDragOver);
    window.addEventListener('dragleave', handleWindowDragLeave);
    window.addEventListener('drop', handleWindowDrop);

    return () => {
      window.removeEventListener('dragenter', handleWindowDragEnter);
      window.removeEventListener('dragover', handleWindowDragOver);
      window.removeEventListener('dragleave', handleWindowDragLeave);
      window.removeEventListener('drop', handleWindowDrop);
    };
  }, [isOpen]);

  const generateResultExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Import Results');

    const headers = [
      'Row #', 'Status', 'Error Message', 'Email', 'Faculty Name', 'Department', 'Designation',
      'ISBN / ISSN', 'Book Title', 'Co-Authors', 'Publication Type', 'Publisher', 'Year of Publication', 'Document Link'
    ];

    const headerRow = worksheet.addRow(headers);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    resultData.forEach((result) => {
      const row = worksheet.addRow([
        result.rowNumber,
        result.status === 'success' ? '✅ SUCCESS' : '❌ FAILED',
        result.error || '',
        result.data['Email'] || result.data['email'] || '',
        result.data['Faculty Name'] || result.data['facultyName'] || '',
        result.data['Department'] || result.data['department'] || '',
        result.data['Designation'] || result.data['designation'] || '',
        result.data['ISBN / ISSN'] || result.data['isbn'] || '',
        result.data['Book Title'] || result.data['title'] || '',
        result.data['Co-Authors'] || result.data['coAuthors'] || '',
        result.data['Publication Type'] || result.data['publicationType'] || '',
        result.data['Publisher'] || result.data['publisher'] || '',
        result.data['Year of Publication'] || result.data['yearOfPublication'] || '',
        result.data['Document Link'] || result.data['documentLink'] || ''
      ]);

      if (result.status === 'success') {
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC6EFCE' } };
      } else {
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC7CE' } };
      }
    });

    worksheet.columns.forEach(column => { column.width = 15; });
    worksheet.getColumn(2).width = 12; 
    worksheet.getColumn(3).width = 30; 

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `import-results-${new Date().getTime()}.xlsx`);
  };

  const handleFileUpload = async (fileOrEvent) => {
    let file;
    if (fileOrEvent instanceof File) {
      file = fileOrEvent;
    } else {
      file = fileOrEvent.target?.files?.[0];
    }

    if (!file) return;

    setLoading(true);
    setStats({ total: 0, success: 0, failed: 0 });
    setErrors([]);
    setResultData([]);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const buffer = evt.target.result;
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer);
        
        const worksheet = workbook.worksheets[0];
        if (!worksheet || worksheet.rowCount <= 1) {
          throw new Error('Sheet is empty');
        }

        const data = [];
        const headers = worksheet.getRow(1).values; 

        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return;
          const rowData = {};
          row.eachCell((cell, colNumber) => {
            let cellValue = cell.value;
            if (cellValue && typeof cellValue === 'object' && cellValue.richText) {
                cellValue = cellValue.richText.map(rt => rt.text).join('');
            }
            const header = headers[colNumber];
            if (header) {
              rowData[header] = cellValue;
            }
          });
          data.push(rowData);
        });

        setStats(prev => ({ ...prev, total: data.length }));

        let successCount = 0;
        let failCount = 0;
        const newErrors = [];
        const results = [];

        for (let i = 0; i < data.length; i++) {
          const normalizedRow = {};
          Object.keys(data[i]).forEach(key => {
            const cleanKey = key.split('(')[0].trim();
            normalizedRow[cleanKey] = data[i][key];
          });

          const row = normalizedRow;
          const rowNumber = i + 2;

          try {
            const rawEmail = row['Email'] || row['email'] || '';
            const email = String(rawEmail).trim();
            const publicationType = row['Publication Type'] || row['publicationType'] || 'Book';

            const payload = {
              email: email,
              facultyName: row['Faculty Name'] || row['facultyName'] || '',
              department: row['Department'] || row['department'] || '',
              designation: row['Designation'] || row['designation'] || '',
              isbn: row['ISBN / ISSN'] || row['isbn'] || '',
              title: row['Book Title'] || row['title'] || '',
              coAuthors: row['Co-Authors'] || row['coAuthors'] || '',
              publicationType: publicationType,
              publisher: row['Publisher'] || row['publisher'] || '',
              yearOfPublication: row['Year of Publication'] || row['yearOfPublication'] || '',
              documentLink: row['Document Link'] || row['documentLink'] || '',
            };

            if (!payload.email || payload.email.trim() === '') throw new Error('Email is required');
            if (!payload.isbn || payload.isbn.trim() === '') throw new Error('ISBN / ISSN is required');
            if (!payload.title || payload.title.trim() === '') throw new Error('Book Title is required');
            if (!payload.yearOfPublication || String(payload.yearOfPublication).trim() === '') throw new Error('Year of Publication is required');
            
            if (!/^\d{4}$/.test(String(payload.yearOfPublication).trim())) {
               throw new Error(`Invalid Year of Publication: '${payload.yearOfPublication}'. Must be a 4 digit year.`);
            }

            if (!payload.email.includes('@') || payload.email.split('@').length !== 2) {
              throw new Error('Invalid email format');
            }

            if (payload.facultyName && !/^[a-zA-Z0-9\s.]*$/.test(String(payload.facultyName))) {
              throw new Error(`Invalid Faculty Name: '${payload.facultyName}'. Must contain letters, numbers, spaces, and dots only.`);
            }

            if (payload.department) {
              const upperDept = payload.department.trim().toUpperCase();
              if (!DEPARTMENTS.includes(upperDept)) {
                throw new Error(`Invalid department: '${payload.department}'. Must be one of: ${DEPARTMENTS.join(', ')}`);
              }
              payload.department = upperDept;
            }

            await api.post('/form/bulkImport', [payload]);
            successCount++;

            results.push({ rowNumber, status: 'success', data: row, error: null });

          } catch (err) {
            failCount++;
            const errorMsg = err.response?.data?.message || err.message || 'Upload failed';
            newErrors.push(`Row ${rowNumber}: ${errorMsg}`);

            results.push({ rowNumber, status: 'failed', data: row, error: errorMsg });
          }

          setStats({ total: data.length, success: successCount, failed: failCount });
        }

        setResultData(results);

        if (newErrors.length > 0) {
          setErrors(newErrors); 
        }

        if (successCount > 0 && onSuccess) {
          onSuccess();
        }

      } catch (err) {
        console.error('File parsing error', err);
        setErrors(['Failed to parse Excel file. Ensure standard format.']);
      } finally {
        setLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handleModalDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      handleFileUpload(file);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onDrop={handleModalDrop}>
          <AnimatePresence>
            {isDragging && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0 }}
                className="absolute inset-0 z-50 bg-slate-900/90 flex flex-col items-center justify-center"
                style={{ willChange: 'opacity' }}
              >
                <div className="flex flex-col items-center gap-6">
                  <div className="p-6 bg-white/10 rounded-3xl border-4 border-dashed border-white/40">
                    <FileSpreadsheet size={80} className="text-white" strokeWidth={1.5} />
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-semibold text-white mb-2">
                      Drop files here to upload
                    </p>
                    <p className="text-sm text-white/70">
                      Excel files only (.xlsx, .xls)
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />

          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative w-full max-w-lg bg-white border border-white/20 shadow-premium rounded-2xl overflow-hidden z-10"
          >
            <div className="bg-gradient-to-r from-indigo-50 to-white px-6 py-4 border-b border-indigo-100 flex justify-between items-center">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <div className="p-2 bg-green-50 rounded-lg text-green-600">
                  <FileSpreadsheet size={20} />
                </div>
                Bulk Import Books/Chapters
              </h3>
              <button
                onClick={onClose}
                className="p-1 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6 relative">
              <div className="text-center space-y-4">
                <p className="text-sm text-slate-500">
                  Upload an Excel file (.xlsx) containing multiple book records. Ensure column names match the standard format.
                </p>

                <input
                  type="file"
                  accept=".xlsx, .xls"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                  id="bulk-import-modal-input"
                  disabled={loading}
                />
                <label
                  htmlFor="bulk-import-modal-input"
                  className={`inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border-2 border-dashed bg-indigo-50/50 text-indigo-600 font-medium hover:bg-indigo-50 w-full cursor-pointer transition-all ${loading ? 'opacity-50 cursor-not-allowed' : 'border-indigo-200 hover:border-indigo-300'}`}
                >
                  {!loading && <Upload size={20} />}
                  {loading ? 'Processing...' : 'Click to Upload or Drag & Drop Excel File'}
                </label>
              </div>

              {(stats.success > 0 || stats.failed > 0) && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-sm">
                  <div className="flex justify-between items-center mb-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    <span>Import Status</span>
                    <span>Total: {stats.total}</span>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1 flex items-center gap-2 bg-white p-2 rounded-lg border border-green-100 text-green-700 shadow-sm">
                      <CheckCircle size={16} />
                      <div className="flex flex-col leading-none">
                        <span className="font-bold">{stats.success}</span>
                        <span className="text-[10px] opacity-70">Success</span>
                      </div>
                    </div>
                    <div className="flex-1 flex items-center gap-2 bg-white p-2 rounded-lg border border-red-100 text-red-700 shadow-sm">
                      <AlertCircle size={16} />
                      <div className="flex flex-col leading-none">
                        <span className="font-bold">{stats.failed}</span>
                        <span className="text-[10px] opacity-70">Failed</span>
                      </div>
                    </div>
                  </div>

                  {errors.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-200">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-red-500">
                          {errors.length} row{errors.length > 1 ? 's' : ''} failed:
                        </p>
                        <span className="text-[10px] text-slate-400">{errors.length} error{errors.length > 1 ? 's' : ''}</span>
                      </div>
                      <ul className="text-xs text-red-500 space-y-1 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                        {errors.map((e, i) => {
                          const colonIdx = e.indexOf(':');
                          const rowPart = colonIdx > -1 ? e.slice(0, colonIdx) : `Row ${i + 1}`;
                          const reason = colonIdx > -1 ? e.slice(colonIdx + 1).trim() : e;
                          return (
                            <li key={i} className="flex items-start gap-1.5 bg-red-50 border border-red-100 rounded-lg px-2 py-1.5">
                              <span className="shrink-0 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">{rowPart}</span>
                              <span className="text-red-600">{reason}</span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}

                  {resultData.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-slate-200">
                      <button
                        onClick={generateResultExcel}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all"
                      >
                        <Download size={18} />
                        Download Result Report
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default BulkImport;
