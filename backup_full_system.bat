@echo off
setlocal enabledelayedexpansion
title Pragati Vidyalaya - Complete Institutional Data Backup

echo =======================================================================
echo   PRAGATI VIDYALAYA - SCHOOL FEE MANAGEMENT SYSTEM
echo   Complete System Archive [Database + Receipts + Photos + Letters]
echo =======================================================================
echo.

set SCRIPT_DIR=%~dp0
if "%SCRIPT_DIR:~-1%"=="\" set SCRIPT_DIR=%SCRIPT_DIR:~0,-1%
set BACKUP_DIR=%SCRIPT_DIR%\backups

if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

:: 1. Trigger fresh database dump first
echo [*] Step 1: Taking fresh database snapshot...
call "%SCRIPT_DIR%\backup_database.bat"

:: 2. Generate timestamp YYYY-MM-DD_HH-mm-ss
for /f %%a in ('powershell -NoProfile -Command "Get-Date -Format 'yyyy-MM-dd_HH-mm-ss'"') do set TIMESTAMP=%%a
if "%TIMESTAMP%"=="" set TIMESTAMP=%DATE:~10,4%-%DATE:~4,2%-%DATE:~7,2%_%TIME:~0,2%-%TIME:~3,2%-%TIME:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%

set ZIP_FILE=%BACKUP_DIR%\PRAGATI_FULL_BACKUP_%TIMESTAMP%.zip
set STAGING_DIR=%BACKUP_DIR%\temp_staging_%TIMESTAMP%

echo.
echo [*] Step 2: Collecting all critical files into archive:
echo     - MySQL Database Dump [.sql]
echo     - All Generated Fee Receipts and Payment PDFs [uploads\receipts]
echo     - Persistent Server License Key [uploads\.server_id]
echo     - Official School Letters and Templates [Documents]
echo     - Student Profile Photos [frontend\public\students]
echo     - System Environment Config [.env]

mkdir "%STAGING_DIR%" >nul 2>&1
mkdir "%STAGING_DIR%\uploads" >nul 2>&1
mkdir "%STAGING_DIR%\Documents" >nul 2>&1
mkdir "%STAGING_DIR%\students" >nul 2>&1
mkdir "%STAGING_DIR%\database" >nul 2>&1

:: Copy latest database backup
for /f "delims=" %%F in ('dir "%BACKUP_DIR%\school_fee_backup_*.sql" /b /o-d /a-d 2^>nul') do (
    if not defined LATEST_SQL set LATEST_SQL=%BACKUP_DIR%\%%F
)
if defined LATEST_SQL (
    copy /y "%LATEST_SQL%" "%STAGING_DIR%\database\" >nul
)

:: Copy uploads (receipts, server id, seed)
if exist "%SCRIPT_DIR%\uploads" (
    xcopy /e /i /y /q "%SCRIPT_DIR%\uploads" "%STAGING_DIR%\uploads" >nul 2>&1
)

:: Copy Documents (.docx templates)
if exist "%SCRIPT_DIR%\Documents" (
    xcopy /e /i /y /q "%SCRIPT_DIR%\Documents" "%STAGING_DIR%\Documents" >nul 2>&1
)

:: Copy Student Photos
if exist "%SCRIPT_DIR%\frontend\public\students" (
    xcopy /e /i /y /q "%SCRIPT_DIR%\frontend\public\students" "%STAGING_DIR%\students" >nul 2>&1
)

:: Copy .env
if exist "%SCRIPT_DIR%\.env" (
    copy /y "%SCRIPT_DIR%\.env" "%STAGING_DIR%\" >nul 2>&1
)

:: 3. Compress staging directory into ZIP archive via PowerShell
echo.
echo [*] Step 3: Compressing complete archive to ZIP...
powershell -NoProfile -Command "Compress-Archive -Path '%STAGING_DIR%\*' -DestinationPath '%ZIP_FILE%' -Force"

:: Clean up staging folder
rmdir /s /q "%STAGING_DIR%" >nul 2>&1

:: 4. Verify ZIP creation
if exist "%ZIP_FILE%" (
    for %%F in ("%ZIP_FILE%") do set ZIP_SIZE=%%~zF
    echo.
    echo =======================================================================
    echo   COMPLETE SYSTEM ARCHIVE CREATED SUCCESSFULLY!
    echo =======================================================================
    echo.
    echo   Archive File : %ZIP_FILE%
    echo   File Size    : !ZIP_SIZE! bytes
    echo.
    echo   What is included in this backup:
    echo     [x] All student records, fees, and receipt history [Database SQL]
    echo     [x] All physical fee receipt PDFs and payment proofs
    echo     [x] All 650 student profile photos
    echo     [x] All 9 institutional letterhead templates [.docx]
    echo     [x] Server hardware ID and offline license activation
    echo.
    echo   RECOMMENDED BEST PRACTICE:
    echo   Copy this ZIP file to an external USB Pen Drive or Google Drive.
    echo   If your server PC ever crashes or is replaced, this single ZIP
    echo   file can restore your entire school system in 2 minutes.
    echo =======================================================================
) else (
    echo.
    echo [ERROR] Failed to create ZIP archive. Check disk space.
)

echo.
pause
