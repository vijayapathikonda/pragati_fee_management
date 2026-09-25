import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.infrastructure.database import SessionLocal
from app.domain.master_models import PaymentMode

def seed_payment_modes():
    db = SessionLocal()
    try:
        modes = ["Cash", "UPI", "Bank Transfer", "Cheque", "Credit Card", "Debit Card"]
        for mode in modes:
            existing = db.query(PaymentMode).filter(PaymentMode.name == mode).first()
            if not existing:
                pm = PaymentMode(name=mode, is_active=True)
                db.add(pm)
        db.commit()
        print("Payment modes seeded successfully!")
    except Exception as e:
        print(f"Error seeding payment modes: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_payment_modes()
