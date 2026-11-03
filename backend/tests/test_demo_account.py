"""Tests for the Evaluator Demo Account authentication, permissions, and multi-tenant data isolation."""
import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.db import SessionLocal
from app.main import app
from app.models import Organization, User, Submission, BrandDocument, BrandRule
from app.seed import seed_demo_workspace


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def test_auth_status_exposes_demo_credentials(client):
    """GET /auth/status must publish demo credentials and status when enabled."""
    res = client.get("/auth/status")
    assert res.status_code == 200
    data = res.json()
    assert data["authentication_enabled"] is True
    assert "demo" in data
    assert data["demo"] is not None
    assert data["demo"]["enabled"] is True
    assert data["demo"]["email"] == settings.DEMO_ACCOUNT_EMAIL
    assert data["demo"]["password"] == settings.DEMO_ACCOUNT_PASSWORD
    assert data["demo"]["organization_name"] == settings.DEMO_ACCOUNT_ORG_NAME


def test_demo_login_successful_with_configured_credentials(client):
    """Demo account credentials authenticate through standard POST /auth/login."""
    payload = {
        "email": settings.DEMO_ACCOUNT_EMAIL,
        "password": settings.DEMO_ACCOUNT_PASSWORD,
    }
    res = client.post("/auth/login", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "user" in data
    assert data["user"]["email"] == settings.DEMO_ACCOUNT_EMAIL.lower()
    assert "expires_in" in data
    assert "brandguard_session" in res.cookies


def test_demo_login_fails_with_invalid_password(client):
    """Invalid password for demo account must be rejected."""
    payload = {
        "email": settings.DEMO_ACCOUNT_EMAIL,
        "password": "WrongPassword123!",
    }
    res = client.post("/auth/login", json=payload)
    assert res.status_code == 401
    assert "Email or password is incorrect" in res.text


def test_demo_account_data_isolation(client, db):
    """Demo account should only see submissions and assets belonging to its demo organization."""
    # Authenticate as demo user
    login_res = client.post("/auth/login", json={
        "email": settings.DEMO_ACCOUNT_EMAIL,
        "password": settings.DEMO_ACCOUNT_PASSWORD,
    })
    assert login_res.status_code == 200
    demo_user_info = login_res.json()["user"]
    demo_org_id = demo_user_info["organization_id"]

    # Call /submissions
    subs_res = client.get("/submissions")
    assert subs_res.status_code == 200
    subs = subs_res.json()
    assert len(subs) > 0

    # Verify every returned submission belongs to demo user's organization
    for s in subs:
        sub_record = db.get(Submission, s["id"])
        assert sub_record.org_id == demo_org_id
        assert sub_record.user_id == demo_user_info["id"]

    # Verify other org submissions are NEVER leaked
    other_org_subs = db.query(Submission).filter(Submission.org_id != demo_org_id).all()
    if other_org_subs:
        demo_sub_ids = {s["id"] for s in subs}
        for o in other_org_subs:
            assert o.id not in demo_sub_ids


def test_demo_user_cannot_access_other_organization_submission(client, db):
    """A demo user requesting another organization's submission must receive 404 (or 403)."""
    login_res = client.post("/auth/login", json={
        "email": settings.DEMO_ACCOUNT_EMAIL,
        "password": settings.DEMO_ACCOUNT_PASSWORD,
    })
    demo_org_id = login_res.json()["user"]["organization_id"]

    other_sub = db.query(Submission).filter(Submission.org_id != demo_org_id).first()
    if other_sub:
        res = client.get(f"/submissions/{other_sub.id}")
        assert res.status_code in (403, 404)


def test_demo_user_workspace_has_guidelines_and_rules(client):
    """Demo user should have access to pre-seeded rules and documents."""
    client.post("/auth/login", json={
        "email": settings.DEMO_ACCOUNT_EMAIL,
        "password": settings.DEMO_ACCOUNT_PASSWORD,
    })

    docs_res = client.get("/knowledge/documents")
    assert docs_res.status_code == 200
    assert len(docs_res.json()) >= 1

    rules_res = client.get("/knowledge/rules")
    assert rules_res.status_code == 200
    assert len(rules_res.json()) >= 1

