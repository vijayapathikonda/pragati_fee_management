from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import os
from app.core.config import settings
from app.core.logger import setup_logger
from app.core.exception_handlers import add_exception_handlers
from app.api.router import api_router

setup_logger()

app = FastAPI(
    title="School Fee Management API",
    description="API for School Fee Management System (Phase 1)",
    version="1.0.0",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
    redoc_url=None,
)

# Ensure uploads directory exists
os.makedirs("uploads/students", exist_ok=True)
os.makedirs("uploads/receipts", exist_ok=True)
app.mount("/static", StaticFiles(directory="uploads"), name="static")

# Mount /students for static legacy student photos
for _students_dir in ["uploads/students", "../frontend/public/students", "frontend/public/students"]:
    if os.path.exists(_students_dir):
        app.mount("/students", StaticFiles(directory=_students_dir), name="students_static")
        break


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.parsed_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.core.licensing.license_middleware import LicenseEnforcementMiddleware

app.add_middleware(LicenseEnforcementMiddleware)
add_exception_handlers(app)

app.include_router(api_router, prefix="/api")
