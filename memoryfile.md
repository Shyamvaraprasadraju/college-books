# Project Memory: College Publications & Patents

## Overview
A modern full-stack web application designed for academic institutions to manage, store, and publicly display faculty patent publications.

## Tech Stack
### Frontend
- **Framework:** React 19 + Vite 7
- **Styling:** Tailwind CSS 4, Framer Motion (animations)
- **Routing:** React Router DOM v7
- **Utilities:** ExcelJS (for client-side Excel parsing/generation), jsPDF (for PDFs), Axios
- **Icons:** Lucide React

### Backend
- **Framework:** Node.js + Express 5
- **Database:** MySQL (using `mysql2` promises)
- **Authentication:** JWT (`jsonwebtoken`) & password hashing (`bcryptjs`)
- **File Handling:** `multer` for multipart PDF uploads
- **Validation:** `joi` for robust payload validation
- **Security & Utilities:** `helmet`, `cors`, `express-rate-limit`, `node-cron` (for automated backups), `archiver`

## Architecture & Features
### Public Portal
- **Browse & Search:** Fully paginated, sortable, and filterable table of all faculty patents.
- **Export Filters:** Smart Excel export mapping the active table filters.
- **Responsive Design:** Supports desktop and mobile seamlessly.

### Admin Dashboard
- **Role-Based Access Control (RBAC):** Super Admins vs. Sub-admins (department-restricted).
- **Patent Submission:** Multi-file PDF uploads with live duplicate detection.
- **Bulk Import:** Client-side parsing of Excel spreadsheets for one-click batch uploading.
- **Audit Trails:** Comprehensive logging of system actions (creates, updates, deletes).
- **System Health:** Automated database backup system and health checks.

## Development Setup
- **Frontend:** Install dependencies and run `npm run dev` to start the Vite development server.
- **Backend:** Install dependencies, configure `.env`, and run `npm run dev` to start the Express server with Nodemon.
- **Unified Server (Production):** The backend can natively host the optimized React frontend build for simplified deployment (e.g., Ngrok).
