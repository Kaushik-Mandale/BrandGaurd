"""
Regression tests for BrandGuard approval safety workflow.
Covers:
1. Correcting a contradictory claim allows approval only after applicable checks pass.
2. Leaving a high-severity contradiction unresolved blocks approval.
3. Dismissing a serious finding cannot silently bypass approval controls.
4. An authorised override works only under the configured policy and is audited.
5. Editing approved content invalidates approval for the previous version.
6. Finding acceptance, rejection, and custom corrections preserve correct text and history.
"""
import pytest
from uuid import uuid4
from fastapi.testclient import TestClient

from app.db import SessionLocal, init_db
from app.auth import create_access_token, hash_password
from app.config import settings
from app.main import app
from app.models import (
    AuditLog,
    BrandAsset,
    BrandChunk,
    BrandDocument,
    BrandRule,
    Finding,
    FindingStatus,
    FindingType,
    Fix,
    Organization,
    RuleKind,
    Severity,
    Submission,
    SubmissionStatus,
    User,
)
from app.pipeline import run_review
from app.seed import DEMO_ORG_ID, DEMO_USER_ID, ensure_development_workspace
from app.services.revisions import snapshot_initial_version

client = TestClient(
    app,
    headers={"Authorization": f"Bearer {create_access_token(DEMO_USER_ID)[0]}"},
)


def _headers(user_id: int) -> dict[str, str]:
    token, _ = create_access_token(user_id)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(autouse=True)
def complete_scheduled_review(monkeypatch):
    def finish_review(submission_id: int):
        with SessionLocal() as db:
            sub = db.get(Submission, submission_id)
            if sub:
                sub.status = SubmissionStatus.in_review
                db.commit()

    monkeypatch.setattr("app.routers.review.run_review", finish_review)


@pytest.fixture(autouse=True, scope="session")
def setup_db():
    init_db()
    with SessionLocal() as db:
        initial_submission_ids = {
            sid for (sid,) in db.query(Submission.id).all()
        }
        ensure_development_workspace(db)
        manager = db.get(User, 1)
        manager.password_hash = hash_password("manager-test-password")
        # Ensure reviewer and creator users exist for role tests
        if not db.get(User, 2):
            db.add(User(id=2, org_id=DEMO_ORG_ID, name="Creator User", email="creator@brandguard.dev", role="creator"))
        if not db.get(User, 3):
            db.add(User(id=3, org_id=DEMO_ORG_ID, name="Reviewer User", email="reviewer@brandguard.dev", role="reviewer"))
        # Ensure second organization and its user exist for multi-tenancy tests
        if not db.get(Organization, 2):
            db.add(Organization(id=2, name="Tenant Two Inc."))
            db.flush()
        if not db.get(User, 4):
            db.add(User(id=4, org_id=2, name="Tenant Two Manager", email="manager@tenant2.dev", role="manager"))
        db.flush()
        for user_id in (2, 3, 4):
            user = db.get(User, user_id)
            user.password_hash = hash_password(f"user-{user_id}-test-password")
        db.commit()
    init_db()
    yield
    with SessionLocal() as db:
        test_submission_ids = [
            sid for (sid,) in db.query(Submission.id).all()
            if sid not in initial_submission_ids
        ]
        if test_submission_ids:
            db.query(AuditLog).filter(AuditLog.submission_id.in_(test_submission_ids)).delete(synchronize_session=False)
            for submission in db.query(Submission).filter(Submission.id.in_(test_submission_ids)).all():
                db.delete(submission)
            db.flush()
        db.query(AuditLog).filter(
            AuditLog.org_id == 2,
            AuditLog.submission_id.is_(None),
        ).delete(synchronize_session=False)
        db.query(User).filter(User.id.in_([2, 3, 4])).delete(synchronize_session=False)
        db.query(Organization).filter(Organization.id == 2).delete(synchronize_session=False)
        db.commit()


def _create_test_submission(
    db,
    text: str,
    title: str = "Test Post",
    user_id: int | None = DEMO_USER_ID,
) -> Submission:
    sub = Submission(
        org_id=DEMO_ORG_ID,
        user_id=user_id,
        title=title,
        original_text=text,
        current_text=text,
        status=SubmissionStatus.in_review,
        version=1,
    )
    db.add(sub)
    db.flush()
    snapshot_initial_version(db, sub, text, user_id)
    db.commit()
    db.refresh(sub)
    return sub


