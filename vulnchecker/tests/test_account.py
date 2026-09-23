import pytest
from vulnchecker.account import (
    validate_email,
    validate_password,
    hash_password,
    verify_password,
    create_user,
    get_user_by_email,
    get_user,
    create_anonymous,
    generate_token,
    verify_token,
    check_and_consume_credits,
    change_password,
    delete_user,
    get_credits_status,
)

def test_validate_email():
    assert validate_email("test@example.com") == True
    assert validate_email("invalid") == False
    assert validate_email("test@") == False
    assert validate_email("@example.com") == False

def test_validate_password():
    assert validate_password("short") == "Password must be at least 8 characters"
    assert validate_password("password") == "Password too common"
    assert validate_password("validpassword123") is None

def test_hash_and_verify_password():
    password = "testpassword123"
    hashed = hash_password(password)
    assert verify_password(password, hashed) == True
    assert verify_password("wrong", hashed) == False

def test_create_and_get_user():
    email = _unique_email("test")
    password = "testpassword123"
    user_id = create_user(email, password)
    assert user_id > 0
    
    user = get_user_by_email(email)
    assert user is not None
    assert user["email"] == email
    
    user_by_id = get_user(user_id)
    assert user_by_id is not None
    assert user_by_id["id"] == user_id

def test_create_anonymous():
    user_id = create_anonymous()
    assert user_id > 0
    user = get_user(user_id)
    assert user is not None
    assert user["is_anonymous"] == 1

def test_token_generation_and_verification():
    user_id = create_user(_unique_email("token"), "password123")
    token = generate_token(user_id)
    assert token is not None
    
    verified_id = verify_token(token)
    assert verified_id == user_id

def test_credits_system():
    user_id = create_anonymous()
    allowed, remaining = check_and_consume_credits(user_id)
    assert allowed == True
    assert remaining == 4  # Started with 5, consumed 1

def test_change_password():
    user_id = create_user(_unique_email("changepass"), "oldpassword123")
    ok, msg = change_password(user_id, "oldpassword123", "newpassword123")
    assert ok == True
    
    # Verify new password works
    user = get_user(user_id)
    assert verify_password("newpassword123", user["password_hash"]) == True

def test_delete_user():
    user_id = create_user(_unique_email("delete"), "password123")
    result = delete_user(user_id)
    assert result == True
    
    user = get_user(user_id)
    assert user is None

def _unique_email(prefix: str) -> str:
    import uuid
    return f"{prefix}_{uuid.uuid4().hex[:8]}@example.com"

def test_create_user_duplicate_race_raises():
    """Second concurrent-style insert must raise ValueError (409 net)."""
    email = _unique_email("dup")
    first = create_user(email, "validpassword123")
    assert first > 0
    with pytest.raises(ValueError, match="already registered"):
        create_user(email, "validpassword123")

def test_password_blocklist_parity():
    """Must stay byte-identical to frontend validation.ts messages."""
    # NOTE: length is checked before the blocklist, so "letmein"
    # (7 chars) reports the length error instead.
    for common in ["password", "PASSWORD", "Password", "12345678", "qwerty123", "QWERTY123"]:
        assert validate_password(common) == "Password too common"
    assert validate_password("letmein") == "Password must be at least 8 characters"
    assert validate_password("1234567") == "Password must be at least 8 characters"
    assert validate_password("x" * 129) == "Password too long"
    assert validate_password("exactly8") is None
    assert validate_password("x" * 128) is None

def test_email_length_bounds():
    ok_254 = "a" * 242 + "@example.com"  # exactly 254 chars
    assert len(ok_254) == 254
    assert validate_email(ok_254) is True
    assert validate_email("a" * 243 + "@example.com") is False  # 255 chars

def test_delete_user_cascades_scans():
    import vulnchecker.account as acc
    email = _unique_email("cascade")
    user_id = create_user(email, "validpassword123")
    conn = acc._get_conn()
    conn.execute(
        "INSERT INTO scans (timestamp, user_id, project_name) VALUES (?, ?, ?)",
        ("2026-01-01T00:00:00+00:00", user_id, "demo"),
    )
    conn.commit()
    conn.close()
    assert delete_user(user_id) is True
    conn = acc._get_conn()
    leftover = conn.execute("SELECT * FROM scans WHERE user_id = ?", (user_id,)).fetchall()
    conn.close()
    assert leftover == []
    assert get_user(user_id) is None
