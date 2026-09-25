import re
from pydantic import BaseModel, EmailStr, ConfigDict, field_validator
from typing import Optional
from datetime import date
from app.domain.student_models import StudentStatus
from app.schemas.master import AcademicYearResponse, GradeResponse, SectionResponse

class StudentValidatorMixin(BaseModel):
    @field_validator("first_name", mode="before", check_fields=False)
    @classmethod
    def validate_first_name(cls, v):
        if v is None:
            return v
        if isinstance(v, str):
            v = v.strip()
            if not v:
                raise ValueError("First name cannot be blank")
        return v

    @field_validator("email", mode="before", check_fields=False)
    @classmethod
    def validate_email(cls, v):
        if v is None:
            return None
        if isinstance(v, str):
            v = v.strip()
            if not v:
                return None
        return v

    @field_validator("serial_number", mode="before", check_fields=False)
    @classmethod
    def validate_serial_number(cls, v):
        if v is None or v == "":
            return None
        if isinstance(v, str):
            v = v.strip()
            if not v:
                return None
            if not v.isdigit():
                raise ValueError("Serial number must contain only numbers")
            v = int(v)
        if isinstance(v, int) and v <= 0:
            raise ValueError("Serial number must be a positive integer greater than 0")
        return v

    @field_validator("contact_number", "father_contact_number", "mother_contact_number", mode="before", check_fields=False)
    @classmethod
    def validate_phone(cls, v):
        if v is None:
            return None
        if isinstance(v, (int, float)):
            v = str(int(v))
        if isinstance(v, str):
            v = v.strip()
            if not v:
                return None
            if re.search(r'[a-zA-Z]', v):
                raise ValueError("Phone number must contain only numbers")
            digits = re.sub(r'\D', '', v)
            if len(digits) == 12 and digits.startswith('91'):
                digits = digits[2:]
            elif len(digits) == 11 and digits.startswith('0'):
                digits = digits[1:]
            if len(digits) != 10:
                raise ValueError("Phone number must be exactly 10 digits")
            return digits
        return v

    @field_validator("last_name", "father_name", "mother_name", "address", "gender", mode="before", check_fields=False)
    @classmethod
    def clean_optional_strings(cls, v):
        if isinstance(v, str):
            v = v.strip()
            if not v:
                return None
        return v

class StudentBase(StudentValidatorMixin):
    first_name: str
    last_name: Optional[str] = ""
    date_of_birth: date
    serial_number: Optional[int] = None
    gender: Optional[str] = None
    father_name: Optional[str] = None
    father_contact_number: Optional[str] = None
    mother_name: Optional[str] = None
    mother_contact_number: Optional[str] = None
    contact_number: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    status: StudentStatus = StudentStatus.ACTIVE
    academic_year_id: int
    grade_id: int
    section_id: Optional[int] = None

class StudentCreate(StudentBase):
    admission_number: Optional[str] = None

class StudentUpdate(StudentValidatorMixin):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    serial_number: Optional[int] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    father_name: Optional[str] = None
    father_contact_number: Optional[str] = None
    mother_name: Optional[str] = None
    mother_contact_number: Optional[str] = None
    contact_number: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    status: Optional[StudentStatus] = None
    academic_year_id: Optional[int] = None
    grade_id: Optional[int] = None
    section_id: Optional[int] = None

class StudentResponse(StudentBase):
    id: int
    admission_number: str
    photo_path: Optional[str] = None
    student_name: Optional[str] = None
    
    academic_year: Optional[AcademicYearResponse] = None
    grade: Optional[GradeResponse] = None
    section: Optional[SectionResponse] = None

    model_config = ConfigDict(from_attributes=True)
