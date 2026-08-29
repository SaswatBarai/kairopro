from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=(".env", "../../.env"), extra="ignore")

    APP_ENV: str = "development"
    PORT: int = 8000

    # Service token — must match Next.js AI_SERVICE_TOKEN
    AI_SERVICE_TOKEN: str = "dev-internal-token"

    # Platform URL (Next.js) — for PlatformClient callbacks
    PLATFORM_URL: str = "http://localhost:3000"

    # Database
    DATABASE_URL: str = "postgresql://kairopro:kairopro@localhost:5432/kairopro"

    # Redis
    REDIS_URL: str = "redis://localhost:6379"

    # MinIO / S3
    MINIO_ENDPOINT: str = "http://localhost:9000"
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "minioadmin"
    MINIO_BUCKET: str = "kairopro"
    AWS_REGION: str = "us-east-1"

    # LLM
    OPENAI_API_KEY: str = ""
    OPENAI_BASE_URL: str = "https://api.deepseek.com/v1"
    OPENAI_MODEL: str = "deepseek-chat"
    ANTHROPIC_API_KEY: str = ""

    # OTel
    OTEL_EXPORTER_OTLP_ENDPOINT: str = "http://localhost:4317"
    OTEL_SERVICE_NAME: str = "kairopro-ai"


settings = Settings()
