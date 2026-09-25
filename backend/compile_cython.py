#!/usr/bin/env python3
"""
Vendor Cython Compilation Script for School Fee Management Backend.
Compiles all proprietary Python source code in app/ into native machine code (.so)
and deletes all original .py and intermediate .c files.
"""

import os
import sys
import shutil
from setuptools import setup
from setuptools.extension import Extension
from Cython.Build import cythonize

APP_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "app")

def collect_py_files():
    """Scans app/ and collects all .py files to compile, keeping __init__.py and main.py."""
    modules_to_compile = []
    
    for root, dirs, files in os.walk(APP_DIR):
        for file in files:
            if file.endswith(".py"):
                # Preserve __init__.py for package recognition
                if file.startswith("__"):
                    continue
                # Keep main.py as a clean entry point loader
                if file == "main.py" and root == APP_DIR:
                    continue
                
                full_path = os.path.join(root, file)
                # Compute dotted module name relative to parent of app/
                rel_path = os.path.relpath(full_path, os.path.dirname(APP_DIR))
                mod_name = os.path.splitext(rel_path)[0].replace(os.path.sep, ".")
                modules_to_compile.append((mod_name, full_path))
                
    return modules_to_compile

def main():
    print("=" * 70)
    print("  CYTHON PROPRIETARY CODE COMPILATION PIPELINE")
    print("=" * 70)
    
    modules = collect_py_files()
    print(f"[*] Discovered {len(modules)} proprietary Python modules to compile.")
    
    if not modules:
        print("[!] No modules found to compile.")
        return

    extensions = [
        Extension(
            name=mod_name,
            sources=[file_path]
        )
        for mod_name, file_path in modules
    ]

    # Cythonize with inspectable bindings for FastAPI dependency injection
    ext_modules = cythonize(
        extensions,
        compiler_directives={
            "language_level": "3",
            "binding": True,
            "embedsignature": True,
            "annotation_typing": False,
            "always_allow_keywords": True,
        },
        quiet=False,
        nthreads=2
    )

    # Build in-place
    sys.argv = ["setup.py", "build_ext", "--inplace"]
    setup(ext_modules=ext_modules)

    # Clean up: Permanently delete original .py and intermediate .c files
    print("\n[*] Purging plain-text source files (.py) and intermediate (.c)...")
    deleted_count = 0
    for _, file_path in modules:
        # Delete .py
        if os.path.exists(file_path):
            os.remove(file_path)
            deleted_count += 1
        # Delete .c
        c_path = os.path.splitext(file_path)[0] + ".c"
        if os.path.exists(c_path):
            os.remove(c_path)

    # Remove build/ directory
    build_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "build")
    if os.path.exists(build_dir):
        shutil.rmtree(build_dir, ignore_errors=True)

    print(f"[OK] Successfully compiled {len(modules)} modules into native .so machine binaries!")
    print(f"[OK] Deleted {deleted_count} plain-text .py source files from image.")
    print("=" * 70)

if __name__ == "__main__":
    main()
