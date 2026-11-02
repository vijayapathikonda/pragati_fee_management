import time
from datetime import datetime, date, timedelta
from decimal import Decimal
from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_, or_, extract, case
from app.domain.student_models import Student, StudentStatus
from app.domain.fee_models import FeeReceipt, FeePaymentItem, FeeAssignment, ReceiptStatus
from app.domain.master_models import FeeCategory, PaymentMode, Grade
from app.schemas.dashboard import (
    DashboardSummary, DashboardCards, DashboardCharts, DashboardLists,
    ChartData, ChartSeries, RecentPayment, TopDefaulter, CategoryFinancialSummary
)

class DashboardService:
    _summary_cache: Dict[Tuple, Tuple[DashboardSummary, float]] = {}
    _CACHE_TTL: float = 15.0

    @classmethod
    def invalidate_cache(cls):
        cls._summary_cache.clear()

    @staticmethod
    def get_summary(
        db: Session,
        academic_year_id: Optional[int] = None,
        grade_id: Optional[int] = None,
        section_id: Optional[int] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> DashboardSummary:
        cache_key = (academic_year_id, grade_id, section_id, str(start_date), str(end_date))
        now_ts = time.time()
        cached = DashboardService._summary_cache.get(cache_key)
        if cached and (now_ts - cached[1]) < DashboardService._CACHE_TTL:
            return cached[0]

        # Base Filters for Students & Assignments
        student_filters = []
        assignment_filters = []
        
        if academic_year_id:
            student_filters.append(Student.academic_year_id == academic_year_id)
            assignment_filters.append(FeeAssignment.academic_year_id == academic_year_id)
        if grade_id:
            student_filters.append(Student.grade_id == grade_id)
        if section_id:
            student_filters.append(Student.section_id == section_id)
            
        # Base Filters for Receipts (only affected by date range and indirectly by student)
        receipt_filters = [FeeReceipt.status == ReceiptStatus.SUCCESS]
        if start_date:
            receipt_filters.append(func.date(FeeReceipt.created_at) >= start_date)
        if end_date:
            receipt_filters.append(func.date(FeeReceipt.created_at) <= end_date)

        def get_decimal(val):
            return Decimal(str(val)) if val else Decimal("0.00")

        # 1. Cards — Combined Student Counts
        stu_counts = db.query(
            func.count(Student.id),
            func.sum(case((Student.status == StudentStatus.ACTIVE, 1), else_=0))
        ).filter(*student_filters).first()
        total_students = int(stu_counts[0] or 0) if stu_counts else 0
        active_students = int(stu_counts[1] or 0) if stu_counts else 0

        # Collections (Today, Monthly, Yearly, Total Count)
        today = datetime.now().date()
        current_month = today.month
        current_year = today.year

        q_receipts_agg = db.query(
            func.sum(case((func.date(FeeReceipt.created_at) == today, FeeReceipt.total_amount), else_=0)),
            func.sum(case((and_(extract('month', FeeReceipt.created_at) == current_month, extract('year', FeeReceipt.created_at) == current_year), FeeReceipt.total_amount), else_=0)),
            func.sum(case((extract('year', FeeReceipt.created_at) == current_year, FeeReceipt.total_amount), else_=0)),
            func.count(FeeReceipt.id)
        ).filter(*receipt_filters)
        if student_filters:
            q_receipts_agg = q_receipts_agg.join(Student, Student.id == FeeReceipt.student_id).filter(*student_filters)

        rec_agg = q_receipts_agg.first()
        today_collection = get_decimal(rec_agg[0] if rec_agg else 0)
        monthly_collection = get_decimal(rec_agg[1] if rec_agg else 0)
        yearly_collection = get_decimal(rec_agg[2] if rec_agg else 0)
        total_receipts = int(rec_agg[3] or 0) if rec_agg else 0

        # Fee Assignments Aggregates (Assigned, Paid, Outstanding overall and per category)
        q_assign_agg = db.query(
            FeeCategory.name,
            func.sum(FeeAssignment.net_amount),
            func.sum(FeeAssignment.paid_amount),
            func.sum(FeeAssignment.net_amount - FeeAssignment.paid_amount)
        ).join(FeeCategory, FeeCategory.id == FeeAssignment.fee_category_id).filter(*assignment_filters)
        
        if student_filters:
            q_assign_agg = q_assign_agg.join(Student, Student.id == FeeAssignment.student_id).filter(*student_filters)
            
        assign_agg_res = q_assign_agg.group_by(FeeCategory.id, FeeCategory.name).all()

        total_assigned = Decimal("0.00")
        tuition_assigned = Decimal("0.00")
        bus_assigned = Decimal("0.00")

        total_assigned_paid = Decimal("0.00")
        tuition_paid = Decimal("0.00")
        bus_paid = Decimal("0.00")

        outstanding_amount = Decimal("0.00")
        tuition_outstanding = Decimal("0.00")
        bus_outstanding = Decimal("0.00")

        category_summary_list: List[CategoryFinancialSummary] = []
        for cat_name, c_assigned, c_paid, c_out in assign_agg_res:
            c_assigned_dec = get_decimal(c_assigned)
            c_paid_dec = get_decimal(c_paid)
            c_out_dec = get_decimal(c_out)

            total_assigned += c_assigned_dec
            total_assigned_paid += c_paid_dec
            outstanding_amount += c_out_dec

            c_lower = (cat_name or "").lower()
            if "tut" in c_lower:
                tuition_assigned += c_assigned_dec
                tuition_paid += c_paid_dec
                tuition_outstanding += c_out_dec
            elif "bus" in c_lower or "transport" in c_lower:
                bus_assigned += c_assigned_dec
                bus_paid += c_paid_dec
                bus_outstanding += c_out_dec

            pct = round((float(c_paid_dec) / float(c_assigned_dec) * 100.0), 1) if c_assigned_dec > 0 else 0.0
            category_summary_list.append(CategoryFinancialSummary(
                category_name="Tuition Fee" if "tut" in c_lower else ("Bus Fee" if "bus" in c_lower else (cat_name or "Fee")),
                total_assigned=c_assigned_dec,
                total_paid=c_paid_dec,
                total_outstanding=c_out_dec,
                collection_percentage=pct
            ))

        category_summary_list.sort(key=lambda x: 0 if "tuit" in x.category_name.lower() else (1 if "bus" in x.category_name.lower() else 2))

        cards = DashboardCards(
            total_students=total_students,
            active_students=active_students,
            today_collection=today_collection,
            monthly_collection=monthly_collection,
            yearly_collection=yearly_collection,
            total_assigned=total_assigned,
            tuition_assigned=tuition_assigned,
            bus_assigned=bus_assigned,
            total_paid=total_assigned_paid,
            tuition_paid=tuition_paid,
            bus_paid=bus_paid,
            outstanding_amount=outstanding_amount,
            tuition_outstanding=tuition_outstanding,
            bus_outstanding=bus_outstanding,
            total_receipts=total_receipts
        )

        # 2. Charts
        # Category Collection
        q_cat_col = db.query(FeeCategory.name, func.sum(FeePaymentItem.amount_paid)).join(FeePaymentItem.fee_assignment).join(FeeCategory).join(FeePaymentItem.receipt).filter(FeeReceipt.status == ReceiptStatus.SUCCESS)
        if assignment_filters:
            q_cat_col = q_cat_col.filter(*assignment_filters)
        if student_filters:
            q_cat_col = q_cat_col.join(Student, Student.id == FeeAssignment.student_id).filter(*student_filters)
        if receipt_filters: # Apply date filters to collections
            for f in receipt_filters:
                 if f is not FeeReceipt.status == ReceiptStatus.SUCCESS:
                     q_cat_col = q_cat_col.filter(f)
                     
        cat_col_res = q_cat_col.group_by(FeeCategory.name).all()
        cat_col_data = ChartData(
            labels=[r[0] for r in cat_col_res],
            series=[float(r[1]) for r in cat_col_res]
        )

        cat_out_data = ChartData(
            labels=[c.category_name for c in category_summary_list],
            series=[float(c.total_outstanding) for c in category_summary_list]
        )

        # Daily Collection (Last 7 Days)
        last_7_days = today - timedelta(days=6)
        q_daily = db.query(func.date(FeeReceipt.created_at).label('date'), func.sum(FeeReceipt.total_amount)).filter(FeeReceipt.status == ReceiptStatus.SUCCESS, func.date(FeeReceipt.created_at) >= last_7_days)
        if student_filters:
             q_daily = q_daily.join(Student, Student.id == FeeReceipt.student_id).filter(*student_filters)
        daily_res = q_daily.group_by('date').order_by('date').all()
        
        # Fill missing days
        daily_dict = {str(r[0]): float(r[1]) for r in daily_res}
        daily_labels = []
        daily_series = []
        for i in range(7):
            d = (last_7_days + timedelta(days=i)).strftime('%Y-%m-%d')
            daily_labels.append(d)
            daily_series.append(daily_dict.get(d, 0.0))
            
        daily_col_data = ChartData(labels=daily_labels, series=daily_series)

        # Grade-wise Collection
        q_grade_col = db.query(Grade.name, func.sum(FeeReceipt.total_amount)).join(Student, Student.id == FeeReceipt.student_id).join(Grade, Grade.id == Student.grade_id).filter(FeeReceipt.status == ReceiptStatus.SUCCESS)
        if student_filters:
             q_grade_col = q_grade_col.filter(*student_filters)
        if receipt_filters:
            for f in receipt_filters:
                 if f is not FeeReceipt.status == ReceiptStatus.SUCCESS:
                     q_grade_col = q_grade_col.filter(f)
                     
        grade_col_res = q_grade_col.group_by(Grade.name).all()
        grade_col_data = ChartData(
            labels=[r[0] for r in grade_col_res],
            series=[float(r[1]) for r in grade_col_res]
        )

        # Payment Mode Distribution
        q_pm_dist = db.query(PaymentMode.name, func.sum(FeeReceipt.total_amount)).join(PaymentMode, PaymentMode.id == FeeReceipt.payment_mode_id).filter(FeeReceipt.status == ReceiptStatus.SUCCESS)
        if student_filters:
             q_pm_dist = q_pm_dist.join(Student, Student.id == FeeReceipt.student_id).filter(*student_filters)
        if receipt_filters:
            for f in receipt_filters:
                 if f is not FeeReceipt.status == ReceiptStatus.SUCCESS:
                     q_pm_dist = q_pm_dist.filter(f)
                     
        pm_dist_res = q_pm_dist.group_by(PaymentMode.name).all()
        pm_dist_data = ChartData(
            labels=[r[0] for r in pm_dist_res],
            series=[float(r[1]) for r in pm_dist_res]
        )

        charts = DashboardCharts(
            category_collection=cat_col_data,
            category_outstanding=cat_out_data,
            daily_collection=daily_col_data,
            monthly_collection=ChartData(labels=[], series=[]),
            grade_collection=grade_col_data,
            payment_mode_distribution=pm_dist_data
        )

        # 3. Lists
        # Recent Payments
        q_recent = db.query(FeeReceipt).join(Student, Student.id == FeeReceipt.student_id).join(PaymentMode, PaymentMode.id == FeeReceipt.payment_mode_id).filter(FeeReceipt.status == ReceiptStatus.SUCCESS)
        if student_filters:
            q_recent = q_recent.filter(*student_filters)
            
        recent_receipts = q_recent.order_by(desc(FeeReceipt.created_at)).limit(10).all()
        recent_payments = [
            RecentPayment(
                id=r.id,
                receipt_number=r.receipt_number,
                student_name=f"{r.student.first_name} {r.student.last_name}",
                admission_number=r.student.admission_number,
                amount=r.total_amount,
                date=r.created_at.strftime('%Y-%m-%d %H:%M'),
                mode=r.payment_mode.name
            ) for r in recent_receipts
        ]

        # Top Defaulters
        q_defaulters = db.query(
            Student, 
            func.sum(FeeAssignment.net_amount - FeeAssignment.paid_amount).label('outstanding')
        ).join(FeeAssignment, FeeAssignment.student_id == Student.id).filter(*assignment_filters)
        
        if student_filters:
            q_defaulters = q_defaulters.filter(*student_filters)
            
        defaulters_res = q_defaulters.group_by(Student.id).having(func.sum(FeeAssignment.net_amount - FeeAssignment.paid_amount) > 0).order_by(desc('outstanding')).limit(10).all()
        
        top_defaulters = [
            TopDefaulter(
                student_id=res[0].id,
                student_name=f"{res[0].first_name} {res[0].last_name}",
                admission_number=res[0].admission_number,
                grade=res[0].grade.name if res[0].grade else '-',
                section=res[0].section.name if res[0].section else '-',
                outstanding_amount=res[1]
            ) for res in defaulters_res
        ]

        lists = DashboardLists(
            recent_payments=recent_payments,
            top_defaulters=top_defaulters
        )

        summary_res = DashboardSummary(
            cards=cards,
            charts=charts,
            lists=lists,
            category_summary=category_summary_list
        )
        DashboardService._summary_cache[cache_key] = (summary_res, now_ts)
        return summary_res
