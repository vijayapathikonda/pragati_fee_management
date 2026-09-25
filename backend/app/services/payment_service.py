from decimal import Decimal
from datetime import datetime
from sqlalchemy.orm import Session
from app.repositories.fee_repository import fee_assignment_repository
from app.repositories.receipt_repository import receipt_repository
from app.repositories.student_repository import student_repository
from app.domain.fee_models import FeeReceipt, FeePaymentItem, FeeAssignmentStatus, ReceiptStatus
from app.schemas.fee import FeeReceiptCreate
from app.core.exceptions import AppException, NotFoundException
from app.services.pdf_service import PDFService

class PaymentService:
    @staticmethod
    def _generate_receipt_number(db: Session) -> str:
        # Simple sequence generation based on count
        count = db.query(FeeReceipt).count()
        year = datetime.now().year
        return f"REC-{year}-{(count + 1):04d}"

    @staticmethod
    def collect_fee(db: Session, obj_in: FeeReceiptCreate, collected_by_id: int) -> FeeReceipt:
        student = student_repository.get(db, id=obj_in.student_id)
        if not student:
            raise NotFoundException("Student not found")

        total_paid_in_request = Decimal("0.00")
        items_to_create = []

        # 1. Validation & Preparation
        for item_in in obj_in.items:
            assignment = fee_assignment_repository.get(db, id=item_in.fee_assignment_id)
            if not assignment:
                raise NotFoundException(f"Fee Assignment {item_in.fee_assignment_id} not found")
                
            if assignment.student_id != obj_in.student_id:
                raise AppException(f"Fee Assignment {assignment.id} does not belong to student {obj_in.student_id}")
                
            outstanding = assignment.net_amount - assignment.paid_amount
            if item_in.amount_paid > outstanding:
                raise AppException(f"Payment amount {item_in.amount_paid} exceeds outstanding balance {outstanding} for assignment {assignment.id}")

            total_paid_in_request += item_in.amount_paid
            items_to_create.append({
                "assignment": assignment,
                "amount": item_in.amount_paid
            })

        if total_paid_in_request <= 0:
            raise AppException("Total payment amount must be greater than 0")

        # 2. Create Receipt
        receipt_number = PaymentService._generate_receipt_number(db)
        receipt = FeeReceipt(
            receipt_number=receipt_number,
            student_id=obj_in.student_id,
            total_amount=total_paid_in_request,
            payment_mode_id=obj_in.payment_mode_id,
            transaction_reference=obj_in.transaction_reference,
            status=ReceiptStatus.SUCCESS,
            collected_by_id=collected_by_id
        )
        db.add(receipt)
        db.flush() # Get receipt ID

        # 3. Create Items & Update Balances
        for data in items_to_create:
            assignment = data["assignment"]
            amount = data["amount"]
            
            # Create receipt item
            payment_item = FeePaymentItem(
                receipt_id=receipt.id,
                fee_assignment_id=assignment.id,
                amount_paid=amount
            )
            db.add(payment_item)
            
            # Update assignment
            assignment.paid_amount += amount
            if assignment.paid_amount >= assignment.net_amount:
                assignment.status = FeeAssignmentStatus.PAID
            else:
                assignment.status = FeeAssignmentStatus.PARTIAL

        db.commit()
        db.refresh(receipt)
        
        # 4. Generate PDF
        try:
            pdf_path = PDFService.generate_receipt_pdf(
                receipt=receipt,
                student_name=f"{student.first_name} {student.last_name or ''}".strip(),
                admission_number=student.admission_number
            )
            receipt.pdf_path = pdf_path
            db.commit()
            db.refresh(receipt)
        except Exception as e:
            # We don't want to rollback the financial transaction if PDF generation fails.
            print(f"PDF Generation failed: {e}")

        # 5. Automatically dispatch WhatsApp receipt notification to Mother Contact Number
        try:
            from app.services.whatsapp_service import WhatsAppService
            if getattr(obj_in, "send_whatsapp", True):
                wa_info = WhatsAppService.send_receipt_to_mother(
                    receipt=receipt,
                    student=student,
                    override_phone=getattr(obj_in, "mother_phone_override", None),
                )
            else:
                contact = WhatsAppService.resolve_recipient_contact(
                    student, override_phone=getattr(obj_in, "mother_phone_override", None)
                )
                msg = WhatsAppService.build_receipt_message(receipt, student)
                import urllib.parse
                phone = contact["phone"]
                wa_info = {
                    "whatsapp_sent": False,
                    "whatsapp_status": "skipped",
                    "recipient_phone": phone,
                    "recipient_role": contact["recipient_role"],
                    "recipient_name": contact["recipient_name"],
                    "mother_name": student.mother_name,
                    "mother_contact_number": student.mother_contact_number,
                    "whatsapp_message": msg,
                    "whatsapp_url": f"https://wa.me/{phone}?text={urllib.parse.quote(msg)}" if phone else None,
                }
            for k, v in wa_info.items():
                setattr(receipt, k, v)
        except Exception as e:
            print(f"WhatsApp dispatch failed: {e}")

        return receipt

    @staticmethod
    def populate_whatsapp_metadata(receipt: FeeReceipt) -> FeeReceipt:
        try:
            from app.services.whatsapp_service import WhatsAppService
            import urllib.parse
            student = receipt.student
            if student:
                contact = WhatsAppService.resolve_recipient_contact(student)
                phone = contact["phone"]
                msg = WhatsAppService.build_receipt_message(receipt, student)
                setattr(receipt, "whatsapp_sent", False)
                setattr(receipt, "whatsapp_status", "ready_to_send" if phone else "missing_mother_phone")
                setattr(receipt, "recipient_phone", phone)
                setattr(receipt, "recipient_role", contact["recipient_role"])
                setattr(receipt, "recipient_name", contact["recipient_name"])
                setattr(receipt, "mother_name", student.mother_name)
                setattr(receipt, "mother_contact_number", student.mother_contact_number)
                setattr(receipt, "whatsapp_message", msg)
                setattr(
                    receipt,
                    "whatsapp_url",
                    f"https://wa.me/{phone}?text={urllib.parse.quote(msg)}" if phone else f"https://wa.me/?text={urllib.parse.quote(msg)}",
                )
        except Exception as e:
            print(f"Populate WhatsApp metadata failed: {e}")
        return receipt

    @staticmethod
    def cancel_receipt(db: Session, receipt_id: int, cancelled_by_id: int, reason: str) -> FeeReceipt:
        receipt = receipt_repository.get(db, id=receipt_id)
        if not receipt:
            raise NotFoundException("Receipt not found")
            
        if receipt.status == ReceiptStatus.CANCELLED:
            raise AppException("Receipt is already cancelled")
            
        # Revert Balances
        for item in receipt.items:
            assignment = item.fee_assignment
            assignment.paid_amount -= item.amount_paid
            
            if assignment.paid_amount <= 0:
                assignment.paid_amount = Decimal("0.00")
                assignment.status = FeeAssignmentStatus.PENDING
            else:
                assignment.status = FeeAssignmentStatus.PARTIAL

        # Update Receipt Status
        receipt.status = ReceiptStatus.CANCELLED
        receipt.cancelled_by_id = cancelled_by_id
        receipt.cancellation_reason = reason
        
        db.commit()
        db.refresh(receipt)
        return receipt
