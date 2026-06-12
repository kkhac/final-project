"""Tests for the multi-turn conversation runner (context passing + failure path)."""
import copy

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models.evaluation import EvaluationResult, EvaluationRun, RunStatus
from app.models.prompt import Prompt, PromptVersion
from app.models.test_case import ConversationStep, TestCase, TestCaseType
from app.services.providers import ChatMessage, ProviderError, ProviderResponse


engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
TestingSession = sessionmaker(bind=engine)


@pytest.fixture(autouse=True)
def db(monkeypatch):
    Base.metadata.create_all(engine)

    # run_evaluation opens its own session via SessionLocal — point it at the test engine.
    monkeypatch.setattr(
        "app.services.evaluation_service.SessionLocal",
        TestingSession,
    )

    session = TestingSession()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(engine)


def _seed_run(db, user_messages: list[str]) -> EvaluationRun:
    prompt = Prompt(name="Greeter")
    db.add(prompt)
    db.flush()

    version = PromptVersion(
        prompt_id=prompt.id, version_number=1, system_prompt="You are helpful."
    )
    db.add(version)
    db.flush()

    tc = TestCase(prompt_id=prompt.id, name="Chat", type=TestCaseType.MULTI_TURN)
    db.add(tc)
    db.flush()

    for i, msg in enumerate(user_messages, start=1):
        db.add(ConversationStep(
            test_case_id=tc.id, step_number=i, user_message=msg, expected_keywords=[]
        ))

    run = EvaluationRun(
        prompt_version_id=version.id,
        test_case_id=tc.id,
        model_provider="openai",
        model_name="gpt-test",
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    return run


class _RecordingProvider:
    """Captures a deep copy of `messages` on every call so we can assert it grew."""

    def __init__(self, replies: list[str], raise_on_step: int | None = None):
        self.replies = replies
        self.raise_on_step = raise_on_step
        self.calls: list[list[ChatMessage]] = []

    def complete(self, *, system_prompt, messages, model, **kwargs):
        step_index = len(self.calls)  # 0-based
        self.calls.append(copy.deepcopy(messages))
        if self.raise_on_step is not None and step_index == self.raise_on_step:
            raise ProviderError("simulated upstream failure")
        return ProviderResponse(
            text=self.replies[step_index], model=model, provider="fake"
        )


def test_messages_list_grows_each_step(db, monkeypatch):
    """Each step must receive the full conversation history (user + assistant turns)."""
    run = _seed_run(db, ["hi I am Keti", "what is my name?", "say bye"])
    fake = _RecordingProvider(replies=["hello Keti", "your name is Keti", "bye Keti"])
    monkeypatch.setattr(
        "app.services.evaluation_service.get_provider", lambda _name: fake
    )

    from app.services.evaluation_service import run_evaluation
    run_evaluation(run.id)

    assert len(fake.calls) == 3

    # Step 1: 1 message (just the first user turn)
    assert [m.role for m in fake.calls[0]] == ["user"]
    assert fake.calls[0][-1].content == "hi I am Keti"

    # Step 2: 3 messages (user, assistant, user)
    assert [m.role for m in fake.calls[1]] == ["user", "assistant", "user"]
    assert fake.calls[1][1].content == "hello Keti"
    assert fake.calls[1][-1].content == "what is my name?"

    # Step 3: 5 messages
    assert [m.role for m in fake.calls[2]] == [
        "user", "assistant", "user", "assistant", "user"
    ]
    assert fake.calls[2][-1].content == "say bye"

    db.expire_all()
    reloaded = db.get(EvaluationRun, run.id)
    assert reloaded.status == RunStatus.COMPLETED
    assert reloaded.error_message is None
    assert db.query(EvaluationResult).filter_by(run_id=run.id).count() == 3


def test_provider_error_marks_run_failed_with_message(db, monkeypatch):
    """Exception on step 2 → status=FAILED, error_message set, step 3 never runs."""
    run = _seed_run(db, ["hi", "boom", "never reached"])
    fake = _RecordingProvider(replies=["ok", "ok", "ok"], raise_on_step=1)  # 0-based: step 2
    monkeypatch.setattr(
        "app.services.evaluation_service.get_provider", lambda _name: fake
    )

    from app.services.evaluation_service import run_evaluation
    run_evaluation(run.id)

    db.expire_all()
    reloaded = db.get(EvaluationRun, run.id)
    assert reloaded.status == RunStatus.FAILED
    assert reloaded.error_message is not None
    assert reloaded.error_message.startswith("ProviderError:")
    assert "simulated upstream failure" in reloaded.error_message
    assert reloaded.finished_at is not None

    # Only step 1's result was persisted; step 3 never ran.
    assert db.query(EvaluationResult).filter_by(run_id=run.id).count() == 1
    assert len(fake.calls) == 2
