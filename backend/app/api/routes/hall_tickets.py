from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.infrastructure.database import get_db
from app.api.dependencies import get_current_user
from app.domain.models import User
from app.domain.student_models import Student, StudentStatus
from app.domain.master_models import Grade
from app.services.hall_ticket_service import HallTicketService

router = APIRouter(tags=["Hall Tickets"])

class SubjectScheduleItem(BaseModel):
    name: str
    max_marks: Optional[str] = "100"
    date: Optional[str] = "-"
    time: Optional[str] = "-"

class HallTicketBatchRequest(BaseModel):
    grade_id: int
    exam_name: str = "Quarterly Examination"
    academic_year: str = "2026-2027"
    subjects: List[SubjectScheduleItem]

class HallTicketStudentPreview(BaseModel):
    id: int
    serial_number: Optional[int] = None
    admission_number: str
    student_name: str
    father_name: Optional[str] = None
    photo_path: Optional[str] = None
    section_name: Optional[str] = None

@router.get("/students", response_model=List[HallTicketStudentPreview])
def get_hall_ticket_students(
    grade_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns the student roster for the selected grade to preview hall tickets.
    """
    students = db.query(Student).filter(
        Student.grade_id == grade_id,
        Student.status == StudentStatus.ACTIVE
    ).order_by(Student.serial_number.asc(), Student.id.asc()).all()

    return [
        HallTicketStudentPreview(
            id=s.id,
            serial_number=s.serial_number,
            admission_number=s.admission_number,
            student_name=s.student_name,
            father_name=s.father_name,
            photo_path=s.photo_path,
            section_name=s.section.name if s.section else None
        )
        for s in students
    ]

@router.post("/generate-pdf")
def generate_hall_tickets_pdf(
    request: HallTicketBatchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generates a consolidated multi-page A4 PDF of hall tickets (2 per page)
    for all active students in the specified grade.
    """
    grade = db.query(Grade).filter(Grade.id == request.grade_id).first()
    if not grade:
        raise HTTPException(status_code=404, detail="Grade not found")

    students = db.query(Student).filter(
        Student.grade_id == request.grade_id,
        Student.status == StudentStatus.ACTIVE
    ).order_by(Student.serial_number.asc(), Student.id.asc()).all()

    if not students:
        raise HTTPException(status_code=404, detail=f"No active students found in {grade.name}")

    subjects_dict_list = [s.model_dump() for s in request.subjects]

    pdf_bytes = HallTicketService.generate_batch_pdf(
        students=students,
        grade_name=grade.name,
        exam_name=request.exam_name,
        academic_year=request.academic_year,
        subjects=subjects_dict_list
    )

    clean_grade = grade.name.replace(" ", "_")
    clean_exam = request.exam_name.replace(" ", "_")
    filename = f"Hall_Tickets_{clean_grade}_{clean_exam}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
    )
