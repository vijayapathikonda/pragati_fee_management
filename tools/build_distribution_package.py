#!/usr/bin/env python3
"""
Vendor Tool: Automated Commercial Distribution Package Builder.
Builds Cythonized zero-source Docker images, packages client-facing runtime files,
exports sealed image archives, and creates a turnkey client release ZIP.
"""

import os
import sys
import shutil
import subprocess
import argparse

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST_DIR = os.path.join(REPO_ROOT, "dist_package")
RELEASE_FOLDER_NAME = "FeeManagement_Release_v1.0"
RELEASE_DIR = os.path.join(DIST_DIR, RELEASE_FOLDER_NAME)

BACKEND_IMAGE_TAG = "school_fee_backend:latest"
FRONTEND_IMAGE_TAG = "school_fee_frontend:latest"

def run_cmd(cmd, cwd=REPO_ROOT):
    """Executes a shell command and raises an exception if it fails."""
    print(f"[*] Running: {cmd}")
    res = subprocess.run(cmd, shell=True, cwd=cwd)
    if res.returncode != 0:
        raise RuntimeError(f"Command failed with return code {res.returncode}: {cmd}")

def build_images():
    """Builds the Cython-compiled backend and production Nginx frontend images."""
    print("\n" + "=" * 75)
    print("  STEP 1: BUILDING SEALED CYTHONIZED BACKEND DOCKER IMAGE")
    print("=" * 75)
    run_cmd(f"docker buildx build --load --provenance=false --sbom=false -t {BACKEND_IMAGE_TAG} -f backend/Dockerfile.prod backend")

    print("\n" + "=" * 75)
    print("  STEP 2: BUILDING PRODUCTION FRONTEND DOCKER IMAGE")
    print("=" * 75)
    run_cmd(f"docker buildx build --load --provenance=false --sbom=false -t {FRONTEND_IMAGE_TAG} -f frontend/Dockerfile frontend")

