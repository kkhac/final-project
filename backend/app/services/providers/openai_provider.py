"""OpenAI implementation of the LLMProvider contract."""
from typing import Optional

from app.config import settings
from app.services.providers.base import (
    ChatMessage,
    LLMProvider,
    ProviderError,
    ProviderResponse,
)


class OpenAIProvider(LLMProvider):
    name = "openai"

    def __init__(self, api_key: Optional[str] = None):
        self._api_key = api_key or settings.openai_api_key
        self._client = None  # lazy — avoids requiring the key at import time

    def _get_client(self):
        if self._client is not None:
            return self._client
        if not self._api_key:
            raise ProviderError("OPENAI_API_KEY is not set")
        try:
            from openai import OpenAI
        except ImportError as exc:
            raise ProviderError("openai package is not installed") from exc
        self._client = OpenAI(api_key=self._api_key)
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

        payload = [{"role": "system", "content": system_prompt}]
        payload.extend({"role": m.role, "content": m.content} for m in messages)

        try:
            resp = client.chat.completions.create(
                model=model,
                messages=payload,
                temperature=temperature,
                max_tokens=max_tokens,
            )
        except Exception as exc:
            raise ProviderError(f"OpenAI request failed: {exc}") from exc

        text = resp.choices[0].message.content or ""
        return ProviderResponse(
            text=text,
            model=model,
            provider=self.name,
            raw={"id": resp.id, "usage": resp.usage.model_dump() if resp.usage else {}},
        )
