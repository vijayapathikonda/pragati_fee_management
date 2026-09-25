from app.repositories.base_repository import BaseRepository
from app.domain.master_models import (
    AcademicYear, Grade, Section, FeeCategory, PaymentMode,
    LateFeeRule, DiscountType, ApplicationSetting, SchoolInformation
)
from app.schemas.master import (
    AcademicYearCreate, AcademicYearUpdate,
    GradeCreate, GradeUpdate,
    SectionCreate, SectionUpdate,
    FeeCategoryCreate, FeeCategoryUpdate,
    PaymentModeCreate, PaymentModeUpdate,
    LateFeeRuleCreate, LateFeeRuleUpdate,
    DiscountTypeCreate, DiscountTypeUpdate,
    ApplicationSettingCreate, ApplicationSettingUpdate,
    SchoolInformationCreate, SchoolInformationUpdate
)

class AcademicYearRepository(BaseRepository[AcademicYear, AcademicYearCreate, AcademicYearUpdate]):
    pass

class GradeRepository(BaseRepository[Grade, GradeCreate, GradeUpdate]):
    pass

class SectionRepository(BaseRepository[Section, SectionCreate, SectionUpdate]):
    pass

class FeeCategoryRepository(BaseRepository[FeeCategory, FeeCategoryCreate, FeeCategoryUpdate]):
    pass

class PaymentModeRepository(BaseRepository[PaymentMode, PaymentModeCreate, PaymentModeUpdate]):
    pass

class LateFeeRuleRepository(BaseRepository[LateFeeRule, LateFeeRuleCreate, LateFeeRuleUpdate]):
    pass

class DiscountTypeRepository(BaseRepository[DiscountType, DiscountTypeCreate, DiscountTypeUpdate]):
    pass

class ApplicationSettingRepository(BaseRepository[ApplicationSetting, ApplicationSettingCreate, ApplicationSettingUpdate]):
    pass

class SchoolInformationRepository(BaseRepository[SchoolInformation, SchoolInformationCreate, SchoolInformationUpdate]):
    pass

academic_year_repo = AcademicYearRepository(AcademicYear)
grade_repo = GradeRepository(Grade)
section_repo = SectionRepository(Section)
fee_category_repo = FeeCategoryRepository(FeeCategory)
payment_mode_repo = PaymentModeRepository(PaymentMode)
late_fee_rule_repo = LateFeeRuleRepository(LateFeeRule)
discount_type_repo = DiscountTypeRepository(DiscountType)
application_setting_repo = ApplicationSettingRepository(ApplicationSetting)
school_info_repo = SchoolInformationRepository(SchoolInformation)
