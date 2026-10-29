"""Pydantic schemas — the API contract shared with the frontend."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from app.models import SubmissionStatus, FindingType, Severity, FindingStatus, RuleKind


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class FixOut(ORM):
    id: int
    original_text: str
    suggested_text: str
    rationale: str


class RegionOut(ORM):
    x: int
    y: int
    w: int
    h: int
    img_w: int
    img_h: int


class FindingOut(ORM):
    id: int
    type: FindingType
    severity: Severity
    status: FindingStatus
    start_offset: Optional[int] = None
    end_offset: Optional[int] = None
    flagged_text: str
    message: str
    evidence_quote: Optional[str] = None
    evidence_chunk_id: Optional[int] = None
    citation_title: Optional[str] = None
    citation_page: Optional[int] = None
    confidence: float
    verified: bool
    fix: Optional[FixOut] = None
    region: Optional[RegionOut] = None


class SubmissionCreate(BaseModel):
    title: str = "Untitled"
    text: str


class SubmissionOut(ORM):
    id: int
    title: str
    original_text: str
    current_text: str
    status: SubmissionStatus
    version: int = 1
    approved_text: Optional[str] = None
    created_at: datetime
    has_image: bool = False
    findings: list[FindingOut] = []


class SubmissionRevisionOut(ORM):
    id: int
    version: int
    text: str
    reason: str
    created_by: Optional[int] = None
    created_at: datetime


class SubmissionListItem(ORM):
    id: int
    title: str
    status: SubmissionStatus
    created_at: datetime


class RuleCreate(BaseModel):
    kind: RuleKind
    pattern: str
    replacement: Optional[str] = None
    severity: Severity = Severity.medium
    description: str = ""


class RuleOut(ORM, RuleCreate):
    id: int
    active: bool


class BrandDocumentOut(ORM):
    id: int
    title: str
    doc_type: str
    created_at: datetime


class SearchHitOut(BaseModel):
    chunk_id: int
    doc_id: int
    doc_title: str
    page: Optional[int] = None
    text: str
    score: float


class AuditEntryOut(ORM):
    id: int
    submission_id: Optional[int] = None
    user_id: Optional[int] = None
    action: str
    details: dict
    created_at: datetime


class BrandAssetOut(ORM):
    id: int
    kind: str
    name: str
    data: dict
    created_at: datetime


class InsightsOut(BaseModel):
    submissions: dict
    findings: dict
    acceptance_rate: Optional[float] = None
    ai_findings: dict
    top_flagged: list
    top_rules: list
    ambiguous_rules: list
