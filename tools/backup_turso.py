#!/usr/bin/env python3
"""
Turso Cloud Database Backup Utility.
Takes a complete snapshot of the Turso Cloud SQLite database.
Generates:
1. A standard SQL dump file (.sql)
2. A standalone offline SQLite database file (.db)
3. Optional upload to Google Drive
"""

import os
import sys
import json
import time
import sqlite3
import argparse
import requests
from datetime import datetime

DEFAULT_TURSO_HOST = "create-school-fee-db-vijayapathikonda.aws-ap-south-1.turso.io"
DEFAULT_TURSO_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTAxNTU0MjgsImlkIjoiMDFhMGNkOTMtNWEwMS03MzZkLWE0NGItYzNhNTYyMTg1Mjg2Iiwia2lkIjoiUDl2d2pKT3lHQlByU3FGNWNRd1pEWEZsOWdtUE9pNFljczJlZ3piNjZDUSIsInJpZCI6IjY3MWVjMjgzLTk0OTctNGM4MS1hOGZkLTM5YjhjODQ4OTc5YyJ9.2-CKzuTXiAp-d5LqaCV5ZjYJ2fQm2GfOhwV8DxPHC1zwAmUvqXg3MdFWNqzkNUysjBv6gj7q1SsnOv0g9CbtAQ"

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKUPS_DIR = os.path.join(REPO_ROOT, "backups")

class TursoBackupClient:
    def __init__(self, host: str, token: str):
        self.host = host.replace("libsql://", "").replace("https://", "").replace("http://", "").split("?")[0].strip("/")
        self.pipeline_url = f"https://{self.host}/v2/pipeline"
        self.headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

    def execute_query(self, sql: str) -> dict:
        payload = {"requests": [{"type": "execute", "stmt": {"sql": sql}}]}
        res = requests.post(self.pipeline_url, headers=self.headers, json=payload, timeout=60)
        if res.status_code != 200:
            raise Exception(f"Turso HTTP Error ({res.status_code}): {res.text}")
        data = res.json()
        results = data.get("results", [])
        if not results:
            return {"cols": [], "rows": []}
        item = results[0]
        if item.get("type") == "error":
            raise Exception(f"Query Error: {item.get('error', {}).get('message')}")
        return item.get("response", {}).get("result", {})

    def get_tables(self):
        result = self.execute_query(
            "SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_litestream_%' ORDER BY name;"
        )
        tables = []
        for row in result.get("rows", []):
            name = row[0].get("value")
            sql = row[1].get("value")
            tables.append((name, sql))
        return tables

    def get_indexes(self):
        result = self.execute_query(
            "SELECT sql FROM sqlite_master WHERE type='index' AND sql IS NOT NULL AND name NOT LIKE 'sqlite_%';"
        )
        return [row[0].get("value") for row in result.get("rows", []) if row[0].get("value")]

    def count_table(self, table_name: str) -> int:
        res = self.execute_query(f"SELECT count(*) FROM `{table_name}`;")
        rows = res.get("rows", [])
        if rows and rows[0]:
            return int(rows[0][0].get("value", 0))
        return 0

    def fetch_table_rows(self, table_name: str, limit: int = 500, offset: int = 0):
        res = self.execute_query(f"SELECT * FROM `{table_name}` LIMIT {limit} OFFSET {offset};")
        cols = [c.get("name") for c in res.get("cols", [])]
        raw_rows = res.get("rows", [])
        parsed_rows = []
        for r in raw_rows:
            row_vals = []
            for cell in r:
                c_type = cell.get("type")
                if c_type == "null":
                    row_vals.append(None)
                else:
                    row_vals.append(cell.get("value"))
            parsed_rows.append(row_vals)
        return cols, parsed_rows


def format_sql_value(val):
    if val is None:
        return "NULL"
    if isinstance(val, (int, float)):
        return str(val)
    if isinstance(val, bool):
        return "1" if val else "0"
    # String / text
    escaped = str(val).replace("'", "''")
    return f"'{escaped}'"


