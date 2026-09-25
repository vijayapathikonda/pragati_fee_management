from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from app.infrastructure.database import get_db
from app.api.dependencies import get_current_user
from app.domain.models import User
from app.core.licensing.license_service import LicenseService
from app.core.licensing.hardware_service import HardwareService

router = APIRouter()

@router.get("/status")
def get_license_status(db: Session = Depends(get_db)):
    """
    Returns current license status, expiration date, days remaining, and server hardware ID.
    Can be polled by frontend layout to render warning banners and badges.
    """
    return LicenseService.get_license_info(db)

@router.get("/fingerprint")
def get_server_fingerprint():
    """
    Returns the Server Hardware ID (Machine Fingerprint).
    The administrator copies this to request or renew an annual license.
    """
    return {
        "server_id": HardwareService.get_server_id()
    }

@router.post("/upload")
async def upload_license(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Uploads and activates a new .lic file.
    Validates signature, server ID, and expiration date.
    """
    if not file.filename.endswith((".lic", ".json")):
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload a .lic file.")

    content = await file.read()
    updated_info = LicenseService.activate_license(content, db, user_id=current_user.id)
    return {
        "message": "License activated successfully!",
        "license": updated_info
    }
