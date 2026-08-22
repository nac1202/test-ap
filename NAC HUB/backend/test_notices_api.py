import pytest
from fastapi.testclient import TestClient

def test_get_notices_unauthorized(client: TestClient):
    response = client.get("/api/v1/notices")
    assert response.status_code == 401

def test_get_notices_as_user(client: TestClient, normal_user_token_headers: dict):
    response = client.get("/api/v1/notices", headers=normal_user_token_headers)
    assert response.status_code == 200
    data = response.json()
    assert "total" in data
    assert "items" in data

def test_create_notice_as_user_forbidden(client: TestClient, normal_user_token_headers: dict):
    response = client.post(
        "/api/v1/notices",
        headers=normal_user_token_headers,
        json={"title": "Test", "body": "Body", "category": "全社"}
    )
    assert response.status_code == 403

def test_create_notice_as_admin(client: TestClient, superuser_token_headers: dict):
    response = client.post(
        "/api/v1/notices",
        headers=superuser_token_headers,
        json={"title": "Test Admin Notice", "body": "Body", "category": "全社"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Test Admin Notice"
