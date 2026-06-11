"""Essential tests for the provider layer: factory + the two concrete providers."""
from types import SimpleNamespace

import pytest

from app.services.providers import ChatMessage, ProviderError, get_provider
from app.services.providers.anthropic_provider import AnthropicProvider
from app.services.providers.openai_provider import OpenAIProvider


# ---- factory --------------------------------------------------------------

def test_get_provider_returns_concrete_instances():
    assert isinstance(get_provider("openai"), OpenAIProvider)
    assert isinstance(get_provider("  ANTHROPIC "), AnthropicProvider)


def test_get_provider_unknown_raises():
    with pytest.raises(ProviderError):
        get_provider("cohere")


# ---- OpenAIProvider -------------------------------------------------------

def _fake_openai_client(text="hello", raise_exc=None):
    usage = SimpleNamespace(model_dump=lambda: {})
    response = SimpleNamespace(
        id="r1",
        usage=usage,
        choices=[SimpleNamespace(message=SimpleNamespace(content=text))],
    )

    class _Completions:
        def create(self, **kwargs):
            if raise_exc:
                raise raise_exc
            return response

    return SimpleNamespace(chat=SimpleNamespace(completions=_Completions()))


def test_openai_happy_path():
    p = OpenAIProvider(api_key="sk-test")
    p._client = _fake_openai_client(text="hi")
    resp = p.complete(
        system_prompt="be nice",
        messages=[ChatMessage(role="user", content="ping")],
        model="gpt-4o-mini",
    )
    assert resp.text == "hi"
    assert resp.provider == "openai"


def test_openai_wraps_vendor_error():
    p = OpenAIProvider(api_key="sk-test")
    p._client = _fake_openai_client(raise_exc=RuntimeError("boom"))
    with pytest.raises(ProviderError, match="OpenAI"):
        p.complete(
            system_prompt="s",
            messages=[ChatMessage(role="user", content="x")],
            model="m",
        )


# ---- AnthropicProvider ----------------------------------------------------

def _fake_anthropic_client(text="hello", raise_exc=None):
    usage = SimpleNamespace(model_dump=lambda: {})
    response = SimpleNamespace(
        id="m1",
        usage=usage,
        content=[SimpleNamespace(type="text", text=text)],
    )

    class _Messages:
        def create(self, **kwargs):
            if raise_exc:
                raise raise_exc
            return response

    return SimpleNamespace(messages=_Messages())


def test_anthropic_happy_path():
    p = AnthropicProvider(api_key="sk-test")
    p._client = _fake_anthropic_client(text="hi")
    resp = p.complete(
        system_prompt="be nice",
        messages=[ChatMessage(role="user", content="ping")],
        model="claude-3-5-sonnet",
    )
    assert resp.text == "hi"
    assert resp.provider == "anthropic"


def test_anthropic_wraps_vendor_error():
    p = AnthropicProvider(api_key="sk-test")
    p._client = _fake_anthropic_client(raise_exc=RuntimeError("boom"))
    with pytest.raises(ProviderError, match="Anthropic"):
        p.complete(
            system_prompt="s",
            messages=[ChatMessage(role="user", content="x")],
            model="m",
        )
