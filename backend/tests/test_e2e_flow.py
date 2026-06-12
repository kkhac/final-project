"""
End-to-end integration tests — exercise the full HTTP flow without hitting
real LLM APIs.

  POST /prompts  →  POST /test-cases  →  POST /evaluations
  → run_evaluation() (synchronous, LLM+judge mocked)
  → GET /evaluations/{id}  → assert results persisted correctly
"""
from unittest.mock import MagicMock, patch

import pytest


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _no_close(db_session):
    """Prevent run_evaluation's finally db.close() from killing the test session."""
    wrapped = MagicMock(wraps=db_session)
    wrapped.close = MagicMock(return_value=None)
    return wrapped


def _mock_provider(text: str):
    mock_resp = MagicMock()
    mock_resp.text = text
    mock_prov = MagicMock()
    mock_prov.complete.return_value = mock_resp
    return mock_prov


def _run_with_mocks(run_id, db_session, llm_text: str, judge_score: float):
    judge_payload = {
        "score": judge_score,
        "category": "correct" if judge_score >= 0.5 else "incomplete",
        "reasoning": "Mocked judge reasoning.",
        "raw_output": "",
    }
    with (
        patch(
            "app.services.evaluation_service.get_provider",
            return_value=_mock_provider(llm_text),
        ),
        patch(
            "app.services.evaluation_service.judge_response",
            return_value=judge_payload,
        ),
        patch(
            "app.services.evaluation_service.SessionLocal",
            return_value=_no_close(db_session),
        ),
    ):
        from app.services.evaluation_service import run_evaluation
        run_evaluation(run_id)


# ---------------------------------------------------------------------------
# E2E Tests
# ---------------------------------------------------------------------------

def test_full_single_turn_flow(client, db_session):
    """
    Full happy-path: prompt → scenario → run → completed with scores.
    """
    # 1. Create prompt (auto-creates version 1)
    r = client.post("/prompts/", json={
        "name": "E2E Greeter",
        "description": "Integration test prompt",
        "system_prompt": "You are a friendly assistant. Always greet the user.",
    })
    assert r.status_code == 201
    prompt_data = r.json()
    version_id = prompt_data["versions"][0]["id"]
    prompt_id = prompt_data["id"]

    # 2. Create single-turn test case
    r = client.post("/test-cases/", json={
        "prompt_id": prompt_id,
        "name": "Greeting check",
        "type": "single_turn",
        "tags": [],
        "steps": [{
            "step_number": 1,
            "user_message": "Hello!",
            "expected_behavior": "Should respond with a greeting.",
            "expected_keywords": ["hello"],
            "expected_format_regex": None,
        }],
    })
    assert r.status_code == 201
    tc_id = r.json()["id"]

    # 3. Trigger evaluation
    r = client.post("/evaluations/", json={
        "prompt_version_id": version_id,
        "test_case_id": tc_id,
        "model_provider": "openai",
        "model_name": "gpt-4o-mini",
    })
    assert r.status_code == 201
    run_id = r.json()["id"]
    assert r.json()["status"] == "pending"

    # 4. Run synchronously (mocked)
    _run_with_mocks(run_id, db_session, "Hello! How can I help you today?", 0.9)

    # 5. Assert final state via API
    r = client.get(f"/evaluations/{run_id}")
    assert r.status_code == 200
    run = r.json()

    assert run["status"] == "completed"
    assert run["overall_score"] is not None
    assert 0.0 <= run["overall_score"] <= 1.0
    assert len(run["results"]) == 1

    result = run["results"][0]
    assert result["step_number"] == 1
    assert result["llm_response"] == "Hello! How can I help you today?"
    assert result["keyword_check_passed"] is True   # "hello" present
    assert result["judge_score"] == pytest.approx(0.9)
    assert result["judge_reasoning"] == "Mocked judge reasoning."
    assert result["failure_category"] is None
    assert result["failure_reason"] is None


