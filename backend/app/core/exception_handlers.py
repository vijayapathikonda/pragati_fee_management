from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from app.core.exceptions import AppException
from loguru import logger

def add_exception_handlers(app: FastAPI):
    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        logger.warning(f"Validation error on {request.url}: {exc.errors()}")
        error_messages = []
        field_errors = {}
        for err in exc.errors():
            loc = err.get("loc", [])
            field = str(loc[-1]) if loc else "field"
            msg = err.get("msg", "Invalid value")
            if msg.startswith("Value error, "):
                msg = msg[len("Value error, "):]
            field_errors[field] = msg
            field_display = field.replace('_', ' ').title()
            error_messages.append(f"{field_display}: {msg}")
        
        detail_msg = "; ".join(error_messages) if error_messages else "Invalid request data"
        return JSONResponse(
            status_code=422,
            content={
                "detail": detail_msg,
                "errors": field_errors,
                "raw_errors": exc.errors()
            },
        )

    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException):
        logger.error(f"AppException: {exc.message} on {request.url}")
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.message},
        )
    
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        logger.exception(f"Unhandled Exception on {request.url}: {exc}")
        return JSONResponse(
            status_code=500,
            content={"detail": f"Internal server error: {str(exc)}"},
        )
