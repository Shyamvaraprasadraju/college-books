import { Router } from "express";
import { verifyToken } from "../middleware/verifyToken.js";
import { requireSuperAdmin, requireAnyAdmin } from "../middleware/authorization.js";
import { db } from "../db.js";
import bcrypt from "bcryptjs";
import { logAction } from "../utils/logger.js";
import { createBackup } from "../services/backupService.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const router = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get current user info
router.get("/me", verifyToken, requireAnyAdmin, async (req, res) => {
  try {
    const [admins] = await db.query(
      "SELECT id, email, role, department, created_at FROM admins WHERE email = ?",
      [req.user.userEmail]
    );

    if (admins.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json(admins[0]);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to fetch user info" });
  }
});

// Get all admins (super admin only) — supports pagination
router.get("/admins", verifyToken, requireSuperAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 0;
    const limit = parseInt(req.query.limit) || 0;

    if (page > 0 && limit > 0) {
      // Paginated response
      const offset = (page - 1) * limit;

      const [[{ total }]] = await db.query("SELECT COUNT(*) as total FROM admins");

      const [admins] = await db.query(
        `SELECT id, email, role, department, created_at, 
         (SELECT email FROM admins AS creator WHERE creator.id = admins.created_by) AS created_by_email
         FROM admins 
         ORDER BY role DESC, created_at ASC
         LIMIT ? OFFSET ?`,
        [limit, offset]
      );

      return res.status(200).json({
        data: admins,
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
      });
    } else {
      // Non-paginated (backward compatible)
      const [admins] = await db.query(
        `SELECT id, email, role, department, created_at, 
         (SELECT email FROM admins AS creator WHERE creator.id = admins.created_by) AS created_by_email
         FROM admins 
         ORDER BY role DESC, created_at ASC`
      );
      return res.status(200).json(admins);
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to fetch admins" });
  }
});

// Add super admin (super admin only)
router.post("/super-admin", verifyToken, requireSuperAdmin, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // Check if email already exists
    const [existing] = await db.query("SELECT id FROM admins WHERE email = ?", [email.toLowerCase().trim()]);
    if (existing.length > 0) {
      return res.status(400).json({ message: "Email already exists" });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS) || 10);

    // Insert new super admin
    await db.query(
      "INSERT INTO admins (email, password_hash, role, department, created_by) VALUES (?, ?, ?, ?, ?)",
      [email.toLowerCase().trim(), passwordHash, 'super_admin', null, req.user.adminId]
    );

    await logAction(req.user.userEmail, "CREATE_SUPER_ADMIN", `Created super admin: ${email}`);

    return res.status(200).json({ message: "Super admin created successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to create super admin" });
  }
});

// Add sub admin (super admin only)
router.post("/sub-admin", verifyToken, requireSuperAdmin, async (req, res) => {
  try {
    const { email, password, department } = req.body;

    if (!email || !password || !department) {
      return res.status(400).json({ message: "Email, password, and department are required" });
    }

    // Check if email already exists
    const [existing] = await db.query("SELECT id FROM admins WHERE email = ?", [email.toLowerCase().trim()]);
    if (existing.length > 0) {
      return res.status(400).json({ message: "Email already exists" });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS) || 10);

    // Insert new sub admin
    await db.query(
      "INSERT INTO admins (email, password_hash, role, department, created_by) VALUES (?, ?, ?, ?, ?)",
      [email.toLowerCase().trim(), passwordHash, 'sub_admin', department, req.user.adminId]
    );

    await logAction(req.user.userEmail, "CREATE_SUB_ADMIN", `Created sub admin for ${department}: ${email}`);

    return res.status(200).json({ message: "Sub admin created successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to create sub admin" });
  }
});

