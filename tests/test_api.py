from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_healthz():
    response = client.get("/healthz")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}

def test_sprint_deadline_protected():
    # Should be protected
    response = client.get("/meta/sprint-deadline")
    assert response.status_code == 401

def test_unauthorized_access():
    # Trying to access protected route without token
    response = client.get("/speakers")
    assert response.status_code == 401
