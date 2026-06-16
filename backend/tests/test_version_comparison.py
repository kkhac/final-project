"""Tests for version comparison endpoint."""


def _create_version(client, prompt_id, text, notes):
    r = client.post(
        f"/prompts/{prompt_id}/versions",
        json={"system_prompt": text, "notes": notes},
    )
    assert r.status_code == 201
    return r.json()["id"]


def _get_first_version_id(client, prompt_id):
    r = client.get(f"/prompts/{prompt_id}/versions")
    assert r.status_code == 200
    versions = r.json()
    if versions:
        return versions[0]["id"]
    # fallback: create one
    return _create_version(client, prompt_id, "You are a helpful assistant.", "v1")


def test_compare_two_versions(client, prompt):
    v1_id = _get_first_version_id(client, prompt.id)
    v2_id = _create_version(client, prompt.id, "Updated: be even more helpful.", "v2")

    r = client.get(f"/prompts/{prompt.id}/versions/compare?v1={v1_id}&v2={v2_id}")
    assert r.status_code == 200
    data = r.json()
    assert data["version_a"]["id"] == v1_id
    assert data["version_b"]["id"] == v2_id


def test_compare_same_version_returns_identical(client, prompt):
    v1_id = _get_first_version_id(client, prompt.id)

    r = client.get(f"/prompts/{prompt.id}/versions/compare?v1={v1_id}&v2={v1_id}")
    assert r.status_code == 200
    data = r.json()
    assert data["version_a"]["system_prompt"] == data["version_b"]["system_prompt"]


def test_compare_wrong_prompt_returns_404(client, prompt):
    v1_id = _get_first_version_id(client, prompt.id)
    r = client.get(f"/prompts/9999/versions/compare?v1={v1_id}&v2={v1_id}")
    assert r.status_code == 404


def test_compare_wrong_version_returns_404(client, prompt):
    r = client.get(f"/prompts/{prompt.id}/versions/compare?v1=9999&v2=9998")
    assert r.status_code == 404
