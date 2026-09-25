from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from app.infrastructure.database import get_db
from app.api.dependencies import get_current_user
from app.domain.models import User
from app.schemas.fee import FeeReceiptCreate, FeeReceiptResponse
from app.services.payment_service import PaymentService
from app.repositories.receipt_repository import receipt_repository

router = APIRouter()

class CancelReceiptRequest(BaseModel):
    reason: str

@router.post("/collect", response_model=FeeReceiptResponse)
def collect_fee(
    receipt_in: FeeReceiptCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return PaymentService.collect_fee(db, obj_in=receipt_in, collected_by_id=current_user.id)

@router.get("/student/{student_id}", response_model=List[FeeReceiptResponse])
def get_student_receipts(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return receipt_repository.get_by_student(db, student_id=student_id)

@router.post("/{receipt_id}/cancel", response_model=FeeReceiptResponse)
def cancel_receipt(
    receipt_id: int,
    request: CancelReceiptRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return PaymentService.cancel_receipt(db, receipt_id=receipt_id, cancelled_by_id=current_user.id, reason=request.reason)
