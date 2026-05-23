from __future__ import annotations

from ..config import Settings, get_settings
from .base import AIProvider, Enrichment


def get_provider(settings: Settings | None = None) -> AIProvider:
    s = settings or get_settings()
    name = s.ai_provider
    if name == "claude":
        from .claude import ClaudeProvider

        return ClaudeProvider(api_key=s.anthropic_api_key, model=s.anthropic_model)
    if name == "gemini":
        from .gemini import GeminiProvider

        return GeminiProvider(api_key=s.gemini_api_key, model=s.gemini_model)
    if name == "perplexity":
        from .perplexity import PerplexityProvider

        return PerplexityProvider(api_key=s.perplexity_api_key, model=s.perplexity_model)
    if name == "openai":
        from .openai_provider import OpenAIProvider

        return OpenAIProvider(api_key=s.openai_api_key, model=s.openai_model)
    raise ValueError(f"Unknown AI provider: {name}")


__all__ = ["AIProvider", "Enrichment", "get_provider"]