def _add_finding(
    db,
    sub: Submission,
    ftype: FindingType,
    severity: Severity,
    start: int,
    end: int,
    flagged: str,
    message: str,
    suggested_text: str | None = None,
) -> Finding:
    f = Finding(
        submission_id=sub.id,
        type=ftype,
        severity=severity,
        status=FindingStatus.open,
        start_offset=start,
        end_offset=end,
        flagged_text=flagged,
        message=message,
        confidence=1.0,
        verified=True,
    )
    if suggested_text is not None:
        f.fix = Fix(
            original_text=flagged,
            suggested_text=suggested_text,
            rationale="Approved brand formulation",
        )
    db.add(f)
    db.commit()
    db.refresh(f)
    return f


# ==============================================================================
# 1. Correcting a contradictory claim allows approval only after applicable checks pass
# ==============================================================================
def test_case_1_correcting_contradictory_claim_allows_approval():
    text = "FitFuel bars have 30g of protein and zero sugar."
    with SessionLocal() as db:
        sub = _create_test_submission(db, text, "Case 1 Contradictions")
        # "30g of protein" is at index 18..32
        f1 = _add_finding(
            db, sub, FindingType.claim, Severity.high,
            18, 32, "30g of protein",
            "Conflicts with approved brand information (approved: 20g)",
            "20g of protein",
        )
        # "zero sugar" is at index 37..47
        f2 = _add_finding(
            db, sub, FindingType.claim, Severity.high,
            37, 47, "zero sugar",
            "Conflicts with approved brand information (approved: 4g)",
            "4g of sugar",
        )
        sub_id = sub.id
        f1_id = f1.id
        f2_id = f2.id

    # 1. Attempt approval while both contradictions are unresolved -> 409
    res = client.post(f"/submissions/{sub_id}/approve", json={"force": False})
    assert res.status_code == 409
    assert "unresolved high-severity finding(s)" in res.json()["detail"]

    # 2. Correct only finding 1 ("30g of protein" -> "20g of protein")
    res = client.post(f"/submissions/{sub_id}/findings/{f1_id}/accept")
    assert res.status_code == 200
    assert "20g of protein" in res.json()["current_text"]
    assert "zero sugar" in res.json()["current_text"]

    # 3. Attempt approval while finding 2 ("zero sugar") is still unresolved -> STILL 409
    res = client.post(f"/submissions/{sub_id}/approve", json={"force": False})
    assert res.status_code == 409
    assert "unresolved high-severity finding(s)" in res.json()["detail"]

    # 4. Correct finding 2 ("zero sugar" -> "4g of sugar")
    res = client.post(f"/submissions/{sub_id}/findings/{f2_id}/accept")
    assert res.status_code == 200
    assert res.json()["current_text"] == "FitFuel bars have 20g of protein and 4g of sugar."

    # 5. Now all contradictions are corrected and applicable checks pass -> APPROVAL SUCCEEDS!
    res = client.post(f"/submissions/{sub_id}/approve", json={"force": False})
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "approved"
    assert data["approved_text"] == "FitFuel bars have 20g of protein and 4g of sugar."


# ==============================================================================
# 2. Leaving a high-severity contradiction unresolved blocks approval
# ==============================================================================
def test_case_2_leaving_high_severity_contradiction_unresolved_blocks_approval():
    text = "Each FitFuel bar has 30g of protein."
    with SessionLocal() as db:
        sub = _create_test_submission(db, text, "Case 2 Unresolved High")
        _add_finding(
            db, sub, FindingType.claim, Severity.high,
            21, 35, "30g of protein",
            "Conflicts with approved brand information (approved: 20g)",
            "20g of protein",
        )
        sub_id = sub.id

    res = client.post(f"/submissions/{sub_id}/approve", json={"force": False})
    assert res.status_code == 409
    assert "unresolved high-severity finding(s)" in res.json()["detail"]

    # Check status is still in_review
    res = client.get(f"/submissions/{sub_id}")
    assert res.json()["status"] == "in_review"
    assert res.json()["approved_text"] is None


