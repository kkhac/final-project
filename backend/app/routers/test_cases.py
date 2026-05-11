from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.test_case import TestCase, ConversationStep
from app.schemas.test_case import TestCaseCreate, TestCaseRead

router = APIRouter(prefix="/test-cases", tags=["test-cases"])


@router.get("/", response_model=List[TestCaseRead])
def list_test_cases(prompt_id: int | None = None, db: Session = Depends(get_db)):
    query = db.query(TestCase)
    if prompt_id:
        query = query.filter(TestCase.prompt_id == prompt_id)
    return query.order_by(TestCase.created_at.desc()).all()


@router.post("/", response_model=TestCaseRead, status_code=201)
def create_test_case(payload: TestCaseCreate, db: Session = Depends(get_db)):
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
        step = ConversationStep(
            test_case_id=test_case.id,
            step_number=step_data.step_number,
            user_message=step_data.user_message,
            expected_behavior=step_data.expected_behavior,
            expected_keywords=step_data.expected_keywords,
            expected_format_regex=step_data.expected_format_regex,
        )
        db.add(step)

    db.commit()
    db.refresh(test_case)
    return test_case


@router.get("/{test_case_id}", response_model=TestCaseRead)
def get_test_case(test_case_id: int, db: Session = Depends(get_db)):
    tc = db.query(TestCase).filter(TestCase.id == test_case_id).first()
    if not tc:
        raise HTTPException(status_code=404, detail="Test case not found")
    return tc


@router.delete("/{test_case_id}", status_code=204)
def delete_test_case(test_case_id: int, db: Session = Depends(get_db)):
    tc = db.query(TestCase).filter(TestCase.id == test_case_id).first()
    if not tc:
        raise HTTPException(status_code=404, detail="Test case not found")
    db.delete(tc)
    db.commit()
