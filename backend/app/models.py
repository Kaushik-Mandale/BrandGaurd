import enum
from datetime import datetime, timezone

from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    String, Text, Integer, Float, Boolean, DateTime, ForeignKey, Enum, JSON, UniqueConstraint
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.config import settings
from app.db import Base


# ── Enums ──────────────────────────────────────────────────────────────────────
class SubmissionStatus(str, enum.Enum):
    pending = "pending"
    processing = "processing"
    in_review = "in_review"
    changes_requested = "changes_requested"
    approved = "approved"
    failed = "failed"


class FindingType(str, enum.Enum):
    terminology = "terminology"
    regex = "regex"
    number_date = "number_date"
    readability = "readability"
    claim = "claim"
    tone = "tone"
    logo = "logo"
    palette = "palette"
    contrast = "contrast"


class Severity(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"


class FindingStatus(str, enum.Enum):
    open = "open"
    accepted = "accepted"
    rejected = "rejected"


class RuleKind(str, enum.Enum):
    banned_term = "banned_term"
    preferred_term = "preferred_term"
    required_text = "required_text"
    regex = "regex"


def now():
    return datetime.now(timezone.utc)


# ── Tables ─────────────────────────────────────────────────────────────────────
class Organization(Base):
    __tablename__ = "organizations"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    org_id: Mapped[int] = mapped_column(ForeignKey("organizations.id"))
    name: Mapped[str] = mapped_column(String(200))
    email: Mapped[str] = mapped_column(String(200), unique=True)
    role: Mapped[str] = mapped_column(String(50), default="creator")
    password_hash: Mapped[str | None] = mapped_column(String(256), nullable=True)
    token_version: Mapped[int] = mapped_column(Integer, default=0, nullable=False)


class BrandDocument(Base):
    __tablename__ = "brand_documents"
    id: Mapped[int] = mapped_column(primary_key=True)
    org_id: Mapped[int] = mapped_column(ForeignKey("organizations.id"), index=True)
    title: Mapped[str] = mapped_column(String(300))
    doc_type: Mapped[str] = mapped_column(String(50), default="guideline")
    file_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)

    chunks = relationship("BrandChunk", back_populates="document", cascade="all, delete-orphan")


class BrandChunk(Base):
    __tablename__ = "brand_chunks"
    id: Mapped[int] = mapped_column(primary_key=True)
    org_id: Mapped[int] = mapped_column(ForeignKey("organizations.id"), index=True)
    document_id: Mapped[int] = mapped_column(ForeignKey("brand_documents.id"), index=True)
    page: Mapped[int | None] = mapped_column(Integer, nullable=True)
    chunk_index: Mapped[int] = mapped_column(Integer, default=0)
    text: Mapped[str] = mapped_column(Text)
    embedding = mapped_column(Vector(settings.EMBEDDING_DIM))

    document = relationship("BrandDocument", back_populates="chunks")


class BrandRule(Base):
    __tablename__ = "brand_rules"
    id: Mapped[int] = mapped_column(primary_key=True)
    org_id: Mapped[int] = mapped_column(ForeignKey("organizations.id"), index=True)
    kind: Mapped[RuleKind] = mapped_column(Enum(RuleKind))
    pattern: Mapped[str] = mapped_column(String(500))
    replacement: Mapped[str | None] = mapped_column(String(500), nullable=True)
    severity: Mapped[Severity] = mapped_column(Enum(Severity), default=Severity.medium)
    description: Mapped[str] = mapped_column(Text, default="")
    source_doc_id: Mapped[int | None] = mapped_column(ForeignKey("brand_documents.id"), nullable=True)
    source_page: Mapped[int | None] = mapped_column(Integer, nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)


class Submission(Base):
    __tablename__ = "submissions"
    id: Mapped[int] = mapped_column(primary_key=True)
    org_id: Mapped[int] = mapped_column(ForeignKey("organizations.id"), index=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    title: Mapped[str] = mapped_column(String(300), default="Untitled")
    original_text: Mapped[str] = mapped_column(Text)
    current_text: Mapped[str] = mapped_column(Text)
    file_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    status: Mapped[SubmissionStatus] = mapped_column(Enum(SubmissionStatus), default=SubmissionStatus.pending)
    version: Mapped[int] = mapped_column(Integer, default=1)
    approved_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)

    findings = relationship("Finding", back_populates="submission", cascade="all, delete-orphan")
    revisions = relationship("SubmissionRevision", back_populates="submission", cascade="all, delete-orphan")


