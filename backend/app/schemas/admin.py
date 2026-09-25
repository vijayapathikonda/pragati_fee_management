from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime

# Settings Schemas
class SystemSettingBase(BaseModel):
    setting_group: str
    setting_key: str
    setting_value: Optional[str] = None
    description: Optional[str] = None

class SystemSettingCreate(SystemSettingBase):
    pass

class SystemSettingUpdate(BaseModel):
    setting_value: str

class SystemSettingResponse(SystemSettingBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class SettingsBulkUpdate(BaseModel):
    settings: dict[str, str]

# Audit Log Schemas
class AuditLogResponse(BaseModel):
    id: int
    user_id: Optional[int]
    username: Optional[str] = None
    action: str
    resource: str
    details: Optional[str] = None
    ip_address: Optional[str] = None
    timestamp: datetime
    model_config = ConfigDict(from_attributes=True)
