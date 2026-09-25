from app.infrastructure.database import SessionLocal
from app.domain.models import User
from app.core.security import get_password_hash

db = SessionLocal()
admin = db.query(User).filter(User.email == "admin@school.com").first()
if admin:
    admin.hashed_password = get_password_hash("admin123")
    db.commit()
    print("Password for admin@school.com reset to: admin123")
else:
    print("Admin user not found!")
