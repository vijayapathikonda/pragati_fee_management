@echo off
setlocal enabledelayedexpansion
title School Fee Management - Client Domain Setup

echo =======================================================================
echo   PRAGATI VIDYALAYA - SCHOOL FEE MANAGEMENT SYSTEM
echo   Client PC Local Domain Name Setup Tool
echo =======================================================================
echo.

:: 1. Check Administrator Privileges
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Administrator privileges required to edit Windows hosts file!
    echo         Please right-click this script and select "Run as administrator".
    echo.
    pause
    exit /b 1
)

set HOSTS_FILE=%SystemRoot%\System32\drivers\etc\hosts

echo This script configures a friendly domain name (e.g. fees.pragati.local)
echo on this client computer to access the School Fee Management Server.
echo.

set DEFAULT_IP=192.168.1.100
set /p SERVER_IP="Enter Server IP address [default %DEFAULT_IP%]: " || set SERVER_IP=%DEFAULT_IP%
if "%SERVER_IP%"=="" set SERVER_IP=%DEFAULT_IP%

set DEFAULT_DOMAIN=fees.pragati.local
set /p DOMAIN_NAME="Enter desired local domain name [default %DEFAULT_DOMAIN%]: " || set DOMAIN_NAME=%DEFAULT_DOMAIN%
if "%DOMAIN_NAME%"=="" set DOMAIN_NAME=%DEFAULT_DOMAIN%

echo.
echo [*] Server IP    : %SERVER_IP%
echo [*] Domain Name  : %DOMAIN_NAME%
echo.

:: 2. Check if domain already exists in hosts file
findstr /i "%DOMAIN_NAME%" "%HOSTS_FILE%" >nul 2>&1
if %errorlevel% equ 0 (
    echo [!] Entry for %DOMAIN_NAME% already exists in hosts file. Updating...
    :: Backup hosts
    copy /y "%HOSTS_FILE%" "%HOSTS_FILE%.bak" >nul
    :: Remove existing line and re-append
    powershell -NoProfile -Command "(Get-Content '%HOSTS_FILE%') | Where-Object { $_ -notmatch '%DOMAIN_NAME%' } | Set-Content '%HOSTS_FILE%'"
) else (
    copy /y "%HOSTS_FILE%" "%HOSTS_FILE%.bak" >nul
)

:: 3. Append new entry
echo %SERVER_IP%    %DOMAIN_NAME% >> "%HOSTS_FILE%"
echo [OK] Added: %SERVER_IP%    %DOMAIN_NAME% to %HOSTS_FILE%

:: 4. Flush DNS
ipconfig /flushdns >nul 2>&1
echo [OK] Windows DNS cache flushed.

echo.
echo =======================================================================
echo   DOMAIN CONFIGURED SUCCESSFULLY!
echo =======================================================================
echo.
echo You can now access the school portal on this PC using:
echo   http://%DOMAIN_NAME%
echo.
set /p OPEN_BROWSER="Open http://%DOMAIN_NAME% in browser now? [Y/N, default=Y]: " || set OPEN_BROWSER=Y
if /i "%OPEN_BROWSER%"=="Y" (
    start http://%DOMAIN_NAME%
)

echo.
pause
