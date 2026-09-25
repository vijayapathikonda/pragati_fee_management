from typing import Optional, Tuple, List
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc
from app.domain.student_models import Student
from app.repositories.base_repository import BaseRepository
from app.schemas.student import StudentCreate, StudentUpdate

class StudentRepository(BaseRepository[Student, StudentCreate, StudentUpdate]):
    def get_paginated_students(
        self,
        db: Session,
        *,
        page: int = 1,
        size: int = 10,
        search: Optional[str] = None,
        academic_year_id: Optional[int] = None,
        grade_id: Optional[int] = None,
        section_id: Optional[int] = None,
        status: Optional[str] = None,
        sort_by: Optional[str] = None,
        sort_order: str = "asc"
    ) -> Tuple[List[Student], int]:
        
        query = db.query(Student)

        if academic_year_id:
            query = query.filter(Student.academic_year_id == academic_year_id)
        if grade_id:
            query = query.filter(Student.grade_id == grade_id)
        if section_id:
            query = query.filter(Student.section_id == section_id)
        if status:
            query = query.filter(Student.status == status)

        if search:
            query = query.filter(
                or_(
                    Student.first_name.ilike(f"%{search}%"),
                    Student.last_name.ilike(f"%{search}%"),
                    Student.admission_number.ilike(f"%{search}%"),
                    Student.father_name.ilike(f"%{search}%"),
                    Student.mother_name.ilike(f"%{search}%"),
                    Student.father_contact_number.ilike(f"%{search}%"),
                    Student.email.ilike(f"%{search}%"),
                )
            )

        if sort_by and hasattr(Student, sort_by):
            column = getattr(Student, sort_by)
            if sort_order.lower() == "desc":
                query = query.order_by(desc(column), desc(Student.id))
            else:
                query = query.order_by(asc(column), asc(Student.id))
        else:
            query = query.order_by(asc(Student.serial_number), asc(Student.id))


        total = query.count()
        skip = (page - 1) * size if page > 0 else 0
        items = query.offset(skip).limit(size).all()
        
        return items, total

    def get_latest_student(self, db: Session) -> Optional[Student]:
        return db.query(Student).order_by(desc(Student.id)).first()

student_repository = StudentRepository(Student)
