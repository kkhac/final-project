import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base
from app.models.evaluation import EvaluationRun, EvaluationResult, RunStatus
from app.models.prompt import Prompt, PromptVersion
from app.models.test_case import TestCase
from app.services.evaluation_crud_service import (
    get_run_or_404, list_runs, list_results, get_prompt_run_history
)

engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine)


@pytest.fixture(autouse=True)
def db():
    Base.metadata.create_all(engine)
    session = SessionLocal()
    yield session
    session.close()
    Base.metadata.drop_all(engine)


def make_prompt(db, name="Test Prompt"):
    prompt = Prompt(name=name)
    db.add(prompt)
    db.flush()
    version = PromptVersion(prompt_id=prompt.id, version_number=1, system_prompt="You are helpful.")
    db.add(version)
    db.commit()
    db.refresh(prompt)
    return prompt


def make_test_case(db, prompt_id):
    tc = TestCase(prompt_id=prompt_id, name="Test case")
    db.add(tc)
    db.commit()
    db.refresh(tc)
    return tc


def make_run(db, prompt_version_id, test_case_id, status=RunStatus.COMPLETED):
    run = EvaluationRun(
        prompt_version_id=prompt_version_id,
        test_case_id=test_case_id,
        model_provider="openai",
        model_name="gpt-4o",
        status=status,
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    return run


def test_get_run_or_404_raises(db):
    from fastapi import HTTPException
    with pytest.raises(HTTPException) as exc:
        get_run_or_404(db, 9999)
    assert exc.value.status_code == 404


def test_get_run_or_404_returns_run(db):
    p = make_prompt(db)
    tc = make_test_case(db, p.id)
    run = make_run(db, p.versions[0].id, tc.id)
    found = get_run_or_404(db, run.id)
    assert found.id == run.id


def test_list_runs_filter_by_version(db):
    p = make_prompt(db)
    tc = make_test_case(db, p.id)
    run = make_run(db, p.versions[0].id, tc.id)
    results = list_runs(db, prompt_version_id=p.versions[0].id)
    assert len(results) == 1
    assert results[0].id == run.id


def test_list_runs_filter_by_status(db):
    p = make_prompt(db)
    tc = make_test_case(db, p.id)
    make_run(db, p.versions[0].id, tc.id, status=RunStatus.COMPLETED)
    make_run(db, p.versions[0].id, tc.id, status=RunStatus.FAILED)
    completed = list_runs(db, status=RunStatus.COMPLETED)
    assert len(completed) == 1
    assert completed[0].status == RunStatus.COMPLETED


def test_list_runs_filter_by_prompt_id(db):
    p = make_prompt(db)
    tc = make_test_case(db, p.id)
    make_run(db, p.versions[0].id, tc.id)
    make_run(db, p.versions[0].id, tc.id)
    results = list_runs(db, prompt_id=p.id)
    assert len(results) == 2


def test_get_prompt_run_history_across_versions(db):
    p = make_prompt(db)
    v2 = PromptVersion(prompt_id=p.id, version_number=2, system_prompt="v2")
    db.add(v2)
    db.commit()
    tc = make_test_case(db, p.id)
    make_run(db, p.versions[0].id, tc.id)
    make_run(db, v2.id, tc.id)
    history = get_prompt_run_history(db, p.id)
    assert len(history) == 2


def test_get_prompt_run_history_404(db):
    from fastapi import HTTPException
    with pytest.raises(HTTPException) as exc:
        get_prompt_run_history(db, 9999)
    assert exc.value.status_code == 404


def test_list_results_empty(db):
    p = make_prompt(db)
    tc = make_test_case(db, p.id)
    run = make_run(db, p.versions[0].id, tc.id)
    assert list_results(db, run.id) == []