from sqlalchemy import create_engine, text

DATABASE_URL = "mysql+pymysql://root:rootpassword@localhost:3306/school_fee_db"
engine = create_engine(DATABASE_URL)

with engine.begin() as conn:
    res = conn.execute(text("UPDATE students SET photo_path = REPLACE(photo_path, '/static/students/', '/students/') WHERE photo_path LIKE '/static/students/%'"))
    print(f"Updated {res.rowcount} records in DB.")

with engine.connect() as conn:
    sample = conn.execute(text("SELECT id, serial_number, first_name, photo_path FROM students WHERE photo_path IS NOT NULL LIMIT 5")).fetchall()
    print("Sample updated records:")
    for s in sample:
        print(f"  SN {s.serial_number} (id {s.id}): {s.first_name} -> {s.photo_path}")
