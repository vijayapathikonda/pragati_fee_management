from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from app.infrastructure.database import get_db
from app.api.dependencies import get_current_user
from app.domain.models import User
from app.repositories.student_repository import student_repository
from app.schemas.student import StudentCreate, StudentUpdate, StudentResponse
from app.services.admission_service import AdmissionService
from app.services.file_service import FileService
from app.services.import_service import ImportService
from app.services.export_service import ExportService
from app.core.exceptions import NotFoundException, AppException

router = APIRouter()

@router.get("", response_model=dict, include_in_schema=False)
@router.get("/", response_model=dict)
def get_students(
    page: int = 1,
    size: int = 10,
    search: Optional[str] = None,
    academic_year_id: Optional[int] = None,
    grade_id: Optional[int] = None,
    section_id: Optional[int] = None,
    status: Optional[str] = None,
    sort_by: Optional[str] = None,
    sort_order: str = "asc",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    items, total = student_repository.get_paginated_students(
        db, page=page, size=size, search=search,
        academic_year_id=academic_year_id, grade_id=grade_id,
        section_id=section_id, status=status,
        sort_by=sort_by, sort_order=sort_order
    )
    data = [StudentResponse.model_validate(item).model_dump() for item in items]
    return {"data": data, "total": total, "page": page, "size": size}

@router.post("", response_model=StudentResponse, include_in_schema=False)
@router.post("/", response_model=StudentResponse)
def create_student(
    student_in: StudentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    student_data = student_in.model_dump()
    # Use custom admission number if provided, otherwise auto-generate
    if not student_data.get("admission_number"):
        admission_number = AdmissionService.generate_admission_number(db, student_in.academic_year_id)
        student_data["admission_number"] = admission_number
    
    from app.domain.student_models import Student
    db_student = Student(**student_data)
    db.add(db_student)
    db.commit()
    db.refresh(db_student)
    return db_student

@router.get("/export/excel")
def export_students(
    academic_year_id: Optional[int] = None,
    grade_id: Optional[int] = None,
    section_id: Optional[int] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    items, _ = student_repository.get_paginated_students(
        db, page=1, size=10000,
        academic_year_id=academic_year_id, grade_id=grade_id,
        section_id=section_id, status=status
    )
    
    export_data = []
    for item in items:
        full_name = f"{item.first_name} {item.last_name}".strip() if item.last_name else item.first_name
        export_data.append({
            "Serial Number": item.serial_number,
            "Admission Number": item.admission_number,
            "Student Name": full_name,
            "Date of Birth": str(item.date_of_birth) if item.date_of_birth else "",
            "Father Name": item.father_name or "",
            "Father Contact Number": item.father_contact_number or "",
            "Mother Name": item.mother_name or "",
            "Mother Contact Number": item.mother_contact_number or "",
            "Address": item.address or "",
            "Grade": item.grade.name if item.grade else "",
            "Academic Year": item.academic_year.name if item.academic_year else "",
            "Status": item.status.value if item.status else "",
        })
        
    return ExportService.generate_excel(export_data, filename="Students_Export.xlsx")

@router.post("/import")
async def import_students(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise AppException("Only Excel files are supported")
        
    contents = await file.read()
    return ImportService.process_student_excel(db, contents)

@router.get("/{id}", response_model=StudentResponse)
def get_student(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    student = student_repository.get(db, id=id)
    if not student:
        raise NotFoundException("Student not found")
    return student

@router.put("/{id}", response_model=StudentResponse)
def update_student(
    id: int,
    student_in: StudentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    student = student_repository.get(db, id=id)
    if not student:
        raise NotFoundException("Student not found")
    return student_repository.update(db, db_obj=student, obj_in=student_in)

@router.post("/{id}/photo")
def upload_photo(
    id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    student = student_repository.get(db, id=id)
    if not student:
        raise NotFoundException("Student not found")
        
    # Allowed types
    if file.content_type not in ["image/jpeg", "image/png", "image/jpg"]:
        raise AppException("Invalid file type. Only JPEG/PNG allowed.")
        
    photo_path = FileService.save_upload_file(file, subfolder="students")
    
    student.photo_path = photo_path
    db.commit()
    db.refresh(student)
    
    return {"message": "Photo uploaded successfully", "photo_path": photo_path}

@router.delete("/{id}", response_model=dict)
def delete_student(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    student = student_repository.get(db, id=id)
    if not student:
        raise NotFoundException("Student not found")
        
    try:
        student_repository.remove(db, id=id)
        return {"message": "Student deleted successfully"}
    except Exception as e:
        db.rollback()
        raise AppException("Cannot delete student. They may have dependent records (e.g., fee assignments or payments).")