# ==============================================================================
# 3. Dismissing a serious finding cannot silently bypass approval controls
# ==============================================================================
def test_case_3_dismissing_serious_finding_cannot_silently_bypass_approval():
    text = "FitFuel bars have 30g of protein and zero sugar."
    with SessionLocal() as db:
        sub = _create_test_submission(db, text, "Case 3 Dismissal Bypass Prevention")
        f1 = _add_finding(
            db, sub, FindingType.claim, Severity.high,
            18, 32, "30g of protein",
            "Conflicts with approved brand information (approved: 20g)",
            "20g of protein",
        )
        f2 = _add_finding(
            db, sub, FindingType.claim, Severity.high,
            37, 47, "zero sugar",
            "Conflicts with approved brand information (approved: 4g)",
            "4g of sugar",
        )
        sub_id = sub.id
        f1_id = f1.id
        f2_id = f2.id

    # Reviewer dismisses/rejects both findings
    res1 = client.post(f"/submissions/{sub_id}/findings/{f1_id}/reject", json={"reason": "Dismissing 30g contradiction"})
    res2 = client.post(f"/submissions/{sub_id}/findings/{f2_id}/reject", json={"reason": "Dismissing zero sugar contradiction"})
    assert res1.status_code == 200
    assert res2.status_code == 200

    # Content has NOT changed
    res = client.get(f"/submissions/{sub_id}")
    assert res.json()["current_text"] == text

    # Normal approval without force MUST STILL BE BLOCKED!
    res = client.post(f"/submissions/{sub_id}/approve", json={"force": False})
    assert res.status_code == 409
    detail = res.json()["detail"]
    assert "2 dismissed" in detail or "unresolved high-severity finding(s)" in detail
    assert "Dismissing a high-severity finding does not resolve the violation" in detail


# ==============================================================================
# 4. An authorised override works only under the configured policy and is audited
# ==============================================================================
def test_case_4_authorised_override_policy_and_audit():
    text = "FitFuel bars have 30g of protein."
    with SessionLocal() as db:
        sub = _create_test_submission(db, text, "Case 4 Override Policy")
        _add_finding(
            db, sub, FindingType.claim, Severity.high,
            18, 32, "30g of protein",
            "Conflicts with approved brand information",
            "20g of protein",
        )
        sub_id = sub.id
        creator_sub = _create_test_submission(db, text, "Creator Cannot Override", user_id=2)
        _add_finding(
            db, creator_sub, FindingType.claim, Severity.high,
            18, 32, "30g of protein", "Conflicts with approved brand information", "20g of protein",
        )
        creator_sub_id = creator_sub.id
        reviewer_sub = _create_test_submission(db, text, "Reviewer Cannot Override", user_id=3)
        _add_finding(
            db, reviewer_sub, FindingType.claim, Severity.high,
            18, 32, "30g of protein", "Conflicts with approved brand information", "20g of protein",
        )
        reviewer_sub_id = reviewer_sub.id

    # 4a. Unauthorized role (creator) attempting force override -> 403 Forbidden
    res = client.post(
        f"/submissions/{creator_sub_id}/approve",
        json={"force": True, "reason": "I am the creator and I want this live"},
        headers=_headers(2),
    )
    assert res.status_code == 403
    assert "not authorized to override high-severity violations" in res.json()["detail"]

    # 4b. Unauthorized role (reviewer) attempting force override -> 403 Forbidden
    res = client.post(
        f"/submissions/{reviewer_sub_id}/approve",
        json={"force": True, "reason": "Reviewer wants to bypass check"},
        headers=_headers(3),
    )
    assert res.status_code == 403
    assert "Manager authorization is required" in res.json()["detail"]

    # 4c. Authorized manager attempting force override with EMPTY reason -> 422 Unprocessable Entity
    res = client.post(
        f"/submissions/{sub_id}/approve",
        json={"force": True, "reason": "   "},
        headers=_headers(1),
    )
    assert res.status_code == 422
    assert "override reason must be provided" in res.json()["detail"]

    # 4d. Authorized manager with valid override reason -> SUCCEEDS (200 OK)
    override_reason = "VP signoff: Special high-protein formula batch #99 approved for limited promo"
    res = client.post(
        f"/submissions/{sub_id}/approve",
        json={"force": True, "override_reason": override_reason},
        headers=_headers(1),
    )
    assert res.status_code == 200
    assert res.json()["status"] == "approved"

    # 4e. Audit trail verification
    audit_res = client.get(f"/audit?submission_id={sub_id}", headers=_headers(1))
    assert audit_res.status_code == 200
    logs = audit_res.json()
    actions = [l["action"] for l in logs]
    assert "override_granted" in actions
    assert "approved" in actions

    override_entry = next(l for l in logs if l["action"] == "override_granted")
    assert override_entry["details"]["override_reason"] == override_reason
    assert override_entry["details"]["authorized_by_role"] == "manager"
    assert override_entry["details"]["unresolved_findings_count"] == 1


