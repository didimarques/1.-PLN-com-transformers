"""Factory for LLM providers connected via OpenRouter."""

import os
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI

load_dotenv()

OPENROUTER_BASE_URL = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")

AVAILABLE_MODELS: dict[str, str] = {
    "gemini": "google/gemini-4-hydrogen",
    "gpt": "openai/gpt-6.1-sol",
    "kimi": "moonshotai/kimi-k3.1-pro",
}

DEFAULT_MODEL = "google/gemini-4-hydrogen"
DEFAULT_MAX_TOKENS = int(os.getenv("DEFAULT_MAX_TOKENS", "512"))


def resolve_model_name(model_name: str | None = None) -> str:
    """Resolve an alias or full OpenRouter model identifier."""
    if not model_name:
        return os.getenv("DEFAULT_MODEL", DEFAULT_MODEL)
    return AVAILABLE_MODELS.get(model_name.lower(), model_name)


def get_model(
    model_name: str | None = None,
    temperature: float = 0,
    max_tokens: int | None = None,
) -> ChatOpenAI:
    """Return a ChatOpenAI instance configured for OpenRouter."""
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        raise ValueError("OPENROUTER_API_KEY não encontrada nas variáveis de ambiente (.env).")

    resolved_model = resolve_model_name(model_name)
    resolved_max_tokens = max_tokens if max_tokens is not None else int(os.getenv("DEFAULT_MAX_TOKENS", str(DEFAULT_MAX_TOKENS)))

    return ChatOpenAI(
        model=resolved_model,
        api_key=api_key,
        base_url=OPENROUTER_BASE_URL,
        temperature=temperature,
        max_tokens=resolved_max_tokens,
    )


class ModelFactory:
    """Factory wrapper for creating configured OpenRouter chat models."""

    @staticmethod
    def create(
        model_name: str | None = None,
        temperature: float = 0,
        max_tokens: int | None = None,
    ) -> ChatOpenAI:
        return get_model(model_name=model_name, temperature=temperature, max_tokens=max_tokens)

    @staticmethod
    def list_models() -> list[str]:
        return list(AVAILABLE_MODELS.values())
