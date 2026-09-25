from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from datetime import date
from typing import Optional
from decimal import Decimal
from app.domain.student_models import Student
from app.domain.fee_models import FeeAssignment, FeeReceipt, FeePaymentItem, ReceiptStatus, FeeAssignmentStatus
from app.domain.master_models import FeeCategory, Grade, Section, PaymentMode, DiscountType
from app.schemas.report import ReportData, ReportColumn

class ReportService:
    @staticmethod
    def _format_decimal(val) -> float:
        return float(val) if val else 0.0

    @staticmethod
    def get_outstanding_report(
        db: Session, 
        academic_year_id: Optional[int], 
        grade_id: Optional[int], 
        section_id: Optional[int]
    ) -> ReportData:
        query = db.query(
            Student.admission_number,
            Student.first_name,
            Student.last_name,
            Grade.name.label("grade"),
            Section.name.label("section"),
            func.sum(FeeAssignment.net_amount).label("total_assigned"),
            func.sum(FeeAssignment.paid_amount).label("total_paid"),
            func.sum(FeeAssignment.net_amount - FeeAssignment.paid_amount).label("balance")
        ).join(FeeAssignment, FeeAssignment.student_id == Student.id)\
         .outerjoin(Grade, Grade.id == Student.grade_id)\
         .outerjoin(Section, Section.id == Student.section_id)

        if academic_year_id:
            query = query.filter(FeeAssignment.academic_year_id == academic_year_id)
        if grade_id:
            query = query.filter(Student.grade_id == grade_id)
        if section_id:
            query = query.filter(Student.section_id == section_id)

        # Only include students who owe something
        query = query.group_by(Student.id).having(func.sum(FeeAssignment.net_amount - FeeAssignment.paid_amount) > 0)
        
        results = query.all()

        columns = [
            ReportColumn(field="admission_number", headerName="Adm No"),
            ReportColumn(field="name", headerName="Student Name"),
            ReportColumn(field="grade", headerName="Grade"),
            ReportColumn(field="section", headerName="Section"),
            ReportColumn(field="total_assigned", headerName="Total Assigned", type="number"),
            ReportColumn(field="total_paid", headerName="Total Paid", type="number"),
            ReportColumn(field="balance", headerName="Balance", type="number"),
        ]

        rows = []
        for i, r in enumerate(results):
            rows.append({
                "id": i,
                "admission_number": r.admission_number,
                "name": f"{r.first_name} {r.last_name}",
                "grade": r.grade or "-",
                "section": r.section or "-",
                "total_assigned": ReportService._format_decimal(r.total_assigned),
                "total_paid": ReportService._format_decimal(r.total_paid),
                "balance": ReportService._format_decimal(r.balance),
            })

        return ReportData(title="Outstanding Fee Report", columns=columns, rows=rows)

    @staticmethod
    def get_student_ledger(db: Session, student_id: int) -> ReportData:
        # Fetch Assignments (Debits)
        assignments = db.query(FeeAssignment).filter(FeeAssignment.student_id == student_id).all()
        # Fetch Receipts (Credits)
        receipts = db.query(FeeReceipt).filter(FeeReceipt.student_id == student_id, FeeReceipt.status == ReceiptStatus.SUCCESS).all()
        
        transactions = []
        
        for a in assignments:
            transactions.append({
                "date": a.due_date, # using due_date as transaction date for assignments
                "description": f"Fee Assigned: {a.description}",
                "debit": ReportService._format_decimal(a.net_amount),
                "credit": 0.0,
                "ref": f"Assign-{a.id}"
            })
            
        for r in receipts:
            transactions.append({
                "date": r.created_at.date(),
                "description": f"Payment Received: {r.payment_mode.name}",
                "debit": 0.0,
                "credit": ReportService._format_decimal(r.total_amount),
                "ref": r.receipt_number
            })
            
        # Sort chronologically
        transactions.sort(key=lambda x: x["date"])
        
        # Calculate running balance
        balance = 0.0
        rows = []
        for i, t in enumerate(transactions):
            balance += t["debit"] - t["credit"]
            rows.append({
                "id": i,
                "date": t["date"].strftime('%Y-%m-%d'),
                "description": t["description"],
                "ref": t["ref"],
                "debit": t["debit"],
                "credit": t["credit"],
                "balance": balance
            })
            
        columns = [
            ReportColumn(field="date", headerName="Date"),
            ReportColumn(field="description", headerName="Description"),
            ReportColumn(field="ref", headerName="Reference"),
            ReportColumn(field="debit", headerName="Debit (Fee)", type="number"),
            ReportColumn(field="credit", headerName="Credit (Paid)", type="number"),
            ReportColumn(field="balance", headerName="Running Balance", type="number"),
        ]
        
        return ReportData(title=f"Student Ledger (ID: {student_id})", columns=columns, rows=rows)

    @staticmethod
    def get_collection_report(
        db: Session, 
        start_date: Optional[date], 
        end_date: Optional[date]
    ) -> ReportData:
        query = db.query(
            FeeReceipt.created_at,
            FeeReceipt.receipt_number,
            Student.admission_number,
            Student.first_name,
            Student.last_name,
            PaymentMode.name.label("payment_mode"),
            FeeReceipt.total_amount
        ).join(Student, Student.id == FeeReceipt.student_id)\
         .join(PaymentMode, PaymentMode.id == FeeReceipt.payment_mode_id)\
         .filter(FeeReceipt.status == ReceiptStatus.SUCCESS)

        if start_date:
            query = query.filter(func.date(FeeReceipt.created_at) >= start_date)
        if end_date:
            query = query.filter(func.date(FeeReceipt.created_at) <= end_date)

        results = query.order_by(desc(FeeReceipt.created_at)).all()

        columns = [
            ReportColumn(field="date", headerName="Date"),
            ReportColumn(field="receipt_number", headerName="Receipt No"),
            ReportColumn(field="admission_number", headerName="Adm No"),
            ReportColumn(field="student_name", headerName="Student Name"),
            ReportColumn(field="payment_mode", headerName="Payment Mode"),
            ReportColumn(field="amount", headerName="Amount Collected", type="number"),
        ]

        rows = []
        for i, r in enumerate(results):
            rows.append({
                "id": i,
                "date": r.created_at.strftime('%Y-%m-%d %H:%M'),
                "receipt_number": r.receipt_number,
                "admission_number": r.admission_number,
                "student_name": f"{r.first_name} {r.last_name}",
                "payment_mode": r.payment_mode,
                "amount": ReportService._format_decimal(r.total_amount),
            })

        title = "Collection Report"
        if start_date and end_date:
            if start_date == end_date:
                title = f"Daily Collection Report ({start_date})"
            else:
                title = f"Collection Report ({start_date} to {end_date})"

        return ReportData(title=title, columns=columns, rows=rows)

    @staticmethod
    def get_discount_report(db: Session, academic_year_id: Optional[int]) -> ReportData:
        query = db.query(
            Student.admission_number,
            Student.first_name,
            Student.last_name,
            DiscountType.name.label("discount_name"),
            FeeCategory.name.label("category"),
            FeeAssignment.base_amount,
            FeeAssignment.discount_amount,
            FeeAssignment.net_amount
        ).join(Student, Student.id == FeeAssignment.student_id)\
         .join(DiscountType, DiscountType.id == FeeAssignment.discount_type_id)\
         .join(FeeCategory, FeeCategory.id == FeeAssignment.fee_category_id)\
         .filter(FeeAssignment.discount_amount > 0)
         
        if academic_year_id:
            query = query.filter(FeeAssignment.academic_year_id == academic_year_id)
            
        results = query.all()
        
        columns = [
            ReportColumn(field="admission_number", headerName="Adm No"),
            ReportColumn(field="student_name", headerName="Student Name"),
            ReportColumn(field="discount_name", headerName="Discount/Scholarship"),
            ReportColumn(field="category", headerName="Fee Category"),
            ReportColumn(field="base_amount", headerName="Base Amount", type="number"),
            ReportColumn(field="discount_amount", headerName="Discount Amount", type="number"),
            ReportColumn(field="net_amount", headerName="Net Amount", type="number"),
        ]
        
        rows = []
        for i, r in enumerate(results):
            rows.append({
                "id": i,
                "admission_number": r.admission_number,
                "student_name": f"{r.first_name} {r.last_name}",
                "discount_name": r.discount_name,
                "category": r.category,
                "base_amount": ReportService._format_decimal(r.base_amount),
                "discount_amount": ReportService._format_decimal(r.discount_amount),
                "net_amount": ReportService._format_decimal(r.net_amount),
            })
            
        return ReportData(title="Discount & Scholarship Report", columns=columns, rows=rows)

    @staticmethod
    def get_overdue_report(db: Session, academic_year_id: Optional[int]) -> ReportData:
        today = date.today()
        query = db.query(
            Student.admission_number,
            Student.first_name,
            Student.last_name,
            FeeCategory.name.label("category"),
            FeeAssignment.due_date,
            (FeeAssignment.net_amount - FeeAssignment.paid_amount).label("overdue_amount")
        ).join(Student, Student.id == FeeAssignment.student_id)\
         .join(FeeCategory, FeeCategory.id == FeeAssignment.fee_category_id)\
         .filter(FeeAssignment.due_date < today)\
         .filter(FeeAssignment.status != FeeAssignmentStatus.PAID)
         
        if academic_year_id:
            query = query.filter(FeeAssignment.academic_year_id == academic_year_id)
            
        results = query.order_by(FeeAssignment.due_date).all()
        
        columns = [
            ReportColumn(field="admission_number", headerName="Adm No"),
            ReportColumn(field="student_name", headerName="Student Name"),
            ReportColumn(field="category", headerName="Category"),
            ReportColumn(field="due_date", headerName="Due Date"),
            ReportColumn(field="days_overdue", headerName="Days Overdue", type="number"),
            ReportColumn(field="overdue_amount", headerName="Overdue Amount", type="number"),
        ]
        
        rows = []
        for i, r in enumerate(results):
            days_overdue = (today - r.due_date).days
            rows.append({
                "id": i,
                "admission_number": r.admission_number,
                "student_name": f"{r.first_name} {r.last_name}",
                "category": r.category,
                "due_date": r.due_date.strftime('%Y-%m-%d'),
                "days_overdue": days_overdue,
                "overdue_amount": ReportService._format_decimal(r.overdue_amount),
            })
            
        return ReportData(title="Overdue Fees Report", columns=columns, rows=rows)
