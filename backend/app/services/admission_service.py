import datetime
from sqlalchemy.orm import Session
from app.repositories.student_repository import student_repository
from app.repositories.master_repository import academic_year_repo

class AdmissionService:
    @staticmethod
    def generate_admission_number(db: Session, academic_year_id: int) -> str:
        # Format: ADM-{YEAR}-{4_DIGIT_SEQUENCE}
        academic_year = academic_year_repo.get(db, id=academic_year_id)
        year_str = datetime.datetime.now().year
        if academic_year:
            # Assuming name is like '2023-2024', extract first year
            year_str = academic_year.name.split("-")[0] if "-" in academic_year.name else academic_year.name
        
        latest_student = student_repository.get_latest_student(db)
        
        next_seq = 1
        if latest_student and latest_student.admission_number:
            try:
                # E.g. ADM-2023-0005 -> 5
                parts = latest_student.admission_number.split("-")
                if len(parts) == 3:
                    next_seq = int(parts[2]) + 1
            except ValueError:
                pass
                
        return f"ADM-{year_str}-{next_seq:04d}"
