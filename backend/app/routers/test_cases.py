from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.test_case import TestCaseCreate, TestCaseRead
from app.services import test_case_service

router = APIRouter(prefix="/test-cases", tags=["test-cases"])


@router.get("/", response_model=List[TestCaseRead])
def list_test_cases(prompt_id: int | None = None, db: Session = Depends(get_db)):
    return test_case_service.list_test_cases(db, prompt_id=prompt_id)


@router.post("/", response_model=TestCaseRead, status_code=201)
def create_test_case(payload: TestCaseCreate, db: Session = Depends(get_db)):
    return test_case_service.create_test_case(db, payload)


@router.get("/{test_case_id}", response_model=TestCaseRead)
def get_test_case(test_case_id: int, db: Session = Depends(get_db)):
    return test_case_service.get_test_case(db, test_case_id)


@router.delete("/{test_case_id}", status_code=204)
def delete_test_case(test_case_id: int, db: Session = Depends(get_db)):
    test_case_service.delete_test_case(db, test_case_id)
