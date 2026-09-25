from typing import List
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.domain.fee_models import FeeAssignment
from app.repositories.base_repository import BaseRepository
from app.schemas.fee import FeeAssignmentCreate, FeeAssignmentUpdate

class FeeAssignmentRepository(BaseRepository[FeeAssignment, FeeAssignmentCreate, FeeAssignmentUpdate]):
    def get_by_student(self, db: Session, student_id: int) -> List[FeeAssignment]:
        return db.query(FeeAssignment).filter(FeeAssignment.student_id == student_id).order_by(desc(FeeAssignment.due_date)).all()

fee_assignment_repository = FeeAssignmentRepository(FeeAssignment)
