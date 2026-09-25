@echo off
setlocal enabledelayedexpansion

echo ==========================================================
echo   School Fee Management - Standalone Database Setup
echo ==========================================================

set SCRIPT_DIR=%~dp0
set SQL_FILE=%SCRIPT_DIR%init.sql

if not exist "%SQL_FILE%" (
    echo [ERROR] SQL file not found: %SQL_FILE%
    exit /b 1
)

set DB_HOST=localhost
set DB_PORT=3306
set DB_USER=root

set /p DB_HOST="Enter MySQL Host [%DB_HOST%]: " || set DB_HOST=localhost
set /p DB_PORT="Enter MySQL Port [%DB_PORT%]: " || set DB_PORT=3306
set /p DB_USER="Enter MySQL Username [%DB_USER%]: " || set DB_USER=root
set /p DB_PASSWORD="Enter MySQL Password: "

echo.
echo [*] Checking MySQL client...
where mysql >nul 2>nul
if %ERRORLEVEL% equ 0 (
    set MYSQL_CMD=mysql
) else (
    if exist "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" (
        set "MYSQL_CMD=C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
    ) else if exist "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe" (
        set "MYSQL_CMD=C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe"
    ) else (
        echo [ERROR] mysql executable not found in PATH or standard installation folders.
        set /p MYSQL_CMD="Please enter full path to mysql.exe: "
    )
)

echo [*] Importing %SQL_FILE% into MySQL (%DB_HOST%:%DB_PORT%)...
if "%DB_PASSWORD%"=="" (
    "%MYSQL_CMD%" -h %DB_HOST% -P %DB_PORT% -u %DB_USER% --default-character-set=utf8mb4 < "%SQL_FILE%"
) else (
    "%MYSQL_CMD%" -h %DB_HOST% -P %DB_PORT% -u %DB_USER% -p%DB_PASSWORD% --default-character-set=utf8mb4 < "%SQL_FILE%"
)

if %ERRORLEVEL% neq 0 (
    echo [ERROR] Database setup failed. Please check credentials and try again.
    exit /b 1
)

echo.
echo ==========================================================
echo   Database Setup Completed Successfully!
echo ==========================================================
echo Default Administrator Account:
echo   - Email    : admin@school.com
echo   - Password : admin123
echo ==========================================================
pause
