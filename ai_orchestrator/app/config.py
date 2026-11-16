"""Application configuration loaded from environment variables."""

import os
from dataclasses import dataclass
from dotenv import load_dotenv

load_dotenv()


@dataclass
class Settings:
    app_name: str = os.getenv("APP_NAME", "AI Orchestrator")
    environment: str = os.getenv("ENVIRONMENT", "development")
    openrouter_api_key: str = os.getenv("OPENROUTER_API_KEY", "")
    openrouter_base_url: str = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
    default_model: str = os.getenv("DEFAULT_MODEL", "google/gemini-4-hydrogen")
    default_max_tokens: int = int(os.getenv("DEFAULT_MAX_TOKENS", "512"))
    storage_dir: str = os.getenv("STORAGE_DIR", "storage")


settings = Settings()
