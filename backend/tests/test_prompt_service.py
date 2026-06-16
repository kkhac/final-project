import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base
from app.services import prompt_service
from app.schemas.prompt import PromptCreate, PromptUpdate, PromptVersionCreate

engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine)

@pytest.fixture(autouse=True)
def db():
    Base.metadata.create_all(engine)
    session = SessionLocal()
    yield session
    session.close()
    Base.metadata.drop_all(engine)

def test_create_prompt_makes_initial_version(db):
    p = prompt_service.create_prompt(db, PromptCreate(name="T", system_prompt="Hello"))
    assert len(p.versions) == 1
    assert p.versions[0].version_number == 1
    assert p.versions[0].notes == "Initial version"

def test_list_prompts(db):
    prompt_service.create_prompt(db, PromptCreate(name="A", system_prompt="A"))
    prompt_service.create_prompt(db, PromptCreate(name="B", system_prompt="B"))
    results = prompt_service.list_prompts(db)
    assert len(results) == 2

def test_update_prompt(db):
    p = prompt_service.create_prompt(db, PromptCreate(name="Old", system_prompt="x"))
    updated = prompt_service.update_prompt(db, p.id, PromptUpdate(name="New"))
    assert updated.name == "New"

def test_add_version_increments_correctly(db):
    p = prompt_service.create_prompt(db, PromptCreate(name="T", system_prompt="v1"))
    v2 = prompt_service.add_version(db, p.id, PromptVersionCreate(system_prompt="v2", notes="second"))
    assert v2.version_number == 2

def test_list_versions_sorted(db):
    p = prompt_service.create_prompt(db, PromptCreate(name="T", system_prompt="v1"))
    prompt_service.add_version(db, p.id, PromptVersionCreate(system_prompt="v2"))
    prompt_service.add_version(db, p.id, PromptVersionCreate(system_prompt="v3"))
    versions = prompt_service.list_versions(db, p.id)
    assert [v.version_number for v in versions] == [1, 2, 3]

def test_delete_prompt(db):
    from fastapi import HTTPException
    p = prompt_service.create_prompt(db, PromptCreate(name="T", system_prompt="x"))
    prompt_service.delete_prompt(db, p.id)
    with pytest.raises(HTTPException) as exc:
        prompt_service.get_prompt_or_404(db, p.id)
    assert exc.value.status_code == 404

def test_get_version_or_404(db):
    from fastapi import HTTPException
    p = prompt_service.create_prompt(db, PromptCreate(name="T", system_prompt="x"))
    with pytest.raises(HTTPException):
        prompt_service.get_version_or_404(db, p.id, 9999)