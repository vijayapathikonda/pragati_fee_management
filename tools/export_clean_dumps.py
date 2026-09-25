import subprocess
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_DIR = os.path.join(BASE_DIR, "db")

HEADER = """-- ==============================================================================
-- School Fee Management System - Complete Database Initialization Script
-- Automatically executed on first container start by Docker:
--   /docker-entrypoint-initdb.d/init.sql
-- Can also be executed directly for Standalone / Native MySQL setups:
--   mysql -u root -p < db/init.sql
-- Contains: Complete DDL (tables, keys, indexes) + Full Production Seed Data
--           (41 Academic Years, 10 Grades, 4 Sections, 6 Payment Modes,
--            Fee Categories, System Settings, Super Admin user, 655 Students,
--            and 1-Year Active Cryptographic License for Pragathi Vidyalaya)
-- ==============================================================================

CREATE DATABASE IF NOT EXISTS school_fee_db DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE school_fee_db;
"""

print("Running mysqldump from Docker container 'school_fee_db'...")
cmd = [
    "docker", "compose", "exec", "-T", "db",
    "mysqldump", "-u", "root", "-prootpassword", "--no-tablespaces", "school_fee_db"
]

res = subprocess.run(cmd, cwd=BASE_DIR, capture_output=True, text=True, encoding="utf-8")
if res.returncode != 0 and not res.stdout:
    print(f"Error running mysqldump: {res.stderr}")
    exit(1)

dump_content = res.stdout

# Strip mysqldump stderr warning if it bled into stdout (rare with -T)
clean_lines = []
for line in dump_content.splitlines(keepends=True):
    if "Using a password on the command line interface can be insecure" in line:
        continue
    clean_lines.append(line)

clean_dump = "".join(clean_lines)

# Write db/init.sql
init_path = os.path.join(DB_DIR, "init.sql")
with open(init_path, "w", encoding="utf-8", newline="\n") as f:
    f.write(HEADER)
    f.write(clean_dump)
print(f"[+] Written: {init_path} ({len(clean_dump)} bytes)")

# Write db/school_fee_db_full_dump.sql
dump_path = os.path.join(DB_DIR, "school_fee_db_full_dump.sql")
with open(dump_path, "w", encoding="utf-8", newline="\n") as f:
    f.write(HEADER)
    f.write(clean_dump)
print(f"[+] Written: {dump_path}")

# Run mysqldump for data-only (for db/data.sql)
data_cmd = [
    "docker", "compose", "exec", "-T", "db",
    "mysqldump", "-u", "root", "-prootpassword", "--no-tablespaces", "--no-create-info", "school_fee_db"
]
data_res = subprocess.run(data_cmd, cwd=BASE_DIR, capture_output=True, text=True, encoding="utf-8")
clean_data_lines = [l for l in data_res.stdout.splitlines(keepends=True) if "Using a password" not in l]
data_path = os.path.join(DB_DIR, "data.sql")
with open(data_path, "w", encoding="utf-8", newline="\n") as f:
    f.write("USE school_fee_db;\n\n")
    f.write("".join(clean_data_lines))
print(f"[+] Written: {data_path}")
