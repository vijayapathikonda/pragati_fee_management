from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.infrastructure.database import get_db
from app.schemas.user import UserLogin, UserResponse, UserCreate
from app.schemas.token import LoginResponse
from app.services.auth_service import AuthService
from app.api.dependencies import get_current_user
from app.domain.models import User
from app.core.security import get_password_hash, verify_password
from app.repositories.user_repository import user_repository
from app.core.exceptions import AppException

router = APIRouter()

@router.post("/login", response_model=LoginResponse)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    """
    Login user and return JWT token.
    """
    user = AuthService.authenticate_user(db, login_data)
    token = AuthService.create_token_for_user(user)
    return LoginResponse(token=token, user=user)

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

@router.post("/change-password")
def change_password(
    request: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not verify_password(request.old_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect old password")
        
    current_user.hashed_password = get_password_hash(request.new_password)
    db.commit()
    
    # Log Action
    from app.services.audit_service import AuditService
    AuditService.log_action(db, "UPDATE", f"User:{current_user.id}:Password", current_user.id)
    
    return {"message": "Password updated successfully"}

@router.post("/register", response_model=UserResponse)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    """
    Register a new user (for initial setup/demo purposes).
    """
    user = user_repository.get_by_email(db, email=user_in.email)
    if user:
        raise AppException("User with this email already exists")
    user = user_repository.create_user(db, obj_in=user_in)
    return user

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """
    Get current logged in user details.
    """
    return current_user