# ==============================================================================
# 5. Editing approved content invalidates approval for the previous version
# ==============================================================================
def test_case_5_editing_approved_content_invalidates_approval():
    text = "Fuel your afternoon with a FitFuel Classic bar."
    with SessionLocal() as db:
        sub = _create_test_submission(db, text, "Case 5 Version Invalidation")
        sub_id = sub.id

    # 1. Approve initial clean version
    res = client.post(f"/submissions/{sub_id}/approve", json={"force": False})
    assert res.status_code == 200
    assert res.json()["status"] == "approved"
    assert res.json()["approved_text"] == text
    assert res.json()["version"] == 1

    # 2. Edit approved content
    edited_text = "Fuel your afternoon with an unauthorized miracle bar."
    res = client.post(f"/submissions/{sub_id}/edit", json={"text": edited_text})
    assert res.status_code == 200
    data = res.json()

    # Approval MUST BE INVALIDATED
    assert data["status"] == "processing"
    assert data["approved_text"] is None
    assert data["current_text"] == edited_text
    assert data["version"] == 2

    # Check audit log for invalidation entry
    audit_res = client.get(f"/audit?submission_id={sub_id}")
    logs = audit_res.json()
    actions = [l["action"] for l in logs]
    assert "approval_invalidated" in actions
    assert "content_edited" in actions

    invalidation_entry = next(l for l in logs if l["action"] == "approval_invalidated")
    assert invalidation_entry["details"]["previous_version"] == 1
    assert invalidation_entry["details"]["new_version"] == 2


def test_accepting_correction_invalidates_approved_version():
    text = "Fuel your afternoon with a miracle bar."
    with SessionLocal() as db:
        sub = _create_test_submission(db, text, "Approved Correction Invalidation")
        finding = _add_finding(
            db, sub, FindingType.terminology, Severity.medium,
            26, 33, "miracle", "Unapproved terminology", "classic",
        )
        sub.status = SubmissionStatus.approved
        sub.approved_text = text
        db.commit()
        submission_id = sub.id
        finding_id = finding.id

    response = client.post(f"/submissions/{submission_id}/findings/{finding_id}/accept")
    assert response.status_code == 200
    assert response.json()["version"] == 2, response.json()
    assert response.json()["approved_text"] is None

    audit = client.get(f"/audit?submission_id={submission_id}").json()
    invalidation = next(entry for entry in audit if entry["action"] == "approval_invalidated")
    assert invalidation["details"] == {"previous_version": 1, "new_version": 2}


# ==============================================================================
# 6. Finding acceptance, rejection, and custom corrections preserve correct text and history
# ==============================================================================
def test_case_6_finding_acceptance_rejection_custom_corrections_and_history():
    text = "Try our miracle bars with 30g of protein today."
    with SessionLocal() as db:
        sub = _create_test_submission(db, text, "Case 6 Corrections & History")
        # "miracle" at 8..15
        f1 = _add_finding(
            db, sub, FindingType.terminology, Severity.high,
            8, 15, "miracle",             "Banned term", "awesome"
        )
        # "30g of protein" at 26..40
        f2 = _add_finding(
            db, sub, FindingType.claim, Severity.high,
            26, 40, "30g of protein", "Wrong claim", "20g of protein"
        )
        sub_id = sub.id
        f1_id = f1.id
        f2_id = f2.id

    # 1. Accept suggested fix for f1 ("miracle" -> "plant-based")
    res = client.post(f"/submissions/{sub_id}/findings/{f1_id}/accept")
    assert res.status_code == 200
    assert "awesome bars" in res.json()["current_text"]
    assert "30g of protein" in res.json()["current_text"]

    # 2. Accept custom correction for f2 ("30g of protein" -> "20g of organic plant protein")
    custom_fix = "20g plant food"
    res = client.post(f"/submissions/{sub_id}/findings/{f2_id}/accept", json={"suggested_text": custom_fix})
    assert res.status_code == 200
    assert custom_fix in res.json()["current_text"]
    assert res.json()["current_text"] == f"Try our awesome bars with {custom_fix} today."

    # 3. Reject the old finding without modifying its already-saved revision
    res = client.post(f"/submissions/{sub_id}/findings/{f1_id}/reject", json={"reason": "Testing rejection revert"})
    assert res.status_code == 200
    # The correction remains in the immutable revised draft.
    assert "awesome" in res.json()["current_text"]
    assert custom_fix in res.json()["current_text"]

    # 4. Reopen f1
    res = client.post(f"/submissions/{sub_id}/findings/{f1_id}/reopen")
    assert res.status_code == 200
    f1_state = next(f for f in res.json()["findings"] if f["id"] == f1_id)
    assert f1_state["status"] == "open"

    # 5. Check audit trail preserves all events
    audit_res = client.get(f"/audit?submission_id={sub_id}")
    actions = [l["action"] for l in audit_res.json()]
    assert "finding_accepted" in actions
    assert "finding_rejected" in actions
    assert "finding_reopened" in actions


