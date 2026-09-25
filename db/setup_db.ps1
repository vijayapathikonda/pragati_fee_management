<#
.SYNOPSIS
    Standalone & Docker Database Setup Script for School Fee Management System.
.DESCRIPTION
    Initializes or restores the MySQL database using db/init.sql.
    Creates the database, all schema tables, master data, admin user, and 659 student records.
.EXAMPLE
    # Standalone native MySQL:
    .\setup_db.ps1 -DbUser root -DbPassword rootpassword

    # Via Docker container:
    .\setup_db.ps1 -DockerContainer school_fee_db -DbPassword rootpassword
#>

[CmdletBinding()]
param (
    [string]$DbHost = "localhost",
    [int]$DbPort = 3306,
    [string]$DbUser = "root",
    [string]$DbPassword = "",
    [string]$DockerContainer = "",
    [string]$SqlFile = ""
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  School Fee Management - Database Setup Tool" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# Determine SQL file path
if (-not $SqlFile) {
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
    $SqlFile = Join-Path $scriptDir "init.sql"
}

if (-not (Test-Path $SqlFile)) {
    Write-Error "SQL file not found at: $SqlFile"
    exit 1
}

Write-Host "[*] Target SQL File : $SqlFile" -ForegroundColor Yellow

if ($DockerContainer) {
    Write-Host "[*] Execution Mode  : Docker Container ($DockerContainer)" -ForegroundColor Yellow
    if (-not $DbPassword) { $DbPassword = "rootpassword" }

    Write-Host "[*] Executing init.sql inside container '$DockerContainer'..." -ForegroundColor Yellow
    Get-Content -Path $SqlFile -Raw | docker exec -i $DockerContainer mysql -u $DbUser "-p$DbPassword"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[X] Import failed inside container." -ForegroundColor Red
        exit 1
    }
    Write-Host "[+] Import successful inside Docker container!" -ForegroundColor Green

    Write-Host "`n[*] Verifying imported data in Docker..." -ForegroundColor Yellow
    $verifyQuery = @"
SELECT 'Tables' as Metric, count(*) as Count FROM information_schema.tables WHERE table_schema = 'school_fee_db'
UNION ALL
SELECT 'Students', count(*) FROM school_fee_db.students
UNION ALL
SELECT 'Academic Years', count(*) FROM school_fee_db.academic_years
UNION ALL
SELECT 'Users', count(*) FROM school_fee_db.users;
"@
    docker exec $DockerContainer mysql -u $DbUser "-p$DbPassword" -e $verifyQuery
} else {
    Write-Host "[*] Execution Mode  : Native / Standalone MySQL" -ForegroundColor Yellow
    Write-Host "[*] Target Host     : $DbHost" -ForegroundColor Yellow
    Write-Host "[*] Target Port     : $DbPort" -ForegroundColor Yellow
    Write-Host "[*] Target User     : $DbUser" -ForegroundColor Yellow

    # Locate mysql.exe
    $mysqlExe = Get-Command "mysql" -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source -First 1

    if (-not $mysqlExe) {
        $commonPaths = @(
            "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe",
            "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe",
            "C:\Program Files\MySQL\MySQL Server 8.1\bin\mysql.exe",
            "C:\Program Files\MySQL\MySQL Server 8.2\bin\mysql.exe",
            "C:\xampp\mysql\bin\mysql.exe",
            "C:\laragon\bin\mysql\current\bin\mysql.exe"
        )
        foreach ($p in $commonPaths) {
            if (Test-Path $p) {
                $mysqlExe = $p
                break
            }
        }
    }

    if (-not $mysqlExe) {
        Write-Host "[!] 'mysql' command was not found in PATH or standard installation folders." -ForegroundColor Red
        $userProvided = Read-Host "Please enter the full path to mysql.exe (or press Enter to abort)"
        if ($userProvided -and (Test-Path $userProvided)) {
            $mysqlExe = $userProvided
        } else {
            Write-Host "`n[TIP] If you are running MySQL in Docker, you can run:" -ForegroundColor Cyan
            Write-Host "      .\setup_db.ps1 -DockerContainer school_fee_db" -ForegroundColor White
            exit 1
        }
    }

    Write-Host "[+] Using MySQL Client : $mysqlExe" -ForegroundColor Green

    if (-not $DbPassword) {
        $secPass = Read-Host "Enter MySQL password for user '$DbUser'" -AsSecureString
        $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secPass)
        $DbPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
    }

    Write-Host "`n[*] Testing connection to MySQL Server..." -ForegroundColor Yellow
    $testArgs = @("-h", $DbHost, "-P", "$DbPort", "-u", $DbUser)
    if ($DbPassword) { $testArgs += "-p$DbPassword" }
    $testArgs += @("-e", "SELECT VERSION();")

    $connTest = & $mysqlExe @testArgs 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[X] Connection failed:" -ForegroundColor Red
        Write-Host $connTest -ForegroundColor Red
        exit 1
    }

    Write-Host "[+] Connection successful! MySQL version: $($connTest[1])" -ForegroundColor Green

    # Execute initialization SQL
    Write-Host "`n[*] Importing $SqlFile into MySQL... (this may take 5-15 seconds)" -ForegroundColor Yellow
    $importArgs = @("-h", $DbHost, "-P", "$DbPort", "-u", $DbUser)
    if ($DbPassword) { $importArgs += "-p$DbPassword" }
    $importArgs += @("--default-character-set=utf8mb4")

    Get-Content -Path $SqlFile -Raw | & $mysqlExe @importArgs 2>&1

    if ($LASTEXITCODE -ne 0) {
        Write-Host "[X] Database initialization encountered an error." -ForegroundColor Red
        exit 1
    }

    Write-Host "[+] Database and tables imported successfully!" -ForegroundColor Green

    # Verification
    Write-Host "`n[*] Verifying imported data..." -ForegroundColor Yellow
    $verifyQuery = @"
SELECT 'Tables' as Metric, count(*) as Count FROM information_schema.tables WHERE table_schema = 'school_fee_db'
UNION ALL
SELECT 'Students', count(*) FROM school_fee_db.students
UNION ALL
SELECT 'Academic Years', count(*) FROM school_fee_db.academic_years
UNION ALL
SELECT 'Grades', count(*) FROM school_fee_db.grades
UNION ALL
SELECT 'Payment Modes', count(*) FROM school_fee_db.payment_modes
UNION ALL
SELECT 'Users', count(*) FROM school_fee_db.users;
"@

    $verifyArgs = @("-h", $DbHost, "-P", "$DbPort", "-u", $DbUser)
    if ($DbPassword) { $verifyArgs += "-p$DbPassword" }
    $verifyArgs += @("-e", $verifyQuery)

    & $mysqlExe @verifyArgs
}

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host "  Database Setup Completed Successfully!                  " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "Default Administrator Account:" -ForegroundColor White
Write-Host "  - Email    : admin@school.com" -ForegroundColor White
Write-Host "  - Password : admin123" -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Green
