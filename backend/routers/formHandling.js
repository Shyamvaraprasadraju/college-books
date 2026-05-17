import { Router } from "express";

import { verifyToken } from "../middleware/verifyToken.js";
import { requireAnyAdmin, isSuperAdmin } from "../middleware/authorization.js";
import { db } from "../db.js";
import ExcelJS from "exceljs";
import path from "path";
import { fileURLToPath } from "url";
import multer from 'multer';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import { logAction } from "../utils/logger.js";
import Joi from 'joi';

const router = Router();

// ── Joi validation schemas ──
const ALLOWED_DEPARTMENTS = ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'AIML', 'CSD', 'CSM', 'FED', 'MBA', 'PHARMACY'];

const bookSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required'
  }),
  facultyName: Joi.string().min(1).max(255).required().messages({
    'any.required': 'Faculty name is required'
  }),
  department: Joi.string().valid(...ALLOWED_DEPARTMENTS).required().messages({
    'any.only': `Department must be one of: ${ALLOWED_DEPARTMENTS.join(', ')}`,
    'any.required': 'Department is required'
  }),
  designation: Joi.string().min(1).max(255).required().messages({
    'any.required': 'Designation is required'
  }),
  coAuthors: Joi.string().allow('', null).optional(),
  isbn: Joi.string().min(1).max(255).required().messages({
    'any.required': 'ISBN/ISSN is required'
  }),
  title: Joi.string().min(1).max(1000).required().messages({
    'any.required': 'Title is required'
  }),
  publicationType: Joi.string().valid('Book', 'Book Chapter').default('Book'),
  publisher: Joi.string().allow('', null).optional(),
  yearOfPublication: Joi.string().pattern(/^\d{4}$/).required().messages({
    'string.pattern.base': 'Year must be a 4-digit number',
    'any.required': 'Year of Publication is required'
  })
}).options({ stripUnknown: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for local disk uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let subfolder = 'book_documents';
    const uploadPath = path.join(__dirname, '../uploads', subfolder);
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const rawIsbn = req.body.isbn || 'Unknown-ISBN';
    const rawEmail = req.body.email || 'Unknown-Email';

    // Sanitize to prevent directory traversal or filesystem issues
    const safeIsbn = rawIsbn.replace(/[^a-zA-Z0-9-]/g, '');
    const cleanEmail = rawEmail.split('@')[0].replace(/[^a-zA-Z0-9.\-]/g, '');

    const finalName = `${safeIsbn}_${cleanEmail}.pdf`;
    cb(null, finalName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB for combined PDF
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files are allowed'));
  }
});

// Single file upload
const uploadFields = upload.fields([
  { name: 'documentFile', maxCount: 1 }
]);