# ==============================================================================
# 7. Security: Role spoofing via client-controlled headers is rejected
# ==============================================================================
def test_role_spoofing_via_client_header_fails():
    text = "FitFuel bars have 30g of protein."
    with SessionLocal() as db:
        sub = _create_test_submission(db, text, "Role Spoofing Attempt", user_id=2)
        _add_finding(
            db, sub, FindingType.claim, Severity.high,
            18, 32, "30g of protein", "Wrong claim", "20g of protein"
        )
        sub_id = sub.id

    # User 2 is a 'creator' in the database.
    # An attacker attempts to spoof a 'manager' role via client header 'X-User-Role'.
    # The server MUST ignore the client-supplied role, check the database record (creator),
    # and reject the override with 403 Forbidden.
    res = client.post(
        f"/submissions/{sub_id}/approve",
        json={"force": True, "override_reason": "I am claiming to be a manager"},
        headers={**_headers(2), "X-User-Role": "manager"},
    )
    assert res.status_code == 403
    assert "not authorized to override high-severity violations" in res.json()["detail"]


# ==============================================================================
# 8. Security: Multi-tenant cross-organisation access is strictly blocked
# ==============================================================================
def test_cross_organisation_access_prevented():
    text = "Confidential Org 1 Strategy Document."
    with SessionLocal() as db:
        sub = _create_test_submission(db, text, "Org 1 Private Submission")
        sub_id = sub.id

    # User 4 belongs to Organization 2 ('Tenant Two Inc.').
    headers_org2 = _headers(4)

    # 8a. User 4 cannot read Org 1's submission
    res = client.get(f"/submissions/{sub_id}", headers=headers_org2)
    assert res.status_code == 404
    assert res.json()["detail"] == "Submission not found"

    # 8b. User 4 cannot approve Org 1's submission
    res = client.post(f"/submissions/{sub_id}/approve", json={"force": False}, headers=headers_org2)
    assert res.status_code == 404
    assert res.json()["detail"] == "Submission not found"

    # 8c. User 4 cannot read Org 1's audit logs
    res = client.get(f"/audit?submission_id={sub_id}", headers=headers_org2)
    assert res.status_code == 404

    # 8d. User 4 listing submissions only sees Organization 2 data (0 items), none of Org 1's
    res = client.get("/submissions", headers=headers_org2)
    assert res.status_code == 200
    submissions_for_org2 = res.json()
    assert all(s["id"] != sub_id for s in submissions_for_org2)

    # 8e. User 4 cannot see Org 1's guidelines or rules
    res_docs = client.get("/knowledge/documents", headers=headers_org2)
    assert res_docs.status_code == 200
    assert len(res_docs.json()) == 0

    res_rules = client.get("/knowledge/rules", headers=headers_org2)
    assert res_rules.status_code == 200
    org1_rules = {
        rule["id"]
        for rule in client.get("/knowledge/rules", headers=_headers(1)).json()
    }
    assert org1_rules.isdisjoint({rule["id"] for rule in res_rules.json()})

    # 8f. User 4 cannot see Org 1's assets
    res_assets = client.get("/assets", headers=headers_org2)
    assert res_assets.status_code == 200
    assert len(res_assets.json()) == 0

    # 8g. User 4 insights are strictly isolated to Org 2
    res_insights = client.get("/insights", headers=headers_org2)
    assert res_insights.status_code == 200
    with SessionLocal() as db:
        expected_org2_submissions = db.query(Submission).filter_by(org_id=2).count()
    assert res_insights.json()["submissions"]["total"] == expected_org2_submissions


