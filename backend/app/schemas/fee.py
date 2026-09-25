from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List
from datetime import date, datetime
from decimal import Decimal
from app.domain.fee_models import FeeAssignmentStatus
from app.schemas.master import FeeCategoryResponse, DiscountTypeResponse, AcademicYearResponse

class FeeAssignmentBase(BaseModel):
    academic_year_id: int
    fee_category_id: int
    description: str
    base_amount: Decimal = Field(..., max_digits=10, decimal_places=2)
    discount_type_id: Optional[int] = None
    due_date: date

class FeeAssignmentCreate(FeeAssignmentBase):
    student_id: int

class FeeAssignmentBulkCreate(BaseModel):
    student_ids: List[int]
    assignment: FeeAssignmentBase

class GradeStudentFeeStatus(BaseModel):
    student_id: int
    admission_number: str
    roll_number: Optional[str] = None
    first_name: str
    last_name: str
    section_name: Optional[str] = None
    photo_url: Optional[str] = None
    is_assigned: bool = False
    assignment_id: Optional[int] = None
    base_amount: Optional[Decimal] = None
    discount_amount: Optional[Decimal] = None
    net_amount: Optional[Decimal] = None
    paid_amount: Optional[Decimal] = None
    status: Optional[str] = None
    due_date: Optional[date] = None

class BatchFeeAssignmentItem(BaseModel):
    student_id: int
    base_amount: Decimal = Field(..., ge=0, max_digits=10, decimal_places=2)
    discount_type_id: Optional[int] = None
    is_selected: bool = True

class BatchFeeAssignmentRequest(BaseModel):
    academic_year_id: int
    grade_id: int
    fee_category_id: int
    description: str
    due_date: date
    update_existing: bool = False
    items: List[BatchFeeAssignmentItem]

class BatchFeeAssignmentResponse(BaseModel):
    created_count: int
    updated_count: int
    skipped_count: int
    total_assigned_amount: Decimal
    message: str

class FeeAssignmentUpdate(BaseModel):
    description: Optional[str] = None
    base_amount: Optional[Decimal] = Field(None, max_digits=10, decimal_places=2)
    discount_type_id: Optional[int] = None
    due_date: Optional[date] = None

class FeeAssignmentResponse(FeeAssignmentBase):
    id: int
    student_id: int
    discount_amount: Decimal
    net_amount: Decimal
    paid_amount: Decimal
    status: FeeAssignmentStatus
    
    fee_category: Optional[FeeCategoryResponse] = None
    discount_type: Optional[DiscountTypeResponse] = None
    academic_year: Optional[AcademicYearResponse] = None

    model_config = ConfigDict(from_attributes=True)

class StudentFeeSummary(BaseModel):
    student_id: int
    total_assigned: Decimal
    total_paid: Decimal
    total_outstanding: Decimal

# Receipt Schemas

class FeePaymentItemCreate(BaseModel):
    fee_assignment_id: int
    amount_paid: Decimal = Field(..., gt=0, max_digits=10, decimal_places=2)

class FeeReceiptCreate(BaseModel):
    student_id: int
    payment_mode_id: int
    transaction_reference: Optional[str] = None
    items: List[FeePaymentItemCreate]

class FeePaymentItemResponse(BaseModel):
    id: int
    fee_assignment_id: int
    amount_paid: Decimal
    fee_assignment: Optional[FeeAssignmentResponse] = None
    model_config = ConfigDict(from_attributes=True)

class FeeReceiptResponse(BaseModel):
    id: int
    receipt_number: str
    student_id: int
    total_amount: Decimal
    payment_mode_id: int
    transaction_reference: Optional[str] = None
    status: str
    pdf_path: Optional[str] = None
    created_at: datetime
    
    items: List[FeePaymentItemResponse] = []
    
    model_config = ConfigDict(from_attributes=True)