router.post("/formEntry", verifyToken, requireAnyAdmin, uploadFields, async (req, res) => {
  const { error: validationError, value: validatedData } = bookSchema.validate(req.body, { abortEarly: false });
  if (validationError) {
    try {
      if (req.files?.documentFile?.[0]?.path) fs.unlinkSync(req.files.documentFile[0].path);
    } catch (cleanupErr) { /* ignore cleanup errors */ }

    const messages = validationError.details.map(d => d.message).join('; ');
    return res.status(400).json({ message: messages });
  }

  const {
    email,
    facultyName,
    designation,
    department,
    coAuthors,
    isbn,
    title,
    publicationType,
    publisher,
    yearOfPublication
  } = validatedData;

  const docFile = req.files?.documentFile?.[0];

  if (!docFile) {
    return res.status(400).json({ message: "Book PDF document is required." });
  }

  const finalDocumentLink = docFile ? `/uploads/book_documents/${docFile.filename}` : null;
  const finalPublicationType = publicationType || 'Book';

  if (req.user.role === 'sub_admin') {
    if (department !== req.user.department) {
      return res.status(403).json({
        message: `You can only add books for your department (${req.user.department})`
      });
    }
  }

  try {
    const [existingRows] = await db.query(
      "SELECT 1 FROM books WHERE isbn = ? AND email = ?",
      [isbn, email]
    );
    if (existingRows.length > 0) {
      return res.status(409).json({ message: "Duplicate entry: You have already submitted this book." });
    }

    await db.query(
      `INSERT INTO books 
  (email, facultyName, designation, department, coAuthors, isbn, title, publicationType, publisher, yearOfPublication, documentLink)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        email,
        facultyName,
        designation,
        department,
        coAuthors || null,
        isbn,
        title,
        finalPublicationType,
        publisher || null,
        yearOfPublication,
        finalDocumentLink
      ]
    );

    await logAction(req.user.userEmail, "CREATE", `Created book: ${title}`);

    return res.status(200).json({ message: "Book submitted successfully" });
  } catch (e) {
    console.error('❌ Error in /formEntry:', e);
    try {
      if (docFile && docFile.path) {
        fs.unlinkSync(docFile.path);
      }
    } catch (cleanupErr) { }

    if (e instanceof multer.MulterError || e?.message === 'Only PDF files are allowed') {
      return res.status(400).json({ message: e.message || 'File upload error' });
    }
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/bulkImport", verifyToken, requireAnyAdmin, async (req, res) => {
  const entries = req.body;

  if (!Array.isArray(entries) || entries.length === 0) {
    return res.status(400).json({ message: "Array of book entries required" });
  }

  const results = {
    successful: [],
    failed: [],
    total: entries.length
  };

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const rowNumber = i + 2; 

    const {
      email,
      facultyName,
      designation,
      department,
      coAuthors,
      isbn,
      title,
      publicationType,
      publisher,
      yearOfPublication,
      documentLink
    } = entry;

    try {
      if (!email || !facultyName || !department || !isbn || !title || !yearOfPublication) {
        throw new Error("Missing required fields: email, facultyName, department, isbn, title, yearOfPublication");
      }

      const finalPublicationType = publicationType || 'Book';
      if (finalPublicationType !== 'Book' && finalPublicationType !== 'Book Chapter') {
        throw new Error(`Invalid publication type: ${finalPublicationType}. Must be 'Book' or 'Book Chapter'`);
      }

      if (req.user.role === 'sub_admin' && department !== req.user.department) {
        throw new Error(`You can only add books for your department (${req.user.department})`);
      }

      const [existingRows] = await db.query(
        "SELECT 1 FROM books WHERE isbn = ? AND email = ?",
        [isbn, email]
      );
      if (existingRows.length > 0) {
        throw new Error("Duplicate entry: This book already exists for this email");
      }

      await db.query(
        `INSERT INTO books 
        (email, facultyName, designation, department, coAuthors, isbn, title, publicationType, publisher, yearOfPublication, documentLink)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          email,
          facultyName,
          designation || null,
          department,
          coAuthors || null,
          isbn,
          title,
          finalPublicationType,
          publisher || null,
          yearOfPublication,
          documentLink || null
        ]
      );

      results.successful.push({ rowNumber, isbn, title });

    } catch (err) {
      results.failed.push({
        rowNumber,
        isbn: isbn || 'N/A',
        title: title || 'N/A',
        error: err.message
      });
    }
  }

  await logAction(
    req.user.userEmail,
    "BULK_IMPORT",
    `Bulk import: ${results.successful.length} successful, ${results.failed.length} failed`
  );

  return res.status(200).json({
    message: "Bulk import completed",
    ...results
  });
});

router.put("/formEntryBatchUpdate", verifyToken, requireAnyAdmin, async (req, res) => {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ message: "Only super admins can perform batch updates." });
  }

  const updates = req.body; 

  if (!Array.isArray(updates)) {
    return res.status(400).json({ message: "Array expected" });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const query = `
      UPDATE books
      SET 
        email = COALESCE(?, email),
        facultyName = COALESCE(?, facultyName),
        designation = COALESCE(?, designation),
        department = COALESCE(?, department),
        coAuthors = COALESCE(?, coAuthors),
        isbn = COALESCE(?, isbn),
        title = COALESCE(?, title),
        publicationType = COALESCE(?, publicationType),
        publisher = COALESCE(?, publisher),
        yearOfPublication = COALESCE(?, yearOfPublication),
        documentLink = COALESCE(?, documentLink)
      WHERE id = ?
    `;

    const rejectedEntries = [];
    const successfulUpdates = [];

    for (const row of updates) {
      const [existingEntry] = await connection.query(
        "SELECT id FROM books WHERE id = ?",
        [row.id]
      );

      if (!existingEntry || existingEntry.length === 0) {
        rejectedEntries.push({
          id: row.id,
          reason: "Entry not found"
        });
        continue;
      }

      await connection.query(query, [
        row.email ?? null,
        row.facultyName ?? null,
        row.designation ?? null,
        row.department ?? null,
        row.coAuthors ?? null,
        row.isbn ?? null,
        row.title ?? null,
        row.publicationType ?? null,
        row.publisher ?? null,
        row.yearOfPublication ?? null,
        row.documentLink ?? null,
        row.id
      ]);

      successfulUpdates.push(row.id);
    }

    await connection.commit();

    await logAction(
      req.user.userEmail,
      "BATCH_UPDATE",
      `Batch update: ${successfulUpdates.length} successful, ${rejectedEntries.length} rejected`
    );

    return res.status(200).json({
      message: "Batch update completed",
      successful: successfulUpdates.length,
      rejected: rejectedEntries.length,
      rejectedEntries: rejectedEntries.length > 0 ? rejectedEntries : undefined
    });

  } catch (err) {
    await connection.rollback();
    console.error("Batch update error:", err);
    return res.status(500).json({ message: "Batch update failed" });
  } finally {
    connection.release();
  }
});

