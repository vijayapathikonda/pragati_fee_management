from sqlalchemy import Column, Integer, String, Date, ForeignKey, DateTime, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.infrastructure.database import Base

class StudentStatus(str, enum.Enum):
    ACTIVE = "Active"
    INACTIVE = "Inactive"
    GRADUATED = "Graduated"

class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    serial_number = Column(Integer, nullable=True)
    admission_number = Column(String(50), index=True, nullable=False)
    first_name = Column(String(150), nullable=False)
    last_name = Column(String(100), nullable=True, default="")
    date_of_birth = Column(Date, nullable=False)
    gender = Column(String(20), nullable=True)
    father_name = Column(String(150), nullable=True)
    father_contact_number = Column(String(50), nullable=True)
    mother_name = Column(String(150), nullable=True)
    mother_contact_number = Column(String(50), nullable=True)
    contact_number = Column(String(50), nullable=True)
    email = Column(String(255), nullable=True)
    address = Column(String(500), nullable=True)
    status = Column(Enum(StudentStatus), default=StudentStatus.ACTIVE)
    photo_path = Column(String(500), nullable=True)

    # Relationships to Master Data
    academic_year_id = Column(Integer, ForeignKey("academic_years.id"), nullable=False)
    grade_id = Column(Integer, ForeignKey("grades.id"), nullable=False)
    section_id = Column(Integer, ForeignKey("sections.id"), nullable=True)

    academic_year = relationship("AcademicYear", lazy="joined")
    grade = relationship("Grade", lazy="joined")
    section = relationship("Section", lazy="joined")

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    @property
    def student_name(self) -> str:
        if self.last_name:
            return f"{self.first_name} {self.last_name}".strip()
        return self.first_name or ""
