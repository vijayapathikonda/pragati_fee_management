from decimal import Decimal
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from app.repositories.fee_repository import fee_assignment_repository
from app.repositories.master_repository import discount_type_repo
from app.domain.fee_models import FeeAssignment, FeeAssignmentStatus
from app.domain.master_models import DiscountType
from app.domain.student_models import Student, StudentStatus
from app.schemas.fee import (
    FeeAssignmentCreate, FeeAssignmentUpdate, StudentFeeSummary,
    GradeStudentFeeStatus, BatchFeeAssignmentRequest, BatchFeeAssignmentResponse
)
from app.core.exceptions import AppException

DEFAULT_DISCOUNT_PLANS = [
    {
        "name": "Teacher Parent",
        "description": "50% discount on base fee for children of school teachers",
        "percentage": 50.0,
        "flat_amount": 0.0,
        "is_active": True,
    },
    {
        "name": "One Shot Payment",
        "description": "Flat ₹2,000 discount for full one-shot fee payment",
        "percentage": 0.0,
        "flat_amount": 2000.0,
        "is_active": True,
    },
    {
        "name": "Sibling + One Shot Payment",
        "description": "Combined Sibling (₹1,000) + One Shot Payment (₹2,000) = ₹3,000 flat discount",
        "percentage": 0.0,
        "flat_amount": 3000.0,
        "is_active": True,
    },
    {
        "name": "Siblings Discount",
        "description": "Flat ₹1,000 discount for siblings studying in the school",
        "percentage": 0.0,
        "flat_amount": 1000.0,
        "is_active": True,
    },
    {
        "name": "Special Discount",
        "description": "Custom discount amount as per management / Principal's instruction (e.g. ₹3,000, ₹4,000, ₹5,000)",
        "percentage": 0.0,
        "flat_amount": 0.0,
        "is_active": True,
    },
]

