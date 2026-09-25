from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Generic, TypeVar
from datetime import date, datetime

T = TypeVar('T')

class PaginatedResponse(BaseModel, Generic[T]):
    data: List[T]
    total: int
    page: int
    size: int

# --- Academic Year ---
class AcademicYearBase(BaseModel):
    name: str
    start_date: date
    end_date: date
    is_active: bool = True

class AcademicYearCreate(AcademicYearBase):
    pass

class AcademicYearUpdate(AcademicYearBase):
    name: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_active: Optional[bool] = None

class AcademicYearResponse(AcademicYearBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

# --- Grade ---
class GradeBase(BaseModel):
    name: str
    description: Optional[str] = None

class GradeCreate(GradeBase):
    pass

class GradeUpdate(GradeBase):
    name: Optional[str] = None

class GradeResponse(GradeBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

# --- Section ---
class SectionBase(BaseModel):
    name: str
    description: Optional[str] = None

class SectionCreate(SectionBase):
    pass

class SectionUpdate(SectionBase):
    name: Optional[str] = None

class SectionResponse(SectionBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

# --- Fee Category ---
class FeeCategoryBase(BaseModel):
    name: str
    description: Optional[str] = None
    is_active: bool = True

class FeeCategoryCreate(FeeCategoryBase):
    pass

class FeeCategoryUpdate(FeeCategoryBase):
    name: Optional[str] = None
    is_active: Optional[bool] = None

class FeeCategoryResponse(FeeCategoryBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

# --- Payment Mode ---
class PaymentModeBase(BaseModel):
    name: str
    is_active: bool = True

class PaymentModeCreate(PaymentModeBase):
    pass

class PaymentModeUpdate(PaymentModeBase):
    name: Optional[str] = None
    is_active: Optional[bool] = None

class PaymentModeResponse(PaymentModeBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

# --- Late Fee Rule ---
class LateFeeRuleBase(BaseModel):
    name: str
    grace_period_days: int = 0
    penalty_amount: float = 0.0
    penalty_percentage: float = 0.0
    is_active: bool = True

class LateFeeRuleCreate(LateFeeRuleBase):
    pass

class LateFeeRuleUpdate(LateFeeRuleBase):
    name: Optional[str] = None

class LateFeeRuleResponse(LateFeeRuleBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

# --- Discount Type ---
class DiscountTypeBase(BaseModel):
    name: str
    description: Optional[str] = None
    percentage: float = 0.0
    flat_amount: float = 0.0
    is_active: bool = True

class DiscountTypeCreate(DiscountTypeBase):
    pass

class DiscountTypeUpdate(DiscountTypeBase):
    name: Optional[str] = None

class DiscountTypeResponse(DiscountTypeBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

# --- Application Setting ---
class ApplicationSettingBase(BaseModel):
    setting_key: str
    setting_value: str

class ApplicationSettingCreate(ApplicationSettingBase):
    pass

class ApplicationSettingUpdate(ApplicationSettingBase):
    setting_key: Optional[str] = None
    setting_value: Optional[str] = None

class ApplicationSettingResponse(ApplicationSettingBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

# --- School Information ---
class SchoolInformationBase(BaseModel):
    name: str
    address: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    logo_url: Optional[str] = None

class SchoolInformationCreate(SchoolInformationBase):
    pass

class SchoolInformationUpdate(SchoolInformationBase):
    name: Optional[str] = None

class SchoolInformationResponse(SchoolInformationBase):
    id: int
    model_config = ConfigDict(from_attributes=True)
