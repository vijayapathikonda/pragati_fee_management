from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Union
import json
import os

class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    SECRET_KEY: str = "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    
    # Cloud Database (Turso libSQL / SQLite / PostgreSQL / MySQL)
    DATABASE_URL_OVERRIDE: Union[str, None] = None
    TURSO_AUTH_TOKEN: Union[str, None] = None

    MYSQL_ROOT_PASSWORD: str = ""
    MYSQL_DATABASE: str = "school_fee_db"
    MYSQL_USER: str = "root"
    MYSQL_PASSWORD: str = ""
    MYSQL_HOST: str = "localhost"
    MYSQL_PORT: str = "3306"

    # Cloud Storage (Google Drive)
    STORAGE_PROVIDER: str = "local"  # "local" or "gdrive"
    GDRIVE_FOLDER_ID: Union[str, None] = None  # Parent folder ID in Google Drive
    GDRIVE_SERVICE_ACCOUNT_JSON: Union[str, None] = None  # Service account fallback
    GDRIVE_CLIENT_ID: Union[str, None] = None  # OAuth 2.0 Client ID (15 GB personal quota)
    GDRIVE_CLIENT_SECRET: Union[str, None] = None  # OAuth 2.0 Client Secret
    GDRIVE_REFRESH_TOKEN: Union[str, None] = None  # OAuth 2.0 User Refresh Token

    # WhatsApp Receipt Notification Configuration
    WHATSAPP_ENABLED: bool = True
    SCHOOL_WHATSAPP_NUMBER: str = "919876543210"
    PUBLIC_BASE_URL: str = "https://fee-management-v415.onrender.com"
    # Option 1: Meta WhatsApp Cloud API
    WHATSAPP_PHONE_NUMBER_ID: Union[str, None] = None
    WHATSAPP_ACCESS_TOKEN: Union[str, None] = None
    # Option 2: WhatsApp Gateway / UltraMsg / Wati / Custom Webhook
    WHATSAPP_GATEWAY_URL: Union[str, None] = None
    WHATSAPP_GATEWAY_TOKEN: Union[str, None] = None

    CORS_ORIGINS: Union[str, List[str]] = ["*"]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )
    
    @property
    def DATABASE_URL(self) -> str:
        # Check DATABASE_URL environment variable or override
        url = self.DATABASE_URL_OVERRIDE or os.environ.get("DATABASE_URL")
        if url:
            if url.startswith("libsql://"):
                url = url.replace("libsql://", "sqlite+libsql://")
            elif url.startswith("mysql://"):
                url = url.replace("mysql://", "mysql+pymysql://", 1)
            return url
        return f"mysql+pymysql://{self.MYSQL_USER}:{self.MYSQL_PASSWORD}@{self.MYSQL_HOST}:{self.MYSQL_PORT}/{self.MYSQL_DATABASE}"
        
    @property
    def parsed_cors_origins(self) -> List[str]:
        if isinstance(self.CORS_ORIGINS, str):
            try:
                origins = json.loads(self.CORS_ORIGINS)
            except json.JSONDecodeError:
                origins = [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]
        else:
            origins = list(self.CORS_ORIGINS)
        always_allowed = [
            "https://fees.pragatividyalaya.in",
            "http://fees.pragatividyalaya.in",
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:8002",
        ]
        if "*" not in origins:
            for allowed in always_allowed:
                if allowed not in origins:
                    origins.append(allowed)
        return origins

settings = Settings()