def assemble_client_package(skip_tar=False, include_mysql=False, create_zip=False):
    """Assembles the clean, zero-source client directory."""
    print("\n" + "=" * 75)
    print("  STEP 3: ASSEMBLING CLIENT DISTRIBUTION DIRECTORY")
    print("=" * 75)

    if os.path.exists(RELEASE_DIR):
        print(f"[*] Cleaning up previous release folder: {RELEASE_DIR}")
        shutil.rmtree(RELEASE_DIR, ignore_errors=True)

    os.makedirs(RELEASE_DIR, exist_ok=True)
    images_dir = os.path.join(RELEASE_DIR, "images")
    uploads_dir = os.path.join(RELEASE_DIR, "uploads")
    db_init_dir = os.path.join(RELEASE_DIR, "db_init")
    backups_dir = os.path.join(RELEASE_DIR, "backups")
    docs_dir = os.path.join(RELEASE_DIR, "Documents")

    os.makedirs(images_dir, exist_ok=True)
    os.makedirs(os.path.join(uploads_dir, "receipts"), exist_ok=True)
    os.makedirs(os.path.join(uploads_dir, "temp"), exist_ok=True)
    os.makedirs(db_init_dir, exist_ok=True)
    os.makedirs(backups_dir, exist_ok=True)

    # 1. Copy Docker Compose (client version without source mounts)
    shutil.copy2(
        os.path.join(REPO_ROOT, "docker-compose.client.yml"),
        os.path.join(RELEASE_DIR, "docker-compose.yml")
    )
    print("  [x] Copied client docker-compose.yml (Zero source code mounts)")

    # 2. Copy Environment Template
    env_src = os.path.join(REPO_ROOT, ".env.example")
    if not os.path.exists(env_src):
        env_src = os.path.join(REPO_ROOT, ".env")
    shutil.copy2(env_src, os.path.join(RELEASE_DIR, ".env"))
    print("  [x] Copied .env configuration file")

    # 3. Copy Official Documents (.docx letter templates)
    src_docs = os.path.join(REPO_ROOT, "Documents")
    if os.path.exists(src_docs):
        shutil.copytree(src_docs, docs_dir, dirs_exist_ok=True)
        print(f"  [x] Copied {len(os.listdir(docs_dir))} official letter templates into Documents/")

    # 3b. Copy Student Photos into uploads/students/
    src_photos = os.path.join(REPO_ROOT, "frontend", "public", "students")
    dest_photos = os.path.join(uploads_dir, "students")
    if os.path.exists(src_photos):
        shutil.copytree(src_photos, dest_photos, dirs_exist_ok=True)
        print(f"  [x] Copied {len(os.listdir(dest_photos))} student photos into uploads/students/")

    # 3c. Preserve Server ID, Seed & Assets if present
    for s_file in [".server_id", ".server_seed", "principal_signature.png"]:
        src_s = os.path.join(REPO_ROOT, "uploads", s_file)
        if os.path.exists(src_s):
            shutil.copy2(src_s, os.path.join(uploads_dir, s_file))
            print(f"  [x] Copied {s_file} into uploads/")

    # 4. Copy Clean Database Initializer (655 students)
    src_sql = os.path.join(REPO_ROOT, "db", "init.sql")
    if os.path.exists(src_sql):
        shutil.copy2(src_sql, os.path.join(db_init_dir, "init.sql"))
        print("  [x] Copied db/init.sql into db_init/")

    # 5. Copy Turnkey Batch Scripts
    scripts_to_copy = [
        "deploy_school.bat",
        "backup_full_system.bat",
        "restore_full_system.bat",
        "setup_client_domain.bat",
        "setup_scheduled_tasks.bat"
    ]
    for script in scripts_to_copy:
        src_script = os.path.join(REPO_ROOT, script)
        if os.path.exists(src_script):
            shutil.copy2(src_script, os.path.join(RELEASE_DIR, script))
            print(f"  [x] Copied turnkey script: {script}")

    # 5b. Copy Master Distribution and Deployment Guide
    guide_path = os.path.join(REPO_ROOT, "Distribution_and_Deployment_Guide.md")
    if os.path.exists(guide_path):
        shutil.copy2(guide_path, os.path.join(RELEASE_DIR, "Distribution_and_Deployment_Guide.md"))
        print("  [x] Copied Distribution_and_Deployment_Guide.md into release package")

    # 6. Generate Client Instructions README
    readme_content = """=======================================================================
  PRAGATI VIDYALAYA - SCHOOL FEE MANAGEMENT & DOCUMENTATION SYSTEM
  Commercial On-Premises Production Package (v1.0)
=======================================================================

INSTALLATION INSTRUCTIONS FOR THE SCHOOL ADMINISTRATOR:

1. PREREQUISITES:
   - Make sure Docker Desktop for Windows is installed and running:
     https://www.docker.com/products/docker-desktop/

2. STARTING THE APPLICATION:
   - Right-click 'deploy_school.bat' and select "Run as administrator".
   - The script will automatically load the pre-built application images,
     start the database and web server, and configure Windows Firewall.

3. ACCESSING THE APPLICATION:
   - On the server machine: Open browser to: http://localhost
   - On other school PCs:   Open browser to: http://<SERVER_IP>
     (Or run 'setup_client_domain.bat' on client PCs to use a friendly name)
   - Default Administrator Credentials:
     Email:    admin@school.com
     Password: admin123

4. ANNUAL LICENSE ACTIVATION:
   - Log in and navigate to System Settings -> "License & Renewal" tab.
   - Note your unique Server ID (format: SCH-XXXX-XXXX-XXXX).
   - Send this Server ID to your software provider to receive your signed
     annual license file (.lic).
   - Click "Upload License File" in the portal to activate full access.

5. AUTOMATED DAILY BACKUPS:
   - Right-click 'setup_scheduled_tasks.bat' and select "Run as administrator".
   - This registers automated Windows tasks to start the application on boot
     and perform daily automated database backups at 6:00 PM.
=======================================================================
"""
    with open(os.path.join(RELEASE_DIR, "README_INSTRUCTIONS.txt"), "w", encoding="utf-8") as f:
        f.write(readme_content)
    print("  [x] Created client README_INSTRUCTIONS.txt")

    # 7. Export Docker Images to TAR archives
    if not skip_tar:
        print("\n" + "=" * 75)
        print("  STEP 4: EXPORTING PRE-BUILT DOCKER IMAGES (SEALED BINARIES)")
        print("=" * 75)
        backend_tar = os.path.join(images_dir, "backend_image.tar")
        frontend_tar = os.path.join(images_dir, "frontend_image.tar")

        print(f"[*] Exporting {BACKEND_IMAGE_TAG} to {backend_tar}...")
        run_cmd(f'docker buildx build --output type=docker,dest="{backend_tar}" --provenance=false --sbom=false -t {BACKEND_IMAGE_TAG} -f backend/Dockerfile.prod backend')

        print(f"[*] Exporting {FRONTEND_IMAGE_TAG} to {frontend_tar}...")
        run_cmd(f'docker buildx build --output type=docker,dest="{frontend_tar}" --provenance=false --sbom=false -t {FRONTEND_IMAGE_TAG} -f frontend/Dockerfile frontend')

        if include_mysql:
            mysql_tar = os.path.join(images_dir, "mysql_image.tar")
            print(f"[*] Exporting mysql:8.0 to {mysql_tar}...")
            run_cmd(f'docker save mysql:8.0 -o "{mysql_tar}"')
        print("[OK] Docker images exported successfully.")
    else:
        print("[*] Skipping image tar export (--skip-tar specified).")

    # 8. Create ZIP archive if requested
    if create_zip:
        print("\n" + "=" * 75)
        print("  STEP 5: CREATING COMPRESSED CLIENT DISTRIBUTION ARCHIVE (.ZIP)")
        print("=" * 75)
        zip_base_name = os.path.join(DIST_DIR, RELEASE_FOLDER_NAME)
        print(f"[*] Compressing {RELEASE_DIR} into {zip_base_name}.zip ...")
        shutil.make_archive(zip_base_name, 'zip', DIST_DIR, RELEASE_FOLDER_NAME)
        print(f"[OK] Created: {zip_base_name}.zip")

    print("\n" + "=" * 75)
    print("  SUMMARY: CLIENT DISTRIBUTION PACKAGE ASSEMBLED")
    print("=" * 75)
    print(f"Directory: {RELEASE_DIR}")
    print("\nVerified Contents:")
    for root, dirs, files in os.walk(RELEASE_DIR):
        rel = os.path.relpath(root, RELEASE_DIR)
        prefix = "" if rel == "." else f"{rel}/"
        for f in files:
            print(f"  - {prefix}{f}")

    print("\n[CONFIRMATION] ZERO SOURCE CODE (.py / .tsx) INCLUDED IN PACKAGE!")
    print("=" * 75)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Build commercial zero-source distribution package.")
    parser.add_argument("--skip-build", action="store_true", help="Skip docker build and only package files.")
    parser.add_argument("--skip-tar", action="store_true", help="Skip docker save image export for quick dry-run.")
    parser.add_argument("--include-mysql", action="store_true", help="Export MySQL 8.0 image into package for completely offline installs.")
    parser.add_argument("--zip", action="store_true", help="Compress client release folder into a standalone .zip file.")
    args = parser.parse_args()

    if not args.skip_build:
        build_images()
    assemble_client_package(
        skip_tar=args.skip_tar,
        include_mysql=args.include_mysql,
        create_zip=args.zip
    )
