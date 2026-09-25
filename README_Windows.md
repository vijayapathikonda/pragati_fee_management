# Windows Native Deployment Guide (Without Docker)

This guide provides instructions to manually install and configure the School Fee Management System on a Windows machine without using Docker. It covers setting up MySQL, Python FastAPI backend (as a Windows service), and the React frontend (hosted via IIS with a reverse proxy).

---

## 1. System Requirements & Prerequisites

Make sure you have the following software installed on your Windows machine:

1. **Python (v3.11 or v3.12)**: Download from the official website. Ensure you check **"Add Python to PATH"** during installation.
2. **Node.js (v20 LTS)**: Install the LTS version (includes `npm`).
3. **MySQL Server (v8.0)**: Download and install MySQL Community Server. Set a secure root password and configure it to run as a Windows Service (`MySQL80`).
4. **IIS (Internet Information Services)**: Included with Windows. See the IIS section below for activation.
5. **Git**: Installed for cloning or pulling updates.

---

## 2. Database Configuration

You can initialize the entire database (schema, master data, admin user, and 659 student records) in one step:

### Option A: Using the Automated PowerShell Script (Recommended)
Open PowerShell as Administrator:
```powershell
cd D:\personal\school\repo\fee_management
powershell -ExecutionPolicy Bypass -File .\db\setup_db.ps1 -DbUser root -DbPassword <rootpassword>
```

### Option B: Using the Windows Batch Script
Double-click `db\setup_db.bat` or run in Command Prompt:
```cmd
cd D:\personal\school\repo\fee_management
db\setup_db.bat
```

### Option C: Manual MySQL CLI Execution
Open the **MySQL Command Line Client** and execute:
```sql
CREATE DATABASE IF NOT EXISTS school_fee_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'school_user'@'localhost' IDENTIFIED BY 'school_password';
GRANT ALL PRIVILEGES ON school_fee_db.* TO 'school_user'@'localhost';
FLUSH PRIVILEGES;
```
Then import the full schema and data:
```cmd
mysql -h localhost -u root -p school_fee_db < db\init.sql
```

Default Administrator Credentials:
- **Email**: `admin@school.com`
- **Password**: `admin123`

---

## 3. Backend Deployment

1. **Copy Files**: Move the `backend` folder contents to your deployment directory (e.g., `C:\Apps\FeeManagement\Backend`).
2. **Environment Variables**: Create a `.env` file in `C:\Apps\FeeManagement\Backend` containing the following configurations:
   ```env
   ENVIRONMENT=production
   SECRET_KEY=09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7
   ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=30

   MYSQL_ROOT_PASSWORD=rootpassword
   MYSQL_DATABASE=school_fee_db
   MYSQL_USER=school_user
   MYSQL_PASSWORD=school_password
   MYSQL_HOST=localhost
   MYSQL_PORT=3306

   CORS_ORIGINS=["http://localhost", "http://localhost:5173", "http://localhost:80"]
   ```
3. **Virtual Environment & Dependencies**:
   Open **PowerShell** (as Administrator) and run:
   ```powershell
   cd C:\Apps\FeeManagement\Backend
   python -m venv venv
   .\venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   ```
4. **Database Migrations & Seeding**:
   *(If you ran `db\init.sql` or `setup_db.ps1` in Step 2, the schema, Alembic version, and all 659 student records are already loaded. You can verify or apply any future migrations with:)*
   ```powershell
   alembic upgrade head
   ```
5. **Run FastAPI Backend**:
   * **For Development**: Run directly with Uvicorn:
     ```powershell
     uvicorn app.main:app --host 127.0.0.1 --port 8000
     ```
   * **For Production (Windows Service)**: Use **NSSM (Non-Sucking Service Manager)** to wrap it as a background service:
     ```powershell
     nssm install FeeManagementBackend "C:\Apps\FeeManagement\Backend\venv\Scripts\uvicorn.exe"
     nssm set FeeManagementBackend AppParameters "app.main:app --host 127.0.0.1 --port 8000"
     nssm set FeeManagementBackend AppDirectory "C:\Apps\FeeManagement\Backend"
     nssm start FeeManagementBackend
     ```