def test_same_organisation_submissions_and_activity_are_private_per_user():
    unique = uuid4().hex
    own_text = f"Creator private submission {unique}."
    other_text = f"Manager private submission {unique}."
    with SessionLocal() as db:
        other_sub = _create_test_submission(db, other_text, f"Other user {unique}")
        legacy_sub = _create_test_submission(
            db, f"Legacy ownerless submission {unique}", f"Legacy {unique}", user_id=None
        )
        db.add(AuditLog(
            org_id=DEMO_ORG_ID,
            submission_id=other_sub.id,
            user_id=DEMO_USER_ID,
            action="other_user_private_marker",
            details={},
        ))
        shared_rule = BrandRule(
            org_id=DEMO_ORG_ID,
            kind=RuleKind.banned_term,
            pattern=f"shared-{unique}",
            replacement="approved wording",
            severity=Severity.medium,
            description="Shared organization policy",
            active=True,
        )
        shared_document = BrandDocument(
            org_id=DEMO_ORG_ID,
            title=f"Shared guideline {unique}",
            doc_type="guideline",
        )
        shared_asset = BrandAsset(
            org_id=DEMO_ORG_ID,
            kind="palette",
            name=f"Shared palette {unique}",
            data={"colors": ["#1D3557"]},
        )
        db.add_all([shared_rule, shared_document, shared_asset])
        db.commit()
        other_sub_id = other_sub.id
        legacy_sub_id = legacy_sub.id
        shared_rule_id = shared_rule.id
        shared_document_id = shared_document.id
        shared_asset_id = shared_asset.id

    creator_headers = _headers(2)
    created = client.post(
        "/submissions",
        json={"title": f"Own user {unique}", "text": own_text},
        headers=creator_headers,
    )
    assert created.status_code == 200
    own_sub_id = created.json()["id"]
    try:
        with SessionLocal() as db:
            own_sub = db.get(Submission, own_sub_id)
            assert own_sub is not None
            assert own_sub.user_id == 2
            _add_finding(
                db, own_sub, FindingType.terminology, Severity.medium,
                0, len("Creator"), "Creator", "Test private finding",
            )

        assert own_sub_id in {item["id"] for item in client.get("/submissions", headers=creator_headers).json()}
        assert other_sub_id not in {item["id"] for item in client.get("/submissions", headers=creator_headers).json()}
        assert legacy_sub_id not in {item["id"] for item in client.get("/submissions", headers=creator_headers).json()}
        assert own_sub_id not in {item["id"] for item in client.get("/submissions", headers=_headers(1)).json()}

        for path in (
            f"/submissions/{other_sub_id}",
            f"/submissions/{other_sub_id}/revisions",
            f"/submissions/{other_sub_id}/image",
            f"/submissions/{legacy_sub_id}",
        ):
            assert client.get(path, headers=creator_headers).status_code == 404
        assert client.post(
            f"/submissions/{other_sub_id}/rerun",
            headers=creator_headers,
        ).status_code == 404
        assert client.post(
            f"/submissions/{other_sub_id}/approve",
            json={"force": False},
            headers=creator_headers,
        ).status_code == 404
        assert client.post(
            f"/submissions/{other_sub_id}/edit",
            json={"text": "Unauthorized edit"},
            headers=creator_headers,
        ).status_code == 404
        assert client.get(
            f"/audit?submission_id={other_sub_id}",
            headers=creator_headers,
        ).status_code == 404

        own_audit = client.post(
            f"/submissions/{own_sub_id}/comments",
            json={"text": f"Private note {unique}"},
            headers=creator_headers,
        )
        assert own_audit.status_code == 200
        creator_audit = client.get("/audit", headers=creator_headers)
        assert creator_audit.status_code == 200
        assert all(entry["user_id"] == 2 for entry in creator_audit.json())
        assert all(entry["submission_id"] != other_sub_id for entry in creator_audit.json())

        with SessionLocal() as db:
            expected_owned_count = db.query(Submission).filter_by(org_id=DEMO_ORG_ID, user_id=2).count()
            expected_owned_findings = (
                db.query(Finding)
                .join(Submission)
                .filter(Submission.org_id == DEMO_ORG_ID, Submission.user_id == 2)
                .count()
            )
        creator_insights = client.get("/insights", headers=creator_headers).json()
        assert creator_insights["submissions"]["total"] == expected_owned_count
        assert creator_insights["findings"]["total"] == expected_owned_findings

        assert shared_rule_id in {
            rule["id"] for rule in client.get("/knowledge/rules", headers=creator_headers).json()
        }
        assert shared_document_id in {
            doc["id"] for doc in client.get("/knowledge/documents", headers=creator_headers).json()
        }
        assert shared_asset_id in {
            asset["id"] for asset in client.get("/assets", headers=creator_headers).json()
        }
    finally:
        with SessionLocal() as db:
            db.query(BrandAsset).filter_by(id=shared_asset_id).delete()
            db.query(BrandRule).filter_by(id=shared_rule_id).delete()
            document = db.get(BrandDocument, shared_document_id)
            if document:
                db.delete(document)
            db.commit()


