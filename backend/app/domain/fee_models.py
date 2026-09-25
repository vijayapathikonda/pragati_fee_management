from sqlalchemy import Column, Integer, String, Date, ForeignKey, Numeric, Enum, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.infrastructure.database import Base

class FeeAssignmentStatus(str, enum.Enum):
    PENDING = "Pending"
    PARTIAL = "Partial"
    PAID = "Paid"

class FeeAssignment(Base):
    __tablename__ = "fee_assignments"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    academic_year_id = Column(Integer, ForeignKey("academic_years.id"), nullable=False)
    fee_category_id = Column(Integer, ForeignKey("fee_categories.id"), nullable=False)
    
    description = Column(String(255), nullable=False) # e.g. "Term 1 Installment"
    base_amount = Column(Numeric(10, 2), nullable=False)
    
    discount_type_id = Column(Integer, ForeignKey("discount_types.id"), nullable=True)
    discount_amount = Column(Numeric(10, 2), default=0.00, nullable=False)
    
    net_amount = Column(Numeric(10, 2), nullable=False)
    paid_amount = Column(Numeric(10, 2), default=0.00, nullable=False)
    
    due_date = Column(Date, nullable=False)
    status = Column(Enum(FeeAssignmentStatus), default=FeeAssignmentStatus.PENDING, nullable=False)

    # Relationships
    student = relationship("Student")
    academic_year = relationship("AcademicYear", lazy="joined")
    fee_category = relationship("FeeCategory", lazy="joined")
    discount_type = relationship("DiscountType", lazy="joined")

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class ReceiptStatus(str, enum.Enum):
    SUCCESS = "Success"
    CANCELLED = "Cancelled"

class FeeReceipt(Base):
    __tablename__ = "fee_receipts"

    id = Column(Integer, primary_key=True, index=True)
    receipt_number = Column(String(50), unique=True, index=True, nullable=False)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    total_amount = Column(Numeric(10, 2), nullable=False)
    payment_mode_id = Column(Integer, ForeignKey("payment_modes.id"), nullable=False)
    transaction_reference = Column(String(100), nullable=True)
    status = Column(Enum(ReceiptStatus), default=ReceiptStatus.SUCCESS, nullable=False)
    pdf_path = Column(String(500), nullable=True)
    
    # Audit log
    collected_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    cancelled_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    cancellation_reason = Column(String(500), nullable=True)

    # Relationships
    student = relationship("Student", lazy="joined")
    payment_mode = relationship("PaymentMode", lazy="joined")
    collected_by = relationship("User", foreign_keys=[collected_by_id])
    cancelled_by = relationship("User", foreign_keys=[cancelled_by_id])
    
    items = relationship("FeePaymentItem", back_populates="receipt", cascade="all, delete-orphan", lazy="joined")

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class FeePaymentItem(Base):
    __tablename__ = "fee_payment_items"

    id = Column(Integer, primary_key=True, index=True)
    receipt_id = Column(Integer, ForeignKey("fee_receipts.id"), nullable=False)
    fee_assignment_id = Column(Integer, ForeignKey("fee_assignments.id"), nullable=False)
    amount_paid = Column(Numeric(10, 2), nullable=False)

    receipt = relationship("FeeReceipt", back_populates="items")
    fee_assignment = relationship("FeeAssignment", lazy="joined")


