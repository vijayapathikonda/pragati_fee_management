import sys
import os
from datetime import date

# Add the backend directory to sys.path so 'app' can be imported
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.infrastructure.database import SessionLocal
from app.domain.master_models import AcademicYear, Grade, Section

def seed_data():
    db = SessionLocal()
    try:
        # Seed Academic Years (2010 to 2050)
        print("Seeding Academic Years...")
        for year in range(2010, 2051):
            name = f"{year}-{year+1}"
            existing = db.query(AcademicYear).filter(AcademicYear.name == name).first()
            if not existing:
                ay = AcademicYear(
                    name=name,
                    start_date=date(year, 4, 1),
                    end_date=date(year+1, 3, 31),
                    is_active=(year == date.today().year) # Make current year active
                )
                db.add(ay)
        
        # Seed Grades (1 to 10)
        print("Seeding Grades...")
        for grade_num in range(1, 11):
            name = f"Grade {grade_num}"
            existing = db.query(Grade).filter(Grade.name == name).first()
            if not existing:
                grade = Grade(name=name, description=f"Standard {grade_num}")
                db.add(grade)
                
        # Seed Sections (A, B, C, D)
        print("Seeding Sections...")
        sections = ['A', 'B', 'C', 'D']
        for sec_name in sections:
            existing = db.query(Section).filter(Section.name == sec_name).first()
            if not existing:
                sec = Section(name=sec_name, description=f"Section {sec_name}")
                db.add(sec)
                
        db.commit()
        print("Successfully seeded all data!")
        
    except Exception as e:
        print(f"Error seeding data: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_data()
