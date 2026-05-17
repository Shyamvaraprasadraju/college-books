import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import archiver from 'archiver';
import util from 'util';
import dotenv from 'dotenv';

dotenv.config();

const execPromise = util.promisify(exec);

// Paths
const BACKUP_DIR = path.join(process.cwd(), 'backups');
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

// Ensure backup dir exists
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

export const createBackup = async () => {
    try {
        console.log('🔄 Starting automated backup process...');
        const dateStr = new Date().toISOString().replace(/:/g, '-').split('.')[0];
        const sqlFileName = `database-${dateStr}.sql`;
        const sqlFilePath = path.join(BACKUP_DIR, sqlFileName);
        const zipFileName = `backup-${dateStr}.zip`;
        const zipFilePath = path.join(BACKUP_DIR, zipFileName);

        // 1. Dump Database
        console.log(`📡 Dumping MySQL Database to ${sqlFileName}...`);
        const dbHost = process.env.DB_HOST || 'localhost';
        const dbUser = process.env.DB_USER || 'root';
        const dbPass = process.env.DB_PASSWORD ? `-p${process.env.DB_PASSWORD}` : '';
        const dbName = process.env.DB_NAME || 'patent_portal';
        
        // Securely pass password via env instead of command line to prevent exposure in `ps aux`
        const dumpCommand = `mysqldump -h ${dbHost} -u ${dbUser} ${dbName} > ${sqlFileName}`;
        
        try {
            await execPromise(dumpCommand, { 
                cwd: BACKUP_DIR,
                env: { ...process.env, MYSQL_PWD: process.env.DB_PASSWORD || '' }
            });
        } catch (execError) {
            // Ignore if the error is just the password warning from stderr
            if (!execError.message.includes('Using a password on the command line interface can be insecure')) {
                throw execError;
            }
        }
        
        console.log('✅ Database dump complete.');

        // 2. Compress Database & Uploads to ZIP
        console.log(`📦 Zipping database and uploads into ${zipFileName}...`);
        
        await new Promise((resolve, reject) => {
            const output = fs.createWriteStream(zipFilePath);
            const archive = archiver('zip', {
                zlib: { level: 9 } // Maximum compression
            });

            output.on('close', () => {
                console.log(`✅ Zipping complete. Archive is ${archive.pointer()} total bytes.`);
                resolve();
            });

            archive.on('error', (err) => {
                reject(err);
            });

            archive.pipe(output);

            // Add the SQL dump to the root of the ZIP
            archive.file(sqlFilePath, { name: sqlFileName });

            // Add the uploads folder to the root of the ZIP
            if (fs.existsSync(UPLOADS_DIR)) {
                archive.directory(UPLOADS_DIR, 'uploads');
            }

            archive.finalize();
        });

        // 3. Cleanup the temporary raw .sql file
        if (fs.existsSync(sqlFilePath)) {
            fs.unlinkSync(sqlFilePath);
        }

        console.log(`✨ Backup process finished successfully: ${zipFileName}`);
        
        // 4. Auto-Rotation (3 Days)
        autoRotateBackups();

        return { success: true, message: "Backup completed successfully", file: zipFileName };

    } catch (error) {
        console.error('❌ Backup process failed:', error);
        return { success: false, message: "Backup process failed", error: error.message };
    }
};

function autoRotateBackups() {
    console.log('🧹 Running 3-Day Backup Auto-Rotation...');
    const RETENTION_DAYS = 3;
    const now = Date.now();
    const KEEP_TIME_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000;

    try {
        const files = fs.readdirSync(BACKUP_DIR);
        let deletedCount = 0;

        files.forEach(file => {
            if (file.endsWith('.zip') && file.startsWith('backup-')) {
                const filePath = path.join(BACKUP_DIR, file);
                const stats = fs.statSync(filePath);
                
                // Calculate age of file in milliseconds
                const fileAge = now - stats.mtimeMs;
                
                if (fileAge > KEEP_TIME_MS) {
                    fs.unlinkSync(filePath);
                    console.log(`🗑️ Deleted old backup: ${file}`);
                    deletedCount++;
                }
            }
        });

        console.log(`✅ Rotation complete. Deleted ${deletedCount} old backup(s).`);
    } catch (err) {
        console.error('❌ Auto-rotation failed to clean up old files:', err);
    }
};