class SubmissionRevision(Base):
    __tablename__ = "submission_revisions"
    __table_args__ = (UniqueConstraint("submission_id", "version", name="uq_submission_revision_version"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    submission_id: Mapped[int] = mapped_column(ForeignKey("submissions.id"), index=True)
    version: Mapped[int] = mapped_column(Integer)
    text: Mapped[str] = mapped_column(Text)
    reason: Mapped[str] = mapped_column(String(300), default="Content revision")
    created_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)

    submission = relationship("Submission", back_populates="revisions")


class Finding(Base):
    __tablename__ = "findings"
    id: Mapped[int] = mapped_column(primary_key=True)
    submission_id: Mapped[int] = mapped_column(ForeignKey("submissions.id"), index=True)
    type: Mapped[FindingType] = mapped_column(Enum(FindingType))
    severity: Mapped[Severity] = mapped_column(Enum(Severity), default=Severity.medium)
    status: Mapped[FindingStatus] = mapped_column(Enum(FindingStatus), default=FindingStatus.open)

    start_offset: Mapped[int | None] = mapped_column(Integer, nullable=True)
    end_offset: Mapped[int | None] = mapped_column(Integer, nullable=True)
    flagged_text: Mapped[str] = mapped_column(Text, default="")
    message: Mapped[str] = mapped_column(Text)
    rule_id: Mapped[int | None] = mapped_column(ForeignKey("brand_rules.id"), nullable=True)
    evidence_chunk_id: Mapped[int | None] = mapped_column(ForeignKey("brand_chunks.id"), nullable=True)
    evidence_quote: Mapped[str | None] = mapped_column(Text, nullable=True)
    confidence: Mapped[float] = mapped_column(Float, default=1.0)
    verified: Mapped[bool] = mapped_column(Boolean, default=False)

    submission = relationship("Submission", back_populates="findings")
    fix = relationship("Fix", back_populates="finding", uselist=False, cascade="all, delete-orphan")
    region = relationship("FindingRegion", back_populates="finding", uselist=False, cascade="all, delete-orphan")


class Fix(Base):
    __tablename__ = "fixes"
    id: Mapped[int] = mapped_column(primary_key=True)
    finding_id: Mapped[int] = mapped_column(ForeignKey("findings.id"), unique=True)
    original_text: Mapped[str] = mapped_column(Text)
    suggested_text: Mapped[str] = mapped_column(Text)
    rationale: Mapped[str] = mapped_column(Text, default="")

    finding = relationship("Finding", back_populates="fix")


class AuditLog(Base):
    __tablename__ = "audit_log"
    id: Mapped[int] = mapped_column(primary_key=True)
    org_id: Mapped[int] = mapped_column(ForeignKey("organizations.id"), index=True)
    submission_id: Mapped[int | None] = mapped_column(ForeignKey("submissions.id"), nullable=True, index=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    action: Mapped[str] = mapped_column(String(100))
    details: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)


class FindingRegion(Base):
    __tablename__ = "finding_regions"
    id: Mapped[int] = mapped_column(primary_key=True)
    finding_id: Mapped[int] = mapped_column(ForeignKey("findings.id"), unique=True)
    x: Mapped[int] = mapped_column(Integer)
    y: Mapped[int] = mapped_column(Integer)
    w: Mapped[int] = mapped_column(Integer)
    h: Mapped[int] = mapped_column(Integer)
    img_w: Mapped[int] = mapped_column(Integer)
    img_h: Mapped[int] = mapped_column(Integer)

    finding = relationship("Finding", back_populates="region")


class BrandAsset(Base):
    __tablename__ = "brand_assets"
    id: Mapped[int] = mapped_column(primary_key=True)
    org_id: Mapped[int] = mapped_column(ForeignKey("organizations.id"), index=True)
    kind: Mapped[str] = mapped_column(String(30))
    name: Mapped[str] = mapped_column(String(200))
    file_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    data: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)
