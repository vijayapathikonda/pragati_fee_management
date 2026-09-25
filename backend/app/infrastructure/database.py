import os
import re
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import NullPool
from app.core.config import settings

db_url = settings.DATABASE_URL
engine_kwargs = {"pool_pre_ping": True}

# Normalize URL for libSQL or Heroku MySQL
if db_url.startswith("libsql://"):
    db_url = db_url.replace("libsql://", "sqlite+libsql://")
elif db_url.startswith("mysql://"):
    db_url = db_url.replace("mysql://", "mysql+pymysql://", 1)

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
    # Remote Turso libSQL connections are not thread-safe when shared in QueuePool across worker threads
    if "libsql" in db_url or "turso.io" in db_url:
        engine_kwargs["poolclass"] = NullPool
else:
    # Heroku MySQL (ClearDB / JawsDB) enforces strict max_user_connections (typically 5-10)
    # and drops idle connections around 60-90 seconds. Keep pool small and recycle early.
    engine_kwargs["pool_size"] = 3
    engine_kwargs["max_overflow"] = 1
    engine_kwargs["pool_timeout"] = 30
    engine_kwargs["pool_recycle"] = 55

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

