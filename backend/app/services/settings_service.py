from typing import Dict, List
from sqlalchemy.orm import Session
from app.domain.admin_models import SystemSettings

class SettingsService:
    @staticmethod
    def get_settings_by_group(db: Session, group: str) -> Dict[str, str]:
        settings = db.query(SystemSettings).filter(SystemSettings.setting_group == group).all()
        return {s.setting_key: s.setting_value for s in settings}

    @staticmethod
    def get_setting(db: Session, key: str, default: str = None) -> str:
        setting = db.query(SystemSettings).filter(SystemSettings.setting_key == key).first()
        return setting.setting_value if setting else default

    @staticmethod
    def bulk_update(db: Session, group: str, updates: Dict[str, str]):
        existing = db.query(SystemSettings).filter(SystemSettings.setting_group == group).all()
        existing_map = {s.setting_key: s for s in existing}
        
        for key, value in updates.items():
            if key in existing_map:
                existing_map[key].setting_value = value
            else:
                new_setting = SystemSettings(
                    setting_group=group,
                    setting_key=key,
                    setting_value=value
                )
                db.add(new_setting)
                
        db.commit()

    @staticmethod
    def seed_defaults(db: Session):
        defaults = {
            "school_info": {
                "school_name": "Modern Academy",
                "school_address": "123 Education Lane",
                "school_phone": "+1 234 567 890",
                "school_email": "contact@modernacademy.edu"
            },
            "formats": {
                "admission_number_format": "ADM-{YYYY}-{SEQ:4}",
                "receipt_number_format": "REC-{YYYY}-{SEQ:4}"
            },
            "theme": {
                "primary_color": "#1976d2",
                "secondary_color": "#dc004e"
            }
        }
        
        for group, settings in defaults.items():
            for key, value in settings.items():
                existing = db.query(SystemSettings).filter(SystemSettings.setting_key == key).first()
                if not existing:
                    new_setting = SystemSettings(
                        setting_group=group,
                        setting_key=key,
                        setting_value=value
                    )
                    db.add(new_setting)
        db.commit()
