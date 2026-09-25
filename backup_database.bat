@echo off
setlocal enabledelayedexpansion

:: =========================================================================
:: Automated Database Backup Script for School Fee Management System
:: Can be run manually or registered in Windows Task Scheduler (Daily)
:: =========================================================================

set SCRIPT_DIR=%~dp0
set BACKUP_DIR=%SCRIPT_DIR%backups
set LOG_FILE=%BACKUP_DIR%\backup_log.txt

if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

:: Generate robust timestamp YYYY-MM-DD_HH-mm-ss
for /f %%a in ('powershell -NoProfile -Command "Get-Date -Format 'yyyy-MM-dd_HH-mm-ss'"') do set TIMESTAMP=%%a
if "%TIMESTAMP%"=="" set TIMESTAMP=%DATE:~10,4%-%DATE:~4,2%-%DATE:~7,2%_%TIME:~0,2%-%TIME:~3,2%-%TIME:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%

set DUMP_FILE=%BACKUP_DIR%\school_fee_backup_%TIMESTAMP%.sql

echo [%DATE% %TIME%] Starting scheduled database backup... >> "%LOG_FILE%"

:: Check if Docker container school_fee_db is active
docker ps --filter "name=school_fee_db" --filter "status=running" --format "{{.Names}}" | findstr /i "school_fee_db" >nul 2>&1
if %errorlevel% equ 0 (
    echo [*] Backing up from Docker container 'school_fee_db'...
    docker exec school_fee_db mysqldump -u root -prootpassword school_fee_db > "%DUMP_FILE%" 2>> "%LOG_FILE%"
) else (
    echo [*] Docker container not detected. Attempting local mysqldump...
    where mysqldump >nul 2>&1
    if %errorlevel% equ 0 (
        mysqldump -u root -prootpassword school_fee_db > "%DUMP_FILE%" 2>> "%LOG_FILE%"
    ) else if exist "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe" (
        "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe" -u root -prootpassword school_fee_db > "%DUMP_FILE%" 2>> "%LOG_FILE%"
    ) else (
        echo [ERROR] Neither Docker container nor local mysqldump found! >> "%LOG_FILE%"
        echo [ERROR] Backup failed. See %LOG_FILE%
        exit /b 1
    )
)

:: Verify file exists and has content
if exist "%DUMP_FILE%" (
    for %%F in ("%DUMP_FILE%") do set FILE_SIZE=%%~zF
    if !FILE_SIZE! gtr 1000 (
        echo [SUCCESS] Backup created: %DUMP_FILE% [!FILE_SIZE! bytes]
        echo [%DATE% %TIME%] SUCCESS: Backup created: %DUMP_FILE% [!FILE_SIZE! bytes] >> "%LOG_FILE%"
    ) else (
        echo [ERROR] Backup file created but is empty or too small. Check credentials.
        echo [%DATE% %TIME%] FAILED: Dump file is empty or too small >> "%LOG_FILE%"
        del "%DUMP_FILE%" 2>nul
        exit /b 1
    )
) else (
    echo [ERROR] Failed to generate backup file.
    echo [%DATE% %TIME%] FAILED: File was not created >> "%LOG_FILE%"
    exit /b 1
)

:: Keep only the last 30 backup files (Cleanup older files)
echo [*] Cleaning up old backups (retaining latest 30)...
for /f "skip=30 delims=" %%F in ('dir "%BACKUP_DIR%\school_fee_backup_*.sql" /b /o-d /a-d 2^>nul') do (
    echo Deleting old backup: %%F
    del "%BACKUP_DIR%\%%F" 2>nul
    echo [%DATE% %TIME%] Purged old backup: %%F >> "%LOG_FILE%"
)

echo [OK] Backup process finished successfully.
