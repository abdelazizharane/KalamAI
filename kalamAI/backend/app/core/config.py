from pydantic_settings import BaseSettings
from pydantic import field_validator


class Settings(BaseSettings):
    redis_url: str = "redis://localhost:6379"
    ai_pipeline_url: str = "http://localhost:8001"
    secret_key: str = "kalamai-dev-secret-CHANGE-IN-PRODUCTION"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24  # 24h
    matrix_homeserver: str = ""
    matrix_bot_token: str = ""
    cors_origins: str = "http://localhost:3000,http://localhost:5173"
    # App public URL used in invitation emails
    app_url: str = "http://localhost:3000"
    # Resend API (https://resend.com — free tier, easiest option)
    # Set RESEND_API_KEY=re_xxx to enable. Takes priority over SMTP.
    resend_api_key: str = ""
    # SMTP fallback (leave smtp_host empty to disable — emails logged only)
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = "noreply@kalamai.ai"

    @field_validator("secret_key")
    @classmethod
    def warn_default_secret(cls, v: str) -> str:
        if v == "kalamai-dev-secret-CHANGE-IN-PRODUCTION":
            import warnings
            warnings.warn("SECRET_KEY is using the insecure default — set SECRET_KEY env var in production")
        return v

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",")]

    class Config:
        env_file = ".env"


settings = Settings()
