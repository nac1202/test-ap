import pytest
from fastapi.testclient import TestClient

def test_get_notifications_unauthorized(client: TestClient):
    response = client.get("/api/v1/notifications")
    assert response.status_code == 401

def test_get_notifications(client: TestClient, normal_user_token_headers: dict):
    response = client.get("/api/v1/notifications", headers=normal_user_token_headers)
    assert response.status_code == 200
    data = response.json()
    assert "total" in data
    assert "items" in data

def test_unread_count(client: TestClient, normal_user_token_headers: dict):
    response = client.get("/api/v1/notifications/unread-count", headers=normal_user_token_headers)
    assert response.status_code == 200
    assert "unread_count" in response.json()

def test_read_all(client: TestClient, normal_user_token_headers: dict):
    response = client.patch("/api/v1/notifications/read-all", headers=normal_user_token_headers)
    assert response.status_code == 200
    assert response.json()["message"] == "All notifications marked as read"
