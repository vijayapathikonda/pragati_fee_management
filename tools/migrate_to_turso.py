#!/usr/bin/env python3
"""
Turso / Cloud SQLite Database Initializer and Migration Tool.
Creates all schema tables and imports baseline master data & 655 students from db/init.sql.
Supports:
1. Remote Turso libSQL via native HTTP Pipeline API (pure Python, 0 native C/Rust dependencies).
2. Local SQLite via standard SQLAlchemy.
"""

import os
import sys
import re
import json
import argparse
import requests

# Add backend directory to sys.path
REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKEND_DIR = os.path.join(REPO_ROOT, "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app.core.config import settings
from app.infrastructure.database import Base
import app.domain.models
import app.domain.master_models
import app.domain.student_models
import app.domain.fee_models
import app.domain.admin_models
from sqlalchemy.schema import CreateTable
from sqlalchemy.dialects import sqlite

TABLE_DEPENDENCY_ORDER = [
    "roles",
    "users",
    "user_role",
    "academic_years",
    "grades",
    "sections",
    "fee_categories",
    "payment_modes",
    "discount_types",
    "late_fee_rules",
    "system_settings",
    "school_information",
    "students",
    "fee_assignments",
    "fee_receipts",
    "fee_payment_items",
    "audit_logs",
]

def clean_sql_statement(stmt: str) -> str:
    """Cleans MySQL-specific syntax into standard ANSI / SQLite SQL."""
    stmt = stmt.strip()
    if not stmt:
        return ""
    if (
        stmt.startswith("/*")
        or stmt.startswith("--")
        or stmt.upper().startswith("LOCK TABLES")
        or stmt.upper().startswith("UNLOCK TABLES")
        or stmt.upper().startswith("USE ")
        or stmt.upper().startswith("CREATE DATABASE")
        or stmt.upper().startswith("DROP TABLE")
        or stmt.upper().startswith("SET ")
    ):
        return ""
    stmt = re.sub(r"`", "", stmt)
    stmt = stmt.replace("\\'", "''")
    stmt = re.sub(r"\\0", "0", stmt)
    return stmt

def extract_table_columns_from_sql(sql_content: str) -> dict:
    """Extracts column ordering for each table from CREATE TABLE definitions."""
    create_tables = re.findall(
        r"CREATE TABLE [`\"]?([a-zA-Z0-9_]+)[`\"]?\s*\((.*?)\)\s*ENGINE",
        sql_content,
        re.DOTALL | re.IGNORECASE,
    )
    table_columns = {}
    for tbl, body in create_tables:
        cols = []
        for line in body.splitlines():
            line = line.strip()
            if (
                not line
                or line.startswith("PRIMARY KEY")
                or line.startswith("KEY")
                or line.startswith("CONSTRAINT")
                or line.startswith("UNIQUE")
            ):
                continue
            m = re.match(r"[`\"]?([a-zA-Z0-9_]+)[`\"]?", line)
            if m:
                cols.append(m.group(1))
        table_columns[tbl] = cols
    return table_columns

def prepare_insert_statements(sql_content: str, table_columns_map: dict) -> list:
    """Parses init.sql, maps columns, chunks batch tuples, and orders by dependency."""
    statements = sql_content.replace("\r\n", "\n").split(";\n")
    grouped_queries = {t: [] for t in TABLE_DEPENDENCY_ORDER}
    other_queries = []

    for raw_stmt in statements:
        cleaned = clean_sql_statement(raw_stmt)
        if not cleaned or not cleaned.upper().startswith("INSERT INTO"):
            continue

        match = re.match(
            r"INSERT\s+INTO\s+([a-zA-Z0-9_]+)(?:\s*\((.*?)\))?\s+VALUES\s+(.*)",
            cleaned,
            re.IGNORECASE | re.DOTALL,
        )
        if not match:
            continue

        tbl = match.group(1)
        col_spec = match.group(2)
        values_str = match.group(3).strip().rstrip(";")

        if tbl not in Base.metadata.tables:
            continue

        if not col_spec and tbl in table_columns_map:
            col_list = ", ".join(table_columns_map[tbl])
            insert_prefix = f"INSERT INTO {tbl} ({col_list}) VALUES"
        else:
            insert_prefix = f"INSERT INTO {tbl} VALUES"

        target_list = grouped_queries[tbl] if tbl in grouped_queries else other_queries

        if values_str.startswith("(") and values_str.endswith(")"):
            tuples = values_str[1:-1].split("),(")
            chunk_size = 50
            for i in range(0, len(tuples), chunk_size):
                chunk = tuples[i : i + chunk_size]
                target_list.append(f"{insert_prefix} ({'),('.join(chunk)});")
        else:
            target_list.append(f"{insert_prefix} {values_str};")

    ordered_queries = []
    for tbl in TABLE_DEPENDENCY_ORDER:
        ordered_queries.extend(grouped_queries[tbl])
    ordered_queries.extend(other_queries)
    return ordered_queries

class TursoHttpClient:
    """Client for Turso libSQL using the native HTTP /v2/pipeline API."""
    def __init__(self, host: str, token: str):
        self.host = host
        self.pipeline_url = f"https://{host}/v2/pipeline"
        self.headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }

    def execute_batch(self, stmts: list, ignore_unique_errors: bool = True) -> list:
        if not stmts:
            return []
        payload = {"requests": [{"type": "execute", "stmt": {"sql": s}} for s in stmts]}
        res = requests.post(self.pipeline_url, headers=self.headers, json=payload, timeout=60)
        if res.status_code != 200:
            raise Exception(f"Turso API error ({res.status_code}): {res.text}")
        data = res.json()
        for item in data.get("results", []):
            if item.get("type") == "error":
                msg = item.get("error", {}).get("message", "")
                if ignore_unique_errors and ("UNIQUE constraint failed" in msg or "Duplicate entry" in msg):
                    continue
                print(f"  [!] Notice: {msg}")
        return data.get("results", [])

    def query_scalar(self, sql: str):
        res = self.execute_batch([sql])
        if res and res[0].get("type") == "ok":
            rows = res[0].get("response", {}).get("result", {}).get("rows", [])
            if rows and rows[0]:
                return rows[0][0].get("value")
        return 0

