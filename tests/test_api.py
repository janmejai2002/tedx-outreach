from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_healthz():
    response = client.get("/healthz")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_sprint_deadline_exists():
    # Allow 404 if not set, or 200 if set. Just ensure it doesn't crash.
    response = client.get("/meta/sprint-deadline")
    assert response.status_code in [200, 404]

def test_unauthorized_access():
    # Trying to access protected route without token
    response = client.get("/speakers")
    assert response.status_code == 403 # Or 401 depending on implementation
