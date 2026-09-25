from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.infrastructure.database import get_db
from app.api.dependencies import get_current_user
from app.domain.models import User
from app.schemas.user import UserResponse, UserCreate
from app.core.security import get_password_hash
from app.services.audit_service import AuditService
from pydantic import BaseModel

router = APIRouter()

class UserUpdate(BaseModel):
    is_active: bool
    role_id: int

@router.get("/", response_model=List[UserResponse])
def get_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    users = db.query(User).offset(skip).limit(limit).all()
    return users

@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    user_in: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    existing_user = db.query(User).filter(User.username == user_in.username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already registered")
        
    existing_email = db.query(User).filter(User.email == user_in.email).first()
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        username=user_in.username,
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        is_active=user_in.is_active,
        role_id=user_in.role_id
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    AuditService.log_action(db, "CREATE", f"User:{user.id}", current_user.id)
    return user

@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    user_in: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if user_id == 1 and not user_in.is_active:
        raise HTTPException(status_code=400, detail="Cannot deactivate the super admin")
        
    user.is_active = user_in.is_active
    user.role_id = user_in.role_id
    db.commit()
    db.refresh(user)
    
    AuditService.log_action(db, "UPDATE", f"User:{user.id}", current_user.id)
    return user

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if user_id == 1 or user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete super admin or yourself")
        
    db.delete(user)
    db.commit()
    
    AuditService.log_action(db, "DELETE", f"User:{user_id}", current_user.id)
    return None
