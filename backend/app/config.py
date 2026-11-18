from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # App
    app_name: str = "Compliance Agent API"
    debug: bool = False

    # Database
    database_url: str

    # Supabase
    supabase_url: str
    supabase_anon_key: str
    supabase_service_role_key: str
    jwt_secret: str

    # Anthropic
    anthropic_api_key: str
    anthropic_model: str = "claude-opus-4-6"

    # CORS
    frontend_url: str = "http://localhost:3000"


settings = Settings()
