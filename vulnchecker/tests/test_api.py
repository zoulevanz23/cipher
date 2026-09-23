import pytest
import uuid
from fastapi.testclient import TestClient
from vulnchecker.main import app

client = TestClient(app)

@pytest.fixture(autouse=True)
def _fresh_rate_limits():
    """The limiter is in-memory and keyed by test-client IP, so every
    test in this file shares one bucket — reset it per test."""
    from vulnchecker.account import _rate_buckets
    _rate_buckets.clear()
    yield
    _rate_buckets.clear()

def _unique(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:8]}@example.com"

def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

def test_register():
    response = client.post("/api/auth/register", json={
        "email": _unique("test"),
        "password": "testpassword123"
    })
    assert response.status_code == 200
    data = response.json()
    assert "token" in data
    assert "user_id" in data

def test_login():
    email = _unique("login")
    # First register
    client.post("/api/auth/register", json={
        "email": email,
        "password": "testpassword123"
    })
    
    # Then login
    response = client.post("/api/auth/login", json={
        "email": email,
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
    email = _unique("duplicate")
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

def _register_token(email: str) -> str:
    r = client.post("/api/auth/register", json={"email": email, "password": "testpassword123"})
    assert r.status_code == 200
    return r.json()["token"]

def test_me_includes_account_facts():
    """Registered users see member-since + lifetime scan stats."""
    token = _register_token(_unique("me"))
    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    d = me.json()
    assert d["created_at"]
    assert d["stats"] == {"scan_count": 0, "total_vulnerabilities": 0}

def test_history_entry_roundtrip_and_isolation():
    """Owner can reopen a saved scan; strangers (and strangers' tokens)
    get 404, and logged-out callers get 401."""
    token_a = _register_token(_unique("histA"))
    token_b = _register_token(_unique("histB"))
    saved = client.post(
        "/api/scan/save",
        json={"results": [], "summary": {}, "fixes": [], "project_name": "demo-proj"},
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert saved.status_code == 200
    scan_id = saved.json()["scan_id"]

    mine = client.get(f"/api/scan/history/{scan_id}", headers={"Authorization": f"Bearer {token_a}"})
    assert mine.status_code == 200
    assert mine.json()["project_name"] == "demo-proj"

    stranger = client.get(f"/api/scan/history/{scan_id}", headers={"Authorization": f"Bearer {token_b}"})
    assert stranger.status_code == 404

    logged_out = client.get(f"/api/scan/history/{scan_id}")
    assert logged_out.status_code == 401

    missing = client.get("/api/scan/history/999999999", headers={"Authorization": f"Bearer {token_a}"})
    assert missing.status_code == 404

def _mock_google(monkeypatch, claims):
    monkeypatch.setenv("CIPHER_GOOGLE_CLIENT_ID", "test-client-id")
    monkeypatch.setattr(
        "vulnchecker.main.verify_google_id_token",
        lambda token, cid: dict(claims) if cid == "test-client-id" else None,
    )

def test_google_auto_creates_account_on_first_signin(monkeypatch):
    email = _unique("guser")
    _mock_google(monkeypatch, {"email": email, "email_verified": True, "sub": "sub-1"})
    first = client.post("/api/auth/google", json={"id_token": "fake-token"})
    assert first.status_code == 200
    d1 = first.json()
    assert d1["is_new"] is True
    assert d1["email"] == email
    assert "token" in d1
    # Same Google subject signs in again: same account, not new.
    second = client.post("/api/auth/google", json={"id_token": "fake-token"})
    assert second.status_code == 200
    d2 = second.json()
    assert d2["is_new"] is False
    assert d2["user_id"] == d1["user_id"]

def test_google_links_password_account(monkeypatch):
    email = _unique("glink")
    client.post("/api/auth/register", json={"email": email, "password": "testpassword123"})
    _mock_google(monkeypatch, {"email": email, "email_verified": True, "sub": "sub-2"})
    r = client.post("/api/auth/google", json={"id_token": "fake-token"})
    assert r.status_code == 200
    assert r.json()["is_new"] is False
    # Password login still works after linking.
    login = client.post("/api/auth/login", json={"email": email, "password": "testpassword123"})
    assert login.status_code == 200

def test_google_rejects_unverified_and_bad_tokens(monkeypatch):
    _mock_google(monkeypatch, {"email": _unique("gunv"), "email_verified": False, "sub": "sub-3"})
    assert client.post("/api/auth/google", json={"id_token": "x"}).status_code == 401
    monkeypatch.setattr("vulnchecker.main.verify_google_id_token", lambda token, cid: None)
    assert client.post("/api/auth/google", json={"id_token": "bogus"}).status_code == 401

def test_google_unconfigured_server(monkeypatch):
    monkeypatch.delenv("CIPHER_GOOGLE_CLIENT_ID", raising=False)
    monkeypatch.setattr("vulnchecker.main.verify_google_id_token", lambda token, cid: {"email": "x@y.z", "email_verified": True, "sub": "s"})
    r = client.post("/api/auth/google", json={"id_token": "x"})
    assert r.status_code == 500
