import os
import uuid
import shutil
from fastapi import UploadFile
from app.core.exceptions import AppException
from app.core.config import settings
from app.services.gdrive_service import gdrive_service

UPLOAD_DIR = "uploads"

class FileService:
    @staticmethod
    def save_upload_file(upload_file: UploadFile, subfolder: str = "") -> str:
        if not upload_file.filename:
            raise AppException("No file provided")
            
        ext = os.path.splitext(upload_file.filename)[1]
        unique_filename = f"{uuid.uuid4().hex}{ext}"

        # 1. Cloud Storage via Google Drive
        if settings.STORAGE_PROVIDER == "gdrive" and gdrive_service.is_configured:
            content = upload_file.file.read()
            mime = upload_file.content_type or "application/octet-stream"
            folder = subfolder or "Uploads"
            result = gdrive_service.upload_file_bytes(content, unique_filename, mime, folder_name=folder)
            if result and result.get("direct_img_url"):
                return result["direct_img_url"]

        # 2. Local Disk Fallback
        target_dir = os.path.join(UPLOAD_DIR, subfolder)
        os.makedirs(target_dir, exist_ok=True)
        file_path = os.path.join(target_dir, unique_filename)
        
        # Reset file cursor if it was read
        upload_file.file.seek(0)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(upload_file.file, buffer)
            
        return f"/static/{subfolder}/{unique_filename}" if subfolder else f"/static/{unique_filename}"
