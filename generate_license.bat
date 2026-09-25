@echo off
setlocal
title School Fee Management System - Vendor License Generator

:: If arguments were provided directly on the command line, forward them directly to Python
if not "%~1"=="" (
    python "%~dp0tools\generate_license.py" %*
    exit /b %errorlevel%
)

echo =======================================================================
echo   SCHOOL FEE MANAGEMENT SYSTEM - VENDOR LICENSE GENERATOR
echo   Generates cryptographically signed .lic files for client schools
echo =======================================================================
echo.

echo Select operation:
echo   [1] Issue New / Renewal Annual License (Default)
echo   [2] Inspect / Verify an Existing .lic File
echo.

set "OP=1"
set /p "USER_OP=Enter choice [1 or 2, default 1]: "
if defined USER_OP set "OP=%USER_OP%"
set "OP=%OP: =%"

if "%OP%"=="2" goto :inspect_license

:issue_license
echo.
echo --- STEP 1: Enter School / Institution Details ---
set "SCHOOL_NAME="
set /p "SCHOOL_NAME=Enter School Name (e.g. Pragati Vidyalaya): "
if not defined SCHOOL_NAME (
    echo [ERROR] School name cannot be empty.
    pause
    exit /b 1
)

echo.
echo --- STEP 2: Enter School Server ID (from client machine) ---
echo (Ask the school admin to copy it from Settings -^> License or http://^<IP^>:8002/api/license/fingerprint)
set "SERVER_ID="
set /p "SERVER_ID=Enter Server ID (e.g. SCH-2B79-DF99-3310, or leave empty for ANY machine): "

echo.
echo --- STEP 3: Enter Validity Period ---
set "DAYS=365"
set /p "USER_DAYS=Enter validity duration in days [default: 365]: "
if defined USER_DAYS set "DAYS=%USER_DAYS%"
set "DAYS=%DAYS: =%"

echo.
echo --- STEP 4: Output License Filename ---
set "SAFE_NAME=%SCHOOL_NAME: =_%"
set "OUTPUT_FILE=%SAFE_NAME%_license.lic"
set /p "USER_OUTPUT=Enter output file name [default: %OUTPUT_FILE%]: "
if defined USER_OUTPUT set "OUTPUT_FILE=%USER_OUTPUT%"
set "OUTPUT_FILE=%OUTPUT_FILE: =%"

echo.
echo [*] Generating cryptographic license file...
if defined SERVER_ID (
    python tools\generate_license.py issue --school "%SCHOOL_NAME%" --server-id "%SERVER_ID%" --days %DAYS% --output "%OUTPUT_FILE%"
) else (
    python tools\generate_license.py issue --school "%SCHOOL_NAME%" --days %DAYS% --output "%OUTPUT_FILE%"
)

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Failed to generate license file.
    pause
    exit /b %errorlevel%
)

echo.
echo =======================================================================
echo   SUCCESS! License generated: %OUTPUT_FILE%
echo.
echo   Next Step:
echo   1. Send '%OUTPUT_FILE%' to the school administrator.
echo   2. School admin logs in, goes to Settings -^> License and Renewal tab,
echo      and clicks "Upload License File" to activate the software.
echo =======================================================================
pause
exit /b 0

:inspect_license
echo.
set "LIC_FILE="
set /p "LIC_FILE=Enter path to .lic file to inspect: "
if not defined LIC_FILE (
    echo [ERROR] File path cannot be empty.
    pause
    exit /b 1
)
python tools\generate_license.py inspect "%LIC_FILE%"
pause
exit /b 0
