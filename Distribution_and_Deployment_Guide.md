# Commercial Distribution & Production Deployment Guide
## Pragati Vidyalaya - School Fee Management & Institutional Documentation System

**Document Type:** Master Operational & Distribution Manual  
**Target Audience:** Software Vendor, Deployment Engineers, and School Administrators  
**System Model:** On-Premises Commercial Distribution (Sealed Machine Binaries / Zero-Source)

---

## 1. Overview & IP Protection Architecture

When deploying the School Fee Management System on-premises at client schools, **your proprietary intellectual property (IP) is 100% protected**:

- **Zero Source Code**: No `.py` (Python) or `.tsx` / `.ts` (React/TypeScript) files are ever provided to the client or mounted on the client machine.
- **Native Cython C-Compilation**: All 59 backend Python modules (business logic, fee services, crypto-licensing, authentication, database models, and API routes) are compiled into native C shared machine binaries (`.so` files) using Cython and GCC.
- **Sealed Production Docker Images**: Pre-compiled binary images (`school_fee_backend:latest` and `school_fee_frontend:latest`) are exported as sealed Docker image archives (`.tar`) that can be loaded into Docker without pulling from external registries.
- **Cryptographic Offline Licensing**: The system is cryptographically locked to the school server's unique motherboard/disk hardware signature using Ed25519 asymmetric cryptography.

---

## 2. Directory Tree of the Commercial Release Package

When built, the self-contained client package inside `dist_package\FeeManagement_Release_v1.0\` contains:

```
FeeManagement_Release_v1.0/
│
├── images/                                 <-- Sealed Docker Image Archives (Zero Source)
│   ├── backend_image.tar                  <-- Cython C-compiled backend (.so binaries)
│   ├── frontend_image.tar                 <-- Production Nginx web server + baked student photos
│   └── mysql_image.tar                    <-- (Optional) Offline MySQL 8.0 image
│
├── db_init/
│   └── init.sql                           <-- Clean database initialization script
│                                              (DDL + 655 students + photos + Pragathi Vidyalaya settings)
│                                              (0 fee assignments, 0 receipts)
│
├── Documents/                             <-- Official Word Letter Templates (.docx)
│   ├── Bonafide_Certificate.docx
│   ├── Study_Certificate.docx
│   ├── Transfer_Certificate.docx
│   ├── Fee_Estimation.docx
│   ├── Fee_Structure.docx
│   └── ... (All other letterhead templates)
│
├── uploads/                               <-- Persistent Data Folder
│   ├── students/                          <-- Student photos (student_12.jpeg to student_666.jpeg)
│   ├── receipts/                          <-- Generated fee receipt PDFs
│   ├── temp/                              <-- Temporary work directory
│   ├── .server_id                         <-- Hardware identifier
│   └── .server_seed                       <-- Cryptographic seed
│
├── docker-compose.yml                     <-- Client Compose file (DATA-ONLY mounts, NO source code)
├── .env                                   <-- Client production configuration
├── deploy_school.bat                      <-- 1-Click turnkey setup script
├── backup_full_system.bat                 <-- Automated full system backup script
├── restore_full_system.bat                <-- Disaster recovery restore script
├── setup_client_domain.bat                <-- Configures school domain on LAN client PCs
├── setup_scheduled_tasks.bat              <-- Windows Task Scheduler automation (boot + daily backup)
└── README_INSTRUCTIONS.txt                <-- Quick-start instructions for school administrators
```

---

## 3. Phase 1: How to Build the Distribution Package

Run this step on your development workstation whenever you want to generate a new commercial release for a school.

### Option A: Interactive Wizard (Recommended)
From the repository root folder (`fee_management`), double-click or run:

```cmd
build_distribution.bat
```

Select:
- **`[1]` Full Release Package**: Compiles Cython machine binaries, builds the frontend, packages all photos/documents/clean database, exports image TARs, and generates a turnkey `.zip`.
- **`[2]` Quick Package**: Assembles the client folder without re-exporting image TARs (useful for fast testing).
- **`[3]` Offline Release Package**: Full Release + exports the official MySQL 8.0 image for sites with zero internet connectivity.

### Option B: Command-Line Execution
```cmd
:: Full Release with compressed ZIP archive:
python tools\build_distribution_package.py --zip

