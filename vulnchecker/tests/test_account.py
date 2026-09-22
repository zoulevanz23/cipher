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
    email = "test@example.com"
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
    user_id = create_user("token@example.com", "password123")
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
    user_id = create_user("changepass@example.com", "oldpassword123")
    ok, msg = change_password(user_id, "oldpassword123", "newpassword123")
    assert ok == True
    
    # Verify new password works
    user = get_user(user_id)
    assert verify_password("newpassword123", user["password_hash"]) == True

def test_delete_user():
    user_id = create_user("delete@example.com", "password123")
    result = delete_user(user_id)
    assert result == True
    
    user = get_user(user_id)
    assert user is None
