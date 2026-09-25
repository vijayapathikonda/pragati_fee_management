from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app.infrastructure.database import get_db
from app.api.dependencies import get_current_user
from app.domain.models import User
from app.schemas.fee import (
    FeeAssignmentCreate, FeeAssignmentUpdate, FeeAssignmentResponse, StudentFeeSummary, FeeAssignmentBulkCreate,
    GradeStudentFeeStatus, BatchFeeAssignmentRequest, BatchFeeAssignmentResponse
)
from app.services.fee_service import FeeService
from app.repositories.fee_repository import fee_assignment_repository
from app.core.exceptions import NotFoundException

router = APIRouter()

@router.get("/grade-status", response_model=List[GradeStudentFeeStatus])
def get_grade_fee_status(
    academic_year_id: int,
    grade_id: int,
    fee_category_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return FeeService.get_grade_fee_status(
        db,
        academic_year_id=academic_year_id,
        grade_id=grade_id,
        fee_category_id=fee_category_id
    )

@router.post("/batch-assign", response_model=BatchFeeAssignmentResponse)
def batch_assign_fees(
    request: BatchFeeAssignmentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return FeeService.batch_assign_fees(db, request=request)

@router.post("/", response_model=FeeAssignmentResponse)
def create_fee_assignment(
    assignment_in: FeeAssignmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return FeeService.create_assignment(db, obj_in=assignment_in)

@router.post("/bulk", response_model=List[FeeAssignmentResponse])
def bulk_create_fee_assignments(
    bulk_in: FeeAssignmentBulkCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    responses = []
    for student_id in bulk_in.student_ids:
        assignment_in = FeeAssignmentCreate(
            student_id=student_id,
            **bulk_in.assignment.model_dump()
        )
        res = FeeService.create_assignment(db, obj_in=assignment_in)
        responses.append(res)
    return responses

@router.get("/student/{student_id}", response_model=dict)
def get_student_fees(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    assignments = fee_assignment_repository.get_by_student(db, student_id=student_id)
    summary = FeeService.get_student_summary(db, student_id=student_id)
    
    return {
        "summary": summary.model_dump(),
        "assignments": [FeeAssignmentResponse.model_validate(a).model_dump() for a in assignments]
    }

@router.put("/{id}", response_model=FeeAssignmentResponse)
def update_fee_assignment(
    id: int,
    assignment_in: FeeAssignmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    assignment = fee_assignment_repository.get(db, id=id)
    if not assignment:
        raise NotFoundException("Fee assignment not found")
        
    return FeeService.update_assignment(db, db_obj=assignment, obj_in=assignment_in)

@router.delete("/{id}", response_model=FeeAssignmentResponse)
def delete_fee_assignment(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    assignment = fee_assignment_repository.get(db, id=id)
    if not assignment:
        raise NotFoundException("Fee assignment not found")
    
    if assignment.paid_amount > 0:
        from app.core.exceptions import AppException
        raise AppException("Cannot delete a fee assignment that has payments against it.")
        
    return fee_assignment_repository.remove(db, id=id)
