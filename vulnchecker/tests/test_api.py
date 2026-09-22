import pytest
from fastapi.testclient import TestClient
from vulnchecker.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

def test_register():
    response = client.post("/api/auth/register", json={
        "email": "test@example.com",
        "password": "testpassword123"
    })
    assert response.status_code == 200
    data = response.json()
    assert "token" in data
    assert "user_id" in data

def test_login():
    # First register
    client.post("/api/auth/register", json={
        "email": "login@example.com",
        "password": "testpassword123"
    })
    
    # Then login
    response = client.post("/api/auth/login", json={
        "email": "login@example.com",
        "password": "testpassword123"
    })
    assert response.status_code == 200
    data = response.json()
    assert "token" in data

def test_anonymous_login():
    response = client.post("/api/auth/anonymous")
    assert response.status_code == 200
    data = response.json()
    assert "token" in data
    assert data["is_anonymous"] == True

def test_invalid_login():
    response = client.post("/api/auth/login", json={
        "email": "nonexistent@example.com",
        "password": "wrongpassword"
    })
    assert response.status_code == 401

def test_duplicate_register():
    email = "duplicate@example.com"
    # Register once
    client.post("/api/auth/register", json={
        "email": email,
        "password": "testpassword123"
    })
    
    # Try to register again
    response = client.post("/api/auth/register", json={
        "email": email,
        "password": "testpassword123"
    })
    assert response.status_code == 409
