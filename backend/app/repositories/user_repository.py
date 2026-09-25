from typing import Optional
from sqlalchemy.orm import Session
from app.domain.models import User, Role
from app.repositories.base_repository import BaseRepository
from app.schemas.user import UserCreate, UserBase
from app.core.security import get_password_hash

class UserRepository(BaseRepository[User, UserCreate, UserBase]):
    def get_by_email(self, db: Session, *, email: str) -> Optional[User]:
        return db.query(User).filter(User.email == email).first()

    def create_user(self, db: Session, *, obj_in: UserCreate) -> User:
        db_obj = User(
            email=obj_in.email,
            hashed_password=get_password_hash(obj_in.password),
            full_name=obj_in.full_name,
        )
        
        for role_name in obj_in.roles:
            role = db.query(Role).filter(Role.name == role_name).first()
            if not role:
                role = Role(name=role_name)
                db.add(role)
            db_obj.roles.append(role)
            
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

user_repository = UserRepository(User)
