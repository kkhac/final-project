"""
Tests that LLM-as-a-Judge is wired into _execute_step and its output
is correctly persisted in EvaluationResult.
"""
from unittest.mock import MagicMock, patch

import pytest

from app.models.evaluation import EvaluationResult, EvaluationRun, RunStatus
from app.models.test_case import ConversationStep, TestCase, TestCaseType
from app.services.evaluation_service import run_evaluation
from app.services.judge_service import FAILURE_THRESHOLD


# ---------------------------------------------------------------------------
# Shared mock values
# ---------------------------------------------------------------------------

MOCK_LLM_TEXT = "Here are some helpful tips: be clear, be concise, be kind."

MOCK_JUDGE_PASS = {
    "score": 0.9,
    "category": "correct",
    "reasoning": "Response is accurate and follows all instructions.",
    "raw_output": "SCORE: 0.9\nCATEGORY: correct\nREASONING: Accurate.",
}

MOCK_JUDGE_FAIL = {
    "score": 0.2,
    "category": "incomplete",
    "reasoning": "Response is missing key requested information.",
    "raw_output": "SCORE: 0.2\nCATEGORY: incomplete\nREASONING: Missing info.",
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_test_case(db_session, prompt) -> TestCase:
    tc = TestCase(
        prompt_id=prompt.id,
        name="Judge wiring test case",
        type=TestCaseType.SINGLE_TURN,
        tags=[],
    )
    db_session.add(tc)
    db_session.flush()

    step = ConversationStep(
        test_case_id=tc.id,
        step_number=1,
        user_message="Give me three productivity tips.",
        expected_behavior="Should list productivity tips.",
        expected_keywords=["tips"],
        expected_format_regex=None,
    )
    db_session.add(step)
    db_session.commit()
    db_session.refresh(tc)
    return tc


def _make_run(db_session, prompt, test_case) -> EvaluationRun:
    from app.models.prompt import PromptVersion
    # Ensure the prompt has at least one version
    if not prompt.versions:
        version = PromptVersion(
            prompt_id=prompt.id,
            version_number=1,
            system_prompt="You are a helpful assistant.",
            notes="test version",
        )
        db_session.add(version)
        db_session.commit()
        db_session.refresh(prompt)
    version = prompt.versions[0]
    run = EvaluationRun(
        prompt_version_id=version.id,
        test_case_id=test_case.id,
        model_provider="openai",
        model_name="gpt-4o-mini",
        status=RunStatus.PENDING,
    )
    db_session.add(run)
    db_session.commit()
    db_session.refresh(run)
    return run


def _mock_provider(llm_text: str):
    """Return a mock provider whose .complete() returns llm_text."""
    mock_resp = MagicMock()
    mock_resp.text = llm_text
    mock_provider = MagicMock()
    mock_provider.complete.return_value = mock_resp
    return mock_provider


def _no_close(db_session):
    wrapped = MagicMock(wraps=db_session)
    wrapped.close = MagicMock(return_value=None)
    return wrapped


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

def test_judge_score_stored_on_passing_response(db_session, prompt):
    """A good response gets a high judge score; failure fields stay None."""
    tc = _make_test_case(db_session, prompt)
    run = _make_run(db_session, prompt, tc)

    with (
        patch(
            "app.services.evaluation_service.get_provider",
            return_value=_mock_provider(MOCK_LLM_TEXT),
        ),
        patch(
            "app.services.evaluation_service.judge_response",
            return_value=MOCK_JUDGE_PASS,
        ),
        patch(
            "app.services.evaluation_service.SessionLocal",
            return_value=_no_close(db_session),
        ),
    ):
        run_evaluation(run.id)

    db_session.refresh(run)
    assert run.status == RunStatus.COMPLETED

    result: EvaluationResult = run.results[0]
    assert result.judge_score == pytest.approx(0.9)
    assert result.judge_reasoning == MOCK_JUDGE_PASS["reasoning"]
    assert result.failure_category is None
    assert result.failure_reason is None
    assert result.score is not None
    assert 0.0 <= result.score <= 1.0


def test_judge_failure_fields_set_on_low_score(db_session, prompt):
    """A poor response populates failure_category and failure_reason."""
    tc = _make_test_case(db_session, prompt)
    run = _make_run(db_session, prompt, tc)

    with (
        patch(
            "app.services.evaluation_service.get_provider",
            return_value=_mock_provider(MOCK_LLM_TEXT),
        ),
        patch(
            "app.services.evaluation_service.judge_response",
            return_value=MOCK_JUDGE_FAIL,
        ),
        patch(
            "app.services.evaluation_service.SessionLocal",
            return_value=_no_close(db_session),
        ),
    ):
        run_evaluation(run.id)

    db_session.refresh(run)
    result: EvaluationResult = run.results[0]

    assert result.judge_score == pytest.approx(0.2)
    assert result.failure_category == "incomplete"
    assert result.failure_reason == MOCK_JUDGE_FAIL["reasoning"]


def test_composite_score_includes_judge(db_session, prompt):
    """score = average(keyword_check, format_check, judge_score)."""
    tc = _make_test_case(db_session, prompt)
    run = _make_run(db_session, prompt, tc)

    with (
        patch(
            "app.services.evaluation_service.get_provider",
            return_value=_mock_provider(MOCK_LLM_TEXT),
        ),
        patch(
            "app.services.evaluation_service.judge_response",
            return_value=MOCK_JUDGE_PASS,
        ),
        patch(
            "app.services.evaluation_service.SessionLocal",
            return_value=_no_close(db_session),
        ),
    ):
        run_evaluation(run.id)

    db_session.refresh(run)
    result = run.results[0]

    # keyword "tips" is present → keyword_check = 1.0
    # no regex → format_check = 1.0
    # judge = 0.9
    # composite = (1.0 + 1.0 + 0.9) / 3 ≈ 0.967
    assert result.score == pytest.approx((1.0 + 1.0 + 0.9) / 3, abs=0.01)


def test_judge_unavailable_does_not_crash_run(db_session, prompt):
    """If judge fails it returns score=0.5; run still completes."""
    tc = _make_test_case(db_session, prompt)
    run = _make_run(db_session, prompt, tc)

    judge_unavailable = {
        "score": 0.5,
        "category": "judge_unavailable",
        "reasoning": "Judge could not be reached: connection error",
        "raw_output": "",
    }

    with (
        patch(
            "app.services.evaluation_service.get_provider",
            return_value=_mock_provider(MOCK_LLM_TEXT),
        ),
        patch(
            "app.services.evaluation_service.judge_response",
            return_value=judge_unavailable,
        ),
        patch(
            "app.services.evaluation_service.SessionLocal",
            return_value=_no_close(db_session),
        ),
    ):
        run_evaluation(run.id)

    db_session.refresh(run)
    assert run.status == RunStatus.COMPLETED
    assert run.results[0].judge_score == pytest.approx(0.5)