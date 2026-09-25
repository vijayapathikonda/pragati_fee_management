from fastapi import APIRouter
from app.api.routes.master_factory import create_master_router
from app.repositories.master_repository import (
    academic_year_repo, grade_repo, section_repo,
    fee_category_repo, payment_mode_repo, late_fee_rule_repo,
    discount_type_repo, application_setting_repo, school_info_repo
)
from app.schemas import master as schemas

router = APIRouter()

router.include_router(
    create_master_router(academic_year_repo, schemas.AcademicYearCreate, schemas.AcademicYearUpdate, schemas.AcademicYearResponse, ["name"]),
    prefix="/academic-years", tags=["Master: Academic Years"]
)
router.include_router(
    create_master_router(grade_repo, schemas.GradeCreate, schemas.GradeUpdate, schemas.GradeResponse, ["name", "description"]),
    prefix="/grades", tags=["Master: Grades"]
)
router.include_router(
    create_master_router(section_repo, schemas.SectionCreate, schemas.SectionUpdate, schemas.SectionResponse, ["name", "description"]),
    prefix="/sections", tags=["Master: Sections"]
)
router.include_router(
    create_master_router(fee_category_repo, schemas.FeeCategoryCreate, schemas.FeeCategoryUpdate, schemas.FeeCategoryResponse, ["name", "description"]),
    prefix="/fee-categories", tags=["Master: Fee Categories"]
)
router.include_router(
    create_master_router(payment_mode_repo, schemas.PaymentModeCreate, schemas.PaymentModeUpdate, schemas.PaymentModeResponse, ["name"]),
    prefix="/payment-modes", tags=["Master: Payment Modes"]
)
router.include_router(
    create_master_router(late_fee_rule_repo, schemas.LateFeeRuleCreate, schemas.LateFeeRuleUpdate, schemas.LateFeeRuleResponse, ["name"]),
    prefix="/late-fee-rules", tags=["Master: Late Fee Rules"]
)
router.include_router(
    create_master_router(discount_type_repo, schemas.DiscountTypeCreate, schemas.DiscountTypeUpdate, schemas.DiscountTypeResponse, ["name", "description"]),
    prefix="/discount-types", tags=["Master: Discount Types"]
)
router.include_router(
    create_master_router(application_setting_repo, schemas.ApplicationSettingCreate, schemas.ApplicationSettingUpdate, schemas.ApplicationSettingResponse, ["setting_key", "setting_value"]),
    prefix="/application-settings", tags=["Master: Application Settings"]
)
router.include_router(
    create_master_router(school_info_repo, schemas.SchoolInformationCreate, schemas.SchoolInformationUpdate, schemas.SchoolInformationResponse, ["name", "contact_email"]),
    prefix="/school-information", tags=["Master: School Information"]
)
