# School Fee Management System (Phase 1 & 2)

This is a production-ready enterprise application for managing school fees.

## Phase 2 Updates: Master Modules
The following master data modules have been added:
- Academic Years, Grades, Sections
- Fee Categories, Payment Modes, Late Fee Rules, Discount Types
- Application Settings, School Information

Features included in Phase 2:
- Full CRUD APIs for all masters with generic search, sort, and pagination.
- Generic React `MasterCrudView` component using `@mui/x-data-grid`.
- "Export to Excel" functionality for all tables.
- Nested side navigation.

## Phase 3 Updates: Student Management
The following student management features have been added:
- Advanced paginated DataGrid with filters for Grade, Section, and Status.
- "New Admission" multi-step flow capturing personal and academic data.
- Photo Upload functionality seamlessly integrated via Docker volume mounting.
- Excel Import for bulk admission, validating Master Data automatically.
- Excel Export respecting active filter states.
- Dedicated Student Profile view.

## Phase 4 Updates: Fee Assignment Module
The following finance features have been added:
- Flexible `FeeAssignment` models allowing custom amounts, multiple installments, and granular tracking per student.
- Automatic server-side discount calculation (percentage and flat amount).
- Dynamic Student Financial Summary (Total Assigned, Paid, Outstanding).
- Interactive "Fee Assignments" dashboard to search students and manage individual fee line-items.
- Financial Summary widget embedded securely into the Student Profile view.

## Phase 5 Updates: Fee Collection Module
The following payment processing features have been added:
- POS-Style "Fee Collection" interface allowing simultaneous, multi-category fee payments.
- Robust support for partial payments with built-in validation preventing over-payments.
- Generation of detailed, professional PDF receipts using `reportlab`.
- Consolidated "Payment History" dashboard supporting receipt re-printing.
- Safe Receipt Cancellation functionality that instantly reverts student balances and maintains an audit trail.

## Phase 6 Updates: Executive Dashboard
The following analytics features have been added:
- High-level KPI metric cards (Total Students, Today's Collection, Outstanding Amounts).
- Comprehensive SQL aggregation engine enabling filtering across Academic Year, Grade, Section, and Date Ranges.
- Interactive visualizations powered by `ApexCharts` (Daily Collection area charts, Category bar charts, Payment Mode donut charts).
- Live tabular feeds for Top Defaulters and Recent Payments for rapid follow-up.

## Phase 7 Updates: Reports Module
The following reporting features have been added:
- Centralized Reports Hub allowing users to preview reports in-browser before downloading.
- Dynamic Filter controls that adapt to the selected report type.
- Consolidated `ExportService` capable of exporting unified `ReportData` to multiple formats seamlessly.
- Available Exports: **PDF (Tabular Landscape)**, **Excel (.xlsx)**, and **CSV**.
- Available Reports: Outstanding Fees, Student Ledger, Collection Register, Discounts & Scholarships, and Overdue / Late Fees.

## Phase 8 Updates: Administration Module
The following administration features have been added:
- **System Settings Hub**: Manage School Info, SMTP, and Receipt/Admission Number formats dynamically.
- **User Management**: Full CRUD capabilities to manage Staff and Admin accounts.
- **Security**: Self-service profile page for password updates.
- **Audit Logs**: Comprehensive tracking of user actions (IP address, timestamps, and resource modifications).
- **Backups**: 1-click ZIP archiving of the entire `uploads` directory (PDFs and Photos).

## Phase 9 Updates: Offline 1-Year Tamper-Resistant Licensing
The following enterprise offline licensing features have been implemented:
- **Asymmetric Cryptography (Ed25519)**: Software licenses (`.lic` files) are digitally signed using a private key held only by the vendor; the application verifies the signature using the embedded public key.
- **Hardware Server Binding**: Licenses are locked to the specific machine's **Server Hardware ID** (`SCH-XXXX-XXXX-XXXX`), preventing copying to unauthorized servers.
- **Clock Rollback Protection**: Real-time detection of backwards system clock tampering via high-water epoch tracking across audit logs and transactions.
- **Transparent Expiration Visibility**:
  - **Top AppBar**: Live chip displaying the exact license expiration date (`Valid till: 15 Sep 2027`) with days remaining.
  - **System Settings Tab**: Dedicated "License & Renewal" tab with comprehensive status, expiration countdown, Server ID, and renewal file upload.
- **30-Day Proactive Notification Banner**: Prominent warning banner displayed across the application when fewer than 30 days remain.
- **Graceful Expiration (Read-Only Mode)**: If expired, the application protects operations by permitting read-only access (records and receipts remain accessible) while blocking new fee collections until renewed.
- **Vendor CLI Generator Tool**: Located in `tools/generate_license.py` for generating 1-year signed `.lic` files for schools.


## Technology Stack
- **Frontend**: React 19, TypeScript, Vite, Material UI
- **Backend**: Python 3.13, FastAPI, SQLAlchemy 2, Alembic
- **Database**: MySQL 8
- **Deployment**: Docker, Docker Compose

## Setup and Usage

### Docker Setup (Recommended)
1. **Prerequisites**: Ensure you have Docker and Docker Compose installed.
2. **Start the application**:
   ```bash
   docker compose up -d --build
   ```
   *Note: On first startup, MySQL automatically executes `db/init.sql`, which initializes the entire database, all 19 tables, 41 academic years, 10 grades, payment modes, system settings, default administrator account, and 659 active student records.*
3. **Access the application**:
   - Frontend: [http://localhost](http://localhost)
   - Backend API: [http://localhost:8002/api](http://localhost:8002/api) (Swagger docs: [http://localhost:8002/api/docs](http://localhost:8002/api/docs))
   - Health Check: [http://localhost:8002/api/health](http://localhost:8002/api/health)
   - Default Administrator Credentials:
     - **Email**: `admin@school.com`
     - **Password**: `admin123`

### Standalone Setup (Without Docker)
For deploying natively on MySQL without Docker:
1. **Initialize Database**:
   - **PowerShell (Recommended)**:
     ```powershell
     powershell -ExecutionPolicy Bypass -File .\db\setup_db.ps1 -DbUser root -DbPassword <password>
     ```
   - **Windows Command Prompt**:
     ```cmd
     db\setup_db.bat
     ```
   - **Linux / macOS**:
     ```bash
     chmod +x db/setup_db.sh
     ./db/setup_db.sh
     ```
   - **Direct MySQL CLI**:
     ```bash
     mysql -h localhost -u root -p < db/init.sql
     ```
2. For complete Windows native deployment with IIS and Python service, refer to [README_Windows.md](README_Windows.md) and [Deployment_Guide.md](Deployment_Guide.md).


## Architecture Overview
This project strictly follows Clean Architecture and SOLID principles.

### Backend Structure
- `app/api/`: API Routes and Controllers
- `app/core/`: Configuration, Security, Logging, Exceptions
- `app/domain/`: SQLAlchemy Models (Entities)
- `app/schemas/`: Pydantic Models (DTOs)
- `app/repositories/`: Data Access Layer
- `app/services/`: Business Logic
- `app/infrastructure/`: Database Connection

### Frontend Structure
- `src/components/`: Reusable UI Components
- `src/pages/`: Page level components
- `src/services/`: Axios API configurations
- `src/theme/`: Material UI Theme
- `src/routes/`: React Router definitions