def run_migration_turso_http(host: str, token: str):
    """Executes schema migration and data seeding directly via Turso HTTP API."""
    print("=" * 75)
    print("  TURSO CLOUD DATABASE INITIALIZATION & MIGRATION (HTTP PIPELINE)")
    print("=" * 75)
    print(f"[*] Target Host: https://{host}")
    client = TursoHttpClient(host, token)

    # 1. Create Schema Tables
    print("[*] Step 1: Creating all 18 database tables...")
    dialect = sqlite.dialect()
    ddl_stmts = []
    for table in Base.metadata.sorted_tables:
        stmt = str(CreateTable(table).compile(dialect=dialect)).strip()
        stmt = re.sub(r"CREATE TABLE (\w+)", r"CREATE TABLE IF NOT EXISTS \1", stmt)
        ddl_stmts.append(stmt)
    client.execute_batch(ddl_stmts)
    print(f"[OK] Schema tables verified ({len(ddl_stmts)} tables).")

    # 2. Check if already seeded
    try:
        student_count = int(client.query_scalar("SELECT count(*) FROM students;") or 0)
        if student_count > 0:
            print(f"[*] Database already contains {student_count} students. Skipping re-seed.")
            show_turso_summary(client)
            return
    except Exception:
        pass

    # 3. Read and execute init.sql data
    init_sql_path = os.path.join(REPO_ROOT, "db", "init.sql")
    if not os.path.exists(init_sql_path):
        print(f"[!] Warning: {init_sql_path} not found.")
        return

    print(f"[*] Step 2: Seeding initial data from {init_sql_path}...")
    with open(init_sql_path, "r", encoding="utf-8", errors="ignore") as f:
        sql_content = f.read()

    table_columns_map = extract_table_columns_from_sql(sql_content)
    insert_queries = prepare_insert_statements(sql_content, table_columns_map)

    print(f"[*] Executing {len(insert_queries)} insert statements in batches...")
    batch_size = 10
    for i in range(0, len(insert_queries), batch_size):
        batch = insert_queries[i : i + batch_size]
        client.execute_batch(batch)
        if (i // batch_size) % 5 == 0 or i + batch_size >= len(insert_queries):
            print(f"  Processed {min(i + batch_size, len(insert_queries))}/{len(insert_queries)} queries...")

    print("[OK] Data seeding complete!")
    show_turso_summary(client)

def show_turso_summary(client: TursoHttpClient):
    """Displays row counts for key tables in Turso."""
    print("\n" + "=" * 75)
    print("  TURSO CLOUD VERIFICATION SUMMARY")
    print("=" * 75)
    key_tables = [
        "students",
        "academic_years",
        "grades",
        "sections",
        "fee_categories",
        "payment_modes",
        "school_information",
        "users",
        "roles",
        "user_role",
        "audit_logs",
        "system_settings",
    ]
    summary_res = client.execute_batch([f"SELECT count(*) FROM {tbl};" for tbl in key_tables])
    for tbl, res in zip(key_tables, summary_res):
        try:
            cnt = res["response"]["result"]["rows"][0][0]["value"]
            print(f"  - {tbl:<22}: {cnt} rows")
        except Exception as e:
            print(f"  - {tbl:<22}: [Error: {e}]")
    print("=" * 75)

def run_migration_local_sqlite(db_url: str):
    """Executes schema migration and data seeding for local SQLite using SQLAlchemy."""
    from sqlalchemy import create_engine, text
    from sqlalchemy.orm import sessionmaker

    print("=" * 75)
    print("  LOCAL SQLITE DATABASE INITIALIZATION & MIGRATION")
    print("=" * 75)
    print(f"[*] Target Database: {db_url}")

    tgt_engine = create_engine(db_url, connect_args={"check_same_thread": False})
    tgt_session = sessionmaker(autocommit=False, autoflush=False, bind=tgt_engine)

    print("[*] Step 1: Creating all 18 database tables...")
    Base.metadata.create_all(bind=tgt_engine)
    print(f"[OK] Schema tables verified ({len(Base.metadata.tables)} tables).")

    db = tgt_session()
    try:
        student_count = db.execute(text("SELECT count(*) FROM students")).scalar() or 0
        if student_count > 0:
            print(f"[*] Database already contains {student_count} students. Skipping re-seed.")
            return
    except Exception:
        pass
    finally:
        db.close()

    init_sql_path = os.path.join(REPO_ROOT, "db", "init.sql")
    with open(init_sql_path, "r", encoding="utf-8", errors="ignore") as f:
        sql_content = f.read()

    table_columns_map = extract_table_columns_from_sql(sql_content)
    insert_queries = prepare_insert_statements(sql_content, table_columns_map)

    db = tgt_session()
    try:
        for stmt in insert_queries:
            try:
                db.execute(text(stmt))
            except Exception as err:
                if "UNIQUE constraint failed" not in str(err) and "Duplicate entry" not in str(err):
                    print(f"  [!] Notice: {err}")
        db.commit()
        print("[OK] Data seeding complete!")
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()

def run_migration(db_url: str = None, token: str = None):
    effective_url = db_url or os.environ.get("DATABASE_URL") or settings.DATABASE_URL
    effective_token = token or os.environ.get("TURSO_AUTH_TOKEN") or getattr(settings, "TURSO_AUTH_TOKEN", None)

    # Check if target is Turso (remote libSQL)
    is_turso = "turso.io" in effective_url or effective_url.startswith("libsql://") or (effective_token and not effective_url.startswith("sqlite:///"))

    if is_turso:
        host = effective_url.replace("libsql://", "").replace("https://", "").replace("http://", "").replace("sqlite+libsql://", "").split("?")[0].strip("/")
        if not effective_token:
            # Check if token is in the URL query string
            m = re.search(r"authToken=([^&]+)", effective_url)
            if m:
                effective_token = m.group(1)
        if not effective_token:
            raise ValueError("Turso auth token is required. Pass --token or set TURSO_AUTH_TOKEN.")
        run_migration_turso_http(host, effective_token)
    else:
        run_migration_local_sqlite(effective_url)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Turso / SQLite cloud database migration tool.")
    parser.add_argument("--db-url", type=str, help="Database URL (e.g. libsql://...turso.io or sqlite:///...)")
    parser.add_argument("--token", type=str, help="Turso Auth Token")
    args = parser.parse_args()

    run_migration(db_url=args.db_url, token=args.token)