// Update admin password (super admin can update any, users can update own)
router.put("/:id/password", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ message: "New password is required" });
    }

    // Get target admin
    const [targetAdmins] = await db.query("SELECT id, email, role FROM admins WHERE id = ?", [id]);
    if (targetAdmins.length === 0) {
      return res.status(404).json({ message: "Admin not found" });
    }

    const targetAdmin = targetAdmins[0];

    // Check permissions
    const isSelf = req.user.adminId === parseInt(id);
    const isSuper = req.user.role === 'super_admin';

    if (!isSelf && !isSuper) {
      return res.status(403).json({ message: "You can only change your own password" });
    }

    // Super admins cannot change other super admins' passwords (except their own)
    if (!isSelf && targetAdmin.role === 'super_admin') {
      return res.status(403).json({ message: "Cannot change another super admin's password" });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, parseInt(process.env.BCRYPT_ROUNDS) || 10);

    // Update password
    await db.query("UPDATE admins SET password_hash = ?, updated_at = NOW() WHERE id = ?", [passwordHash, id]);

    const actionDetail = isSelf
      ? "Changed own password"
      : `Reset password for ${targetAdmin.email}`;

    await logAction(req.user.userEmail, "PASSWORD_CHANGE", actionDetail);

    return res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to update password" });
  }
});

// Change own password
router.put("/my-password", verifyToken, requireAnyAdmin, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current and new password are required" });
    }

    // Get current user
    const [admins] = await db.query(
      "SELECT id, email, password_hash FROM admins WHERE id = ?",
      [req.user.adminId]
    );

    if (admins.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const admin = admins[0];

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, admin.password_hash);
    if (!isValid) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, parseInt(process.env.BCRYPT_ROUNDS) || 10);

    // Update password
    await db.query("UPDATE admins SET password_hash = ?, updated_at = NOW() WHERE id = ?", [passwordHash, admin.id]);

    await logAction(req.user.userEmail, "PASSWORD_CHANGE", "Changed own password");

    return res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to change password" });
  }
});

// DELETE /admin/orphaned-files — deletes a specific list of orphaned files
// SAFETY: Re-checks each file against DB immediately before deleting
// NOTE: This MUST be defined before the generic DELETE /:id route below,
//       otherwise Express matches "orphaned-files" as an :id parameter.
router.delete("/orphaned-files", verifyToken, requireSuperAdmin, async (req, res) => {
  try {
    const { files } = req.body; // [{ filename, folder }]

    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ message: "No files specified for deletion" });
    }

    // Re-query DB references at delete time (double safety — state may have changed since scan)
    const [rows] = await db.query(
      "SELECT documentLink,  FROM books WHERE documentLink IS NOT NULL"
    );
    const dbReferencedFilenames = new Set();
    for (const row of rows) {
      if (row.documentLink) dbReferencedFilenames.add(path.basename(row.documentLink));
    }

    const uploadsBase = path.join(__dirname, '../uploads');
    const allowedFolders = ['book_documents'];
    const deleted = [];
    const skipped = [];

    for (const { filename, folder } of files) {
      // Strict safety: reject any path traversal attempts or unknown folders
      if (!allowedFolders.includes(folder)) {
        console.warn(`[OrphanDelete] Rejected unknown folder: ${folder}`);
        skipped.push({ filename, reason: 'Unknown folder — rejected' });
        continue;
      }
      if (filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
        console.warn(`[OrphanDelete] Rejected unsafe filename: ${filename}`);
        skipped.push({ filename, reason: 'Unsafe filename — rejected' });
        continue;
      }

      // Re-check: if file now exists in DB, do NOT delete it
      if (dbReferencedFilenames.has(filename)) {
        console.warn(`[OrphanDelete] Skipping '${filename}' — now referenced in DB`);
        skipped.push({ filename, reason: 'File is now referenced in DB — skipped for safety' });
        continue;
      }

      const filePath = path.join(uploadsBase, folder, filename);

      // Verify file actually exists on disk before trying to delete
      if (!fs.existsSync(filePath)) {
        skipped.push({ filename, reason: 'File not found on disk' });
        continue;
      }

      // All checks passed — safe to delete
      fs.unlinkSync(filePath);
      deleted.push(filename);
      console.log(`[OrphanDelete] Deleted orphaned file: ${folder}/${filename}`);
    }

    await logAction(
      req.user.userEmail,
      "ORPHAN_CLEANUP",
      `Deleted ${deleted.length} orphaned file(s): ${deleted.join(', ')}${skipped.length > 0 ? ` | Skipped ${skipped.length}: ${skipped.map(s => s.filename).join(', ')}` : ''}`
    );

    return res.status(200).json({
      message: `Deleted ${deleted.length} file(s)${skipped.length > 0 ? `, skipped ${skipped.length}` : ''}`,
      deleted,
      skipped
    });
  } catch (error) {
    console.error('[OrphanDelete] Error:', error);
    return res.status(500).json({ message: "Failed to delete orphaned files" });
  }
});

