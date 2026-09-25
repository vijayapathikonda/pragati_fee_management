import json
import time
from datetime import datetime, timezone
from typing import Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
from app.domain.admin_models import SystemSettings
from app.core.licensing.crypto_service import CryptoService
from app.core.licensing.hardware_service import HardwareService
from app.core.exceptions import AppException

class LicenseStatus:
    ACTIVE = "ACTIVE"
    EXPIRING_SOON = "EXPIRING_SOON"
    EXPIRED = "EXPIRED"
    TAMPERED = "TAMPERED"
    UNLICENSED = "UNLICENSED"

class LicenseService:
    _cached_info: Optional[Dict[str, Any]] = None
    _cached_at: float = 0.0
    _CACHE_TTL_SECONDS: float = 60.0

    @classmethod
    def invalidate_cache(cls):
        cls._cached_info = None
        cls._cached_at = 0.0

    @classmethod
    def get_setting(cls, db: Session, key: str) -> Optional[str]:
        setting = db.query(SystemSettings).filter(
            SystemSettings.setting_group == "license",
            SystemSettings.setting_key == key
        ).first()
        return setting.setting_value if setting else None

    @classmethod
    def set_setting(cls, db: Session, key: str, value: str, description: str = ""):
        setting = db.query(SystemSettings).filter(
            SystemSettings.setting_group == "license",
            SystemSettings.setting_key == key
        ).first()
        if setting:
            setting.setting_value = value
        else:
            setting = SystemSettings(
                setting_group="license",
                setting_key=key,
                setting_value=value,
                description=description
            )
            db.add(setting)
        db.commit()

    @classmethod
    def get_license_info(cls, db: Session, force_refresh: bool = False) -> Dict[str, Any]:
        """
        Calculates and returns the full license status, days remaining, and validation flags.
        Uses a short in-memory cache (60s) to avoid hammering remote cloud databases on every page load.
        """
        now_ts = time.time()
        if not force_refresh and cls._cached_info is not None and (now_ts - cls._cached_at) < cls._CACHE_TTL_SECONDS:
            return cls._cached_info

        current_server_id = HardwareService.get_server_id()
        raw_document = cls.get_setting(db, "license_document")

        if not raw_document:
            res = {
                "status": LicenseStatus.UNLICENSED,
                "message": "No license activated. Please upload a valid .lic file.",
                "days_remaining": 0,
                "hours_remaining": 0,
                "expires_at": None,
                "issued_at": None,
                "school_name": None,
                "server_id": None,
                "current_server_id": current_server_id,
                "is_write_allowed": False
            }
            cls._cached_info = res
            cls._cached_at = now_ts
            return res

        try:
            license_data = json.loads(raw_document)
        except Exception:
            return {
                "status": LicenseStatus.TAMPERED,
                "message": "License file data corrupted in database.",
                "days_remaining": 0,
                "hours_remaining": 0,
                "expires_at": None,
                "issued_at": None,
                "school_name": None,
                "server_id": None,
                "current_server_id": current_server_id,
                "is_write_allowed": False
            }

        # 1. Verify Cryptographic Signature
        is_valid_sig, sig_err, payload = CryptoService.verify_license_document(license_data)
        if not is_valid_sig or not payload:
            return {
                "status": LicenseStatus.TAMPERED,
                "message": f"License cryptographic verification failed: {sig_err}",
                "days_remaining": 0,
                "hours_remaining": 0,
                "expires_at": None,
                "issued_at": None,
                "school_name": None,
                "server_id": None,
                "current_server_id": current_server_id,
                "is_write_allowed": False
            }

        school_name = payload.get("school_name", "Unknown School")
        lic_server_id = payload.get("server_id", "ANY")
        issued_at_str = payload.get("issued_at")
        expires_at_str = payload.get("expires_at")

        # 2. Verify Server Hardware ID binding
        if lic_server_id and lic_server_id != "ANY" and lic_server_id.upper() != current_server_id.upper():
            return {
                "status": LicenseStatus.TAMPERED,
                "message": f"License is issued for Server ID '{lic_server_id}', but this server is '{current_server_id}'.",
                "days_remaining": 0,
                "hours_remaining": 0,
                "expires_at": expires_at_str,
                "issued_at": issued_at_str,
                "school_name": school_name,
                "server_id": lic_server_id,
                "current_server_id": current_server_id,
                "is_write_allowed": False
            }

        # 3. Check for Clock Rollback
        now_epoch = int(now_ts)
        last_seen_epoch_str = cls.get_setting(db, "license_last_seen_epoch")
        last_seen_epoch = 0
        if last_seen_epoch_str:
            try:
                last_seen_epoch = int(last_seen_epoch_str)
                # Allow 1-hour grace for system NTP clock synchronizations
                if now_epoch < (last_seen_epoch - 3600):
                    return {
                        "status": LicenseStatus.TAMPERED,
                        "message": "Clock rollback detected! The server system time was altered backwards.",
                        "days_remaining": 0,
                        "hours_remaining": 0,
                        "expires_at": expires_at_str,
                        "issued_at": issued_at_str,
                        "school_name": school_name,
                        "server_id": lic_server_id,
                        "current_server_id": current_server_id,
                        "is_write_allowed": False
                    }
            except Exception:
                pass

        # Update high-water mark epoch at most once per hour (3600s) to avoid write-locking DB on GET requests
        if (now_epoch - last_seen_epoch) > 3600:
            try:
                cls.set_setting(db, "license_last_seen_epoch", str(now_epoch), "License anti-rollback high-water epoch")
            except Exception:
                db.rollback()

        # 4. Check Expiry
        try:
            expires_dt = datetime.fromisoformat(expires_at_str.replace("Z", "+00:00"))
            now_dt = datetime.now(timezone.utc)
            delta = expires_dt - now_dt
            seconds_remaining = int(delta.total_seconds())
        except Exception as e:
            return {
                "status": LicenseStatus.TAMPERED,
                "message": f"Invalid expiration timestamp format: {e}",
                "days_remaining": 0,
                "hours_remaining": 0,
                "expires_at": expires_at_str,
                "issued_at": issued_at_str,
                "school_name": school_name,
                "server_id": lic_server_id,
                "current_server_id": current_server_id,
                "is_write_allowed": False
            }

        if seconds_remaining <= 0:
            res = {
                "status": LicenseStatus.EXPIRED,
                "message": f"Annual software license expired on {expires_dt.strftime('%d %B %Y')}. Please renew to resume write operations.",
                "days_remaining": 0,
                "hours_remaining": 0,
                "expires_at": expires_at_str,
                "issued_at": issued_at_str,
                "school_name": school_name,
                "server_id": lic_server_id,
                "current_server_id": current_server_id,
                "is_write_allowed": False
            }
            cls._cached_info = res
            cls._cached_at = now_ts
            return res

        days_remaining = seconds_remaining // 86400
        hours_remaining = (seconds_remaining % 86400) // 3600

        # Warning threshold: 30 days
        if days_remaining <= 30:
            res = {
                "status": LicenseStatus.EXPIRING_SOON,
                "message": f"License expires in {days_remaining} day(s) on {expires_dt.strftime('%d %B %Y')}. Please renew to prevent service disruption.",
                "days_remaining": days_remaining,
                "hours_remaining": hours_remaining,
                "expires_at": expires_at_str,
                "issued_at": issued_at_str,
                "school_name": school_name,
                "server_id": lic_server_id,
                "current_server_id": current_server_id,
                "is_write_allowed": True
            }
            cls._cached_info = res
            cls._cached_at = now_ts
            return res

        res = {
            "status": LicenseStatus.ACTIVE,
            "message": f"License is active and valid until {expires_dt.strftime('%d %B %Y')}.",
            "days_remaining": days_remaining,
            "hours_remaining": hours_remaining,
            "expires_at": expires_at_str,
            "issued_at": issued_at_str,
            "school_name": school_name,
            "server_id": lic_server_id,
            "current_server_id": current_server_id,
            "is_write_allowed": True
        }
        cls._cached_info = res
        cls._cached_at = now_ts
        return res

    @classmethod
    def activate_license(cls, file_content: bytes, db: Session, user_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Validates and activates an uploaded .lic file content.
        """
        try:
            license_doc = json.loads(file_content.decode("utf-8"))
        except Exception:
            raise AppException("Uploaded file is not a valid JSON license document.")

        is_valid_sig, sig_err, payload = CryptoService.verify_license_document(license_doc)
        if not is_valid_sig or not payload:
            raise AppException(f"License verification failed: {sig_err}")

        current_server_id = HardwareService.get_server_id()
        lic_server_id = payload.get("server_id", "ANY")

        if lic_server_id and lic_server_id != "ANY" and lic_server_id.upper() != current_server_id.upper():
            raise AppException(
                f"License is bound to Server ID '{lic_server_id}', but this server has ID '{current_server_id}'. "
                "Please request a license file for this server ID."
            )

        expires_at_str = payload.get("expires_at")
        try:
            expires_dt = datetime.fromisoformat(expires_at_str.replace("Z", "+00:00"))
            now_dt = datetime.now(timezone.utc)
            if expires_dt <= now_dt:
                raise AppException(f"The uploaded license has already expired on {expires_dt.strftime('%d %B %Y')}.")
        except Exception as e:
            if isinstance(e, AppException):
                raise
            raise AppException(f"Invalid expiration date in license: {e}")

        # Store the active license document
        cls.set_setting(db, "license_document", json.dumps(license_doc), "Active cryptographic license document")
        cls.set_setting(db, "license_last_seen_epoch", str(int(time.time())), "License anti-rollback high-water epoch")
        cls.invalidate_cache()

        # Audit Log
        try:
            from app.services.audit_service import AuditService
            AuditService.log_action(
                db=db,
                action="ACTIVATE_LICENSE",
                resource=f"License:{payload.get('school_name')}:{expires_at_str}",
                user_id=user_id
            )
        except Exception:
            pass

        return cls.get_license_info(db, force_refresh=True)
