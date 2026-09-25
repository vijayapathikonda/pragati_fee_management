import os
import io
import json
import base64
from typing import Optional, Dict
from loguru import logger

try:
    from google.oauth2 import service_account
    from googleapiclient.discovery import build
    from googleapiclient.http import MediaIoBaseUpload, MediaFileUpload
    GDRIVE_AVAILABLE = True
except ImportError:
    GDRIVE_AVAILABLE = False
    logger.warning("Google Drive client libraries not installed. Run 'pip install google-api-python-client google-auth'.")

from app.core.config import settings

class GoogleDriveService:
    _instance: Optional["GoogleDriveService"] = None
    _service = None
    _folder_cache: Dict[str, str] = {}

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(GoogleDriveService, cls).__new__(cls)
            cls._instance._init_service()
        return cls._instance

    _auth_type: str = "none"

    def _init_service(self):
        """Initializes the Google Drive API client using either OAuth 2.0 User credentials or Service Account."""
        if not GDRIVE_AVAILABLE:
            return

        scopes = ["https://www.googleapis.com/auth/drive"]

        # 1. Prefer OAuth 2.0 User Refresh Token (uses personal 15 GB quota, bypasses service account quota limit)
        if settings.GDRIVE_REFRESH_TOKEN and settings.GDRIVE_CLIENT_ID and settings.GDRIVE_CLIENT_SECRET:
            try:
                from google.oauth2.credentials import Credentials
                credentials = Credentials(
                    None,
                    refresh_token=settings.GDRIVE_REFRESH_TOKEN,
                    token_uri="https://oauth2.googleapis.com/token",
                    client_id=settings.GDRIVE_CLIENT_ID,
                    client_secret=settings.GDRIVE_CLIENT_SECRET,
                    scopes=scopes
                )
                self._service = build("drive", "v3", credentials=credentials, cache_discovery=False)
                self._auth_type = "oauth_user"
                logger.info("Google Drive API successfully authenticated with OAuth 2.0 User Account (15 GB Personal Quota active).")
                return
            except Exception as oauth_err:
                logger.error(f"Failed to authenticate with Google Drive OAuth credentials: {oauth_err}")

        # 2. Fallback to Service Account
        creds_data = settings.GDRIVE_SERVICE_ACCOUNT_JSON
        if not creds_data:
            logger.info("Neither Google Drive OAuth tokens nor service account credentials set. Drive storage is inactive.")
            return

        try:
            creds_info = None
            if os.path.isfile(creds_data):
                with open(creds_data, "r", encoding="utf-8") as f:
                    creds_info = json.load(f)
            else:
                try:
                    creds_info = json.loads(creds_data)
                except Exception:
                    try:
                        decoded = base64.b64decode(creds_data).decode("utf-8")
                        creds_info = json.loads(decoded)
                    except Exception as b64_err:
                        logger.error(f"Failed to decode GDRIVE_SERVICE_ACCOUNT_JSON: {b64_err}")
                        return

            if creds_info:
                if "private_key" in creds_info and "\\n" in creds_info["private_key"]:
                    creds_info["private_key"] = creds_info["private_key"].replace("\\n", "\n")

                credentials = service_account.Credentials.from_service_account_info(
                    creds_info, scopes=scopes
                )
                self._service = build("drive", "v3", credentials=credentials, cache_discovery=False)
                self._auth_type = "service_account"
                logger.info("Google Drive API service successfully authenticated with Service Account.")
        except Exception as e:
            logger.error(f"Failed to initialize Google Drive service: {e}")

    @property
    def is_configured(self) -> bool:
        """Returns True if the Google Drive service is actively initialized."""
        return self._service is not None

    def get_or_create_folder(self, folder_name: str, parent_id: Optional[str] = None) -> Optional[str]:
        """Gets existing folder ID or creates a new one in Google Drive."""
        if not self.is_configured:
            return None

        cache_key = f"{parent_id or ''}_{folder_name}"
        if cache_key in self._folder_cache:
            return self._folder_cache[cache_key]

        try:
            query = f"mimeType = 'application/vnd.google-apps.folder' and name = '{folder_name}' and trashed = false"
            if parent_id:
                query += f" and '{parent_id}' in parents"
            elif settings.GDRIVE_FOLDER_ID:
                query += f" and '{settings.GDRIVE_FOLDER_ID}' in parents"

            results = self._service.files().list(
                q=query, spaces="drive", fields="files(id, name)"
            ).execute()
            files = results.get("files", [])

            if files:
                folder_id = files[0]["id"]
            else:
                # Create folder
                folder_metadata = {
                    "name": folder_name,
                    "mimeType": "application/vnd.google-apps.folder",
                }
                target_parent = parent_id or settings.GDRIVE_FOLDER_ID
                if target_parent:
                    folder_metadata["parents"] = [target_parent]

                folder = self._service.files().create(
                    body=folder_metadata, fields="id"
                ).execute()
                folder_id = folder.get("id")

            self._folder_cache[cache_key] = folder_id
            return folder_id
        except Exception as e:
            logger.error(f"Error getting/creating Google Drive folder '{folder_name}': {e}")
            return None

    def upload_file_bytes(
        self,
        file_bytes: bytes,
        filename: str,
        mime_type: str = "application/octet-stream",
        folder_name: Optional[str] = None
    ) -> Optional[Dict[str, str]]:
        """
        Uploads in-memory bytes to Google Drive, sets public read access, and returns direct URLs.
        Returns a dict: {'file_id': ..., 'view_url': ..., 'download_url': ..., 'direct_img_url': ...}
        """
        if not self.is_configured:
            logger.warning("Google Drive upload requested but service is not configured.")
            return None

        try:
            folder_id = None
            if folder_name:
                folder_id = self.get_or_create_folder(folder_name)
            elif settings.GDRIVE_FOLDER_ID:
                folder_id = settings.GDRIVE_FOLDER_ID

            file_metadata = {"name": filename}
            if folder_id:
                file_metadata["parents"] = [folder_id]

            media = MediaIoBaseUpload(io.BytesIO(file_bytes), mimetype=mime_type, resumable=True)
            uploaded_file = self._service.files().create(
                body=file_metadata, media_body=media, fields="id, name, webViewLink, webContentLink"
            ).execute()

            file_id = uploaded_file.get("id")

            # Set public read permission so links work directly in browser and <img> tags
            try:
                self._service.permissions().create(
                    fileId=file_id,
                    body={"type": "anyone", "role": "reader"}
                ).execute()
            except Exception as perm_err:
                logger.warning(f"Could not set public permission on GDrive file {file_id}: {perm_err}")

            return {
                "file_id": file_id,
                "filename": filename,
                "view_url": f"https://drive.google.com/file/d/{file_id}/view?usp=sharing",
                "download_url": f"https://drive.google.com/uc?export=download&id={file_id}",
                # Direct image embed URL (renders directly inside <img> tags)
                "direct_img_url": f"https://lh3.googleusercontent.com/d/{file_id}",
            }
        except Exception as e:
            logger.error(f"Failed to upload file '{filename}' to Google Drive: {e}")
            return None

    def upload_local_file(
        self,
        local_path: str,
        filename: Optional[str] = None,
        mime_type: str = "application/octet-stream",
        folder_name: Optional[str] = None
    ) -> Optional[Dict[str, str]]:
        """Uploads a local file from disk to Google Drive."""
        if not os.path.exists(local_path):
            logger.error(f"Local file does not exist: {local_path}")
            return None

        with open(local_path, "rb") as f:
            content = f.read()

        target_name = filename or os.path.basename(local_path)
        return self.upload_file_bytes(content, target_name, mime_type, folder_name)

    def delete_file(self, file_id: str) -> bool:
        """Deletes a file from Google Drive by ID."""
        if not self.is_configured:
            return False

        try:
            self._service.files().delete(fileId=file_id).execute()
            logger.info(f"Deleted Google Drive file: {file_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete Google Drive file {file_id}: {e}")
            return False

# Global Singleton Instance
gdrive_service = GoogleDriveService()