// Delete admin (super admin only)
router.delete("/:id", verifyToken, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent self-deletion
    if (req.user.adminId === parseInt(id)) {
      return res.status(400).json({ message: "You cannot delete yourself" });
    }

    // Get admin info before deletion
    const [admins] = await db.query("SELECT email, role FROM admins WHERE id = ?", [id]);
    if (admins.length === 0) {
      return res.status(404).json({ message: "Admin not found" });
    }

    const deletedAdmin = admins[0];

    // Delete admin
    await db.query("DELETE FROM admins WHERE id = ?", [id]);

    await logAction(
      req.user.userEmail,
      "DELETE_ADMIN",
      `Deleted ${deletedAdmin.role}: ${deletedAdmin.email}`
    );

    return res.status(200).json({ message: "Admin deleted successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to delete admin" });
  }
});

// Update sub admin department (super admin only)
router.put("/:id/department", verifyToken, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { department } = req.body;

    if (!department) {
      return res.status(400).json({ message: "Department is required" });
    }

    // Get target admin
    const [targetAdmins] = await db.query("SELECT id, email, role FROM admins WHERE id = ?", [id]);
    if (targetAdmins.length === 0) {
      return res.status(404).json({ message: "Admin not found" });
    }

    const targetAdmin = targetAdmins[0];

    // Cannot change super admin department
    if (targetAdmin.role === 'super_admin') {
      return res.status(400).json({ message: "Cannot assign department to super admin" });
    }

    // Update department
    await db.query("UPDATE admins SET department = ?, updated_at = NOW() WHERE id = ?", [department, id]);

    await logAction(
      req.user.userEmail,
      "UPDATE_DEPARTMENT",
      `Changed department for ${targetAdmin.email} to ${department}`
    );

    return res.status(200).json({ message: "Department updated successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to update department" });
  }
});

// Get audit logs (filtered by department for sub-admins)
router.get("/logs", verifyToken, requireAnyAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    let query = "SELECT * FROM audit_logs";
    let countQuery = "SELECT COUNT(*) as count FROM audit_logs";
    const params = [];

    // Sub-admins can only see logs related to their department
    if (req.user.role === 'sub_admin') {
      query += " WHERE details LIKE ?";
      countQuery += " WHERE details LIKE ?";
      params.push(`%${req.user.department}%`);
    }

    query += " ORDER BY timestamp DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);

    const [logs] = await db.query(query, params);
    const [countResult] = await db.query(countQuery, params.slice(0, params.length - 2));
    const totalLogs = countResult[0].count;

    return res.json({
      logs,
      total: totalLogs,
      page,
      totalPages: Math.ceil(totalLogs / limit)
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to fetch logs" });
  }
});

