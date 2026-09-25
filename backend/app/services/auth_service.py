from sqlalchemy.orm import Session
from app.repositories.user_repository import user_repository
from app.schemas.user import UserLogin
from app.schemas.token import Token
from app.core.security import verify_password, create_access_token
from app.core.exceptions import UnauthorizedException
from app.domain.models import User

class AuthService:
    @staticmethod
    def authenticate_user(db: Session, login_data: UserLogin) -> User:
        user = user_repository.get_by_email(db, email=login_data.email)
        if not user:
            raise UnauthorizedException("Incorrect email or password")
        if not verify_password(login_data.password, user.hashed_password):
            raise UnauthorizedException("Incorrect email or password")
        if not user.is_active:
            raise UnauthorizedException("Inactive user")
        return user
    
    @staticmethod
    def create_token_for_user(user: User) -> Token:
        access_token = create_access_token(subject=user.id)
        return Token(access_token=access_token, token_type="bearer")