router.put("/formEntryUpdate", verifyToken, requireAnyAdmin, uploadFields, async (req, res) => {
  const {
    id,
    email,
    facultyName,
    designation,
    department,
    coAuthors,
    isbn,
    title,
    publicationType,
    publisher,
    yearOfPublication
  } = req.body;

  const userEmail = req.user.userEmail;

  try {
    const [rows] = await db.query("SELECT email, documentLink, department FROM books WHERE id = ?", [id]);
    const entry = rows[0];

    if (!entry) {
      return res.status(404).json({ message: "Book not found" });
    }

    if (req.user.role === 'sub_admin') {
      if (entry.department !== req.user.department) {
        return res.status(403).json({
          message: `You can only edit books from your department (${req.user.department})`
        });
      }
    }

    const finalPublicationType = publicationType || 'Book';

    const docFile = req.files?.documentFile?.[0];
    let finalDocumentLink = entry.documentLink;
    if (docFile) {
      finalDocumentLink = `/uploads/book_documents/${docFile.filename}`;
      try {
        if (entry.documentLink?.startsWith('/uploads/')) {
          const oldPath = path.join(__dirname, '..', entry.documentLink.replace(/^\/+/, ''));
          await fs.promises.unlink(oldPath).catch(() => { });
        }
      } catch (err) {
        console.error('Failed to remove old doc:', err);
      }
    }

    await db.query(
      `UPDATE books 
      SET 
        email = COALESCE(?, email),
        facultyName = COALESCE(?, facultyName),
        designation = COALESCE(?, designation),
        department = COALESCE(?, department),
        coAuthors = COALESCE(?, coAuthors),
        isbn = COALESCE(?, isbn),
        title = COALESCE(?, title),
        publicationType = COALESCE(?, publicationType),
        publisher = COALESCE(?, publisher),
        yearOfPublication = COALESCE(?, yearOfPublication),
        documentLink = COALESCE(?, documentLink)
      WHERE id = ?
    `,
      [
        email ?? null,
        facultyName ?? null,
        designation ?? null,
        department ?? null,
        coAuthors ?? null,
        isbn ?? null,
        title ?? null,
        finalPublicationType ?? null,
        publisher ?? null,
        yearOfPublication ?? null,
        finalDocumentLink ?? null,
        id
      ]
    );

    await logAction(userEmail, "UPDATE", `Updated book ID: ${id} - ${title}`);
    return res.status(200).json({ message: "Book updated successfully" });

  } catch (e) {
    console.error("Update error:", e);
    if (e instanceof multer.MulterError || e?.message === 'Only PDF files are allowed') {
      return res.status(400).json({ message: e.message || 'File upload error' });
    }
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.delete("/deleteEntry/:id", verifyToken, requireAnyAdmin, async (req, res) => {
  const { id } = req.params;
  const userEmail = req.user.userEmail;
  try {
    const [rows] = await db.query("SELECT email, documentLink, department FROM books WHERE id = ?", [id]);
    const entry = rows[0];

    if (!entry) {
      return res.status(404).json({ message: "Book not found" });
    }

    if (req.user.role === 'sub_admin' && entry.department !== req.user.department) {
      return res.status(403).json({
        message: `You can only delete books from your department (${req.user.department})`
      });
    }

    try {
      if (entry.documentLink?.startsWith('/uploads/')) {
        const filePath = path.join(__dirname, '..', entry.documentLink.replace(/^\/+/, ''));
        if (fs.existsSync(filePath)) {
          await fs.promises.unlink(filePath);
        }
      }
    } catch (err) {
      console.error('[Delete] Failed to physically remove file on delete:', err);
    }

    await db.query("DELETE FROM books WHERE id = ?", [id]);

    await logAction(userEmail, "DELETE", `Deleted book ID: ${id}`);

    return res
      .status(200)
      .json({ message: "Book deleted successfully" });

  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/formGet", async (req, res) => {
  try {
    const pageParam = req.query.page;
    const limitParam = req.query.limit;
    const filtersParam = req.query.filters;
    const sortKeyParam = req.query.sortKey;
    const sortDirectionParam = req.query.sortDirection;

    const page = pageParam ? parseInt(pageParam, 10) : null;
    const limit = limitParam ? parseInt(limitParam, 10) : null;
    
    let filters = {};
    if (filtersParam) {
      try { filters = JSON.parse(filtersParam); } catch (e) {}
    }

    let user = null;
    const token = req.headers.authorization?.split(" ")[1];
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        user = decoded;
      } catch (err) {}
    }

    let conditions = [];
    let searchParams = [];

    if (user && user.role === 'sub_admin') {
      conditions.push('department = ?');
      searchParams.push(user.department);
    }

    const allowedColumns = ['facultyName', 'email', 'department', 'designation', 'isbn', 'title', 'coAuthors', 'publicationType', 'publisher', 'yearOfPublication'];
    for (const [key, value] of Object.entries(filters)) {
      if (value && allowedColumns.includes(key)) {
        conditions.push(`\`${key}\` LIKE ?`);
        searchParams.push(`%${value}%`);
      }
    }

    const searchCondition = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const safeSortKey = allowedColumns.includes(sortKeyParam) ? sortKeyParam : 'id';
    const safeSortDirection = sortDirectionParam === 'desc' ? 'DESC' : 'ASC';
    
    const finalSortDirection = (!sortKeyParam) ? 'DESC' : safeSortDirection;
    const orderClause = `ORDER BY \`${safeSortKey}\` ${finalSortDirection}`;

    if (page && limit && !isNaN(page) && !isNaN(limit) && page > 0 && limit > 0) {
      const offset = (page - 1) * limit;

      const [countResult] = await db.query(
        `SELECT COUNT(*) as total FROM books ${searchCondition}`,
        searchParams
      );
      const total = countResult[0].total;

      const [rows] = await db.query(
        `SELECT * FROM books ${searchCondition} ${orderClause} LIMIT ? OFFSET ?`,
        [...searchParams, limit, offset]
      );

      return res.json({
        data: rows,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      });
    } else {
      const [rows] = await db.query(`SELECT * FROM books ${searchCondition} ${orderClause}`, searchParams);
      return res.json(rows);
    }
  } catch (e) {
    console.error("Error in /formGet:", e);
    return res.status(500).json({ message: "error reading database", error: e.message });
  }
});

router.get("/downloadExcel", async (req, res) => {
  try {
    const filtersParam = req.query.filters;
    const filters = filtersParam ? JSON.parse(filtersParam) : {};
    const allowedFilterColumns = ['facultyName', 'email', 'department', 'designation', 'isbn', 'title', 'coAuthors', 'publicationType', 'publisher', 'yearOfPublication'];

    let conditions = [];
    let searchParams = [];

    for (const [key, value] of Object.entries(filters)) {
      if (value && allowedFilterColumns.includes(key)) {
        conditions.push(`\`${key}\` LIKE ?`);
        searchParams.push(`%${value}%`);
      }
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
    const query = `SELECT * FROM books ${whereClause} ORDER BY id DESC`;
    const [rows] = await db.query(query, searchParams);

    const baseUrl = `${req.protocol}://${req.get('host')}`;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Books");

    worksheet.mergeCells("A1:K1");
    const titleRow = worksheet.getRow(1);
    titleRow.getCell(1).value = "FACULTY BOOKS AND CHAPTERS";
    titleRow.getCell(1).font = { name: "Arial", family: 4, size: 16, bold: true };
    titleRow.getCell(1).alignment = { vertical: "middle", horizontal: "center" };
    titleRow.height = 30;

    const columns = [
      { header: "ID", key: "id", width: 10 },
      { header: "Email", key: "email", width: 30 },
      { header: "Faculty Name", key: "facultyName", width: 25 },
      { header: "Department", key: "department", width: 20 },
      { header: "Designation", key: "designation", width: 25 },
      { header: "ISBN / ISSN", key: "isbn", width: 20 },
      { header: "Book Title", key: "title", width: 40 },
      { header: "Co-Authors", key: "coAuthors", width: 30 },
      { header: "Publication Type", key: "publicationType", width: 20 },
      { header: "Publisher", key: "publisher", width: 30 },
      { header: "Year of Publication", key: "yearOfPublication", width: 20 },
      { header: "Document Link", key: "documentLink", width: 50 },
    ];

    columns.forEach((col, index) => {
      worksheet.getColumn(index + 1).width = col.width;
    });

    const headerRow = worksheet.addRow(columns.map((c) => c.header));

    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4CAF50" } };
      cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
      cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    });
    headerRow.height = 25;

    rows.forEach((row) => {
      let docLink = row.documentLink;
      if (docLink && docLink.startsWith('/uploads/')) {
        docLink = `${baseUrl}${docLink}`;
      }

      const rowData = columns.map((col) => {
        if (col.key === 'documentLink') return docLink;
        return row[col.key];
      });

      const newRow = worksheet.addRow(rowData);

      newRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
        cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };

        if (colNumber === 12 && cell.value && cell.value.toString().startsWith('http')) {
          cell.value = { text: cell.value, hyperlink: cell.value, tooltip: 'Click to open document' };
          cell.font = { color: { argb: 'FF0000FF' }, underline: true };
        }
      });
    });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=books.xlsx");
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("Excel generation error:", err);
    res.status(500).json({ message: "Failed to generate Excel file" });
  }
});