def take_backup(host: str, token: str, output_dir: str = BACKUPS_DIR, upload_gdrive: bool = False):
    os.makedirs(output_dir, exist_ok=True)
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    sql_path = os.path.join(output_dir, f"turso_backup_{timestamp}.sql")
    db_path = os.path.join(output_dir, f"turso_backup_{timestamp}.db")

    print("=" * 75)
    print("  TURSO CLOUD DATABASE BACKUP")
    print("=" * 75)
    print(f"[*] Target Host: https://{host}")
    print(f"[*] Destination: {output_dir}")
    print(f"[*] Timestamp  : {timestamp}")
    print("-" * 75)

    client = TursoBackupClient(host, token)

    # 1. Fetch Schema
    print("[*] Inspecting database tables and indexes...")
    tables = client.get_tables()
    indexes = client.get_indexes()
    print(f"[OK] Found {len(tables)} tables and {len(indexes)} indexes.")

    # 2. Open Local SQLite DB & SQL File
    if os.path.exists(db_path):
        os.remove(db_path)
    sqlite_conn = sqlite3.connect(db_path)
    sqlite_cur = sqlite_conn.cursor()

    total_records = 0
    start_time = time.time()

    with open(sql_path, "w", encoding="utf-8") as f_sql:
        f_sql.write(f"-- Turso Cloud Database Backup\n")
        f_sql.write(f"-- Host: {host}\n")
        f_sql.write(f"-- Created: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f_sql.write("PRAGMA foreign_keys = OFF;\nBEGIN TRANSACTION;\n\n")

        # Create tables
        for tbl_name, tbl_sql in tables:
            f_sql.write(f"{tbl_sql};\n")
            sqlite_cur.execute(tbl_sql)

        f_sql.write("\n")

        # Export Data
        for tbl_name, _ in tables:
            count = client.count_table(tbl_name)
            if count == 0:
                print(f"  - {tbl_name:<24}: 0 rows")
                continue

            print(f"  - {tbl_name:<24}: exporting {count} rows...", end="", flush=True)
            offset = 0
            limit = 200
            table_records = 0

            while offset < count:
                cols, rows = client.fetch_table_rows(tbl_name, limit=limit, offset=offset)
                if not rows:
                    break

                col_str = ", ".join([f"`{c}`" for c in cols])
                placeholders = ", ".join(["?"] * len(cols))

                # Insert into local SQLite
                sqlite_cur.executemany(f"INSERT INTO `{tbl_name}` ({col_str}) VALUES ({placeholders});", rows)

                # Write SQL inserts
                for r in rows:
                    val_strs = [format_sql_value(v) for v in r]
                    f_sql.write(f"INSERT INTO `{tbl_name}` ({col_str}) VALUES ({', '.join(val_strs)});\n")

                table_records += len(rows)
                offset += limit

            total_records += table_records
            sqlite_conn.commit()
            print(" [OK]")

        # Create Indexes
        f_sql.write("\n-- Indexes\n")
        for idx_sql in indexes:
            f_sql.write(f"{idx_sql};\n")
            try:
                sqlite_cur.execute(idx_sql)
            except Exception:
                pass

        f_sql.write("\nCOMMIT;\n")

    sqlite_conn.commit()
    sqlite_conn.close()

    elapsed = time.time() - start_time
    sql_size_kb = os.path.getsize(sql_path) / 1024
    db_size_kb = os.path.getsize(db_path) / 1024

    print("=" * 75)
    print("  BACKUP COMPLETED SUCCESSFULLY")
    print("=" * 75)
    print(f"[OK] Total Records Exported: {total_records}")
    print(f"[OK] SQL Dump File         : {sql_path} ({sql_size_kb:.1f} KB)")
    print(f"[OK] Offline SQLite File   : {db_path} ({db_size_kb:.1f} KB)")
    print(f"[OK] Duration              : {elapsed:.2f} seconds")
    print("=" * 75)

    if upload_gdrive:
        try:
            from backend.app.services.gdrive_service import gdrive_service
            if gdrive_service.is_configured:
                print("\n[*] Uploading backup to Google Drive (15 GB quota)...")
                res = gdrive_service.upload_local_file(sql_path, folder_name="Backups")
                if res:
                    print(f"[OK] Backup uploaded to Google Drive folder 'Backups': {res.get('download_url')}")
        except Exception as e:
            print(f"[!] Optional Google Drive upload skipped: {e}")

    return sql_path, db_path

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Turso Database Backup Tool")
    parser.add_argument("--host", default=DEFAULT_TURSO_HOST, help="Turso database host")
    parser.add_argument("--token", default=DEFAULT_TURSO_TOKEN, help="Turso Auth Token")
    parser.add_argument("--output-dir", default=BACKUPS_DIR, help="Directory to save backup files")
    parser.add_argument("--upload-gdrive", action="store_true", help="Upload backup to Google Drive")
    args = parser.parse_args()

    take_backup(args.host, args.token, args.output_dir, args.upload_gdrive)
