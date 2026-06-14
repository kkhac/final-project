from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.test_case import TestCase, TestCaseType, ConversationStep
from app.schemas.test_case import TestCaseCreate
from app.models.evaluation import EvaluationRun


def list_test_cases(db: Session, prompt_id: int | None = None) -> list[TestCase]:
    query = db.query(TestCase)
    if prompt_id is not None:
        query = query.filter(TestCase.prompt_id == prompt_id)
    return query.order_by(TestCase.created_at.desc()).all()


def get_test_case(db: Session, test_case_id: int) -> TestCase:
    tc = db.query(TestCase).filter(TestCase.id == test_case_id).first()
    if not tc:
        raise HTTPException(status_code=404, detail="Test case not found")
    return tc


def create_test_case(db: Session, payload: TestCaseCreate) -> TestCase:
    validate_steps(payload.type, [s.step_number for s in payload.steps])

    test_case = TestCase(
        prompt_id=payload.prompt_id,
        name=payload.name,
        description=payload.description,
        type=payload.type,
        tags=payload.tags,
    )
    db.add(test_case)
    db.flush()

    for step_data in payload.steps:
        db.add(ConversationStep(
            test_case_id=test_case.id,
            step_number=step_data.step_number,
            user_message=step_data.user_message,
            expected_behavior=step_data.expected_behavior,
            expected_keywords=step_data.expected_keywords,
            expected_format_regex=step_data.expected_format_regex,
        ))

    db.commit()
    db.refresh(test_case)
    return test_case


def delete_test_case(db: Session, test_case_id: int) -> None:
    tc = get_test_case(db, test_case_id)
    db.query(EvaluationRun).filter(
        EvaluationRun.test_case_id == test_case_id
    ).delete(synchronize_session=False)
    db.delete(tc)
    db.commit()


def validate_steps(test_case_type: TestCaseType, step_numbers: list[int]) -> None:
    """
    Enforce step-ordering invariants:
      - SINGLE_TURN test cases must have exactly one step.
      - MULTI_TURN test cases must have >= 2 steps.
      - Step numbers must form a contiguous 1..N sequence with no duplicates.

    Raises HTTPException(422) on any violation so FastAPI surfaces it cleanly.
    """
    n = len(step_numbers)
    if n == 0:
        raise HTTPException(status_code=422, detail="Test case must contain at least one step")

    if test_case_type == TestCaseType.SINGLE_TURN and n != 1:
        raise HTTPException(
            status_code=422,
            detail=f"single_turn test cases must have exactly 1 step (got {n})",
        )

    if test_case_type == TestCaseType.MULTI_TURN and n < 2:
        raise HTTPException(
            status_code=422,
            detail=f"multi_turn test cases must have at least 2 steps (got {n})",
        )

    if len(set(step_numbers)) != n:
        raise HTTPException(status_code=422, detail="Duplicate step_number values are not allowed")

    expected = list(range(1, n + 1))
    if sorted(step_numbers) != expected:
        raise HTTPException(
            status_code=422,
            detail=f"step_number values must be a 1-based contiguous sequence 1..{n}, got {sorted(step_numbers)}",
        )
