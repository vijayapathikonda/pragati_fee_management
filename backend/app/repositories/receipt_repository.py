from typing import List
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.domain.fee_models import FeeReceipt
from app.repositories.base_repository import BaseRepository
from app.schemas.fee import FeeReceiptCreate

class ReceiptRepository(BaseRepository[FeeReceipt, FeeReceiptCreate, FeeReceiptCreate]):
    def get_by_student(self, db: Session, student_id: int) -> List[FeeReceipt]:
        return db.query(FeeReceipt).filter(FeeReceipt.student_id == student_id).order_by(desc(FeeReceipt.created_at)).all()

    def get_by_receipt_number(self, db: Session, receipt_number: str) -> FeeReceipt | None:
        return db.query(FeeReceipt).filter(FeeReceipt.receipt_number == receipt_number).first()

receipt_repository = ReceiptRepository(FeeReceipt)
