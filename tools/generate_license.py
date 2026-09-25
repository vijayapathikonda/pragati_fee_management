#!/usr/bin/env python3
"""
Vendor License Generator Tool for School Fee Management System.
Used exclusively by the software provider to generate cryptographically signed .lic files.

Usage:
  # 1. Initialize keys (run once by vendor):
  python tools/generate_license.py init-keys

  # 2. Generate a 1-year license:
  python tools/generate_license.py issue \
      --school "Pragathi Vidyalaya" \
      --server-id "SCH-1234-ABCD-5678" \
      --days 365 \
      --output pragathi_vidyalaya_license.lic
"""

import os
import sys
import json
import base64
import argparse
from datetime import datetime, timezone, timedelta
from cryptography.hazmat.primitives.asymmetric import ed25519
from cryptography.hazmat.primitives import serialization

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KEYS_DIR = os.path.join(BASE_DIR, "tools", "keys")
PRIVATE_KEY_PATH = os.path.join(KEYS_DIR, "private_key.pem")
PUBLIC_KEY_PATH = os.path.join(BASE_DIR, "backend", "app", "core", "licensing", "public_key.pem")

def ensure_keys():
    """Generates an Ed25519 keypair if not already present."""
    os.makedirs(KEYS_DIR, exist_ok=True)
    os.makedirs(os.path.dirname(PUBLIC_KEY_PATH), exist_ok=True)

    if not os.path.exists(PRIVATE_KEY_PATH):
        print(f"[*] Generating new Ed25519 vendor keypair...")
        private_key = ed25519.Ed25519PrivateKey.generate()
        public_key = private_key.public_key()

        # Save private key (vendor only)
        with open(PRIVATE_KEY_PATH, "wb") as f:
            f.write(private_key.private_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PrivateFormat.PKCS8,
                encryption_algorithm=serialization.NoEncryption()
            ))

        # Save public key (embedded in application)
        with open(PUBLIC_KEY_PATH, "wb") as f:
            f.write(public_key.public_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PublicFormat.SubjectPublicKeyInfo
            ))

        print(f"[+] Private key saved to : {PRIVATE_KEY_PATH}")
        print(f"[+] Public key saved to  : {PUBLIC_KEY_PATH}")
    else:
        print(f"[+] Using existing keys.")

def issue_license(school_name: str, server_id: str, days: int, output_path: str, client_email: str = ""):
    """Issues a cryptographically signed .lic file for a school."""
    if not os.path.exists(PRIVATE_KEY_PATH):
        print(f"[!] Private key not found at {PRIVATE_KEY_PATH}. Running init-keys first...")
        ensure_keys()

    with open(PRIVATE_KEY_PATH, "rb") as f:
        private_key = serialization.load_pem_private_key(f.read(), password=None)

    # If server_id not explicitly provided, try auto-detecting from uploads/.server_id
    if not server_id:
        local_id_file = os.path.join(BASE_DIR, "uploads", ".server_id")
        if os.path.exists(local_id_file):
            try:
                with open(local_id_file, "r", encoding="utf-8") as f:
                    auto_id = f.read().strip()
                    if auto_id:
                        server_id = auto_id
                        print(f"[*] Auto-detected local Server ID: {server_id}")
            except Exception:
                pass

    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(days=days)

    payload = {
        "school_name": school_name.strip(),
        "client_email": client_email.strip(),
        "server_id": server_id.strip().upper() if server_id else "ANY",
        "issued_at": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "expires_at": expires_at.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "duration_days": days,
        "license_version": "1.0",
        "features": ["STUDENTS", "FINANCE", "REPORTS", "ADMIN"]
    }

    # Canonical JSON string for signature
    canonical_json = json.dumps(payload, sort_keys=True, separators=(',', ':')).encode('utf-8')
    signature = private_key.sign(canonical_json)
    signature_b64 = base64.b64encode(signature).decode('utf-8')

    license_document = {
        "format": "SCHOOL_FEE_MGMT_LICENSE_V1",
        "payload": payload,
        "signature": signature_b64
    }

    output_json = json.dumps(license_document, indent=2)

    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(output_json)

    print("\n==========================================================")
    print("  License Generated Successfully!")
    print("==========================================================")
    print(f"  School Name   : {payload['school_name']}")
    print(f"  Server ID     : {payload['server_id']}")
    print(f"  Issued Date   : {payload['issued_at']}")
    print(f"  Expiry Date   : {payload['expires_at']} ({days} days)")
    print(f"  Output File   : {output_path}")
    print("==========================================================\n")

def inspect_license(license_path: str):
    """Inspects and validates a license file using the public key."""
    if not os.path.exists(PUBLIC_KEY_PATH):
        print(f"[!] Public key not found at {PUBLIC_KEY_PATH}")
        return

    with open(PUBLIC_KEY_PATH, "rb") as f:
        public_key = serialization.load_pem_public_key(f.read())

    with open(license_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    payload = data.get("payload", {})
    signature_b64 = data.get("signature", "")
    canonical_json = json.dumps(payload, sort_keys=True, separators=(',', ':')).encode('utf-8')
    signature = base64.b64decode(signature_b64)

    try:
        public_key.verify(signature, canonical_json)
        print("[+] Cryptographic Signature: VALID")
    except Exception as e:
        print(f"[X] Cryptographic Signature: INVALID ({e})")

    print(json.dumps(payload, indent=2))

def main():
    parser = argparse.ArgumentParser(description="School Fee Management License Generator")
    subparsers = parser.add_subparsers(dest="command")

    # init-keys
    subparsers.add_parser("init-keys", help="Generate Ed25519 vendor keypair")

    # issue
    issue_parser = subparsers.add_parser("issue", help="Issue a new school license")
    issue_parser.add_argument("--school", required=True, help="School institution name")
    issue_parser.add_argument("--server-id", required=False, default="", help="School server hardware ID (or leave empty for unconstrained)")
    issue_parser.add_argument("--days", type=int, default=365, help="Validity duration in days (default: 365)")
    issue_parser.add_argument("--email", default="", help="Client contact email")
    issue_parser.add_argument("--output", default="license.lic", help="Output file path (.lic)")

    # inspect
    inspect_parser = subparsers.add_parser("inspect", help="Inspect and verify a .lic file")
    inspect_parser.add_argument("file", help="Path to .lic file")

    args = parser.parse_args()

    if args.command == "init-keys":
        ensure_keys()
    elif args.command == "issue":
        issue_license(args.school, args.server_id, args.days, args.output, args.email)
    elif args.command == "inspect":
        inspect_license(args.file)
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