class FeeService:
    _discounts_seeded: bool = False

    @staticmethod
    def ensure_default_discounts(db: Session) -> None:
        """Ensures the 5 standard school discount plans exist in discount_types."""
        if FeeService._discounts_seeded:
            return
        try:
            existing_list = db.query(DiscountType).all()
            existing_by_name = {d.name.strip().lower(): d for d in existing_list}
            changed = False

            for plan in DEFAULT_DISCOUNT_PLANS:
                key = plan["name"].lower()
                if key not in existing_by_name:
                    db.add(DiscountType(**plan))
                    changed = True

            if changed:
                db.commit()
            FeeService._discounts_seeded = True
        except Exception:
            db.rollback()

    @staticmethod
    def calculate_net_amount(
        db: Session,
        base_amount: Decimal,
        discount_type_id: int | None,
        custom_discount_amount: Decimal | None = None
    ) -> tuple[Decimal, Decimal]:
        base_amount = Decimal(str(base_amount))
        if not discount_type_id:
            return Decimal("0.00"), base_amount
            
        discount = discount_type_repo.get(db, id=discount_type_id)
        if not discount or not discount.is_active:
            raise AppException("Invalid or inactive discount type")
            
        discount_amount = Decimal("0.00")
        is_special = "special" in (discount.name or "").lower() or (
            (not discount.percentage or discount.percentage == 0)
            and (not discount.flat_amount or discount.flat_amount == 0)
        )

        if is_special and custom_discount_amount is not None and Decimal(str(custom_discount_amount)) > 0:
            discount_amount = Decimal(str(custom_discount_amount))
        elif discount.percentage and discount.percentage > 0:
            discount_amount = (base_amount * Decimal(str(discount.percentage))) / Decimal("100")
        elif discount.flat_amount and discount.flat_amount > 0:
            discount_amount = Decimal(str(discount.flat_amount))
        elif custom_discount_amount is not None and Decimal(str(custom_discount_amount)) > 0:
            discount_amount = Decimal(str(custom_discount_amount))
            
        # Ensure we don't discount more than the base amount or less than 0
        discount_amount = max(Decimal("0.00"), min(discount_amount, base_amount))
        net_amount = base_amount - discount_amount
        return discount_amount, net_amount

    @staticmethod
    def create_assignment(db: Session, obj_in: FeeAssignmentCreate) -> FeeAssignment:
        discount_amt, net_amt = FeeService.calculate_net_amount(
            db, obj_in.base_amount, obj_in.discount_type_id, obj_in.discount_amount
        )
        
        db_obj = FeeAssignment(
            student_id=obj_in.student_id,
            academic_year_id=obj_in.academic_year_id,
            fee_category_id=obj_in.fee_category_id,
            description=obj_in.description,
            base_amount=obj_in.base_amount,
            discount_type_id=obj_in.discount_type_id,
            discount_amount=discount_amt,
            net_amount=net_amt,
            due_date=obj_in.due_date,
            status=FeeAssignmentStatus.PENDING
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    @staticmethod
    def update_assignment(db: Session, db_obj: FeeAssignment, obj_in: FeeAssignmentUpdate) -> FeeAssignment:
        update_data = obj_in.model_dump(exclude_unset=True)
        
        # If amount or discount changes, recalculate
        if "base_amount" in update_data or "discount_type_id" in update_data or "discount_amount" in update_data:
            base_amt = update_data.get("base_amount", db_obj.base_amount)
            disc_id = update_data.get("discount_type_id", db_obj.discount_type_id)
            custom_disc_amt = update_data.get("discount_amount", db_obj.discount_amount)
            
            discount_amt, net_amt = FeeService.calculate_net_amount(
                db, base_amt, disc_id, custom_disc_amt
            )
            
            if net_amt < db_obj.paid_amount:
                raise AppException(f"New net amount ({net_amt}) cannot be less than already paid amount ({db_obj.paid_amount})")
                
            update_data["discount_amount"] = discount_amt
            update_data["net_amount"] = net_amt
            
            # Status adjustments based on new net_amount
            if net_amt == db_obj.paid_amount and db_obj.paid_amount > 0:
                update_data["status"] = FeeAssignmentStatus.PAID
            elif net_amt > db_obj.paid_amount and db_obj.paid_amount > 0:
                update_data["status"] = FeeAssignmentStatus.PARTIAL
            elif db_obj.paid_amount == 0:
                update_data["status"] = FeeAssignmentStatus.PENDING

        for field, value in update_data.items():
            setattr(db_obj, field, value)
            
        db.commit()
        db.refresh(db_obj)
        return db_obj

    @staticmethod
    def get_student_summary(db: Session, student_id: int) -> StudentFeeSummary:
        assignments = fee_assignment_repository.get_by_student(db, student_id=student_id)
        
        total_base = sum((a.base_amount or Decimal("0.00")) for a in assignments)
        total_discount = sum((a.discount_amount or Decimal("0.00")) for a in assignments)
        total_assigned = sum((a.net_amount or Decimal("0.00")) for a in assignments)
        total_paid = sum((a.paid_amount or Decimal("0.00")) for a in assignments)
        
        return StudentFeeSummary(
            student_id=student_id,
            total_base=total_base,
            total_discount=total_discount,
            total_assigned=total_assigned,
            total_paid=total_paid,
            total_outstanding=total_assigned - total_paid
        )

    @staticmethod
    def get_grade_fee_status(
        db: Session,
        academic_year_id: int,
        grade_id: int,
        fee_category_id: int
    ) -> List[GradeStudentFeeStatus]:
        FeeService.ensure_default_discounts(db)
        students = db.query(Student).filter(
            Student.grade_id == grade_id,
            Student.status == StudentStatus.ACTIVE
        ).order_by(Student.serial_number.asc(), Student.admission_number.asc()).all()

        if not students:
            return []

        student_ids = [s.id for s in students]

        existing_assignments = db.query(FeeAssignment).filter(
            FeeAssignment.student_id.in_(student_ids),
            FeeAssignment.academic_year_id == academic_year_id,
            FeeAssignment.fee_category_id == fee_category_id
        ).all()

        assignment_map = {a.student_id: a for a in existing_assignments}

        result = []
        for s in students:
            assignment = assignment_map.get(s.id)
            result.append(GradeStudentFeeStatus(
                student_id=s.id,
                admission_number=s.admission_number,
                roll_number=str(s.serial_number) if s.serial_number else None,
                first_name=s.first_name,
                last_name=s.last_name or "",
                section_name=s.section.name if s.section else None,
                photo_url=f"/students/student_{s.id}.jpeg",
                is_assigned=assignment is not None,
                assignment_id=assignment.id if assignment else None,
                base_amount=assignment.base_amount if assignment else None,
                discount_type_id=assignment.discount_type_id if assignment else None,
                discount_type_name=assignment.discount_type.name if (assignment and assignment.discount_type) else None,
                discount_amount=assignment.discount_amount if assignment else None,
                net_amount=assignment.net_amount if assignment else None,
                paid_amount=assignment.paid_amount if assignment else None,
                status=assignment.status.value if assignment else None,
                due_date=assignment.due_date if assignment else None
            ))
        return result

    @staticmethod
    def batch_assign_fees(
        db: Session,
        request: BatchFeeAssignmentRequest
    ) -> BatchFeeAssignmentResponse:
        created_count = 0
        updated_count = 0
        skipped_count = 0
        total_assigned_amount = Decimal("0.00")

        selected_student_ids = [item.student_id for item in request.items if item.is_selected]
        if not selected_student_ids:
            return BatchFeeAssignmentResponse(
                created_count=0,
                updated_count=0,
                skipped_count=len(request.items),
                total_assigned_amount=Decimal("0.00"),
                message="No students were selected for fee assignment."
            )

        existing_assignments = db.query(FeeAssignment).filter(
            FeeAssignment.student_id.in_(selected_student_ids),
            FeeAssignment.academic_year_id == request.academic_year_id,
            FeeAssignment.fee_category_id == request.fee_category_id
        ).all()
        existing_map = {a.student_id: a for a in existing_assignments}

        for item in request.items:
            if not item.is_selected:
                skipped_count += 1
                continue

            existing = existing_map.get(item.student_id)

            if existing:
                discount_amt, net_amt = FeeService.calculate_net_amount(
                    db, item.base_amount, item.discount_type_id, item.discount_amount
                )
                has_changes = (
                    Decimal(str(existing.base_amount)) != Decimal(str(item.base_amount))
                    or existing.discount_type_id != item.discount_type_id
                    or Decimal(str(existing.discount_amount or 0)) != discount_amt
                    or Decimal(str(existing.net_amount)) != net_amt
                )
                # Update if update_existing is True or if the user modified base/discount on this selected row
                if (request.update_existing or has_changes) and net_amt >= Decimal(str(existing.paid_amount or 0)):
                    existing.base_amount = item.base_amount
                    existing.discount_type_id = item.discount_type_id
                    existing.discount_amount = discount_amt
                    existing.net_amount = net_amt
                    existing.description = request.description
                    existing.due_date = request.due_date
                    paid_amt = Decimal(str(existing.paid_amount or 0))
                    if paid_amt > 0 and net_amt == paid_amt:
                        existing.status = FeeAssignmentStatus.PAID
                    elif paid_amt > 0 and net_amt > paid_amt:
                        existing.status = FeeAssignmentStatus.PARTIAL
                    else:
                        existing.status = FeeAssignmentStatus.PENDING
                    updated_count += 1
                    total_assigned_amount += net_amt
                else:
                    skipped_count += 1
            else:
                discount_amt, net_amt = FeeService.calculate_net_amount(
                    db, item.base_amount, item.discount_type_id, item.discount_amount
                )
                db_obj = FeeAssignment(
                    student_id=item.student_id,
                    academic_year_id=request.academic_year_id,
                    fee_category_id=request.fee_category_id,
                    description=request.description,
                    base_amount=item.base_amount,
                    discount_type_id=item.discount_type_id,
                    discount_amount=discount_amt,
                    net_amount=net_amt,
                    due_date=request.due_date,
                    status=FeeAssignmentStatus.PENDING
                )
                db.add(db_obj)
                created_count += 1
                total_assigned_amount += net_amt

        db.commit()

        return BatchFeeAssignmentResponse(
            created_count=created_count,
            updated_count=updated_count,
            skipped_count=skipped_count,
            total_assigned_amount=total_assigned_amount,
            message=f"Successfully processed: {created_count} created, {updated_count} updated, {skipped_count} skipped."
        )
