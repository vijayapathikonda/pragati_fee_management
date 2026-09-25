from fastapi import APIRouter
from app.api.routes import auth, health, masters, students, fees, payments, dashboard, reports, admin, users, license, artifacts, hall_tickets

api_router = APIRouter()

api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(license.router, prefix="/license", tags=["License"])
api_router.include_router(masters.router, prefix="/masters")
api_router.include_router(students.router, prefix="/students", tags=["Students"])
api_router.include_router(fees.router, prefix="/fee-assignments", tags=["Fee Assignments"])
api_router.include_router(payments.router, prefix="/payments", tags=["Payments"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
api_router.include_router(reports.router, prefix="/reports", tags=["Reports"])
api_router.include_router(admin.router, prefix="/admin", tags=["Administration"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(artifacts.router, prefix="/artifacts", tags=["Artifacts"])
api_router.include_router(hall_tickets.router, prefix="/hall-tickets", tags=["Hall Tickets"])

