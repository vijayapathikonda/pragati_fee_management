import time
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List, Type, Any, Optional, Dict, Tuple
from pydantic import BaseModel

from app.infrastructure.database import get_db
from app.repositories.base_repository import BaseRepository
from app.services.export_service import ExportService
from app.api.dependencies import get_current_user
from app.domain.models import User
from app.core.exceptions import NotFoundException

def create_master_router(
    repo: BaseRepository,
    create_schema: Type[BaseModel],
    update_schema: Type[BaseModel],
    response_schema: Type[BaseModel],
    search_fields: List[str]
) -> APIRouter:
    router = APIRouter()
    _list_cache: Dict[Tuple, Tuple[dict, float]] = {}
    _CACHE_TTL = 60.0

    @router.get("", response_model=dict, include_in_schema=False)
    @router.get("/", response_model=dict)
    def get_all(
        page: int = 1,
        size: int = 10,
        search: Optional[str] = None,
        sort_by: Optional[str] = None,
        sort_order: str = "asc",
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
    ):
        cache_key = (page, size, search or "", sort_by or "", sort_order)
        now = time.time()
        cached = _list_cache.get(cache_key)
        if cached and (now - cached[1]) < _CACHE_TTL:
            return cached[0]

        if getattr(repo.model, "__tablename__", "") == "discount_types":
            from app.services.fee_service import FeeService
            FeeService.ensure_default_discounts(db)

        items, total = repo.get_paginated(
            db, 
            page=page, 
            size=size, 
            search=search, 
            search_fields=search_fields,
            sort_by=sort_by,
            sort_order=sort_order
        )
        data = [response_schema.model_validate(item).model_dump() for item in items]
        result = {
            "data": data,
            "total": total,
            "page": page,
            "size": size
        }
        _list_cache[cache_key] = (result, now)
        return result

    @router.get("/export/excel")
    def export_excel(
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
    ):
        # Fetch all items for export
        items = repo.get_multi(db, skip=0, limit=10000)
        data = [response_schema.model_validate(item).model_dump() for item in items]
        return ExportService.generate_excel(data, filename=f"{repo.model.__tablename__}_export.xlsx")

    @router.get("/{id}", response_model=response_schema)
    def get_one(
        id: int, 
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
    ):
        item = repo.get(db, id=id)
        if not item:
            raise NotFoundException("Item not found")
        return item

    @router.post("", response_model=response_schema, include_in_schema=False)
    @router.post("/", response_model=response_schema)
    def create(
        item_in: create_schema,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
    ):
        res = repo.create(db, obj_in=item_in)
        _list_cache.clear()
        return res

    @router.put("/{id}", response_model=response_schema)
    def update(
        id: int,
        item_in: update_schema,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
    ):
        item = repo.get(db, id=id)
        if not item:
            raise NotFoundException("Item not found")
        res = repo.update(db, db_obj=item, obj_in=item_in)
        _list_cache.clear()
        return res

    @router.delete("/{id}", response_model=response_schema)
    def delete(
        id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
    ):
        item = repo.get(db, id=id)
        if not item:
            raise NotFoundException("Item not found")
        res = repo.remove(db, id=id)
        _list_cache.clear()
        return res

    return router

