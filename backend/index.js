import "dotenv/config";
import express from "express"
import loginRoutes from "./login.js"
import FormRoutes from "./routers/formHandling.js"
import AdminRoutes from "./routers/Admin.js"
import cors from "cors"
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import compression from "compression";
import cookieParser from "cookie-parser";
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import cron from 'node-cron';
import { createBackup } from './services/backupService.js';

// ── Validate required environment variables ──
const requiredEnvVars = ['JWT_SECRET', 'DB_HOST', 'DB_USER', 'DB_NAME'];
const missingVars = requiredEnvVars.filter(v => !process.env[v]);
if (missingVars.length > 0) {
  console.error(`\n❌ Missing required environment variables: ${missingVars.join(', ')}`);
  console.error('Please check your .env file and ensure all required variables are set.');
  console.error('Refer to .env.example for the expected configuration.\n');
  process.exit(1);
}

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const port = process.env.PORT || 3000;
const app = express();
app.set('trust proxy', 1); // Trust first proxy (Cloudflare/Nginx/Ngrok)

// Request Logging Middleware with Status Code
app.use((req, res, next) => {
  const start = Date.now();
  const { method, url } = req;
  const origin = req.headers['origin'] || 'No Origin';

  console.log(`📩 [${new Date().toISOString()}] Incoming: ${method} ${url} | Origin: ${origin}`);

  // Log body (safely)
  if (req.body && Object.keys(req.body).length > 0) {
    const safeBody = { ...req.body };
    if (safeBody.password) safeBody.password = '***REDACTED***';
    // console.log('   Body:', JSON.stringify(safeBody)); // Uncomment if deep debugging needed
  }

  // Log Response Status on Finish
  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const color = status >= 500 ? '\x1b[31m' : status >= 400 ? '\x1b[33m' : status >= 300 ? '\x1b[36m' : '\x1b[32m';
    const reset = '\x1b[0m';
    console.log(`📤 ${color}[${status}]${reset} ${method} ${url} completed in ${duration}ms`);
  });

  next();
});

app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      objectSrc: ["'self'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'self'"]
    }
  }
}));
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// ── Health check endpoint ──
app.get('/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'healthy', db: 'connected', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({ status: 'unhealthy', db: 'disconnected', error: err.message });
  }
});

// Ensure uploads directory exists and serve it
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve PDF files with proper Headers for Preview
app.use('/uploads', express.static(uploadsDir, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.pdf')) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename="' + path.basename(filePath) + '"');
    }
  }
}));

// Database initialization - seeding handled in db.js
import { db, dbReady } from "./db.js";
await dbReady; // Wait for database to be ready

const isLocalOrigin = (origin) => {
  if (!origin) return true;
  // Match localhost, LAN IPs, OR any Ngrok domains
  return /^(http|https):\/\/(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|192\.168\.\d+\.\d+)(:\d+)?$/.test(origin) || origin.includes('ngrok');
};

const corsOptions = {
  origin: (origin, callback) => {
    // Check if origin is allowed
    const allowed = !origin || isLocalOrigin(origin) || (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL);

    if (allowed) {
      callback(null, true);
    } else {
      console.warn(`🚫 CORS Rejected: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
}
app.use(cors(corsOptions));

// Rate limiter for login route: 50 requests per 10 minutes per IP
const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many login attempts. Please try again after 10 minutes." }
});

app.use("/login", loginLimiter, loginRoutes);
app.use("/form", FormRoutes);
app.use("/admin", AdminRoutes);

// Serve Frontend Static Files (Production)
const frontendPath = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(frontendPath)) {
  console.log('Serving frontend from:', frontendPath);
  app.use(express.static(frontendPath));

  // Handle SPA routing - serve index.html for all non-API routes
  // Using regex pattern for compatibility with newer path-to-regexp
  app.get(/^\/(?!api\/|form\/|login|admin\/).*/, (req, res, next) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}

// Global error handler — catches unhandled errors and prevents stack trace leakage
app.use((err, req, res, next) => {
  const errorMsg = `❌ Unhandled error on ${req.method} ${req.url}: ${err.message}`;
  console.error(errorMsg);

  // Log to file
  try {
    const errorLogPath = path.join(__dirname, 'error_log.txt');
    const logMessage = `[${new Date().toISOString()}] ${errorMsg}\nStack: ${err.stack}\n\n`;
    fs.appendFileSync(errorLogPath, logMessage);
  } catch (logErr) {
    console.error('Failed to write to error log:', logErr);
  }

  // Handle Multer file upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ message: "File too large. Maximum size is 5MB." });
  }
  if (err.message === 'Only PDF files are allowed') {
    return res.status(400).json({ message: err.message });
  }

  // Generic error response (no stack trace)
  return res.status(err.status || 500).json({ message: "Internal server error" });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Running at 0.0.0.0:${port}`);
  
  // Initialize Automated Backups
  // Runs every 3 days at 3:00 AM server time
  console.log('⏰ Scheduling automated backups for 03:00 AM every 3 days.');
  cron.schedule('0 3 */3 * *', async () => {
    console.log(`[${new Date().toISOString()}] Executing scheduled full system backup...`);
    await createBackup();
  });
})