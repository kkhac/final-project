"""Anthropic (Claude) implementation of the LLMProvider contract."""
from typing import Optional

from app.config import settings
from app.services.providers.base import (
    ChatMessage,
    LLMProvider,
    ProviderError,
    ProviderResponse,
)

try:
    from anthropic import Anthropic
except ImportError:  # SDK is optional at import time; checked again on first use
    Anthropic = None


class AnthropicProvider(LLMProvider):
    name = "anthropic"

    def __init__(self, api_key: Optional[str] = None):
        self._api_key = api_key or settings.anthropic_api_key
        self._client = None

    def _get_client(self):
        if self._client is not None:
            return self._client
        if not self._api_key:
            raise ProviderError("ANTHROPIC_API_KEY is not set")
        if Anthropic is None:
            raise ProviderError("anthropic package is not installed")
        self._client = Anthropic(api_key=self._api_key)
        return self._client

    def complete(
        self,
        *,
        system_prompt: str,
        messages: list[ChatMessage],
        model: str,
        temperature: float = 0.0,
        max_tokens: Optional[int] = None,
    ) -> ProviderResponse:
        client = self._get_client()

        # Anthropic separates the system prompt from the conversation list.
        formatted = [{"role": m.role, "content": m.content} for m in messages if m.role != "system"]

        try:
            resp = client.messages.create(
                model=model,
                system=system_prompt,
                messages=formatted,
                temperature=temperature,
                max_tokens=max_tokens or 1024,
            )
        except Exception as exc:
            raise ProviderError(f"Anthropic request failed: {exc}") from exc

        text = "".join(
            block.text for block in resp.content if getattr(block, "type", None) == "text"
        )
        return ProviderResponse(
            text=text,
            model=model,
            provider=self.name,
            raw={"id": resp.id, "usage": resp.usage.model_dump() if resp.usage else {}},
        )