---

## 4. Frontend Deployment

### Option A: Running Vite Development Server
1. Open a terminal in the `frontend` folder.
2. Install npm packages:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `frontend` folder:
   ```env
   VITE_API_BASE_URL=http://localhost:8000/api
   ```
4. Start the dev server:
   ```bash
   npm run dev
   ```
   *Access the app at `http://localhost:5173`.*

### Option B: Hosting via IIS (Production Setup)
1. **Compile React App**:
   In the `frontend` folder, run:
   ```powershell
   npm install
   npm run build
   ```
2. **Move Built Files**: Copy everything inside the `dist` folder to `C:\Apps\FeeManagement\React`.
3. **Enable IIS Windows Feature**:
   Open PowerShell as Administrator and run:
   ```powershell
   Enable-WindowsOptionalFeature -Online -FeatureName IIS-WebServerRole, IIS-WebServer, IIS-CommonHttpFeatures, IIS-StaticContent, IIS-DefaultDocument, IIS-DirectoryBrowsing, IIS-HttpErrors, IIS-HealthAndDiagnostics, IIS-HttpLogging, IIS-Performance, IIS-HttpCompressionStatic
   ```
4. **Install Rewrite & Proxy Extensions**:
   * Download and install [URL Rewrite 2.1](https://www.iis.net/downloads/microsoft/url-rewrite).
   * Download and install [Application Request Routing (ARR) 3.0](https://www.iis.net/downloads/microsoft/application-request-routing).
5. **Enable ARR Proxy**:
   * Open **IIS Manager** -> Click on your server node.
   * Double-click **Application Request Routing Cache**.
   * Click **Server Proxy Settings** in the right actions panel.
   * Check **Enable proxy** and click **Apply**.
6. **Create IIS Website**:
   * Create a new website in IIS. Set the physical path to `C:\Apps\FeeManagement\React` and specify your host address/port.
7. **Add Web Config Routing**:
   Place a `web.config` file inside `C:\Apps\FeeManagement\React` to manage single-page application routing and proxy API requests:
   ```xml
   <?xml version="1.0" encoding="UTF-8"?>
   <configuration>
       <system.webServer>
           <rewrite>
               <rules>
                   <!-- Rewrite API requests to Uvicorn Backend -->
                   <rule name="ReverseProxyAPI" stopProcessing="true">
                       <match url="^api/(.*)" />
                       <action type="Rewrite" url="http://127.0.0.1:8000/api/{R:1}" />
                   </rule>
                   <!-- Rewrite Static file requests to Uvicorn Backend -->
                   <rule name="ReverseProxyStatic" stopProcessing="true">
                       <match url="^static/(.*)" />
                       <action type="Rewrite" url="http://127.0.0.1:8000/static/{R:1}" />
                   </rule>
                   <!-- React SPA Routing -->
                   <rule name="ReactRoutes" stopProcessing="true">
                       <match url=".*" />
                       <conditions logicalGrouping="MatchAll">
                           <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
                           <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
                           <add input="{REQUEST_URI}" pattern="^/api/" negate="true" />
                           <add input="{REQUEST_URI}" pattern="^/static/" negate="true" />
                       </conditions>
                       <action type="Rewrite" url="/index.html" />
                   </rule>
               </rules>
           </rewrite>
       </system.webServer>
   </configuration>
   ```

---

## 5. Setting up the Initial Admin Account

1. Start both backend and frontend services.
2. Open your browser and navigate to the backend documentation at `http://127.0.0.1:8000/docs` (or via your reverse proxied IIS URL `/api/docs`).
3. Find the `/api/auth/register` endpoint under the **auth** group.
4. Execute the endpoint with the default admin credentials or any custom email/password you want:
   ```json
   {
     "email": "admin@school.com",
     "password": "admin123",
     "full_name": "Admin User"
   }
   ```
5. You can now log in to the frontend dashboard using these credentials.

*Note: For further configuration details like SSL certificates, backups, and firewall rules, check the full [Deployment_Guide.md](file:///d:/personal/school/Fee_management/Deployment_Guide.md) in the root repository.*
