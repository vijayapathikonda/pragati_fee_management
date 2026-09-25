@echo off
setlocal enabledelayedexpansion

:: =========================================================================
:: Database Restore Script for School Fee Management System
:: Restores school_fee_db from a backup SQL file
:: =========================================================================

set SCRIPT_DIR=%~dp0
set BACKUP_DIR=%SCRIPT_DIR%backups

echo ==========================================================
echo   School Fee Management System - Database Restore Tool
echo ==========================================================
echo.

set RESTORE_FILE=%~1

if "%RESTORE_FILE%"=="" (
    :: Find latest backup
    for /f "delims=" %%F in ('dir "%BACKUP_DIR%\school_fee_backup_*.sql" /b /o-d /a-d 2^>nul') do (
        if not defined LATEST_FILE set LATEST_FILE=%BACKUP_DIR%\%%F
    )
    if defined LATEST_FILE (
        echo Found latest backup file:
        echo   !LATEST_FILE!
        echo.
        set /p CONFIRM="Restore this backup? [Y/N, default=Y]: " || set CONFIRM=Y
        if /i not "!CONFIRM!"=="Y" (
            set /p RESTORE_FILE="Enter full path to backup file: "
        ) else (
            set RESTORE_FILE=!LATEST_FILE!
        )
    ) else (
        echo [!] No backup files found in %BACKUP_DIR%
        set /p RESTORE_FILE="Please enter path to .sql backup file: "
    )
)

if not exist "%RESTORE_FILE%" (
    echo [ERROR] Specified file not found: %RESTORE_FILE%
    pause
    exit /b 1
)

echo.
echo [WARNING] Restoring will overwrite existing data in 'school_fee_db'!
echo Target file: %RESTORE_FILE%
set /p PROCEED="Are you sure you want to proceed? [type YES to continue]: "
if not "%PROCEED%"=="YES" (
    echo Restore cancelled by user.
    pause
    exit /b 0
)

echo.
echo [*] Restoring database...

docker ps --filter "name=school_fee_db" --filter "status=running" --format "{{.Names}}" | findstr /i "school_fee_db" >nul 2>&1
if %errorlevel% equ 0 (
    echo [*] Restoring into Docker container 'school_fee_db'...
    docker exec -i school_fee_db mysql -u root -prootpassword school_fee_db < "%RESTORE_FILE%"
) else (
    echo [*] Restoring into local MySQL server...
    where mysql >nul 2>&1
    if %errorlevel% equ 0 (
        mysql -u root -prootpassword school_fee_db < "%RESTORE_FILE%"
    ) else if exist "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" (
        "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -prootpassword school_fee_db < "%RESTORE_FILE%"
    ) else (
        echo [ERROR] Neither Docker container nor mysql client found.
        pause
        exit /b 1
    )
)

if %errorlevel% equ 0 (
    echo.
    echo ==========================================================
    echo [SUCCESS] Database restored successfully from:
    echo   %RESTORE_FILE%
    echo ==========================================================
) else (
    echo.
    echo [ERROR] Database restore failed. Please verify credentials.
)

pause
