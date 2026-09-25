from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
import jwt
from jwt.exceptions import InvalidTokenError
from pydantic import ValidationError

from app.infrastructure.database import get_db
from app.core.config import settings
from app.core.exceptions import UnauthorizedException, NotFoundException
from app.schemas.token import TokenPayload
from app.domain.models import User
from app.repositories.user_repository import user_repository

reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl="/api/auth/login"
)

def get_current_user(
    db: Session = Depends(get_db), token: str = Depends(reusable_oauth2)
) -> User:
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        token_data = TokenPayload(**payload)
    except (InvalidTokenError, ValidationError):
        raise UnauthorizedException("Could not validate credentials")
    
    user = user_repository.get(db, id=token_data.sub)
    if not user:
        raise NotFoundException("User not found")
    if not user.is_active:
        raise UnauthorizedException("Inactive user")
    return user
