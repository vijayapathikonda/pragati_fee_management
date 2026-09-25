@echo off
setlocal enabledelayedexpansion
title Setup Windows Scheduled Tasks - School Fee Management

echo =======================================================================
echo   PRAGATI VIDYALAYA - SCHOOL FEE MANAGEMENT SYSTEM
echo   Windows Automated Tasks Registration (Boot Auto-Start & Daily Backup)
echo =======================================================================
echo.

:: 1. Check Administrator Privileges
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Administrative permissions required!
    echo         Please right-click this file and select "Run as administrator".
    echo.
    pause
    exit /b 1
)

set SCRIPT_DIR=%~dp0
:: Remove trailing backslash if present
if "%SCRIPT_DIR:~-1%"=="\" set SCRIPT_DIR=%SCRIPT_DIR:~0,-1%

echo [*] Project Directory: %SCRIPT_DIR%
echo.

:: 2. Register Startup Task (Auto-start system on Windows boot/logon)
echo [*] Registering auto-start task: 'SchoolFeeManagement_AutoStart'...
schtasks /query /tn "SchoolFeeManagement_AutoStart" >nul 2>&1
if %errorlevel% equ 0 (
    echo     Task already exists. Updating task...
    schtasks /delete /tn "SchoolFeeManagement_AutoStart" /f >nul 2>&1
)

schtasks /create /tn "SchoolFeeManagement_AutoStart" /tr "cmd.exe /c \"cd /d %SCRIPT_DIR% && docker compose up -d\"" /sc ONSTART /ru "SYSTEM" /rl HIGHEST /f >nul 2>&1
if %errorlevel% neq 0 (
    :: Fallback to ONLOGON if ONSTART requires special service accounts on non-server Windows
    schtasks /create /tn "SchoolFeeManagement_AutoStart" /tr "cmd.exe /c \"cd /d %SCRIPT_DIR% && docker compose up -d\"" /sc ONLOGON /rl HIGHEST /f >nul 2>&1
)

if %errorlevel% equ 0 (
    echo [OK] Auto-Start task registered successfully!
) else (
    echo [WARNING] Could not register auto-start task. You may start it manually via deploy_production.bat.
)
echo.

:: 3. Register Daily Backup Task (Runs every day at 18:00 / 6:00 PM)
echo [*] Registering daily backup task: 'SchoolFeeManagement_DailyBackup'...
schtasks /query /tn "SchoolFeeManagement_DailyBackup" >nul 2>&1
if %errorlevel% equ 0 (
    echo     Task already exists. Updating task...
    schtasks /delete /tn "SchoolFeeManagement_DailyBackup" /f >nul 2>&1
)

schtasks /create /tn "SchoolFeeManagement_DailyBackup" /tr "cmd.exe /c \"cd /d %SCRIPT_DIR% && backup_database.bat\"" /sc DAILY /st 18:00 /rl HIGHEST /f >nul 2>&1

if %errorlevel% equ 0 (
    echo [OK] Daily backup task registered successfully (Scheduled at 6:00 PM daily).
) else (
    echo [WARNING] Could not register daily backup task.
)

echo.
echo =======================================================================
echo   SCHEDULED TASKS CONFIGURED SUCCESSFULLY
echo =======================================================================
echo.
echo   1. Auto-Start   : System containers will automatically start when the
echo                     computer boots or logs in.
echo   2. Daily Backup : A database snapshot will be automatically saved to
echo                     %SCRIPT_DIR%\backups every day at 6:00 PM.
echo.
pause
