from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    app_name: str = "CloudDesk API"
    database_url: str = "postgresql+psycopg://clouddesk:clouddesk@localhost:5432/clouddesk"
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