router.get("/downloadTemplate", async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Books");

    worksheet.mergeCells("A1:K1");
    const titleRow = worksheet.getRow(1);
    titleRow.getCell(1).value = "FACULTY BOOKS AND CHAPTERS TEMPLATE";
    titleRow.getCell(1).font = { name: "Arial", family: 4, size: 16, bold: true };
    titleRow.getCell(1).alignment = { vertical: "middle", horizontal: "center" };
    titleRow.height = 30;

    const columns = [
      { header: "Email (faculty@domain.com)", width: 35 },
      { header: "Faculty Name (Dr. John Doe)", width: 30 },
      { header: "Department (CSE/ECE/EEE/MECH/CIVIL/IT/AIML/CSD/CSM/FED/MBA/PHARMACY)", width: 60 },
      { header: "Designation (Professor/Associate Professor/etc)", width: 40 },
      { header: "ISBN / ISSN (e.g. 978-3-16-148410-0)", width: 30 },
      { header: "Book Title", width: 45 },
      { header: "Co-Authors (Name1, Name2)", width: 40 },
      { header: "Publication Type (Book or Book Chapter)", width: 40 },
      { header: "Publisher (Publisher Details)", width: 40 },
      { header: "Year of Publication (e.g. 2025) - REQUIRED", width: 45 },
      { header: "Document Link (https://...)", width: 45 }
    ];

    columns.forEach((col, index) => {
      worksheet.getColumn(index + 1).width = col.width;
    });

    const headerRow = worksheet.addRow(columns.map((c) => c.header));

    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4CAF50" } };
      cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
      cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    });
    headerRow.height = 25;

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=books_template.xlsx");
    await workbook.xlsx.write(res);
    res.end();
  } catch (e) {
    console.error("Template download error:", e);
    res.status(500).json({ message: "Server error", error: e.message });
  }
});

router.get("/pdf-preview", async (req, res) => {
  try {
    const { file } = req.query; 

    if (!file) {
      return res.status(400).json({ message: "Missing file parameter" });
    }

    const uploadsBase = path.join(__dirname, '../uploads');
    const relative = file.replace(/^\/+uploads\/+/, '');
    const fullPath = path.resolve(uploadsBase, relative);

    if (!fullPath.startsWith(uploadsBase)) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ message: "File not found" });
    }

    const ext = path.extname(fullPath).toLowerCase();
    if (ext !== '.pdf') {
      return res.status(400).json({ message: "Only PDF files are supported" });
    }

    const data = fs.readFileSync(fullPath);
    return res.json({ data: data.toString('base64'), mimeType: 'application/pdf' });

  } catch (err) {
    console.error('[pdf-preview] Error:', err);
    return res.status(500).json({ message: "Failed to load file" });
  }
});

export default router;
