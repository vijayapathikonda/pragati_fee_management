#!/usr/bin/env python3
"""
One-Time Google Drive OAuth Token Generator.
Generates an OAuth 2.0 User Refresh Token so that uploads count against
your personal 15 GB Google Drive storage quota (bypassing the service account quota limit).
"""

import os
import sys
import json
import argparse
from google_auth_oauthlib.flow import InstalledAppFlow
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
import io
from googleapiclient.http import MediaIoBaseUpload

SCOPES = ["https://www.googleapis.com/auth/drive"]

def get_tokens_from_file(client_secrets_path: str):
    print(f"[*] Loading client secrets from: {client_secrets_path}")
    try:
        flow = InstalledAppFlow.from_client_secrets_file(client_secrets_path, SCOPES)
    except Exception as e:
        print(f"[ERROR] Failed to read client secrets: {e}")
        return

    print("\n[!] Opening your web browser for Google Authorization...")
    print("    Log in with the Google Account whose 15 GB Drive you want to use, and click 'Allow'.\n")
    try:
        creds = flow.run_local_server(port=0)
    except Exception as e:
        print(f"\n[ERROR] Authorization failed: {e}")
        if "deleted_client" in str(e):
            print("\n[!] Reason: The OAuth client in this file was deleted in Google Cloud Console.")
            print("    Please create a new OAuth client of type 'Desktop app' and download the fresh JSON.")
        return

    with open(client_secrets_path, "r") as f:
        data = json.load(f)
    client_type = "installed" if "installed" in data else "web"
    client_id = data[client_type]["client_id"]
    client_secret = data[client_type]["client_secret"]

    display_results(client_id, client_secret, creds.refresh_token)

def get_tokens_from_id_secret(client_id: str, client_secret: str):
    client_config = {
        "installed": {
            "client_id": client_id.strip(),
            "client_secret": client_secret.strip(),
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": ["http://localhost"]
        }
    }
    flow = InstalledAppFlow.from_client_config(client_config, SCOPES)
    print("\n[!] Opening your web browser for Google Authorization...")
    print("    Log in with the Google Account whose 15 GB Drive you want to use, and click 'Allow'.\n")
    try:
        creds = flow.run_local_server(port=0)
        display_results(client_id, client_secret, creds.refresh_token)
    except Exception as e:
        print(f"\n[ERROR] Authorization failed: {e}")

def display_results(client_id: str, client_secret: str, refresh_token: str):
    print("\n" + "=" * 75)
    print("  GOOGLE DRIVE OAUTH 2.0 CREDENTIALS FOR RENDER")
    print("=" * 75)
    print("Add these 3 Environment Variables in your Render Dashboard:")
    print("-" * 75)
    print(f"GDRIVE_CLIENT_ID     = {client_id}")
    print(f"GDRIVE_CLIENT_SECRET = {client_secret}")
    print(f"GDRIVE_REFRESH_TOKEN = {refresh_token}")
    print("=" * 75)

    # Verify Upload
    print("\n[*] Verifying 15 GB upload permissions with Google Drive...")
    try:
        credentials = Credentials(
            None,
            refresh_token=refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=client_id,
            client_secret=client_secret,
            scopes=SCOPES
        )
        service = build("drive", "v3", credentials=credentials)
        media = MediaIoBaseUpload(io.BytesIO(b"Google Drive 15GB Quota Test Successful!"), mimetype="text/plain")
        test_file = service.files().create(
            body={"name": "_quota_test_delete_me.txt"},
            media_body=media,
            fields="id, name"
        ).execute()
        file_id = test_file.get("id")
        print(f"[OK] Upload SUCCESS! Uploaded test file ID: {file_id}")
        print("     Your 15 GB personal Google Drive storage is fully unlocked!")
        # Clean up
        service.files().delete(fileId=file_id).execute()
        print("[OK] Test file cleaned up successfully.")
    except Exception as e:
        print(f"[!] Warning during verification: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Google Drive OAuth User Token Generator")
    parser.add_argument("--secrets", type=str, help="Path to client_secret_*.json downloaded from Google Cloud")
    parser.add_argument("--client-id", type=str, help="OAuth Client ID")
    parser.add_argument("--client-secret", type=str, help="OAuth Client Secret")
    args = parser.parse_args()

    if args.secrets:
        get_tokens_from_file(args.secrets)
    elif args.client_id and args.client_secret:
        get_tokens_from_id_secret(args.client_id, args.client_secret)
    else:
        # Find the NEWEST client_secret*.json file by modification time
        candidate_files = []
        for f in os.listdir("."):
            if f.startswith("client_secret") and f.endswith(".json"):
                candidate_files.append(os.path.abspath(f))
        downloads = os.path.expanduser("~/Downloads")
        if os.path.exists(downloads):
            for f in os.listdir(downloads):
                if f.startswith("client_secret") and f.endswith(".json"):
                    candidate_files.append(os.path.join(downloads, f))

        if candidate_files:
            # Pick the most recently modified file
            candidate_files.sort(key=lambda p: os.path.getmtime(p), reverse=True)
            newest = candidate_files[0]
            print(f"[*] Found newest client secrets file: {newest}")
            get_tokens_from_file(newest)
        else:
            print("Usage:")
            print("  python tools/get_gdrive_oauth_token.py --secrets path/to/client_secret.json")
            print("  OR")
            print("  python tools/get_gdrive_oauth_token.py --client-id YOUR_ID --client-secret YOUR_SECRET")
