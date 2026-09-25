from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse
from typing import List, Dict, Any
import os

from app.api.dependencies import get_current_user
from app.services.artifact_service import ArtifactService

router = APIRouter()

@router.get("", response_model=List[Dict[str, Any]])
def list_artifacts(current_user: Any = Depends(get_current_user)):
    """List all available institutional document formats & certificates."""
    return ArtifactService.list_artifacts()

@router.get("/{artifact_id}", response_model=Dict[str, Any])
def get_artifact(artifact_id: str, current_user: Any = Depends(get_current_user)):
    """Get parsed template structure, fields, and paragraphs for a specific artifact."""
    artifact = ArtifactService.get_artifact_by_id(artifact_id)
    if not artifact:
        raise HTTPException(status_code=404, detail=f"Artifact with ID '{artifact_id}' not found.")
    return artifact

@router.get("/{artifact_id}/download")
def download_artifact(artifact_id: str, current_user: Any = Depends(get_current_user)):
    """Download the original .docx document template."""
    filepath = ArtifactService.get_artifact_filepath(artifact_id)
    if not filepath or not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail=f"Template file for '{artifact_id}' not found on server.")
    
    filename = os.path.basename(filepath)
    return FileResponse(
        path=filepath,
        filename=filename,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    )