:: 100% Offline Release (includes MySQL 8.0 image TAR):
python tools\build_distribution_package.py --include-mysql --zip
```

---

## 3b. Cloud Distribution via Private Docker Hub Registry

Instead of transporting massive 250MB+ `.tar` files, you can push the compiled, zero-source images directly to your private Docker Hub repository:

### 1. Build and Tag Images
```cmd
docker tag school_fee_backend:latest vijay9241/dockerrepo:fee-backend
docker tag school_fee_frontend:latest vijay9241/dockerrepo:fee-frontend
```

### 2. Push to Docker Hub
```cmd
docker push vijay9241/dockerrepo:fee-backend
docker push vijay9241/dockerrepo:fee-frontend
```

### 3. Deploy Anywhere via Docker Hub
- The `FeeManagement_Cloud_Release_v1.0.zip` package contains only the client scripts, templates, and database seed (under 65 MB including all 655 student photos, with 0 MB of TAR files).
- When `deploy_school.bat` runs on a machine logged in to Docker Hub (`docker login`), it automatically fetches the latest layers from `vijay9241/dockerrepo`!
- Updating a school takes seconds: only the modified layers are downloaded!

---

## 4. Phase 2: How to Deploy on the Client Server

Follow these steps on the target machine (or when testing locally in the `dist_package` folder):

### Step 4.1: Transfer and Extract
1. Copy `FeeManagement_Release_v1.0.zip` to the client computer (e.g., `C:\SchoolSoftware\FeeManagement_Release_v1.0`).
2. Extract the archive.

### Step 4.2: Run Turnkey Deployment
1. Ensure **Docker Desktop for Windows** is installed and running.
2. Open the extracted folder `FeeManagement_Release_v1.0`.
3. Right-click **`deploy_school.bat`** and select **"Run as administrator"**.

```cmd
deploy_school.bat
```

#### What `deploy_school.bat` executes automatically:
1. Validates the Docker engine daemon is reachable.
2. Loads pre-compiled Docker images from `images\*.tar`.
3. Prepares host storage folders (`uploads\`, `Documents\`, `db_init\`, `backups\`).
4. Starts the 3 containers (`school_fee_db`, `school_fee_backend`, `school_fee_frontend`) via `docker compose up -d`.
5. Adds a Windows Firewall rule to permit inbound LAN traffic on **TCP Port 80**.
6. Detects the host's LAN IPv4 address (e.g., `192.168.1.100`) and displays the access URL.

---

## 5. Production Credentials Reference

The production deployment in `FeeManagement_Release_v1.0\.env` uses dedicated secure credentials:

| Service | Parameter | Value |
| :--- | :--- | :--- |
| **Web Portal Admin** | URL | `http://localhost` (or `http://<SERVER_IP>`) |
| | Username / Email | `admin@school.com` |
| | Password | `admin123` |
| **Database Root** | Host / Port | `localhost:3306` (inside container: `db:3306`) |
| | User | `root` |
| | Password | `school_root_secure_password_2026` |
| **Application DB User** | User | `school_user` |
| | Password | `school_secure_password_2026` |
| | Database Name | `school_fee_db` |

---

## 6. Phase 3: System Verification Checklist

Run these commands on the deployed machine to verify full operational integrity:

### 1. Verify Zero Plain-Text Source Code Inside Container
```cmd
docker exec school_fee_backend find /app/app -name "*.py"
```
> **Expected Result:** Only `/app/app/main.py` (entrypoint bootstrap loader). Zero business logic, models, or service source files exist.

```cmd
docker exec school_fee_backend find /app/app -name "*.so"
```
> **Expected Result:** Lists all 59 compiled `.so` binary files (e.g., `fee_service...so`, `auth_service...so`, `crypto_service...so`, `master_models...so`).

---

### 2. Verify Database Initialization (655 Students & 0 Fees)
Run query using the production password:
```cmd
docker exec school_fee_db mysql -u root -pschool_root_secure_password_2026 school_fee_db -e "SELECT COUNT(*) AS total_students FROM students; SELECT COUNT(*) AS total_fee_assignments FROM fee_assignments; SELECT COUNT(*) AS total_receipts FROM fee_receipts;"
```
> **Expected Output:**
> ```
> +----------------+
> | total_students |
> +----------------+
> |            655 |
> +----------------+
> +-----------------------+
> | total_fee_assignments |
> +-----------------------+
> |                     0 |
> +-----------------------+
> +----------------+
> | total_receipts |
> +----------------+
> |              0 |
> +----------------+
> ```

