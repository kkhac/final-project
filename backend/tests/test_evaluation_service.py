"""Tests for the parts of evaluation_service this branch actually changed."""
from app.services.evaluation_service import _call_llm


def test_call_llm_falls_back_to_stub_on_provider_error():
    """Unknown provider → factory raises → _call_llm returns the stub string."""
    text = _call_llm(
        provider="not-a-real-provider",
        model="x",
        system_prompt="s",
        user_message="hello",
    )
    assert text.startswith("[STUB]")
    assert "not-a-real-provider" in text
