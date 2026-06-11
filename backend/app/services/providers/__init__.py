"""Provider Layer entry point — exposes the get_provider() factory."""
from app.services.providers.anthropic_provider import AnthropicProvider
from app.services.providers.base import (
    ChatMessage,
    LLMProvider,
    ProviderError,
    ProviderResponse,
)
from app.services.providers.openai_provider import OpenAIProvider

_REGISTRY: dict[str, type[LLMProvider]] = {
    "openai": OpenAIProvider,
    "anthropic": AnthropicProvider,
}


def get_provider(name: str) -> LLMProvider:
    key = (name or "").lower().strip()
    if key not in _REGISTRY:
        raise ProviderError(
            f"Unknown provider '{name}'. Supported: {sorted(_REGISTRY)}"
        )
    return _REGISTRY[key]()


__all__ = [
    "ChatMessage",
    "LLMProvider",
    "ProviderError",
    "ProviderResponse",
    "get_provider",
]
