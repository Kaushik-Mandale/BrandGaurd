"""Database seeder for the dedicated Evaluator Demo Account and sample workspace data.

Ensures:
1. An isolated Organization ('Acme Corp (Demo)') exists.
2. A dedicated evaluator User ('demo@brandguard.ai') exists with role='creator' or 'evaluator'.
3. Brand guidelines & approved claim documents with embeddings in BrandChunk.
4. Deterministic brand rules (banned terms, preferred terms, disclaimers, regex).
5. Brand visual assets (approved logo, color palette).
6. Realistic sample submissions in various states (in_review, approved, changes_requested)
   with findings, fixes, regions, revisions, and audit trail entries.
"""
import logging
from app.auth import hash_password
from app.config import settings
from app.models import (
    Organization,
    User,
    BrandDocument,
    BrandChunk,
    BrandRule,
    BrandAsset,
    Submission,
    SubmissionStatus,
    SubmissionRevision,
    Finding,
    FindingType,
    FindingStatus,
    Severity,
    Fix,
    FindingRegion,
    AuditLog,
    RuleKind,
)
from app.services.embeddings import embed_batch

log = logging.getLogger("brandguard.seed")

DEMO_ORG_ID = 1
DEMO_USER_ID = 1


def seed_demo_workspace(db) -> User:
    """Idempotently creates or updates the dedicated demo workspace and account."""
    demo_email = settings.DEMO_ACCOUNT_EMAIL.strip().lower()
    demo_password = settings.DEMO_ACCOUNT_PASSWORD
    org_name = settings.DEMO_ACCOUNT_ORG_NAME
    user_name = settings.DEMO_ACCOUNT_NAME

    # 1. Organization
    org = db.query(Organization).filter(Organization.name == org_name).first()
    if not org:
        org = Organization(name=org_name)
        db.add(org)
        db.flush()

    # 2. User
    user = db.query(User).filter(User.email == demo_email).first()
    if not user:
        user = User(
            org_id=org.id,
            name=user_name,
            email=demo_email,
            role="creator",
            password_hash=hash_password(demo_password),
        )
        db.add(user)
        db.flush()
    else:
        # Update org and credentials if needed so they stay synchronized
        user.org_id = org.id
        user.name = user_name
        user.password_hash = hash_password(demo_password)
        db.flush()

    # 3. Brand Documents (Guidelines & Product Specs)
    doc_title = "Acme Core Brand & Product Guidelines v2.4"
    doc = db.query(BrandDocument).filter_by(org_id=org.id, title=doc_title).first()
    if not doc:
        doc = BrandDocument(
            org_id=org.id,
            title=doc_title,
            doc_type="guideline",
            file_path="uploads/demo_brand_guidelines.txt",
        )
        db.add(doc)
        db.flush()

        chunks_data = [
            (1, "Acme Cloud delivers guaranteed 99.9% uptime SLA across all enterprise availability zones. All downtime outside scheduled maintenance windows is credited according to our standard service level agreement."),
            (1, "Our product name is strictly written as 'Acme Cloud' or 'Acme Platform'. Never write 'AcmeCloud' or 'Acme-Cloud' or refer to customers as 'users'; always use 'clients' or 'partners'."),
            (2, "Enterprise security: Acme Cloud is certified under ISO 27001, SOC 2 Type II, and HIPAA compliance frameworks. Data at rest is encrypted via AES-256 and in transit via TLS 1.3."),
            (2, "Pricing and tiers: Acme Cloud Developer tier starts at $49.00/month. Professional tier is $199.00/month. Enterprise plans require custom volume quotes."),
            (3, "Compliance & promotional restrictions: Promotional superlatives such as '100% bug-free', 'miracle platform', or 'unhackable system' are strictly forbidden in all customer-facing and marketing materials."),
            (3, "Mandatory regulatory disclosure: Any quantitative financial claim or cost-savings projection must include: 'Past customer savings do not guarantee future performance. Individual results may vary based on cloud infrastructure scale.'"),
        ]

        try:
            texts = [c[1] for c in chunks_data]
            embs = embed_batch(texts)
            for idx, ((page, text), emb) in enumerate(zip(chunks_data, embs)):
                db.add(BrandChunk(
                    org_id=org.id,
                    document_id=doc.id,
                    page=page,
                    chunk_index=idx,
                    text=text,
                    embedding=emb,
                ))
            db.flush()
        except Exception as e:
            log.warning("Could not compute embeddings for demo chunks during seed: %s", e)

    # 4. Brand Rules
    existing_rules_count = db.query(BrandRule).filter_by(org_id=org.id).count()
    if existing_rules_count == 0:
        rules_to_seed = [
            BrandRule(
                org_id=org.id,
                kind=RuleKind.banned_term,
                pattern="unhackable",
                severity=Severity.high,
                description="Acme never claims any system is 'unhackable'. Security claims must be modest and verifiable.",
            ),
            BrandRule(
                org_id=org.id,
                kind=RuleKind.banned_term,
                pattern="miracle",
                severity=Severity.high,
                description="The term 'miracle' is prohibited in all enterprise product copy.",
            ),
            BrandRule(
                org_id=org.id,
                kind=RuleKind.preferred_term,
                pattern="users",
                replacement="clients",
                severity=Severity.medium,
                description="We refer to customers as 'clients' or 'partners', never 'users'.",
            ),
            BrandRule(
                org_id=org.id,
                kind=RuleKind.preferred_term,
                pattern="AcmeCloud",
                replacement="Acme Cloud",
                severity=Severity.medium,
                description="The brand name is written 'Acme Cloud' with a space.",
            ),
            BrandRule(
                org_id=org.id,
                kind=RuleKind.required_text,
                pattern="Past customer savings do not guarantee future performance.",
                severity=Severity.high,
                description="Mandatory disclaimer for any ROI or pricing savings projection.",
            ),
            BrandRule(
                org_id=org.id,
                kind=RuleKind.regex,
                pattern=r"!{2,}",
                severity=Severity.low,
                description="Excessive exclamation marks (!! or more) are prohibited in professional communications.",
            ),
        ]
        for r in rules_to_seed:
            db.add(r)
        db.flush()

    # 5. Brand Assets (Color palette & Logo)
    existing_assets_count = db.query(BrandAsset).filter_by(org_id=org.id).count()
    if existing_assets_count == 0:
        db.add(BrandAsset(
            org_id=org.id,
            kind="palette",
            name="Acme Official Brand Palette",
            data={"colors": ["#1D3557", "#457B9D", "#A8DADC", "#F1FAEE", "#E63946"]},
        ))
        db.add(BrandAsset(
            org_id=org.id,
            kind="logo",
            name="Acme Primary Navy Badge",
            file_path="sample_data/images/logo.png",
            data={"width": 128, "height": 128},
        ))
        db.flush()

    # 6. Sample Submissions & Findings (for Dashboard, Review, Insights & Audit exploration)
    existing_subs = db.query(Submission).filter_by(org_id=org.id, user_id=user.id).count()
    if existing_subs == 0:
        # Submission 1: In Review (Has multiple findings and fixes ready for interactive review)
        sub1_text = (
            "Welcome to AcmeCloud! Our cloud infrastructure delivers guaranteed 99.999% uptime for all users. "
            "Our miracle auto-scaling engine makes your architecture completely unhackable. "
            "Switch today and save up to 60% on infrastructure costs!!"
        )
        sub1 = Submission(
            org_id=org.id,
            user_id=user.id,
            title="Q4 Enterprise Campaign — Landing Page Hero",
            original_text=sub1_text,
            current_text=sub1_text,
            status=SubmissionStatus.in_review,
            version=1,
        )
        db.add(sub1)
        db.flush()

        db.add(SubmissionRevision(
            submission_id=sub1.id,
            version=1,
            text=sub1_text,
            reason="Initial evaluator sample submission",
            created_by=user.id,
        ))

        # Findings for sub1
        f1 = Finding(
            submission_id=sub1.id,
            type=FindingType.terminology,
            severity=Severity.medium,
            status=FindingStatus.open,
            start_offset=11,
            end_offset=20,
            flagged_text="AcmeCloud",
            message="Brand name should be written as 'Acme Cloud' with a space.",
            confidence=0.95,
            verified=True,
        )
        f1.fix = Fix(
            original_text="AcmeCloud",
            suggested_text="Acme Cloud",
            rationale="Approved naming guideline specifies 'Acme Cloud'.",
        )
        db.add(f1)

        f2 = Finding(
            submission_id=sub1.id,
            type=FindingType.claim,
            severity=Severity.high,
            status=FindingStatus.open,
            start_offset=56,
            end_offset=70,
            flagged_text="99.999% uptime",
            message="Contradicted: Approved SLA guarantees 99.9% uptime, not 99.999%.",
            evidence_quote="Acme Cloud delivers guaranteed 99.9% uptime SLA across all enterprise availability zones.",
            confidence=0.92,
            verified=True,
        )
        f2.fix = Fix(
            original_text="99.999% uptime",
            suggested_text="99.9% uptime",
            rationale="Align with verified service level agreement.",
        )
        db.add(f2)

        f3 = Finding(
            submission_id=sub1.id,
            type=FindingType.terminology,
            severity=Severity.high,
            status=FindingStatus.open,
            start_offset=162,
            end_offset=172,
            flagged_text="unhackable",
            message="Prohibited term: Absolute security superlatives are forbidden.",
            confidence=0.99,
            verified=True,
        )
        f3.fix = Fix(
            original_text="unhackable",
            suggested_text="SOC 2 Type II and ISO 27001 certified",
            rationale="Replace unverified superlative with verified certifications.",
        )
        db.add(f3)

        f4 = Finding(
            submission_id=sub1.id,
            type=FindingType.claim,
            severity=Severity.high,
            status=FindingStatus.open,
            start_offset=209,
            end_offset=242,
            flagged_text="save up to 60% on infrastructure",
            message="Missing mandatory disclaimer: Financial savings claims require standard qualification.",
            confidence=0.88,
            verified=True,
        )
        f4.fix = Fix(
            original_text="save up to 60% on infrastructure costs!!",
            suggested_text="optimize your cloud infrastructure costs. Past customer savings do not guarantee future performance.",
            rationale="Attach mandatory regulatory disclosure.",
        )
        db.add(f4)

        db.add(AuditLog(
            org_id=org.id,
            submission_id=sub1.id,
            user_id=user.id,
            action="submission_created",
            details={"title": sub1.title, "char_count": len(sub1_text)},
        ))
        db.add(AuditLog(
            org_id=org.id,
            submission_id=sub1.id,
            user_id=user.id,
            action="audit_pipeline_completed",
            details={"findings_count": 4, "flagged_severity_max": "high"},
        ))

        # Submission 2: Approved (Clean copy baseline)
        sub2_text = (
            "Acme Cloud delivers guaranteed 99.9% uptime SLA across all enterprise availability zones. "
            "Our architecture is certified under ISO 27001 and SOC 2 Type II. "
            "Developer plans start at $49.00/month for all clients."
        )
        sub2 = Submission(
            org_id=org.id,
            user_id=user.id,
            title="Product Launch Press Release — Verified Baseline",
            original_text=sub2_text,
            current_text=sub2_text,
            approved_text=sub2_text,
            status=SubmissionStatus.approved,
            version=1,
        )
        db.add(sub2)
        db.flush()

        db.add(SubmissionRevision(
            submission_id=sub2.id,
            version=1,
            text=sub2_text,
            reason="Verified brand-compliant copy",
            created_by=user.id,
        ))
        db.add(AuditLog(
            org_id=org.id,
            submission_id=sub2.id,
            user_id=user.id,
            action="submission_approved",
            details={"approved_by": user.name, "findings_count": 0},
        ))

        # Submission 3: Changes Requested (Visual asset / creative review)
        sub3_text = "Acme Cloud Fall Promotional Banner Creative with brand palette & logo"
        sub3 = Submission(
            org_id=org.id,
            user_id=user.id,
            title="Fall 2026 Social Display Banner Ad",
            original_text=sub3_text,
            current_text=sub3_text,
            status=SubmissionStatus.changes_requested,
            version=1,
        )
        db.add(sub3)
        db.flush()

        f_vis = Finding(
            submission_id=sub3.id,
            type=FindingType.contrast,
            severity=Severity.medium,
            status=FindingStatus.open,
            flagged_text="Banner Headline Contrast",
            message="Low contrast detected on banner hero typography. Ensure minimum contrast ratio ≥ 4.5:1 for WCAG AA compliance.",
            confidence=0.85,
            verified=True,
        )
        f_vis.region = FindingRegion(x=30, y=40, w=300, h=80, img_w=800, img_h=400)
        db.add(f_vis)

        db.add(AuditLog(
            org_id=org.id,
            submission_id=sub3.id,
            user_id=user.id,
            action="changes_requested",
            details={"reason": "Contrast ratio fails accessibility check on banner background."},
        ))

    db.commit()
    log.info("Demo workspace and sample data verified for %s", demo_email)
    return user
