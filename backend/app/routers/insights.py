"""Insights router: aggregated metrics with tenant isolation."""
from collections import Counter
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.db import get_db
from app.models import AuditLog, Finding, FindingStatus, FindingType, Submission, SubmissionStatus, BrandRule, User
from app.schemas import InsightsOut

router = APIRouter(prefix="/insights", tags=["insights"])


@router.get("", response_model=InsightsOut)
def insights(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # Submissions
    owned_submissions = db.query(Submission).filter_by(org_id=user.org_id, user_id=user.id)
    total_subs = owned_submissions.count()
    approved_subs = owned_submissions.filter_by(status=SubmissionStatus.approved).count()

    # Findings
    all_findings = (
        db.query(Finding)
        .join(Submission)
        .filter(Submission.org_id == user.org_id, Submission.user_id == user.id)
        .all()
    )
    total_findings = len(all_findings)

    by_type: dict[str, int] = {}
    by_severity: dict[str, int] = {}
    by_status: dict[str, int] = {}
    for f in all_findings:
        by_type[f.type.value] = by_type.get(f.type.value, 0) + 1
        by_severity[f.severity.value] = by_severity.get(f.severity.value, 0) + 1
        by_status[f.status.value] = by_status.get(f.status.value, 0) + 1

    accepted = by_status.get("accepted", 0)
    rejected = by_status.get("rejected", 0)
    acceptance_rate = accepted / (accepted + rejected) if (accepted + rejected) > 0 else None

    # AI findings stats (confidence < 1 = AI-generated)
    ai_all = [f for f in all_findings if f.confidence < 1.0]
    ai_reviewed = [
        f for f in ai_all
        if f.status in {FindingStatus.accepted, FindingStatus.rejected}
    ]
    ai_rejected = sum(1 for f in ai_reviewed if f.status == FindingStatus.rejected)
    fpr = ai_rejected / len(ai_reviewed) if ai_reviewed else None

    # Count dropped_by_verifier from audit log
    dropped = 0
    logs = db.query(AuditLog).filter_by(
        org_id=user.org_id,
        user_id=user.id,
        action="review_completed",
    ).all()
    for l in logs:
        dropped += l.details.get("dropped_by_verifier", 0)

    # Top flagged texts
    text_counter: Counter = Counter()
    for f in all_findings:
        if f.flagged_text:
            text_counter[(f.flagged_text[:60], f.type.value)] += 1
    top_flagged = [
        {"type": t, "text": txt, "count": cnt}
        for (txt, t), cnt in text_counter.most_common(10)
    ]

    # Top rules
    rules = db.query(BrandRule).filter_by(org_id=user.org_id).all()
    rule_map = {r.id: r for r in rules}
    rule_stats: dict[int, dict] = {}
    for f in all_findings:
        if f.rule_id:
            s = rule_stats.setdefault(f.rule_id, {"triggered": 0, "accepted": 0, "rejected": 0})
            s["triggered"] += 1
            if f.status == FindingStatus.accepted:
                s["accepted"] += 1
            elif f.status == FindingStatus.rejected:
                s["rejected"] += 1

    top_rules = sorted(
        [
            {
                "rule_id": rid,
                "pattern": rule_map[rid].pattern if rid in rule_map else "?",
                **stats,
            }
            for rid, stats in rule_stats.items()
        ],
        key=lambda x: x["triggered"],
        reverse=True,
    )[:10]

    ambiguous_rules = [
        {**r, "hint": "Reviewers reject this rule often — consider revising it."}
        for r in top_rules
        if r["rejected"] >= 2 and r["rejected"] >= r["accepted"]
    ]

    return InsightsOut(
        submissions={"total": total_subs, "approved": approved_subs},
        findings={
            "total": total_findings,
            "by_type": by_type,
            "by_severity": by_severity,
            "by_status": by_status,
        },
        acceptance_rate=acceptance_rate,
        ai_findings={
            "total": len(ai_all),
            "rejected_by_reviewers": ai_rejected,
            "false_positive_rate": fpr,
            "dropped_by_verifier": dropped,
        },
        top_flagged=top_flagged,
        top_rules=top_rules,
        ambiguous_rules=ambiguous_rules,
    )
