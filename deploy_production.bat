@echo off
setlocal enabledelayedexpansion
title School Fee Management System - Production Deployment

echo =======================================================================
echo   PRAGATI VIDYALAYA - SCHOOL FEE MANAGEMENT SYSTEM
echo   Windows Production Deployment & Auto-Configuration Script
echo =======================================================================
echo.

:: 1. Check Administrator Privileges
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] NOTE: To automatically configure the Windows Firewall rule for LAN
    echo     access, please right-click this script and select "Run as administrator".
    echo     Continuing with standard privileges...
    echo.
)

:: 2. Check Docker Installation
echo [*] Checking Docker engine...
where docker >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker is not installed or not in PATH!
    echo         Please install Docker Desktop for Windows from:
    echo         https://www.docker.com/products/docker-desktop/
    pause
    exit /b 1
)

:: Check if Docker daemon is running
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

:: 3. Ensure Environment File (.env)
if not exist ".env" (
    if exist ".env.example" (
        echo [*] Creating .env from .env.example...
        copy ".env.example" ".env" >nul
        echo [OK] Created .env configuration file.
    ) else (
        echo [!] Warning: Neither .env nor .env.example found. Docker Compose will use defaults.
    )
) else (
    echo [OK] Found active .env file.
)

:: 4. Ensure Directory Structure
echo [*] Checking necessary directories...
if not exist "uploads" mkdir uploads
if not exist "uploads\receipts" mkdir uploads\receipts
if not exist "uploads\temp" mkdir uploads\temp
if not exist "backups" mkdir backups
if not exist "Documents" mkdir Documents
echo [OK] Directories verified (uploads, backups, Documents).
echo.

:: 5. Build and Launch Containers
echo [*] Starting School Fee Management containers via Docker Compose...
echo     (This will build the production React bundle and FastAPI service)
echo.
docker compose up -d --build

if %errorlevel% neq 0 (
    echo [ERROR] Docker Compose failed to start the containers.
    pause
    exit /b 1
)

echo.
echo [*] Waiting for database and backend services to initialize...
timeout /t 10 /nobreak >nul

:: 6. Optional Windows Firewall Configuration
net session >nul 2>&1
if %errorlevel% equ 0 (
    echo [*] Configuring Windows Firewall to allow LAN traffic on Port 80...
    netsh advfirewall firewall show rule name="School Fee Management System (Port 80)" >nul 2>&1
    if %errorlevel% neq 0 (
        netsh advfirewall firewall add rule name="School Fee Management System (Port 80)" dir=in action=allow protocol=TCP localport=80 >nul 2>&1
        echo [OK] Windows Firewall inbound rule added for Port 80.
    ) else (
        echo [OK] Windows Firewall rule already exists.
    )
) else (
    echo [!] Skipping Windows Firewall rule (Run as Administrator to enable automatically).
)
echo.

:: 7. Detect Local IPv4 Address
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
echo     - Direct Backend API : http://localhost:8002/docs
echo.
echo   LAN Access (Other School PCs / Laptops on same Wi-Fi or Switch):
echo     - Open Browser to    : http://!SERVER_IP!
echo.
echo   Administrator Credentials:
echo     - Email              : admin@school.com
echo     - Password           : admin123
echo.
echo   Documents & Artifacts:
echo     - Institutional templates are loaded from .\Documents
echo     - Student certificates and printouts available at /artifacts
echo.
echo =======================================================================
pause
