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
    Creates a complete ZIP archive containing:
    - Full SQL database dump (.sql)
    - Multi-sheet Excel database workbook (.xlsx)
    - Full JSON database snapshot (.json)
    - Uploaded files (Student Photos & PDF Receipts)
    """
    from fastapi.responses import Response
    from app.services.backup_service import BackupService

    zip_bytes, _excel_bytes, row_counts, ts_label = BackupService.create_full_backup_zip_bytes(db, include_uploads=True)
    backup_filename = f"Pragathi_DB_Backup_{ts_label}.zip"

    AuditService.log_action(
        db,
        action="EXPORT",
        resource="System:LocalFullBackup",
        user_id=current_user.id,
        details={"row_counts": row_counts},
        ip_address=request.client.host if request.client else None
    )

    return Response(
        content=zip_bytes,
        media_type="application/zip",
        headers={
            "Content-Disposition": f'attachment; filename="{backup_filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition",
        }
    )

@router.get("/backup/status")
def get_backup_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Returns Google Drive auto-backup configuration, last backup details, and recent Drive backup files."""
    from app.services.backup_service import BackupService
    from app.services.gdrive_service import gdrive_service

    cfg = BackupService.get_backup_config(db)
    folder_name = cfg.get("backup_folder_name") or "Pragathi_DB_Backups"
    recent_files = gdrive_service.list_folder_files(folder_name=folder_name, limit=12) if gdrive_service.is_configured else []
    return {
        "config": cfg,
        "recent_files": recent_files,
    }

@router.post("/backup/gdrive")
def trigger_gdrive_backup(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Immediately backs up the full database (.zip + .xlsx) to Google Drive."""
    from app.services.backup_service import BackupService

    res = BackupService.backup_to_google_drive(db, trigger="manual")
    AuditService.log_action(
        db,
        action="EXPORT",
        resource="System:GoogleDriveBackup",
        user_id=current_user.id,
        details={"filename": res.get("filename"), "success": res.get("success")},
        ip_address=request.client.host if request.client else None
    )
    return res

@router.post("/regenerate-receipts-gdrive")
def regenerate_receipts_gdrive(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Regenerates PDF vouchers for all existing receipts and uploads them to Google Drive folder Pragathi_Fee_Receipts."""
    from app.domain.fee_models import FeeReceipt, ReceiptStatus
    from app.services.pdf_service import PDFService
    from app.services.audit_service import AuditService

    receipts = db.query(FeeReceipt).filter(FeeReceipt.status == ReceiptStatus.SUCCESS).order_by(FeeReceipt.id.asc()).all()
    results = []

    for r in receipts:
        student = r.student
        student_name = f"{student.first_name} {student.last_name or ''}".strip() if student else "Student"
        admission_number = student.admission_number if student else "N/A"
        try:
            pdf_path = PDFService.generate_receipt_pdf(
                receipt=r,
                student_name=student_name,
                admission_number=admission_number,
                folder_name="Fee_Receipts"
            )
            r.pdf_path = pdf_path
            db.commit()
            results.append({
                "id": r.id,
                "receipt_number": r.receipt_number,
                "student_name": student_name,
                "pdf_path": pdf_path,
                "status": "success"
            })
        except Exception as e:
            results.append({
                "id": r.id,
                "receipt_number": r.receipt_number,
                "error": str(e),
                "status": "failed"
            })

    AuditService.log_action(
        db,
        action="EXPORT",
        resource="System:RegenerateReceiptsGDrive",
        user_id=current_user.id,
        details={"total": len(receipts), "success_count": sum(1 for x in results if x.get("status") == "success")},
        ip_address=request.client.host if request.client else None
    )
    return {
        "total": len(receipts),
        "success_count": sum(1 for x in results if x.get("status") == "success"),
        "receipts": results
    }




