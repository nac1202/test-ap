from pydantic_settings import BaseSettings
from typing import Optional, Union
from pydantic import field_validator

class Settings(BaseSettings):
    PROJECT_NAME: str = "NAC HUB API"
    VERSION: str = "1.5.0"
    
    # Security
    SECRET_KEY: str = "super_secret_key_change_this_in_production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 1 week
    
    # Database
    DATABASE_URL: str = "postgresql://postgres:postgres@db:5432/nac_hub"
    
    # CORS
    BACKEND_CORS_ORIGINS: Union[list[str], str] = ["http://localhost:5173", "http://localhost:3000"]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, list[str]]) -> Union[list[str], str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            import json
            if isinstance(v, str):
                try:
                    return json.loads(v)
                except Exception:
                    pass
            return v
        return v
    
    # Initial Superuser Settings
    FIRST_SUPERUSER: str = "admin@example.com"
    FIRST_SUPERUSER_PASSWORD: str = "AdminPassword123"
    
    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()

