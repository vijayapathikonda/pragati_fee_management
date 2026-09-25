import json
from sqlalchemy.orm import Session
from app.domain.admin_models import AuditLog

class AuditService:
    @staticmethod
    def log_action(
        db: Session, 
        action: str, 
        resource: str, 
        user_id: int = None, 
        details: dict = None, 
        ip_address: str = None
    ):
        details_str = json.dumps(details) if details else None
        
        log = AuditLog(
            user_id=user_id,
            action=action,
            resource=resource,
            details=details_str,
            ip_address=ip_address
        )
        db.add(log)
        db.commit()
