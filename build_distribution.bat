@echo off
setlocal
title Fee Management System - Vendor Distribution Package Builder

echo =======================================================================
echo   FEE MANAGEMENT SYSTEM - COMMERCIAL DISTRIBUTION BUILDER
echo   Builds sealed binary Docker images and zero-source client package
echo =======================================================================
echo.
echo Select packaging mode:
echo   [1] Full Release Package (Builds Cython binaries, exports TARs, creates ZIP)
echo   [2] Quick Package (Assembles client scripts and templates without re-exporting images)
echo   [3] Offline Release Package (Full Release + exports MySQL 8.0 image)
echo.

set "MODE=1"
set /p "USER_INPUT=Enter choice [1, 2, or 3, default 1]: "
if defined USER_INPUT set "MODE=%USER_INPUT%"
set "MODE=%MODE: =%"

if "%MODE%"=="1" goto :opt_full
if "%MODE%"=="2" goto :opt_quick
if "%MODE%"=="3" goto :opt_offline

echo.
echo [ERROR] Invalid choice: %MODE%
pause
exit /b 1

:opt_full
echo.
echo [*] Starting Full Release Package Build
python tools\build_distribution_package.py --zip
goto :done

:opt_quick
echo.
echo [*] Starting Quick Package Assembly (dry-run)
python tools\build_distribution_package.py --skip-build --skip-tar
goto :done

:opt_offline
echo.
echo [*] Starting Offline Release Package Build with MySQL image
python tools\build_distribution_package.py --include-mysql --zip
goto :done

:done
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Build process failed with error code %errorlevel%.
    pause
    exit /b %errorlevel%
)

echo.
echo =======================================================================
echo   Done! Check the 'dist_package' folder for your client release.
echo =======================================================================
pause
