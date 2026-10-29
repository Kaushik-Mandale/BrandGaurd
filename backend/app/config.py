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
    UPLOAD_DIR: str = "uploads"


settings = Settings()
