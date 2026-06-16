"""Unit tests for test_case_service (validation + persistence)."""
import pytest
from fastapi import HTTPException

from app.models.test_case import TestCaseType, ConversationStep
from app.schemas.test_case import TestCaseCreate, ConversationStepCreate
from app.services import test_case_service as svc


def _step(n: int, msg: str = "hi") -> ConversationStepCreate:
    return ConversationStepCreate(step_number=n, user_message=msg)


def _payload(prompt_id: int, steps, type_=TestCaseType.SINGLE_TURN) -> TestCaseCreate:
    return TestCaseCreate(
        prompt_id=prompt_id, name="s", type=type_, steps=steps, tags=["smoke"]
    )


# ---------- validate_steps ----------

class TestValidateSteps:
    def test_empty_steps_rejected(self):
        with pytest.raises(HTTPException) as exc:
            svc.validate_steps(TestCaseType.SINGLE_TURN, [])
        assert exc.value.status_code == 422

    def test_single_turn_requires_exactly_one(self):
        svc.validate_steps(TestCaseType.SINGLE_TURN, [1])  # ok
        with pytest.raises(HTTPException) as exc:
            svc.validate_steps(TestCaseType.SINGLE_TURN, [1, 2])
        assert exc.value.status_code == 422
        assert "single_turn" in exc.value.detail

    def test_multi_turn_requires_at_least_two(self):
        svc.validate_steps(TestCaseType.MULTI_TURN, [1, 2])  # ok
        with pytest.raises(HTTPException) as exc:
            svc.validate_steps(TestCaseType.MULTI_TURN, [1])
        assert exc.value.status_code == 422
        assert "multi_turn" in exc.value.detail

    def test_duplicate_step_numbers_rejected(self):
        with pytest.raises(HTTPException) as exc:
            svc.validate_steps(TestCaseType.MULTI_TURN, [1, 1, 2])
        assert "Duplicate" in exc.value.detail

    def test_non_contiguous_sequence_rejected(self):
        with pytest.raises(HTTPException) as exc:
            svc.validate_steps(TestCaseType.MULTI_TURN, [1, 3])
        assert "contiguous" in exc.value.detail

    def test_unordered_but_contiguous_is_accepted(self):
        svc.validate_steps(TestCaseType.MULTI_TURN, [2, 1, 3])


# ---------- create / get / list / delete ----------

class TestTestCaseCrud:
    def test_create_persists_test_case_and_steps(self, db_session, prompt):
        payload = _payload(
            prompt.id,
            [_step(1, "hello"), _step(2, "bye")],
            type_=TestCaseType.MULTI_TURN,
        )
        tc = svc.create_test_case(db_session, payload)

        assert tc.id is not None
        assert tc.prompt_id == prompt.id
        assert len(tc.steps) == 2
        assert [s.step_number for s in tc.steps] == [1, 2]
        assert tc.steps[0].user_message == "hello"

    def test_create_rolls_back_when_validation_fails(self, db_session, prompt):
        payload = _payload(
            prompt.id, [_step(1), _step(1)], type_=TestCaseType.MULTI_TURN
        )
        with pytest.raises(HTTPException):
            svc.create_test_case(db_session, payload)
        assert db_session.query(ConversationStep).count() == 0

    def test_get_test_case_404(self, db_session):
        with pytest.raises(HTTPException) as exc:
            svc.get_test_case(db_session, 999)
        assert exc.value.status_code == 404

    def test_list_filters_by_prompt_and_orders_desc(self, db_session, prompt):
        a = svc.create_test_case(db_session, _payload(prompt.id, [_step(1)]))
        b = svc.create_test_case(db_session, _payload(prompt.id, [_step(1)]))
        results = svc.list_test_cases(db_session, prompt_id=prompt.id)
        assert [s.id for s in results] == [b.id, a.id]
        assert svc.list_test_cases(db_session, prompt_id=prompt.id + 1) == []

    def test_delete_cascades_steps(self, db_session, prompt):
        tc = svc.create_test_case(
            db_session,
            _payload(prompt.id, [_step(1), _step(2)], type_=TestCaseType.MULTI_TURN),
        )
        svc.delete_test_case(db_session, tc.id)
        assert db_session.query(ConversationStep).filter_by(test_case_id=tc.id).count() == 0
