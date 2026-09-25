from fastapi import APIRouter
from app.core.config import settings

router = APIRouter()

@router.api_route("", methods=["GET", "HEAD"])
@router.api_route("/", methods=["GET", "HEAD"])
def health_check():
    """
    Health check API supporting both GET and HEAD requests for UptimeRobot monitoring.
    """
    return {"status": "ok"}

@router.get("/storage")
def storage_status():
    """
    Diagnostic endpoint to verify Google Drive cloud storage status.
    """
    from app.services.gdrive_service import gdrive_service
    
    status = {
        "storage_provider": settings.STORAGE_PROVIDER,
        "is_configured": gdrive_service.is_configured,
        "auth_type": gdrive_service._auth_type,
        "has_oauth_tokens": bool(settings.GDRIVE_REFRESH_TOKEN and settings.GDRIVE_CLIENT_ID),
        "has_service_account": bool(settings.GDRIVE_SERVICE_ACCOUNT_JSON),
        "folder_id": settings.GDRIVE_FOLDER_ID or None,
    }
    
    if settings.STORAGE_PROVIDER != "gdrive":
        status["status"] = "inactive (STORAGE_PROVIDER is set to 'local')"
    elif not gdrive_service.is_configured:
        status["status"] = "error (Google Drive credentials missing or invalid)"
    else:
        try:
            folder_id = gdrive_service.get_or_create_folder("Fee_Receipts")
            status["fee_receipts_folder_id"] = folder_id
            status["status"] = f"connected ({gdrive_service._auth_type} 15GB Drive ready)"
        except Exception as e:
            status["status"] = f"error: {str(e)}"
            
    return status
