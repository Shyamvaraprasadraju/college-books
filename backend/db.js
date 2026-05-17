import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

// First, create a connection without specifying a database to check/create it
const createDatabaseIfNotExists = async () => {
    try {
        // Connect without specifying database
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD
        });

        const dbName = process.env.DB_NAME || 'books_portal';

        // Create database if it doesn't exist
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
        console.log(`✅ Database '${dbName}' is ready`);

        await connection.end();
    } catch (error) {
        console.error('❌ Error creating database:', error.message);
        throw error;
    }
};

// Create database with retry logic for production resilience
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const connectWithRetry = async (retries = 10, delay = 3000) => {
    for (let i = 0; i < retries; i++) {
        try {
            await createDatabaseIfNotExists();
            return; // Success
        } catch (error) {
            console.error(`⚠️ Database not ready... retrying in ${delay/1000}s (${i+1}/${retries})`);
            await sleep(delay);
        }
    }
    console.error('❌ Failed to connect to the database after multiple retries. Exiting.');
    process.exit(1);
};

await connectWithRetry();

export const db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'books_portal',
    waitForConnections: true,
    connectionLimit: 100,
    queueLimit: 0
});

const initDb = async () => {
    let connection;
    try {
        connection = await db.getConnection();
        console.log('✅ Connected to MySQL database');

        // Check if admins table exists
        const [tables] = await connection.query("SHOW TABLES LIKE 'admins'");
        const adminsTableExists = tables.length > 0;

        // Create admins table if it doesn't exist
        if (!adminsTableExists) {
            await connection.query(`
                CREATE TABLE admins (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    role ENUM('super_admin', 'sub_admin') NOT NULL,
                    department VARCHAR(255) DEFAULT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    created_by INT DEFAULT NULL,
                    FOREIGN KEY (created_by) REFERENCES admins(id) ON DELETE SET NULL,
                    INDEX idx_email (email),
                    INDEX idx_role (role),
                    INDEX idx_department (department)
                )
            `);
            console.log('✅ Admins table created');
        } else {
            console.log('ℹ️ Admins table exists, checking for missing columns...');
            const [adminCols] = await connection.query(`
                SELECT COLUMN_NAME 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'admins'
            `);
            const existingAdminCols = adminCols.map(col => col.COLUMN_NAME);

            const requiredAdminCols = [
                { name: 'role', definition: "ENUM('super_admin', 'sub_admin') NOT NULL DEFAULT 'super_admin'" },
                { name: 'department', definition: 'VARCHAR(255) DEFAULT NULL' },
                { name: 'updated_at', definition: 'DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP' },
                { name: 'created_by', definition: 'INT DEFAULT NULL' }
            ];

            for (const col of requiredAdminCols) {
                if (!existingAdminCols.includes(col.name)) {
                    try {
                        await connection.query(`ALTER TABLE admins ADD COLUMN ${col.name} ${col.definition}`);
                        console.log(`✅ Added column to admins: ${col.name}`);
                    } catch (e) {
                        console.warn(`Failed to add admin column ${col.name}: ${e.message}`);
                    }
                }
            }

            if (!existingAdminCols.includes('created_by')) {
                try {
                    await connection.query('ALTER TABLE admins ADD FOREIGN KEY (created_by) REFERENCES admins(id) ON DELETE SET NULL');
                    console.log('✅ Fixed admins foreign key');
                } catch (e) {
                    console.warn(`Failed to add foreign key to admins: ${e.message}`);
                }
            }
            console.log('✅ Admins table schema verified');
        }

        // Check if books table exists
        const [bookTables] = await connection.query("SHOW TABLES LIKE 'books'");
        const booksTableExists = bookTables.length > 0;

        if (!booksTableExists) {
            // Create books table with strict field order
            await connection.query(`
                CREATE TABLE books (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    facultyName TEXT,
                    email TEXT,
                    department VARCHAR(255),
                    designation TEXT,
                    coAuthors TEXT,
                    isbn TEXT,
                    title TEXT,
                    publicationType ENUM('Book', 'Book Chapter') DEFAULT 'Book',
                    publisher TEXT,
                    yearOfPublication VARCHAR(4),
                    documentLink TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_department (department),
                    INDEX idx_isbn (isbn(255)),
                    INDEX idx_email (email(255)),
                    FULLTEXT INDEX idx_facultyName (facultyName),
                    FULLTEXT INDEX idx_title (title)
                )
            `);
            console.log('✅ Books table created with strict field order');
        } else {
            // If table exists, ensure all columns exist (Migrations)
            console.log('ℹ️ Books table exists, checking for missing columns...');

            // Get existing columns
            const [columns] = await connection.query(`
                SELECT COLUMN_NAME 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'books'
            `);
            const existingColumns = columns.map(col => col.COLUMN_NAME);

            // Define required columns with their definitions
            const requiredColumns = [
                { name: 'facultyName', definition: 'TEXT' },
                { name: 'email', definition: 'TEXT' },
                { name: 'department', definition: 'VARCHAR(255)' },
                { name: 'designation', definition: 'TEXT' },
                { name: 'coAuthors', definition: 'TEXT' },
                { name: 'isbn', definition: 'TEXT' },
                { name: 'title', definition: 'TEXT' },
                { name: 'publicationType', definition: "ENUM('Book', 'Book Chapter') DEFAULT 'Book'" },
                { name: 'publisher', definition: 'TEXT' },
                { name: 'yearOfPublication', definition: 'VARCHAR(4)' },
                { name: 'documentLink', definition: 'TEXT' }
            ];

            // Add missing columns
            for (const col of requiredColumns) {
                if (!existingColumns.includes(col.name)) {
                    try {
                        await connection.query(`ALTER TABLE books ADD COLUMN ${col.name} ${col.definition}`);
                        console.log(`✅ Added column: ${col.name}`);
                    } catch (e) {
                        console.warn(`Failed to add column ${col.name}: ${e.message}`);
                    }
                }
            }
            console.log('✅ Books table schema verified');

            // Apply missing indexes to existing books table
            console.log('ℹ️ Checking for missing text indexes on books table...');
            
            const indexesToAdd = [
                { name: 'idx_isbn', sql: 'CREATE INDEX idx_isbn ON books (isbn(255))' },
                { name: 'idx_email', sql: 'CREATE INDEX idx_email ON books (email(255))' },
                { name: 'idx_facultyName', sql: 'CREATE FULLTEXT INDEX idx_facultyName ON books (facultyName)' },
                { name: 'idx_title', sql: 'CREATE FULLTEXT INDEX idx_title ON books (title)' }
            ];

            const [existingIndexes] = await connection.query('SHOW INDEXES FROM books');
            const currentIndexNames = existingIndexes.map(idx => idx.Key_name);

            for (const define of indexesToAdd) {
                if (!currentIndexNames.includes(define.name)) {
                    try {
                        await connection.query(define.sql);
                        console.log(`✅ Applied index: ${define.name}`);
                    } catch (e) {
                         console.warn(`Failed to apply index ${define.name}: ${e.message}`);
                    }
                }
            }
        }

        // Create audit_logs table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS audit_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_email TEXT,
                action TEXT,
                details TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_timestamp (timestamp)
            )
        `);
        console.log('✅ Audit logs table created/verified');

        // Seed super admin if not exists
        const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@nriit.edu.in';
        const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || 'Admin@123';

        const [existingAdmin] = await connection.query(
            'SELECT id FROM admins WHERE email = ? AND role = ?',
            [superAdminEmail, 'super_admin']
        );

        if (existingAdmin.length === 0) {
            const passwordHash = await bcrypt.hash(superAdminPassword, 10);
            await connection.query(
                'INSERT INTO admins (email, password_hash, role, department, created_by) VALUES (?, ?, ?, ?, ?)',
                [superAdminEmail, passwordHash, 'super_admin', null, null]
            );
            console.log(`✅ Super admin created: ${superAdminEmail}`);
            console.log(`⚠️  CHANGE DEFAULT PASSWORD AFTER FIRST LOGIN!`);
        } else {
            console.log(`✅ Super admin exists: ${superAdminEmail}`);
        }

        console.log('✅ Database initialization complete');
    } catch (error) {
        console.error('❌ Error initializing database:', error.message);
        throw error;
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

// Export the initialization promise
export const dbReady = initDb();
