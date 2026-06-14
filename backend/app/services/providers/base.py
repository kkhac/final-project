"""
Provider Layer — abstract interface every LLM backend must satisfy.

The evaluation pipeline (and, in Week 3, the LLM-as-Judge module) talk only
to this interface so that adding a new model vendor is a one-file change.
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class ChatMessage:
    role: str  # "system" | "user" | "assistant"
    content: str


@dataclass
class ProviderResponse:
    text: str
    model: str
    provider: str
    raw: dict = field(default_factory=dict)


class LLMProvider(ABC):
    """Minimal contract a provider implementation must fulfil."""

    name: str = "base"

    @abstractmethod
    def complete(
        self,
        *,
        system_prompt: str,
        messages: list[ChatMessage],
        model: str,
        temperature: float = 0.0,
        max_tokens: Optional[int] = None,
    ) -> ProviderResponse:
        """Run a chat completion. Implementations may raise ProviderError."""


class ProviderError(RuntimeError):
    """Wraps any vendor-specific failure with a uniform type."""