def test_authentication_uses_passwords_and_signed_bearer_tokens():
    auth_client = TestClient(app, headers={"Origin": settings.FRONTEND_ORIGIN})
    unauthenticated = auth_client.get("/auth/me")
    assert unauthenticated.status_code == 401

    login = auth_client.post(
        "/auth/login",
        json={"email": "local@brandguard.dev", "password": "manager-test-password"},
    )
    assert login.status_code == 200
    auth_data = login.json()
    assert auth_data["expires_in"] > 0
    cookie = login.cookies.get("brandguard_session")
    assert cookie
    assert "httponly" in login.headers["set-cookie"].lower()
    current_user = auth_client.get("/auth/me")
    assert current_user.status_code == 200
    assert current_user.json()["role"] == "manager"

    auth_client.cookies.set("brandguard_session", "not-a-valid-token")
    invalid_token = auth_client.get("/auth/me")
    assert invalid_token.status_code == 401
    wrong_password = auth_client.post(
        "/auth/login",
        json={"email": "local@brandguard.dev", "password": "incorrect"},
    )
    assert wrong_password.status_code == 401

    email = f"signup-{uuid4().hex}@example.test"
    try:
        status = auth_client.get("/auth/status")
        assert status.status_code == 200
        assert status.json()["registration_enabled"] is True
        registration = auth_client.post(
            "/auth/register",
            json={
                "name": "New Workspace Manager",
                "email": email,
                "password": "a-strong-test-password",
                "organization_name": "A New Workspace",
            },
        )
        assert registration.status_code == 201
        registered_user = registration.json()["user"]
        assert registered_user["role"] == "manager"
        assert registered_user["organization_id"] > 0
        assert "httponly" in registration.headers["set-cookie"].lower()
        registered_session = registration.cookies.get("brandguard_session")
        auth_client.cookies.set("brandguard_session", registered_session)
        current_after_registration = auth_client.get("/auth/me")
        assert current_after_registration.status_code == 200, current_after_registration.text
        assert current_after_registration.json()["id"] == registered_user["id"]
        csrf = auth_client.post(
            "/submissions",
            json={"title": "Blocked CSRF", "text": "Must not be created."},
            headers={"Origin": "https://attacker.example"},
        )
        assert csrf.status_code == 403
        duplicate = auth_client.post(
            "/auth/register",
            json={
                "name": "Duplicate Account",
                "email": email.upper(),
                "password": "a-strong-test-password",
                "organization_name": "A Second Workspace",
            },
        )
        assert duplicate.status_code == 409

        logout = auth_client.post("/auth/logout")
        assert logout.status_code == 204, logout.text
        assert auth_client.get("/auth/me").status_code == 401
        revoked = auth_client.get(
            "/auth/me",
            headers={"Authorization": f"Bearer {registered_session}"},
        )
        assert revoked.status_code == 401
    finally:
        with SessionLocal() as db:
            user = db.query(User).filter_by(email=email).one_or_none()
            if user:
                organization = db.get(Organization, user.org_id)
                db.delete(user)
                db.flush()
                if organization:
                    db.delete(organization)
                db.commit()


