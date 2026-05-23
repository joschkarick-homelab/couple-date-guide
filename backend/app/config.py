from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: Literal["production", "development"] = "production"
    database_path: str = "./data/datemgr.db"
    log_level: str = "info"

    auth_header_user: str = "X-Forwarded-Preferred-Username"
    auth_header_email: str = "X-Forwarded-Email"
    allowed_emails: str = ""
    auth_dev_mode: bool = False
    auth_dev_user_email: str = "dev@example.com"

    quick_add_token: str = ""

    ai_provider: Literal["claude", "gemini", "perplexity", "openai"] = "claude"

    anthropic_api_key: str = ""
    anthropic_model: str = "claude-sonnet-4-6"

    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"

    perplexity_api_key: str = ""
    perplexity_model: str = "sonar-pro"

    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"

    unsplash_access_key: str = ""

    vapid_public_key: str = ""
    vapid_private_key: str = ""
    vapid_subject: str = "mailto:admin@example.com"

    @property
    def allowed_email_list(self) -> list[str]:
        return [e.strip().lower() for e in self.allowed_emails.split(",") if e.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
