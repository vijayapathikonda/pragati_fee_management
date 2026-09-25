import os
import re
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

db_url = settings.DATABASE_URL
engine_kwargs = {"pool_pre_ping": True}

# Normalize URL for libSQL
if db_url.startswith("libsql://"):
    db_url = db_url.replace("libsql://", "sqlite+libsql://")

# Handle Turso libSQL and SQLite configurations
if "sqlite" in db_url or "libsql" in db_url:
    connect_args = {"check_same_thread": False}
    
    # Extract auth token if connecting to Turso remote database
    token = settings.TURSO_AUTH_TOKEN or os.environ.get("TURSO_AUTH_TOKEN")
    
    # Check if token is in query string
    if not token and "authToken=" in db_url:
        m = re.search(r"authToken=([^&]+)", db_url)
        if m:
            token = m.group(1)
            db_url = re.sub(r"[?&]authToken=[^&]+", "", db_url)
            
    if token:
        connect_args["auth_token"] = token
        
    engine_kwargs["connect_args"] = connect_args
else:
    engine_kwargs["pool_recycle"] = 3600

# Ensure secure=true for remote Turso databases
if "turso.io" in db_url and "secure=" not in db_url:
    sep = "&" if "?" in db_url else "?"
    db_url = f"{db_url}{sep}secure=true"

engine = create_engine(db_url, **engine_kwargs)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
