from pydantic import BaseModel, EmailStr
from typing import List, Optional

class RoleResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    
    model_config = {"from_attributes": True}

class UserBase(BaseModel):
    email: EmailStr
    full_name: str

class UserCreate(UserBase):
    password: str
    roles: List[str] = ["User"]

class UserResponse(UserBase):
    id: int
    is_active: bool
    roles: List[RoleResponse] = []
    
    model_config = {"from_attributes": True}

class UserLogin(BaseModel):
    email: EmailStr
    password: str
