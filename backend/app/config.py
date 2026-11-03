import os
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str = "postgresql+psycopg2://brandguard:brandguard@localhost:5432/brandguard"

    APP_ENV: str = "development"
    AUTH_SECRET_KEY: str = ""
    AUTH_TOKEN_TTL_MINUTES: int = 60
    LLM_API_KEY: str = ""
    LLM_BASE_URL: str = "https://api.openai.com/v1"
    LLM_MODEL: str = "gpt-4o-mini"

    EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"
    EMBEDDING_DIM: int = 384

    FRONTEND_ORIGIN: str = "http://localhost:3000"
    UPLOAD_DIR: str = "/tmp/uploads" if os.environ.get("VERCEL") else "uploads"

    # Evaluator demo account configuration
    DEMO_ACCOUNT_ENABLED: bool = True
    DEMO_ACCOUNT_EMAIL: str = "demo@brandguard.ai"
    DEMO_ACCOUNT_PASSWORD: str = "BrandGuardDemo2026!"
    DEMO_ACCOUNT_NAME: str = "Inkloom Hackathon Evaluator"
    DEMO_ACCOUNT_ORG_NAME: str = "Acme Corp (Demo)"

    # Verification & Visual thresholds
    VERIFIER_MIN_CONFIDENCE: float = 0.65
    VERIFIER_CITATION_STRICT: bool = True
    VISION_DELTA_E_THRESHOLD: float = 35.0
    VISION_LOGO_THRESHOLD: float = 0.65
    VISION_WCAG_AA_NORMAL_RATIO: float = 4.5
    VISION_WCAG_AA_LARGE_RATIO: float = 3.0


    def get_database_url(self) -> str:
        url = self.DATABASE_URL
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+psycopg2://", 1)
        elif url.startswith("postgresql://") and not url.startswith("postgresql+psycopg2://"):
            url = url.replace("postgresql://", "postgresql+psycopg2://", 1)
        return url


settings = Settings()
settings.DATABASE_URL = settings.get_database_url()
