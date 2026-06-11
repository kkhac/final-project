"""HTTP-level tests for the /test-cases router."""


def _body(prompt_id, steps, type_="single_turn"):
    return {
        "prompt_id": prompt_id,
        "name": "scenario",
        "type": type_,
        "tags": ["smoke"],
        "steps": steps,
    }


def test_create_and_get_scenario(client, prompt):
    resp = client.post(
        "/test-cases/",
        json=_body(prompt.id, [{"step_number": 1, "user_message": "hello"}]),
    )
    assert resp.status_code == 201
    created = resp.json()
    assert created["prompt_id"] == prompt.id
    assert len(created["steps"]) == 1

    got = client.get(f"/test-cases/{created['id']}")
    assert got.status_code == 200
    assert got.json()["id"] == created["id"]


def test_create_rejects_invalid_step_sequence(client, prompt):
    resp = client.post(
        "/test-cases/",
        json=_body(
            prompt.id,
            [{"step_number": 1, "user_message": "a"}, {"step_number": 3, "user_message": "b"}],
            type_="multi_turn",
        ),
    )
    assert resp.status_code == 422


def test_create_single_turn_rejects_multiple_steps(client, prompt):
    resp = client.post(
        "/test-cases/",
        json=_body(
            prompt.id,
            [{"step_number": 1, "user_message": "a"}, {"step_number": 2, "user_message": "b"}],
            type_="single_turn",
        ),
    )
    assert resp.status_code == 422


def test_list_filters_by_prompt_id(client, prompt):
    client.post(
        "/test-cases/",
        json=_body(prompt.id, [{"step_number": 1, "user_message": "x"}]),
    )
    in_scope = client.get(f"/test-cases/?prompt_id={prompt.id}").json()
    out_of_scope = client.get(f"/test-cases/?prompt_id={prompt.id + 999}").json()
    assert len(in_scope) == 1
    assert out_of_scope == []


def test_get_missing_scenario_returns_404(client):
    assert client.get("/test-cases/9999").status_code == 404


def test_delete_scenario_returns_204_and_removes_it(client, prompt):
    created = client.post(
        "/test-cases/",
        json=_body(prompt.id, [{"step_number": 1, "user_message": "x"}]),
    ).json()
    assert client.delete(f"/test-cases/{created['id']}").status_code == 204
    assert client.get(f"/test-cases/{created['id']}").status_code == 404
