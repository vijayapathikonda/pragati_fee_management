import openpyxl
from io import BytesIO
from sqlalchemy.orm import Session
from datetime import datetime
from app.domain.student_models import Student, StudentStatus
from app.domain.master_models import Grade, Section, AcademicYear
from app.services.admission_service import AdmissionService
from app.core.exceptions import AppException

class ImportService:
    @staticmethod
    def process_student_excel(db: Session, file_contents: bytes):
        wb = openpyxl.load_workbook(filename=BytesIO(file_contents))
        ws = wb.active

        # Expected headers: First Name, Last Name, DOB (YYYY-MM-DD), Gender, Email, Phone, Grade, Section, Academic Year
        rows = list(ws.iter_rows(values_only=True))
        if len(rows) < 2:
            raise AppException("Excel file is empty or missing data rows")

        headers = [str(h).strip().lower() for h in rows[0]]
        
        required = ["first name", "last name", "dob", "grade", "section", "academic year"]
        for req in required:
            if req not in headers:
                raise AppException(f"Missing required column: {req}")

        success_count = 0
        errors = []

        # Cache lookups
        grades = {g.name.lower(): g.id for g in db.query(Grade).all()}
        sections = {s.name.lower(): s.id for s in db.query(Section).all()}
        academic_years = {a.name.lower(): a.id for a in db.query(AcademicYear).all()}

        for i, row in enumerate(rows[1:], start=2):
            if not any(row): continue # Skip empty rows

            row_dict = dict(zip(headers, row))
            try:
                first_name = row_dict.get("first name")
                last_name = row_dict.get("last name")
                dob_raw = row_dict.get("dob")
                grade_name = str(row_dict.get("grade")).strip().lower()
                section_name = str(row_dict.get("section")).strip().lower()
                ay_name = str(row_dict.get("academic year")).strip().lower()

                if not first_name or not last_name:
                    raise ValueError("First Name and Last Name are required")

                if isinstance(dob_raw, datetime):
                    dob = dob_raw.date()
                else:
                    dob = datetime.strptime(str(dob_raw).strip(), "%Y-%m-%d").date()

                grade_id = grades.get(grade_name)
                section_id = sections.get(section_name)
                ay_id = academic_years.get(ay_name)

                if not grade_id: raise ValueError(f"Grade '{grade_name}' not found")
                if not section_id: raise ValueError(f"Section '{section_name}' not found")
                if not ay_id: raise ValueError(f"Academic Year '{ay_name}' not found")

                admission_num = AdmissionService.generate_admission_number(db, ay_id)

                student = Student(
                    admission_number=admission_num,
                    first_name=first_name,
                    last_name=last_name,
                    date_of_birth=dob,
                    gender=row_dict.get("gender"),
                    email=row_dict.get("email"),
                    contact_number=row_dict.get("phone"),
                    address=row_dict.get("address"),
                    status=StudentStatus.ACTIVE,
                    academic_year_id=ay_id,
                    grade_id=grade_id,
                    section_id=section_id
                )
                db.add(student)
                db.commit()
                success_count += 1

            except Exception as e:
                db.rollback()
                errors.append(f"Row {i}: {str(e)}")

        return {"success": success_count, "errors": errors}
