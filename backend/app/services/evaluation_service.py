"""
Evaluation Service — multi-turn conversation runner.

For each step in a TestCase we append the user turn, call the LLM with the
full running message list (context passing), then append the assistant turn
so the next step sees what was said before.
"""
import re
from datetime import datetime

from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.evaluation import EvaluationRun, EvaluationResult, RunStatus
from app.services.providers import ChatMessage, ProviderError, get_provider
from app.services.judge_service import judge_response, FAILURE_THRESHOLD


def run_evaluation(run_id: int) -> None:
    """Entry point called as a background task."""
    db = SessionLocal()
    try:
        run = db.query(EvaluationRun).filter(EvaluationRun.id == run_id).first()
        if not run:
            return

        run.status = RunStatus.RUNNING
        run.started_at = datetime.utcnow()
        run.error_message = None
        db.commit()

        messages: list[ChatMessage] = []
        try:
            for step in run.test_case.steps:
                _execute_step(db, run, step, messages)
            run.status = RunStatus.COMPLETED
        except Exception as exc:
            run.status = RunStatus.FAILED
            run.error_message = f"{type(exc).__name__}: {exc}"

        run.finished_at = datetime.utcnow()
        db.commit()
    finally:
        db.close()


def _execute_step(
    db: Session,
    run: EvaluationRun,
    step,
    messages: list[ChatMessage],
) -> None:
    """Run one turn: extend context, call LLM, save result. Per-step commit."""
    messages.append(ChatMessage(role="user", content=step.user_message))

    llm = get_provider(run.model_provider)
    response = llm.complete(
        system_prompt=run.prompt_version.system_prompt,
        messages=messages,
        model=run.model_name,
    )
    llm_response = response.text

    messages.append(ChatMessage(role="assistant", content=llm_response))

    keyword_passed, format_passed, rule_details = _rule_based_check(
        response=llm_response,
        expected_keywords=step.expected_keywords or [],
        regex_pattern=step.expected_format_regex,
    )

    # LLM-as-a-Judge
    judge = judge_response(
        system_prompt=run.prompt_version.system_prompt,
        user_message=step.user_message,
        llm_response=llm_response,
        expected_behavior=step.expected_behavior,
        judge_provider="openai",
        judge_model="gpt-4o-mini",
    )

    db.add(EvaluationResult(
        run_id=run.id,
        step_number=step.step_number,
        llm_response=llm_response,
        keyword_check_passed=keyword_passed,
        format_check_passed=format_passed,
        rule_details=rule_details,
        judge_score=judge["score"],
        judge_reasoning=judge["reasoning"],
        failure_category=judge["category"] if judge["score"] < FAILURE_THRESHOLD else None,
        failure_reason=judge["reasoning"] if judge["score"] < FAILURE_THRESHOLD else None,
        score=_composite_score(keyword_passed, format_passed, judge["score"]),
    ))
    db.commit()


def _rule_based_check(
    response: str,
    expected_keywords: list[str],
    regex_pattern: str | None,
) -> tuple[bool, bool, dict]:
    """
    Deterministic checks — Barbare's module (feature/rule-based-eval).
    """
    # if the LLM returns blank, everything fails immediately
    if not response or not response.strip():
        return False, False, {
            "expected_keywords": expected_keywords,
            "matched_keywords": [],
            "missing_keywords": expected_keywords,
            "empty_response": True,
            "regex_pattern": regex_pattern,
            "regex_match": False,
        }

    matched = [kw for kw in expected_keywords if kw.lower() in response.lower()]
    missing = [kw for kw in expected_keywords if kw.lower() not in response.lower()]
    keyword_passed = len(missing) == 0

    format_passed = True
    if regex_pattern:
        format_passed = bool(re.search(regex_pattern, response))

    details = {
        "expected_keywords": expected_keywords,
        "matched_keywords": matched,
        "missing_keywords": missing,
        "empty_response": False,
        "regex_pattern": regex_pattern,
        "regex_match": format_passed,
    }
    # explicitly missing_keywords tracked instead of having to infer it

    return keyword_passed, format_passed, details


def _composite_score(keyword: bool | None, format_ok: bool | None, judge: float | None) -> float:
    scores = []
    if keyword is not None:
        scores.append(1.0 if keyword else 0.0)
    if format_ok is not None:
        scores.append(1.0 if format_ok else 0.0)
    if judge is not None:
        scores.append(judge)
    return sum(scores) / len(scores) if scores else 0.0
