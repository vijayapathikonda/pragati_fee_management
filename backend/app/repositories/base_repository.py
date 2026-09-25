from typing import Any, Dict, Generic, List, Optional, Type, TypeVar, Union, Tuple
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc
from app.infrastructure.database import Base
from sqlalchemy.orm import Session
from app.infrastructure.database import Base

ModelType = TypeVar("ModelType", bound=Base)
CreateSchemaType = TypeVar("CreateSchemaType", bound=BaseModel)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=BaseModel)

class BaseRepository(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    def __init__(self, model: Type[ModelType]):
        self.model = model

    def get(self, db: Session, id: Any) -> Optional[ModelType]:
        return db.query(self.model).filter(self.model.id == id).first()

    def get_multi(self, db: Session, *, skip: int = 0, limit: int = 100) -> List[ModelType]:
        return db.query(self.model).offset(skip).limit(limit).all()

    def get_paginated(
        self, 
        db: Session, 
        *, 
        page: int = 1, 
        size: int = 10, 
        search: Optional[str] = None, 
        search_fields: List[str] = [],
        sort_by: Optional[str] = None,
        sort_order: str = "asc"
    ) -> Tuple[List[ModelType], int]:
        query = db.query(self.model)

        if search and search_fields:
            conditions = []
            for field in search_fields:
                column = getattr(self.model, field, None)
                if column is not None:
                    conditions.append(column.ilike(f"%{search}%"))
            if conditions:
                query = query.filter(or_(*conditions))

        if sort_by and hasattr(self.model, sort_by):
            column = getattr(self.model, sort_by)
            if sort_order.lower() == "desc":
                query = query.order_by(desc(column))
            else:
                query = query.order_by(asc(column))
        elif hasattr(self.model, "id"):
            query = query.order_by(desc(self.model.id))

        total = query.count()
        
        # Ensure non-negative offset
        skip = (page - 1) * size if page > 0 else 0
        items = query.offset(skip).limit(size).all()
        
        return items, total

    def create(self, db: Session, *, obj_in: CreateSchemaType) -> ModelType:
        obj_in_data = obj_in.model_dump()
        db_obj = self.model(**obj_in_data)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def update(self, db: Session, *, db_obj: ModelType, obj_in: Union[UpdateSchemaType, Dict[str, Any]]) -> ModelType:
        obj_data = db_obj.__dict__
        if isinstance(obj_in, dict):
            update_data = obj_in
        else:
            update_data = obj_in.model_dump(exclude_unset=True)
        for field in obj_data:
            if field in update_data:
                setattr(db_obj, field, update_data[field])
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def remove(self, db: Session, *, id: int) -> ModelType:
        obj = db.query(self.model).get(id)
        db.delete(obj)
        db.commit()
        return obj
