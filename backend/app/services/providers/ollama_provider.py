"""Ollama implementation — talks to a locally-running Ollama server."""
from typing import Optional

from app.services.providers.base import (
    ChatMessage,
    LLMProvider,
    ProviderError,
    ProviderResponse,
)


class OllamaProvider(LLMProvider):
    name = "ollama"

    def __init__(self):
        from app.config import settings
        self._base_url = settings.ollama_base_url.rstrip("/")

    def complete(
        self,
        *,
        system_prompt: str,
        messages: list[ChatMessage],
        model: str,
        temperature: float = 0.0,
        max_tokens: Optional[int] = None,
    ) -> ProviderResponse:
        import requests as _req

        payload: dict = {
            "model": model,
            "messages": [{"role": "system", "content": system_prompt}]
            + [{"role": m.role, "content": m.content} for m in messages],
            "stream": False,
            "options": {"temperature": temperature},
        }
        if max_tokens:
            payload["options"]["num_predict"] = max_tokens

        try:
            resp = _req.post(
                f"{self._base_url}/api/chat",
                json=payload,
                timeout=120,
            )
            resp.raise_for_status()
            data = resp.json()
        except Exception as exc:
            raise ProviderError(f"Ollama request failed: {exc}") from exc

        text = data.get("message", {}).get("content", "")
        return ProviderResponse(
            text=text,
            model=model,
            provider=self.name,
            raw=data,
        )
