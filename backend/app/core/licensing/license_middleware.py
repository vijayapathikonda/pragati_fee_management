from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse
from app.infrastructure.database import SessionLocal
from app.core.licensing.license_service import LicenseService

EXEMPT_PREFIXES = [
    "/api/license",
    "/api/auth",
    "/api/health",
    "/api/docs",
    "/api/openapi.json",
    "/static",
    "/docs",
    "/openapi.json"
]

class LicenseEnforcementMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path = request.url.path

        # Always permit GET, HEAD, OPTIONS (read-only mode is preserved even if expired)
        if request.method in ["GET", "HEAD", "OPTIONS"]:
            return await call_next(request)

        # Allow exempt routes (authentication, license upload, health checks)
        for prefix in EXEMPT_PREFIXES:
            if path.startswith(prefix):
                return await call_next(request)

        # Check license status for write operations (POST, PUT, PATCH, DELETE)
        db = SessionLocal()
        try:
            info = LicenseService.get_license_info(db)
            if not info.get("is_write_allowed", False):
                status = info.get("status")
                msg = info.get("message") or "License expired or invalid."
                return JSONResponse(
                    status_code=403,
                    content={
                        "detail": f"Write operation blocked: {msg}",
                        "license_status": status,
                        "requires_renewal": True
                    }
                )
        finally:
            db.close()

        return await call_next(request)
