@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"
title School Fee Management System - Client On-Premises Deployment

echo =======================================================================
echo   PRAGATI VIDYALAYA - SCHOOL FEE MANAGEMENT SYSTEM
echo   Commercial On-Premises Client Setup (Zero-Source Binary Package)
echo =======================================================================
echo.

:: 1. Check Administrator Privileges
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [*] NOTE: To automatically configure the Windows Firewall rule for LAN
    echo     access, please right-click this script and select "Run as administrator".
    echo     Continuing with standard privileges...
    echo.
)

:: 2. Check Docker Engine
echo [*] Step 1: Checking Docker engine...
where docker >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker is not installed or not in PATH!
    echo         Please install Docker Desktop for Windows from:
    echo         https://www.docker.com/products/docker-desktop/
    pause
    exit /b 1
)

docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker Desktop is installed but NOT running!
    echo         Please start Docker Desktop and wait until the whale icon is steady.
    echo.
    set /p RETRY="Press [Enter] once Docker Desktop is running, or [Q] to quit: "
    if /i "!RETRY!"=="Q" exit /b 1
    docker info >nul 2>&1
    if %errorlevel% neq 0 (
        echo [ERROR] Docker daemon still unreachable. Exiting.
        pause
        exit /b 1
    )
)
echo [OK] Docker engine is running.
echo.

:: 3. Load Pre-Built Images from images/ or Docker Hub
if exist "images\backend_image.tar" (
    docker image inspect vijay9241/dockerrepo:fee-backend >nul 2>&1
    if !errorlevel! equ 0 (
        echo [*] Step 2: Backend image is already present in Docker.
    ) else (
        docker image inspect school_fee_backend:latest >nul 2>&1
        if !errorlevel! equ 0 (
            docker tag school_fee_backend:latest vijay9241/dockerrepo:fee-backend >nul 2>&1
            echo [*] Step 2: Backend image is already present in Docker.
        ) else (
            echo [*] Step 2: Loading sealed backend binary image from local archive...
            docker load -i "images\backend_image.tar"
            docker tag school_fee_backend:latest vijay9241/dockerrepo:fee-backend >nul 2>&1
            echo [OK] Backend image loaded successfully.
        )
    )
) else (
    echo [*] Step 2: Fetching backend image from Docker Hub...
    docker compose pull backend
)

if exist "images\frontend_image.tar" (
    docker image inspect vijay9241/dockerrepo:fee-frontend >nul 2>&1
    if !errorlevel! equ 0 (
        echo [*] Step 3: Frontend image is already present in Docker.
    ) else (
        docker image inspect school_fee_frontend:latest >nul 2>&1
        if !errorlevel! equ 0 (
            docker tag school_fee_frontend:latest vijay9241/dockerrepo:fee-frontend >nul 2>&1
            echo [*] Step 3: Frontend image is already present in Docker.
        ) else (
            echo [*] Step 3: Loading sealed frontend production image from local archive...
            docker load -i "images\frontend_image.tar"
            docker tag school_fee_frontend:latest vijay9241/dockerrepo:fee-frontend >nul 2>&1
            echo [OK] Frontend image loaded successfully.
        )
    )
) else (
    echo [*] Step 3: Fetching frontend image from Docker Hub...
    docker compose pull frontend
)

if exist "images\mysql_image.tar" (
    docker image inspect mysql:8.0 >nul 2>&1
    if !errorlevel! equ 0 (
        echo [*] Step 4: MySQL 8.0 image is already present in Docker.
    ) else (
        echo [*] Step 4: Loading MySQL database engine image into Docker...
        docker load -i "images\mysql_image.tar"
        echo [OK] MySQL image loaded successfully.
    )
)
echo.

:: 4. Ensure Necessary Directories
echo [*] Step 5: Verifying data directories on host drive...
if not exist "uploads" mkdir uploads
if not exist "uploads\receipts" mkdir uploads\receipts
if not exist "uploads\temp" mkdir uploads\temp
if not exist "backups" mkdir backups
if not exist "Documents" mkdir Documents
if not exist "db_init" mkdir db_init
echo [OK] Data directories verified.
echo.

:: 5. Launch System via Docker Compose
echo [*] Step 6: Starting containers...
docker compose up -d

if %errorlevel% neq 0 (
    echo [ERROR] Docker Compose failed to start the containers.
    pause
    exit /b 1
)

echo.
echo [*] Waiting 10 seconds for database and backend services to initialize...
timeout /t 10 /nobreak >nul

:: 6. Windows Firewall Rule for Port 80
net session >nul 2>&1
if %errorlevel% equ 0 (
    echo [*] Configuring Windows Firewall for LAN Port 80...
    netsh advfirewall firewall show rule name="School Fee Management System (Port 80)" >nul 2>&1
    if %errorlevel% neq 0 (
        netsh advfirewall firewall add rule name="School Fee Management System (Port 80)" dir=in action=allow protocol=TCP localport=80 >nul 2>&1
        echo [OK] Inbound rule added for Port 80.
    ) else (
        echo [OK] Firewall rule already exists.
    )
)
echo.

:: 7. Detect Local IPv4
set SERVER_IP=localhost
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address"') do (
    set "RAW_IP=%%a"
    set "TRIMMED_IP=!RAW_IP: =!"
    if not "!TRIMMED_IP!"=="" (
        set SERVER_IP=!TRIMMED_IP!
    )
)

echo =======================================================================
echo   DEPLOYMENT SUCCESSFUL! SYSTEM IS RUNNING
echo =======================================================================
echo.
echo   Local Access (This PC):
echo     - Application Portal : http://localhost
echo.
echo   LAN Access (Other School PCs / Laptops on same Wi-Fi):
echo     - Open Browser to    : http://!SERVER_IP!
echo.
echo   Administrator Credentials:
echo     - Email              : admin@school.com
echo     - Password           : admin123
echo.
echo   License Activation:
echo     - Go to: http://localhost/admin/settings -> "License & Renewal" tab
echo     - Copy your unique Server ID and provide it to your software vendor
echo       to receive your 1-year cryptographic license file (.lic).
echo =======================================================================
pause
