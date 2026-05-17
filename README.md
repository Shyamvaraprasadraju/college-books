# College Publications & Patents

A modern full-stack web application designed for academic institutions to manage, store, and publicly display faculty patent publications. Built with **Express 5 + MySQL** on the backend and **React 19 + Vite + Tailwind 4** on the frontend.

![Project Banner](./frontend/public/favicon.svg)

## ✨ Features

### Public Portal
- **Browse & Search:** Fully paginated, sortable, and filterable table of all faculty patents.
- **Export Filters:** Smart Excel export that exactly matches the active table filters.
- **Responsive Design:** Seamless experience across desktop and mobile devices.

### Admin Dashboard
- **Role-Based Access Control:** Super Admins can manage sub-admins; Sub-admins can only manage patents within their assigned department.
- **Patent Submission:** Secure multi-file PDF uploads with live duplicate detection.
- **Bulk Import:** Client-side parsing of Excel spreadsheets for one-click batch uploading.
- **Audit Trails:** Comprehensive logging of all system actions (creates, updates, deletes).
- **System Health:** Integrated `/health` endpoint and automatic database backup system.

---

## 🚀 Quick Start

See [HOW_TO_RUN.md](./HOW_TO_RUN.md) for detailed local setup and production deployment instructions.

### Prerequisites
- Node.js v18+
- MySQL Server 8.0+

### 💻 Local Development Setup

The application automatically provisions its own database schema, tables, and seeds the initial Super Admin account based on the `.env` configuration. The backend has a built-in auto-retry loop and will patiently wait if MySQL takes a moment to boot.

1. **Start the Backend:**
   ```bash
   cd backend
   npm install
   # copy .env.example to .env and configure DB credentials
   npm run dev
   ```

2. **Start the Frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

### 🌍 Production / Ngrok Single-Server Setup

For simple Ngrok sharing or production deployment, the Express backend natively hosts the optimized React frontend.

1. **Build the Frontend:**
   ```bash
   cd frontend
   npm run build
   ```
2. **Start the Unified Server:**
   ```bash
   cd backend
   npm start
   ```
3. **Tunnel to the Internet:**
   ```bash
   ngrok http 3000
   ```
*(The backend CORS and frontend Axios are fully pre-configured to dynamically support `ngrok-free.app` domains without hardcoding).*

---

## 📚 API Reference

The backend provides a comprehensive REST architecture secured via JWT tokens.

| Group | Endpoint | Description | Auth Required |
|---|---|---|---|
| **Public** | `GET /form/formGet` | Retrieve paginated list of patents | None |
| **Public** | `GET /form/downloadExcel` | Export patent data (supports data filtering) | None |
| **System** | `GET /health` | Check MySQL database connectivity | None |
| **Auth** | `POST /login` | Authenticate an admin user | None |
| **Patents** | `POST /form/formEntry` | Submit a new patent (with PDFs) | Any Admin |
| **Patents** | `PUT /form/formEntryUpdate` | Update existing patent | Any Admin |
| **Patents** | `DELETE /form/deleteEntry/:id`| Remove patent and associated PDFs | Any Admin |
| **Admins** | `GET /admin/admins` | List paginated administrators | Super Admin |
| **Logs** | `POST /admin/logs/cleanup` | Delete audit logs older than N months | Super Admin |

*For the complete list of 21 unique endpoints and parameter documentation, view the respective router files in `backend/routers/`.*

---

## 🛠️ Technology Stack

**Frontend:**
- React 19 Ecosystem (react-router-dom)
- Vite 7 tooling
- Tailwind CSS 4 styling
- Framer Motion animations
- ExcelJS (Client-side spreadsheet generation)

**Backend:**
- Node.js Express 5 server
- MySQL2 (Promise-based client)
- JWT Authentication & Bcrypt Hashing
- Multer (Multipart PDF uploads)
- Joi (Robust payload validation schema)

## 🔒 Security Posture

- **Input Validation:** Joi request body validation preventing malformed data.
- **Injection Protection:** Parameterized queries and backtick column escaping for dynamic sorts.
- **Denial of Service:** `express.json` request body capped at 1MB.
- **Fast Startup Failures:** Pre-flight checks ensure all critical environment variables exist at boot.
# college-books