// Delete all books (super admin only)
router.post("/deleteAll", verifyToken, requireSuperAdmin, async (req, res) => {
  try {
    // 1. Delete all physical files in the upload directories first
    const publishDir = path.join(__dirname, '../uploads/book_documents');
    const grantDir = path.join(__dirname, '../uploads/book_documents');

    console.log(`[DeleteAll] Starting physical file deletion...`);
    console.log(`[DeleteAll] Publish Dir: ${publishDir}`);
    console.log(`[DeleteAll] Grant Dir: ${grantDir}`);

    let deletedCount = 0;

    try {
      if (fs.existsSync(publishDir)) {
        const files = fs.readdirSync(publishDir);
        console.log(`[DeleteAll] Found ${files.length} files in publish_dir`);
        for (const file of files) {
          const filePath = path.join(publishDir, file);
          try {
             fs.unlinkSync(filePath);
             deletedCount++;
             console.log(`[DeleteAll] Deleted: ${filePath}`);
          } catch(e) {
             console.error(`[DeleteAll] Failed to delete file ${filePath}:`, e);
          }
        }
      } else {
        console.log(`[DeleteAll] Directory does not exist: ${publishDir}`);
      }

      if (fs.existsSync(grantDir)) {
        const files = fs.readdirSync(grantDir);
        console.log(`[DeleteAll] Found ${files.length} files in grant_dir`);
        for (const file of files) {
           const filePath = path.join(grantDir, file);
           try {
             fs.unlinkSync(filePath);
             deletedCount++;
             console.log(`[DeleteAll] Deleted: ${filePath}`);
           } catch (e) {
             console.error(`[DeleteAll] Failed to delete file ${filePath}:`, e);
           }
        }
      } else {
        console.log(`[DeleteAll] Directory does not exist: ${grantDir}`);
      }
      
      console.log(`[DeleteAll] Successfully deleted ${deletedCount} files.`);
      
    } catch (fsErr) {
      console.error("[DeleteAll] Critical error during file deletion loop:", fsErr);
    }

    // 2. Wipe the database table
    await db.query("DELETE FROM books");
    await logAction(req.user.userEmail, "DELETE_ALL", "Deleted all books and associated files");
    
    return res.status(200).json({ message: "All books and files deleted" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to delete all" });
  }
});

// Trigger manual backup (super admin only)
router.post("/backup", verifyToken, requireSuperAdmin, async (req, res) => {
  try {
    const result = await createBackup();
    if (result.success) {
      await logAction(req.user.userEmail, "BACKUP", `Created manual backup: ${result.file}`);
      return res.status(200).json(result);
    } else {
      return res.status(500).json(result);
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to create backup" });
  }
});

// Get list of available departments
router.get("/departments", verifyToken, requireAnyAdmin, async (req, res) => {
  try {
    // Get distinct departments from books table
    const [departments] = await db.query(
      "SELECT DISTINCT department FROM books WHERE department IS NOT NULL AND department != '' ORDER BY department"
    );

    // Also get departments from sub-admins
    const [adminDepts] = await db.query(
      "SELECT DISTINCT department FROM admins WHERE role = 'sub_admin' AND department IS NOT NULL ORDER BY department"
    );

    // Combine and deduplicate
    const deptSet = new Set();
    departments.forEach(d => deptSet.add(d.department));
    adminDepts.forEach(d => deptSet.add(d.department));

    const allDepartments = Array.from(deptSet).sort();

    return res.status(200).json(allDepartments);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to fetch departments" });
  }
});

// Dashboard stats
router.get("/stats", verifyToken, requireAnyAdmin, async (req, res) => {
  try {
    const isSuperAdmin = req.user.role === 'super_admin';
    const dept = req.user.department;

    // Patent count (filtered by department for sub-admins)
    let patentQuery = "SELECT COUNT(*) as count FROM books";
    let patentParams = [];
    if (!isSuperAdmin && dept) {
      patentQuery += " WHERE department = ?";
      patentParams = [dept];
    }
    const [[{ count: totalBooks }]] = await db.query(patentQuery, patentParams);

    // Admin count (super-admin only)
    let totalAdmins = 0;
    if (isSuperAdmin) {
      const [[{ count }]] = await db.query("SELECT COUNT(*) as count FROM admins");
      totalAdmins = count;
    }

    // Log count
    let logQuery = "SELECT COUNT(*) as count FROM audit_logs";
    let logParams = [];
    if (!isSuperAdmin && dept) {
      logQuery += " WHERE details LIKE ?";
      logParams = [`%${dept}%`];
    }
    const [[{ count: totalLogs }]] = await db.query(logQuery, logParams);

    // Department count (super-admin only)
    let totalDepartments = 0;
    if (isSuperAdmin) {
      const [[{ count: deptCount }]] = await db.query(
        "SELECT COUNT(DISTINCT department) as count FROM books WHERE department IS NOT NULL AND department != ''"
      );
      totalDepartments = deptCount;
    }

    return res.status(200).json({
      totalBooks,
      totalAdmins,
      totalLogs,
      totalDepartments,
      department: dept || null
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to fetch stats" });
  }
});

// ── Audit Log Cleanup (Super Admin) ──
router.post("/logs/cleanup", verifyToken, requireSuperAdmin, async (req, res) => {
  try {
    const retentionMonths = parseInt(req.body.retentionMonths) || 6;
    const [result] = await db.query(
      "DELETE FROM audit_logs WHERE timestamp < DATE_SUB(NOW(), INTERVAL ? MONTH)",
      [retentionMonths]
    );

    await logAction(req.user.userEmail, "CLEANUP", `Cleaned up ${result.affectedRows} audit logs older than ${retentionMonths} months`);

    return res.status(200).json({
      message: `Deleted ${result.affectedRows} logs older than ${retentionMonths} months`,
      deletedCount: result.affectedRows
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to clean up logs" });
  }
});

// ── Orphaned File Cleanup (Super Admin) ──
// GET /admin/orphaned-files — lists files on disk NOT referenced in the DB
router.get("/orphaned-files", verifyToken, requireSuperAdmin, async (req, res) => {
  try {
    const uploadsBase = path.join(__dirname, '../uploads');
    const folders = ['book_documents'];

    // 1. Collect all files currently on disk
    const diskFiles = [];
    for (const folder of folders) {
      const folderPath = path.join(uploadsBase, folder);
      if (!fs.existsSync(folderPath)) continue;
      const entries = fs.readdirSync(folderPath);
      for (const filename of entries) {
        const filePath = path.join(folderPath, filename);
        const stat = fs.statSync(filePath);
        if (stat.isFile()) {
          diskFiles.push({ filename, folder, size: stat.size, lastModified: stat.mtime });
        }
      }
    }

    // 2. Query ALL document references currently stored in DB
    const [rows] = await db.query(
      "SELECT documentLink,  FROM books WHERE documentLink IS NOT NULL"
    );

    // Build a Set of just the basenames that the DB knows about
    const dbReferencedFilenames = new Set();
    for (const row of rows) {
      if (row.documentLink) { dbReferencedFilenames.add(path.basename(row.documentLink)); }
    }

    // 3. Find orphans: on disk but NOT in DB references
    const orphaned = diskFiles.filter(f => !dbReferencedFilenames.has(f.filename));

    console.log(`[OrphanScan] Disk: ${diskFiles.length} files | DB refs: ${dbReferencedFilenames.size} | Orphaned: ${orphaned.length}`);

    return res.status(200).json({ orphaned, total: diskFiles.length, orphanedCount: orphaned.length });
  } catch (error) {
    console.error('[OrphanScan] Error:', error);
    return res.status(500).json({ message: "Failed to scan for orphaned files" });
  }
});

// (Moved above DELETE /:id to prevent route conflict)

// Exported cleanup function for cron usage
export const cleanupOldLogs = async (retentionMonths = 6) => {
  try {
    const [result] = await db.query(
      "DELETE FROM audit_logs WHERE timestamp < DATE_SUB(NOW(), INTERVAL ? MONTH)",
      [retentionMonths]
    );
    if (result.affectedRows > 0) {
      console.log(`🧹 Auto-cleanup: Deleted ${result.affectedRows} audit logs older than ${retentionMonths} months`);
    }
  } catch (error) {
    console.error("Audit log cleanup failed:", error.message);
  }
};

export default router;
