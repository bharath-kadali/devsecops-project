import os
os.environ["DATABASE_URL"] = "sqlite:///./test.db"

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db import engine, Base
from app import models  # ensure all models are registered with Base

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    """Create all tables before test session and drop them after."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
    if os.path.exists("./test.db"):
        try:
            os.remove("./test.db")
        except OSError:
            pass

client = TestClient(app)

def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "UP"}

def test_ready():
    response = client.get("/ready")
    assert response.status_code == 200
    assert response.json() == {"status": "READY"}

def test_root():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["service"] == "CloudDesk API"
    assert "version" in data
    assert "docs" in data

def test_create_ticket_success():
    payload = {
        "title": "Investigate high memory usage on auth-service pod",
        "description": "Auth service pod memory usage spiked above 85% after deployment",
        "category": "INFRASTRUCTURE",
        "priority": "HIGH",
        "status": "OPEN",
        "assignee": "SRE Oncall"
    }
    response = client.post("/api/tickets", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == payload["title"]
    assert data["category"] == "INFRASTRUCTURE"
    assert data["priority"] == "HIGH"
    assert data["status"] == "OPEN"
    assert "id" in data
    assert "created_at" in data

def test_create_ticket_validation_empty_title():
    payload = {
        "title": "",
        "category": "SECURITY",
        "priority": "LOW"
    }
    response = client.post("/api/tickets", json=payload)
    assert response.status_code == 422

def test_create_ticket_invalid_priority():
    payload = {
        "title": "Valid title",
        "priority": "CRITICAL_INVALID"
    }
    response = client.post("/api/tickets", json=payload)
    assert response.status_code == 422

def test_list_tickets():
    response = client.get("/api/tickets")
    assert response.status_code == 200
    tickets = response.json()
    assert isinstance(tickets, list)
    assert len(tickets) >= 1

def test_ticket_stats():
    response = client.get("/api/tickets/stats")
    assert response.status_code == 200
    stats = response.json()
    assert "total" in stats
    assert "open" in stats
    assert "inProgress" in stats
    assert "resolved" in stats
    assert "closed" in stats
    assert stats["total"] >= 1
    assert stats["open"] >= 1

def test_get_ticket_by_id():
    # First create a ticket to ensure known ID
    create_res = client.post("/api/tickets", json={"title": "TLS certificate expiring soon", "priority": "URGENT"})
    ticket_id = create_res.json()["id"]

    response = client.get(f"/api/tickets/{ticket_id}")
    assert response.status_code == 200
    assert response.json()["id"] == ticket_id
    assert response.json()["title"] == "TLS certificate expiring soon"

def test_get_ticket_not_found():
    response = client.get("/api/tickets/999999")
    assert response.status_code == 404
    assert response.json()["detail"] == "Ticket not found"

def test_update_ticket():
    create_res = client.post("/api/tickets", json={"title": "Rotate cluster secrets", "status": "OPEN"})
    ticket_id = create_res.json()["id"]

    update_payload = {
        "status": "IN_PROGRESS",
        "assignee": "DevSecOps Lead"
    }
    response = client.put(f"/api/tickets/{ticket_id}", json=update_payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "IN_PROGRESS"
    assert data["assignee"] == "DevSecOps Lead"
    assert data["title"] == "Rotate cluster secrets"

def test_delete_ticket():
    create_res = client.post("/api/tickets", json={"title": "Temporary testing ticket"})
    ticket_id = create_res.json()["id"]

    del_res = client.delete(f"/api/tickets/{ticket_id}")
    assert del_res.status_code == 204

    get_res = client.get(f"/api/tickets/{ticket_id}")
    assert get_res.status_code == 404