def test_content_edits_create_revisions_and_recheck_revised_text(monkeypatch):
    monkeypatch.setattr("app.pipeline.llm_available", lambda: False)
    pattern = f"unapproved-{uuid4().hex}"
    with SessionLocal() as db:
        sub = _create_test_submission(db, "Original draft.", "Revision History Check")
        rule = BrandRule(
            org_id=DEMO_ORG_ID,
            kind=RuleKind.banned_term,
            pattern=pattern,
            replacement="approved wording",
            severity=Severity.high,
            description="Test revised text recheck",
            active=True,
        )
        db.add(rule)
        db.commit()
        submission_id = sub.id
        rule_id = rule.id

    edited_text = f"Updated copy uses {pattern}."
    try:
        edit = client.post(
            f"/submissions/{submission_id}/edit",
            json={"text": edited_text},
        )
        assert edit.status_code == 200
        assert edit.json()["version"] == 2
        assert edit.json()["current_text"] == edited_text

        revisions = client.get(f"/submissions/{submission_id}/revisions")
        assert revisions.status_code == 200
        assert [(revision["version"], revision["text"]) for revision in revisions.json()] == [
            (2, edited_text),
            (1, "Original draft."),
        ]

        run_review(submission_id)
        with SessionLocal() as db:
            sub = db.get(Submission, submission_id)
            assert sub.current_text == edited_text
            assert sub.original_text == edited_text
            assert any(f.flagged_text == pattern for f in sub.findings)
    finally:
        with SessionLocal() as db:
            finding_ids = [
                finding_id
                for (finding_id,) in db.query(Finding.id).filter_by(rule_id=rule_id).all()
            ]
            if finding_ids:
                db.query(Fix).filter(Fix.finding_id.in_(finding_ids)).delete(synchronize_session=False)
                db.query(Finding).filter(Finding.id.in_(finding_ids)).delete(synchronize_session=False)
            db.query(BrandRule).filter_by(id=rule_id).delete()
            db.commit()


def test_pipeline_uses_rules_and_audit_scope_from_submission_tenant(monkeypatch):
    monkeypatch.setattr("app.pipeline.llm_available", lambda: False)
    with SessionLocal() as db:
        old_submissions = db.query(Submission).filter_by(
            org_id=2,
            title="Tenant Two Rule Check",
        ).all()
        for old_submission in old_submissions:
            db.query(AuditLog).filter_by(submission_id=old_submission.id).delete()
            db.delete(old_submission)
        old_rules = db.query(BrandRule).filter_by(
            org_id=2,
            pattern="tenant-two-only",
        ).all()
        for old_rule in old_rules:
            for finding in db.query(Finding).filter_by(rule_id=old_rule.id).all():
                db.delete(finding)
        db.flush()
        for old_rule in old_rules:
            db.delete(old_rule)
        db.commit()

        rule = BrandRule(
            org_id=2,
            kind=RuleKind.banned_term,
            pattern="tenant-two-only",
            replacement="approved wording",
            severity=Severity.high,
            description="Tenant-specific terminology",
            active=True,
        )
        db.add(rule)
        sub = Submission(
            org_id=2,
            user_id=4,
            title="Tenant Two Rule Check",
            original_text="Use tenant-two-only wording.",
            current_text="Use tenant-two-only wording.",
            status=SubmissionStatus.pending,
        )
        db.add(sub)
        db.commit()
        db.refresh(sub)
        submission_id = sub.id
        rule_id = rule.id

    try:
        run_review(submission_id)

        with SessionLocal() as db:
            sub = db.get(Submission, submission_id)
            assert sub is not None
            assert any(f.rule_id == rule_id for f in sub.findings)
            audit_event = (
                db.query(AuditLog)
                .filter_by(submission_id=submission_id, action="review_completed")
                .one()
            )
            assert audit_event.org_id == 2
    finally:
        with SessionLocal() as db:
            db.query(AuditLog).filter_by(submission_id=submission_id).delete()
            for finding in db.query(Finding).filter_by(rule_id=rule_id).all():
                db.delete(finding)
            db.flush()
            sub = db.get(Submission, submission_id)
            rule = db.get(BrandRule, rule_id)
            if sub:
                db.delete(sub)
            if rule:
                db.delete(rule)
            db.commit()
