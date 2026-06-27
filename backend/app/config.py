from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: str = "development"
    app_base_url: str = "http://localhost:5173"
    admin_username: str = "admin"
    admin_password: str = "change-me"
    secret_key: str = "dev-secret-change-me"

    database_url: str = "sqlite:///./data/setadinfo.db"
    redis_url: str = "redis://localhost:6379/0"

    setad_base_url: str = "https://gw.setadiran.ir/api/centralboard"
    setad_http_timeout: float = 15
    setad_retry_attempts: int = 3
    setad_retry_delay_seconds: float = 0.6
    setad_cache_ttl_seconds: int = 60
    setad_stale_cache_ttl_seconds: int = 86400
    setad_page_size: int = 50
    setad_max_pages_per_run: int = 20
    setad_min_interval_minutes: int = 15

    rubika_bot_token: str = ""
    rubika_default_chat_id: str = ""

    @property
    def cookie_secure(self) -> bool:
        return self.app_env == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
