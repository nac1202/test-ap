from pydantic_settings import BaseSettings
from typing import Optional, Union
from pydantic import SecretStr, field_validator

class Settings(BaseSettings):
    PROJECT_NAME: str = "NAC HUB API"
    VERSION: str = "1.9.0"
    API_V1_STR: str = "/api/v1"
    
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

    # AI Provider (なっくん)
    # AI_PROVIDER: "mock"(既定) | "openai"
    # OPENAI_API_KEY はバックエンドの環境変数だけから取得する（ブラウザ・フロント・DB・ログへは出さない）。
    AI_PROVIDER: str = "mock"
    OPENAI_API_KEY: Optional[SecretStr] = None
    OPENAI_MODEL: str = "gpt-6-luna"
    OPENAI_REASONING_EFFORT: str = "low"  # 空文字なら reasoning を送らない
    OPENAI_TIMEOUT_SECONDS: float = 30
    OPENAI_MAX_OUTPUT_TOKENS: int = 1200
    OPENAI_MAX_RETRIES: int = 1  # SDKの自動リトライ上限（無限リトライ禁止）
    # モデルへ渡す会話履歴の上限
    AI_HISTORY_MAX_TURNS: int = 10
    AI_HISTORY_MAX_CHARS: int = 6000
    
    class Config:
        case_sensitive = True
        # .env.ai は backend 専用の秘密ファイル（Git管理外・フロントエンドには渡されない）
        env_file = (".env", ".env.ai")
        extra = "ignore"

settings = Settings()