---

### 3. Verify Student Photos Loading
Test direct photo delivery via Nginx:
```cmd
curl.exe -I http://localhost/students/student_12.jpeg
```
> **Expected Result:** `HTTP/1.1 200 OK`, `Content-Type: image/jpeg`.

Open `http://localhost` in your browser:
1. Log in with `admin@school.com` / `admin123`.
2. Navigate to **Students -> Student List**.
3. Confirm all 655 students display with their respective photos in the table.

---

### 4. Verify Grade-Level Batch Fee Assignment
1. Navigate to **Finance -> Fee Assignment**.
2. Select **Grade 1** and fee category **Tuition Fee**.
3. The system displays the KPI summary and roster of **92 students**.
4. Enter the default fee amount (e.g., `45000`) -> all selected students auto-fill.
5. Customize individual rows or uncheck any excluded students.
6. Click **Assign Fees to X Students** and confirm in the modal.
7. Verification: The summary immediately updates to show assigned totals, and re-submitting prevents duplicates.

---

### 5. Verify Document Templates & Hall Ticket Generation
1. Verify document templates are mounted inside the container:
   ```cmd
   docker exec school_fee_backend ls -la /app/Documents
   ```
2. Navigate to **Documentation -> Hall Tickets** in the web portal.
3. Select **Grade 1**, choose examination, and click **Generate Hall Tickets PDF**.
4. The generated PDF renders 2-per-page A4 examination tickets complete with student photos, exam schedules, and school header.

---

## 7. Phase 4: Multi-PC LAN Access Setup

To allow other computers in the school (Front Office, Principal's cabin, Accounts) to access the system:

### 1. Direct IP Access
From any computer connected to the same school Wi-Fi or router:
```
http://<SERVER_IP>
```
*(Example: `http://192.168.1.100`)*

### 2. Friendly Domain Name Setup (e.g., `http://pragativdyalaya.local`)
On each client PC:
1. Copy `setup_client_domain.bat` to the client PC.
2. Right-click and run as Administrator.
3. Enter the Server's IP address.
4. Users can now access the portal simply by typing:
   ```
   http://pragativdyalaya.local
   ```

---

## 8. Phase 5: Automated Backups & Disaster Recovery

### Daily Automated Backups (Windows Task Scheduler)
1. On the server machine, right-click `setup_scheduled_tasks.bat` and select **"Run as administrator"**.
2. This creates two automated Windows tasks:
   - **SchoolFeeApp-Startup**: Automatically starts Docker containers when the computer boots up.
   - **SchoolFeeApp-DailyBackup**: Automatically executes `backup_full_system.bat` every day at 6:00 PM.

### Manual Full Backup
Double-click `backup_full_system.bat`:
- Backs up the entire database (UTF-8 SQL dump).
- Backs up all student photos, uploaded documents, and receipt PDFs.
- Backs up official letter templates and configuration files.
- Creates a timestamped `.zip` archive in the `backups\` folder.

### Full Disaster Recovery / Restore
If migrating to a new machine or restoring after a hardware failure:
1. Deploy the software using `deploy_school.bat`.
2. Run `restore_full_system.bat <path_to_backup_zip>`.
3. The script restores the database, photos, receipts, and templates in 1 click.

---

## 9. Phase 6: Annual License Generation & Activation

The software includes hardware-bound offline licensing protected by Ed25519 asymmetric cryptography.

### 1. School Identifies Server ID
1. School administrator logs into `http://localhost`.
2. Goes to **System Settings -> License & Renewal**.
3. Copies their unique **Server ID** (format: `SCH-XXXX-XXXX-XXXX`).

### 2. Vendor Generates Signed License File
On your vendor machine:
```cmd
generate_license.bat
```
- Enter School Name: `Pragathi Vidyalaya`
- Enter Server ID: *(paste client's Server ID)*
- Enter Validity: `365` days (or any desired duration)
- The script uses your private Ed25519 key (`vendor_private.pem`) to sign the license and creates `Pragathi_Vidyalaya.lic`.

### 3. Client Activates License
1. Email or send `Pragathi_Vidyalaya.lic` to the school.
2. Administrator navigates to **System Settings -> License & Renewal**.
3. Clicks **"Upload License File"** and selects the `.lic` file.
4. The system validates the cryptographic signature against the embedded public key, verifies hardware binding, and activates access immediately.
