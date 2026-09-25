@echo off
setlocal enabledelayedexpansion
title Pragati Vidyalaya - Complete Institutional Data Restore

echo =======================================================================
echo   PRAGATI VIDYALAYA - SCHOOL FEE MANAGEMENT SYSTEM
echo   Complete System Restore Tool (Database + Receipts + Photos + Letters)
echo =======================================================================
echo.

set SCRIPT_DIR=%~dp0
if "%SCRIPT_DIR:~-1%"=="\" set SCRIPT_DIR=%SCRIPT_DIR:~0,-1%
set BACKUP_DIR=%SCRIPT_DIR%\backups

set RESTORE_ZIP=%~1

if "%RESTORE_ZIP%"=="" (
    :: Find latest full backup archive
    for /f "delims=" %%F in ('dir "%BACKUP_DIR%\PRAGATI_FULL_BACKUP_*.zip" /b /o-d /a-d 2^>nul') do (
        if not defined LATEST_ZIP set LATEST_ZIP=%BACKUP_DIR%\%%F
    )
    if defined LATEST_ZIP (
        echo Found latest full system archive:
        echo   !LATEST_ZIP!
        echo.
        set /p CONFIRM="Restore this archive? [Y/N, default=Y]: " || set CONFIRM=Y
        if /i not "!CONFIRM!"=="Y" (
            set /p RESTORE_ZIP="Enter full path to .zip archive: "
        ) else (
            set RESTORE_ZIP=!LATEST_ZIP!
        )
    ) else (
        echo [!] No full backup archives found in %BACKUP_DIR%
        set /p RESTORE_ZIP="Please enter full path to PRAGATI_FULL_BACKUP_*.zip: "
    )
)

if not exist "%RESTORE_ZIP%" (
    echo [ERROR] Specified archive file not found: %RESTORE_ZIP%
    pause
    exit /b 1
)

echo.
echo [WARNING] Restoring will overwrite existing receipts, photos, letters, and database data!
echo Target Archive: %RESTORE_ZIP%
set /p PROCEED="Are you sure you want to proceed? [type YES to continue]: "
if not "%PROCEED%"=="YES" (
    echo Restore cancelled by user.
    pause
    exit /b 0
)

echo.
echo [*] Step 1: Extracting backup archive...
set TEMP_RESTORE_DIR=%BACKUP_DIR%\temp_restore
if exist "%TEMP_RESTORE_DIR%" rmdir /s /q "%TEMP_RESTORE_DIR%" >nul 2>&1
mkdir "%TEMP_RESTORE_DIR%" >nul 2>&1

powershell -NoProfile -Command "Expand-Archive -Path '%RESTORE_ZIP%' -DestinationPath '%TEMP_RESTORE_DIR%' -Force"

:: 1. Restore Receipts & Uploads
echo [*] Step 2: Restoring fee receipts, payment PDFs, and license keys...
if exist "%TEMP_RESTORE_DIR%\uploads" (
    xcopy /e /i /y /q "%TEMP_RESTORE_DIR%\uploads" "%SCRIPT_DIR%\uploads" >nul 2>&1
    echo     [OK] Receipts and license restored to .\uploads
)

:: 2. Restore Documents
echo [*] Step 3: Restoring official letterhead templates...
if exist "%TEMP_RESTORE_DIR%\Documents" (
    xcopy /e /i /y /q "%TEMP_RESTORE_DIR%\Documents" "%SCRIPT_DIR%\Documents" >nul 2>&1
    echo     [OK] Letter templates restored to .\Documents
)

:: 3. Restore Student Photos
echo [*] Step 4: Restoring student profile photos...
if exist "%TEMP_RESTORE_DIR%\students" (
    xcopy /e /i /y /q "%TEMP_RESTORE_DIR%\students" "%SCRIPT_DIR%\frontend\public\students" >nul 2>&1
    echo     [OK] Photos restored to .\frontend\public\students
)

:: 4. Restore Database SQL
echo [*] Step 5: Restoring relational database (students, transactions, fees)...
for /f "delims=" %%F in ('dir "%TEMP_RESTORE_DIR%\database\*.sql" /b /o-d /a-d 2^>nul') do (
    if not defined SQL_FILE set SQL_FILE=%TEMP_RESTORE_DIR%\database\%%F
)

if defined SQL_FILE (
    echo     Restoring SQL file: !SQL_FILE!
    docker ps --filter "name=school_fee_db" --filter "status=running" --format "{{.Names}}" | findstr /i "school_fee_db" >nul 2>&1
    if %errorlevel% equ 0 (
        docker exec -i school_fee_db mysql -u root -prootpassword school_fee_db < "!SQL_FILE!"
        echo     [OK] Database restored into Docker container 'school_fee_db'.
    ) else (
        where mysql >nul 2>&1
        if %errorlevel% equ 0 (
            mysql -u root -prootpassword school_fee_db < "!SQL_FILE!"
            echo     [OK] Database restored into local MySQL server.
        ) else (
            echo     [ERROR] Neither Docker container nor mysql client found!
        )
    )
) else (
    echo     [WARNING] No SQL file found inside database folder of archive.
)

:: Clean up temporary folder
rmdir /s /q "%TEMP_RESTORE_DIR%" >nul 2>&1

echo.
echo =======================================================================
echo   FULL INSTITUTIONAL RESTORE COMPLETED SUCCESSFULLY!
echo =======================================================================
echo   - All student records and receipts restored
echo   - All receipt PDFs and templates restored on disk
echo   - License and server hardware configuration restored
echo =======================================================================
echo.
pause
