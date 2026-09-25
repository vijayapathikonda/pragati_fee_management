import os
import sys
import uuid
import hashlib
import platform
from typing import Optional
from sqlalchemy.orm import Session

class HardwareService:
    _cached_server_id = None

    @classmethod
    def _get_uploads_dir(cls) -> str:
        """Locates the persistent uploads directory across Docker and host environments."""
        candidates = [
            "/app/uploads",  # Standard Docker container path
            os.path.abspath("uploads"),  # Relative to working directory
            os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))), "uploads"),  # Repo root uploads
        ]
        for path in candidates:
            if os.path.exists(path) and os.path.isdir(path):
                return path

        # Fallback to first writable candidate
        for path in candidates:
            try:
                os.makedirs(path, exist_ok=True)
                return path
            except Exception:
                continue

        return os.path.abspath("uploads")

    @classmethod
    def get_server_id(cls, db: Optional[Session] = None) -> str:
        """
        Returns a stable, tamper-resistant unique Server ID for the host machine.
        Persisted both in the shared uploads directory and in the database.
        Format: SCH-XXXX-XXXX-XXXX
        """
        if cls._cached_server_id:
            return cls._cached_server_id

        uploads_dir = cls._get_uploads_dir()
        id_file_path = os.path.join(uploads_dir, ".server_id")

        # 1. Check persistent file in uploads folder
        if os.path.exists(id_file_path):
            try:
                with open(id_file_path, "r", encoding="utf-8") as f:
                    stored_id = f.read().strip()
                    if stored_id and stored_id.startswith("SCH-"):
                        cls._cached_server_id = stored_id
                        return stored_id
            except Exception:
                pass

        # 2. Check persistent database setting if DB session is available
        if db:
            try:
                from app.domain.admin_models import SystemSettings
                setting = db.query(SystemSettings).filter(
                    SystemSettings.setting_group == "license",
                    SystemSettings.setting_key == "server_hardware_id"
                ).first()
                if setting and setting.setting_value and setting.setting_value.startswith("SCH-"):
                    cls._cached_server_id = setting.setting_value
                    # Write to file for future speed
                    try:
                        with open(id_file_path, "w", encoding="utf-8") as f:
                            f.write(cls._cached_server_id)
                    except Exception:
                        pass
                    return cls._cached_server_id
            except Exception:
                pass

        # 3. Compute stable server identifier from hardware / machine details
        raw_identifiers = []

        # Platform details
        raw_identifiers.append(platform.node())
        raw_identifiers.append(platform.machine())

        # Windows-specific: MachineGuid from Registry
        if sys.platform == "win32":
            try:
                import winreg
                with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Cryptography") as key:
                    guid, _ = winreg.QueryValueEx(key, "MachineGuid")
                    if guid:
                        raw_identifiers.append(str(guid).strip())
            except Exception:
                pass

        # Linux/Docker-specific: machine-id
        if sys.platform.startswith("linux"):
            for mid_path in ["/etc/machine-id", "/var/lib/dbus/machine-id"]:
                if os.path.exists(mid_path):
                    try:
                        with open(mid_path, "r", encoding="utf-8") as f:
                            content = f.read().strip()
                            if content:
                                raw_identifiers.append(content)
                                break
                    except Exception:
                        pass

        # Fallback to persistent random seed if hardware identifiers are sparse
        seed_path = os.path.join(uploads_dir, ".server_seed")
        if os.path.exists(seed_path):
            try:
                with open(seed_path, "r", encoding="utf-8") as f:
                    seed = f.read().strip()
                    if seed:
                        raw_identifiers.append(seed)
            except Exception:
                pass
        else:
            try:
                seed = str(uuid.uuid4())
                with open(seed_path, "w", encoding="utf-8") as f:
                    f.write(seed)
                raw_identifiers.append(seed)
            except Exception:
                pass

        combined = "|".join(raw_identifiers).encode("utf-8")
        digest = hashlib.sha256(combined).hexdigest().upper()

        # Format as SCH-XXXX-XXXX-XXXX
        formatted_id = f"SCH-{digest[:4]}-{digest[4:8]}-{digest[8:12]}"
        cls._cached_server_id = formatted_id

        # Persist to id file
        try:
            with open(id_file_path, "w", encoding="utf-8") as f:
                f.write(formatted_id)
        except Exception:
            pass

        # Persist to DB if session provided
        if db:
            try:
                from app.domain.admin_models import SystemSettings
                setting = db.query(SystemSettings).filter(
                    SystemSettings.setting_group == "license",
                    SystemSettings.setting_key == "server_hardware_id"
                ).first()
                if not setting:
                    setting = SystemSettings(
                        setting_group="license",
                        setting_key="server_hardware_id",
                        setting_value=formatted_id,
                        description="Permanent Server Hardware Identifier"
                    )
                    db.add(setting)
                    db.commit()
            except Exception:
                pass

        return formatted_id
