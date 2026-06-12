"""Unit tests for judge_service — no real API calls needed."""
import pytest
from unittest.mock import MagicMock, patch

from app.services.judge_service import (
    _parse_judge_output,
    is_regression,
    judge_response,
    FAILURE_THRESHOLD,
)


# _parse_judge_output

def test_parse_perfect_score():
    raw = "SCORE: 1.0\nCATEGORY: correct\nREASONING: Response is accurate and complete."
    result = _parse_judge_output(raw)
    assert result["score"] == 1.0
    assert result["category"] == "correct"
    assert "accurate" in result["reasoning"]


def test_parse_zero_score():
    raw = "SCORE: 0.0\nCATEGORY: hallucination\nREASONING: Completely made up facts."
    result = _parse_judge_output(raw)
    assert result["score"] == 0.0
    assert result["category"] == "hallucination"


def test_parse_clamps_score_above_1():
    raw = "SCORE: 1.5\nCATEGORY: correct\nREASONING: Too good."
    result = _parse_judge_output(raw)
    assert result["score"] == 1.0


def test_parse_clamps_score_below_0():
    raw = "SCORE: -0.5\nCATEGORY: off_topic\nREASONING: Way off."
    result = _parse_judge_output(raw)
    assert result["score"] == 0.0


def test_parse_missing_fields_returns_safe_defaults():
    raw = "I cannot evaluate this."
    result = _parse_judge_output(raw)
    assert result["score"] == 0.5
    assert result["category"] == "unknown"
    assert len(result["reasoning"]) > 0


def test_parse_case_insensitive_category():
    raw = "SCORE: 0.8\nCATEGORY: FORMAT_ERROR\nREASONING: Minor issue."
    result = _parse_judge_output(raw)
    assert result["category"] == "format_error"


# is_regression

def test_is_regression_true_when_drop_exceeds_threshold():
    assert is_regression(old_score=0.9, new_score=0.7) is True


def test_is_regression_false_when_drop_small():
    assert is_regression(old_score=0.9, new_score=0.85) is False


def test_is_regression_false_when_score_improved():
    assert is_regression(old_score=0.7, new_score=0.9) is False


def test_is_regression_custom_threshold():
    assert is_regression(old_score=0.8, new_score=0.75, threshold=0.03) is True


# judge_response (mocked provider)

def _mock_provider(text: str):
    """Returns a get_provider mock that returns the given text."""
    resp = MagicMock()
    resp.text = text
    provider = MagicMock()
    provider.complete.return_value = resp
    return provider


def test_judge_response_happy_path():
    judge_text = "SCORE: 0.9\nCATEGORY: correct\nREASONING: Looks good."
    with patch("app.services.judge_service.get_provider", return_value=_mock_provider(judge_text)):
        result = judge_response(
            system_prompt="Be helpful.",
            user_message="What is 2+2?",
            llm_response="4",
            expected_behavior="Should answer 4",
        )
    assert result["score"] == 0.9
    assert result["category"] == "correct"


def test_judge_response_failure_below_threshold():
    judge_text = "SCORE: 0.2\nCATEGORY: hallucination\nREASONING: Made up answer."
    with patch("app.services.judge_service.get_provider", return_value=_mock_provider(judge_text)):
        result = judge_response(
            system_prompt="Be helpful.",
            user_message="Capital of France?",
            llm_response="London",
        )
    assert result["score"] < FAILURE_THRESHOLD
    assert result["category"] == "hallucination"


def test_judge_response_returns_safe_default_on_provider_error():
    from app.services.providers import ProviderError
    with patch("app.services.judge_service.get_provider", side_effect=ProviderError("no key")):
        result = judge_response(
            system_prompt="s",
            user_message="u",
            llm_response="r",
        )
    assert result["score"] == 0.5
    assert result["category"] == "judge_unavailable"