def test_failure_fields_populated_on_low_score(client, db_session):
    """
    When judge score < FAILURE_THRESHOLD, failure_category and
    failure_reason must be persisted.
    """
    r = client.post("/prompts/", json={
        "name": "E2E Failure Prompt",
        "system_prompt": "You are a helpful assistant.",
    })
    assert r.status_code == 201
    version_id = r.json()["versions"][0]["id"]
    prompt_id = r.json()["id"]

    r = client.post("/test-cases/", json={
        "prompt_id": prompt_id,
        "name": "Failure scenario",
        "type": "single_turn",
        "tags": [],
        "steps": [{
            "step_number": 1,
            "user_message": "Explain quantum computing.",
            "expected_behavior": "Should explain clearly.",
            "expected_keywords": ["quantum"],
            "expected_format_regex": None,
        }],
    })
    tc_id = r.json()["id"]

    r = client.post("/evaluations/", json={
        "prompt_version_id": version_id,
        "test_case_id": tc_id,
        "model_provider": "openai",
        "model_name": "gpt-4o-mini",
    })
    run_id = r.json()["id"]

    # Low judge score → triggers failure fields
    _run_with_mocks(run_id, db_session, "I don't know.", 0.2)

    r = client.get(f"/evaluations/{run_id}")
    run = r.json()
    assert run["status"] == "completed"

    result = run["results"][0]
    assert result["judge_score"] == pytest.approx(0.2)
    assert result["failure_category"] is not None
    assert result["failure_reason"] is not None
    assert result["keyword_check_passed"] is False   # "quantum" not in response


def test_multi_turn_flow(client, db_session):
    """
    Multi-turn scenario: two steps both get results, context is carried.
    """
    r = client.post("/prompts/", json={
        "name": "E2E Multi-turn Prompt",
        "system_prompt": "You are a helpful assistant.",
    })
    version_id = r.json()["versions"][0]["id"]
    prompt_id = r.json()["id"]

    r = client.post("/test-cases/", json={
        "prompt_id": prompt_id,
        "name": "Two-step conversation",
        "type": "multi_turn",
        "tags": [],
        "steps": [
            {
                "step_number": 1,
                "user_message": "My name is Alice.",
                "expected_behavior": "Should acknowledge the name.",
                "expected_keywords": [],
                "expected_format_regex": None,
            },
            {
                "step_number": 2,
                "user_message": "What is my name?",
                "expected_behavior": "Should recall Alice.",
                "expected_keywords": ["alice"],
                "expected_format_regex": None,
            },
        ],
    })
    tc_id = r.json()["id"]

    r = client.post("/evaluations/", json={
        "prompt_version_id": version_id,
        "test_case_id": tc_id,
        "model_provider": "openai",
        "model_name": "gpt-4o-mini",
    })
    run_id = r.json()["id"]

    _run_with_mocks(run_id, db_session, "Your name is Alice!", 0.95)

    r = client.get(f"/evaluations/{run_id}")
    run = r.json()
    assert run["status"] == "completed"
    assert len(run["results"]) == 2

    steps = sorted(run["results"], key=lambda x: x["step_number"])
    assert steps[0]["step_number"] == 1
    assert steps[1]["step_number"] == 2
    assert steps[1]["keyword_check_passed"] is True   # "alice" present


def test_run_list_endpoint_returns_new_run(client, db_session):
    """GET /evaluations/ reflects newly created runs."""
    r = client.post("/prompts/", json={
        "name": "List test prompt",
        "system_prompt": "You are helpful.",
    })
    version_id = r.json()["versions"][0]["id"]
    prompt_id = r.json()["id"]

    r = client.post("/test-cases/", json={
        "prompt_id": prompt_id,
        "name": "List scenario",
        "type": "single_turn",
        "tags": [],
        "steps": [{
            "step_number": 1,
            "user_message": "Hi",
            "expected_behavior": "Greet",
            "expected_keywords": [],
            "expected_format_regex": None,
        }],
    })
    tc_id = r.json()["id"]

    r = client.post("/evaluations/", json={
        "prompt_version_id": version_id,
        "test_case_id": tc_id,
        "model_provider": "ollama",
        "model_name": "llama3",
    })
    run_id = r.json()["id"]

    runs = client.get("/evaluations/").json()
    ids = [run["id"] for run in runs]
    assert run_id in ids
