from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from datetime import date
from typing import Optional
from app.infrastructure.database import get_db
from app.api.dependencies import get_current_user
from app.domain.models import User
from app.services.report_service import ReportService
from app.services.export_service import ExportService
from app.schemas.report import ReportData

router = APIRouter()

def handle_export(data: ReportData, fmt: str):
    if fmt == 'pdf':
        return ExportService.to_pdf(data)
    elif fmt == 'excel':
        return ExportService.to_excel(data)
    elif fmt == 'csv':
        return ExportService.to_csv(data)
    return data # default json

@router.get("/outstanding")
def get_outstanding_report(
    academic_year_id: Optional[int] = Query(None),
    grade_id: Optional[int] = Query(None),
    section_id: Optional[int] = Query(None),
    format: str = Query("json"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    data = ReportService.get_outstanding_report(db, academic_year_id, grade_id, section_id)
    return handle_export(data, format)

@router.get("/ledger")
def get_student_ledger(
    student_id: int = Query(...),
    format: str = Query("json"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    data = ReportService.get_student_ledger(db, student_id)
    return handle_export(data, format)

@router.get("/collection")
def get_collection_report(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    format: str = Query("json"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    data = ReportService.get_collection_report(db, start_date, end_date)
    return handle_export(data, format)

@router.get("/discounts")
def get_discount_report(
    academic_year_id: Optional[int] = Query(None),
    format: str = Query("json"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    data = ReportService.get_discount_report(db, academic_year_id)
    return handle_export(data, format)

@router.get("/overdue")
def get_overdue_report(
    academic_year_id: Optional[int] = Query(None),
    format: str = Query("json"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    data = ReportService.get_overdue_report(db, academic_year_id)
    return handle_export(data, format)
