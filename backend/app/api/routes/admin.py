import zipfile
import os
import shutil
from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import Dict, List
from fastapi.responses import FileResponse
from app.infrastructure.database import get_db
from app.api.dependencies import get_current_user
from app.domain.models import User
from app.domain.admin_models import AuditLog
from app.schemas.admin import SettingsBulkUpdate, AuditLogResponse
from app.services.settings_service import SettingsService
from app.services.audit_service import AuditService

router = APIRouter()

@router.get("/settings/{group}", response_model=Dict[str, str])
def get_settings(
    group: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return SettingsService.get_settings_by_group(db, group)

@router.put("/settings/{group}")
def update_settings(
    group: str,
    update_data: SettingsBulkUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    SettingsService.bulk_update(db, group, update_data.settings)
    
    # Log the action
    AuditService.log_action(
        db,
        action="UPDATE",
        resource=f"Settings:{group}",
        user_id=current_user.id,
        details={"updates": update_data.settings},
        ip_address=request.client.host if request.client else None
    )
    
    return {"message": "Settings updated successfully"}

@router.get("/audit-logs", response_model=List[AuditLogResponse])
def get_audit_logs(
    skip: int = Query(0),
    limit: int = Query(100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    logs = db.query(AuditLog).order_by(desc(AuditLog.timestamp)).offset(skip).limit(limit).all()
    
    response = []
    for log in logs:
        response.append(AuditLogResponse(
            id=log.id,
            user_id=log.user_id,
            username=log.user.username if log.user else "System",
            action=log.action,
            resource=log.resource,
            details=log.details,
            ip_address=log.ip_address,
            timestamp=log.timestamp
        ))
    return response

@router.post("/backup")
def trigger_backup(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Creates a zip archive of the uploads directory (containing PDFs, Photos, etc.)
    and returns it. For a true database backup, external shell scripts are required.
    """
    uploads_dir = "uploads"
    backup_filename = "uploads_backup.zip"
    backup_path = os.path.join("uploads", "temp", backup_filename)
    
    os.makedirs(os.path.dirname(backup_path), exist_ok=True)
    
    # Create zip
    with zipfile.ZipFile(backup_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(uploads_dir):
            if "temp" in root: # Skip temp dir
                continue
            for file in files:
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, uploads_dir)
                zipf.write(file_path, arcname)
                
    # Log Backup Action
    AuditService.log_action(
        db,
        action="EXPORT",
        resource="System:Backup",
        user_id=current_user.id,
        ip_address=request.client.host if request.client else None
    )
    
    return FileResponse(
        backup_path,
        media_type="application/zip",
        filename=backup_filename
    )
