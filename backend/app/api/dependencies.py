import time
from typing import Dict, Tuple
from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
import jwt
from jwt.exceptions import InvalidTokenError
from pydantic import ValidationError

from app.infrastructure.database import SessionLocal
from app.core.config import settings
from app.core.exceptions import UnauthorizedException, NotFoundException
from app.schemas.token import TokenPayload
from app.domain.models import User
from app.repositories.user_repository import user_repository

reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl="/api/auth/login"
)

_USER_CACHE: Dict[str, Tuple[User, float]] = {}
_USER_CACHE_TTL = 180.0  # 3 minutes

def invalidate_user_cache():
    _USER_CACHE.clear()

def get_current_user(
    token: str = Depends(reusable_oauth2)
) -> User:
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        token_data = TokenPayload(**payload)
    except (InvalidTokenError, ValidationError):
        raise UnauthorizedException("Could not validate credentials")

    cache_key = str(token_data.sub)
    now = time.time()
    cached = _USER_CACHE.get(cache_key)
    if cached and (now - cached[1]) < _USER_CACHE_TTL:
        user = cached[0]
        if not user.is_active:
            raise UnauthorizedException("Inactive user")
        return user

    db = SessionLocal()
    try:
        user = user_repository.get(db, id=token_data.sub)
        if not user:
            raise NotFoundException("User not found")
        if not user.is_active:
            raise UnauthorizedException("Inactive user")
        # Force load roles before detaching from session
        _ = list(user.roles)
        db.expunge(user)
        _USER_CACHE[cache_key] = (user, now)
        return user
    finally:
        db.close()

