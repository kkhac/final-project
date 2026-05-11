from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "sqlite:///./llm_testing.db"
    openai_api_key: str = ""
    anthropic_api_key: str = ""
    secret_key: str = "dev-secret-key"
    environment: str = "development"

    class Config:
        env_file = ".env"


settings = Settings()
