#!/usr/bin/env bash
set -e

echo "=========================================================="
echo "  School Fee Management - Standalone Database Setup"
echo "=========================================================="

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SQL_FILE="${SCRIPT_DIR}/init.sql"

if [ ! -f "$SQL_FILE" ]; then
    echo "[ERROR] SQL file not found: $SQL_FILE"
    exit 1
fi

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:-root}"

read -p "Enter MySQL Host [${DB_HOST}]: " INPUT_HOST
DB_HOST="${INPUT_HOST:-$DB_HOST}"

read -p "Enter MySQL Port [${DB_PORT}]: " INPUT_PORT
DB_PORT="${INPUT_PORT:-$DB_PORT}"

read -p "Enter MySQL Username [${DB_USER}]: " INPUT_USER
DB_USER="${INPUT_USER:-$DB_USER}"

read -s -p "Enter MySQL Password: " DB_PASSWORD
echo ""

echo "[*] Importing ${SQL_FILE} into MySQL (${DB_HOST}:${DB_PORT})..."
if [ -z "$DB_PASSWORD" ]; then
    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" --default-character-set=utf8mb4 < "$SQL_FILE"
else
    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" --default-character-set=utf8mb4 < "$SQL_FILE"
fi

echo ""
echo "=========================================================="
echo "  Database Setup Completed Successfully!"
echo "=========================================================="
echo "Default Administrator Account:"
echo "  - Email    : admin@school.com"
echo "  - Password : admin123"
echo "=========================================================="
