"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import type { Submission, SubmissionRevision } from "@/lib/types";
import AuthenticatedImage from "@/components/AuthenticatedImage";
import {
  FindingStatusBadge,
  SeverityBadge,
  SubmissionStatusBadge,
  TypeBadge,
  ConfidencePill,
  ClaimStateBadge,
} from "@/components/Badges";
import PipelineProgress from "@/components/PipelineProgress";
import { fmtDate, errMsg } from "@/lib/ui";
import {
  ArrowLeft,
  RotateCw,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Sparkles,
  BookOpen,
  Image as ImageIcon,
  MessageSquare,
  Zap,
  Edit3,
  X,
  ShieldAlert,
} from "lucide-react";

export default function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = Number(resolvedParams.id);

  const [sub, setSub] = useState<Submission | null>(null);
  const [revisions, setRevisions] = useState<SubmissionRevision[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedFindingId, setSelectedFindingId] = useState<number | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"interactive" | "diff" | "edit" | "image">("interactive");
  const [commentText, setCommentText] = useState("");
  const [showOverlays, setShowOverlays] = useState(true);

  // Inline editing state
  const [editingText, setEditingText] = useState("");

  // Force override modal state
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");

  useEffect(() => {
    let ignore = false;
    async function fetchInitial() {
      try {
        const [data, revisionData] = await Promise.all([
          api.getSubmission(id),
          api.listRevisions(id),
        ]);
        if (!ignore) {
          setSub(data);
          setRevisions(revisionData);
          setEditingText(data.current_text || data.original_text || "");
          if (data.findings && data.findings.length > 0) {
            setSelectedFindingId(data.findings[0].id);
          }
          setLoading(false);
        }
      } catch (err) {
        if (!ignore) {
          setError(errMsg(err));
          setLoading(false);
        }
      }
    }
    fetchInitial();
    return () => {
      ignore = true;
    };
  }, [id]);

  const submissionStatus = sub?.status;
  useEffect(() => {
    if (!submissionStatus || !["pending", "processing"].includes(submissionStatus)) return;
    let active = true;
    async function refreshUntilComplete() {
      try {
        const updated = await api.getSubmission(id);
        if (!active) return;
        setSub(updated);
        setEditingText(updated.current_text || updated.original_text || "");
        if (!["pending", "processing"].includes(updated.status)) {
          setRevisions(await api.listRevisions(id));
        }
      } catch (err) {
        if (active) setError(errMsg(err));
      }
    }
    void refreshUntilComplete();
    const interval = setInterval(refreshUntilComplete, 1500);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [id, submissionStatus]);

  async function handleAcceptFinding(fid: number, suggestedText?: string) {
    setActionLoading(`accept-${fid}`);
    try {
      const updated = await api.acceptFinding(id, fid, suggestedText);
      setSub(updated);
      setEditingText(updated.current_text || updated.original_text || "");
      setRevisions(await api.listRevisions(id));
    } catch (err) {
      alert("Error accepting finding: " + errMsg(err));
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRejectFinding(fid: number) {
    setActionLoading(`reject-${fid}`);
    try {
      const updated = await api.rejectFinding(id, fid);
      setSub(updated);
      setEditingText(updated.current_text || updated.original_text || "");
      setRevisions(await api.listRevisions(id));
    } catch (err) {
      alert("Error dismissing finding: " + errMsg(err));
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReopenFinding(fid: number) {
    setActionLoading(`reopen-${fid}`);
    try {
      const updated = await api.reopenFinding(id, fid);
      setSub(updated);
      setEditingText(updated.current_text || updated.original_text || "");
      setRevisions(await api.listRevisions(id));
    } catch (err) {
      alert("Error reopening finding: " + errMsg(err));
    } finally {
      setActionLoading(null);
    }
  }

  async function handleAcceptAll() {
    if (!confirm("Apply all proposed AI fixes to this content?")) return;
    setActionLoading("accept-all");
    try {
      const updated = await api.acceptAll(id);
      setSub(updated);
      setEditingText(updated.current_text || updated.original_text || "");
      setRevisions(await api.listRevisions(id));
    } catch (err) {
      alert("Error accepting all fixes: " + errMsg(err));
    } finally {
      setActionLoading(null);
    }
  }

  async function handleSaveEdit() {
    if (!editingText.trim()) return;
    setActionLoading("save-edit");
    try {
      const updated = await api.editSubmission(id, editingText);
      setSub(updated);
      setRevisions(await api.listRevisions(id));
      setViewMode("interactive");
      alert("Content updated, previous approval invalidated, and compliance checks restarted.");
    } catch (err) {
      alert("Error saving edits: " + errMsg(err));
    } finally {
      setActionLoading(null);
    }
  }

  async function handleApprove(force: boolean = false, reason?: string) {
    const hasHighUnresolved = sub?.findings.some(
      (f) => f.severity === "high" && (f.status === "open" || f.status === "rejected")
    );

    if (hasHighUnresolved && !force) {
      setShowOverrideModal(true);
      return;
    }

    setActionLoading("approve");
    try {
      const updated = await api.approve(id, force, reason);
      setSub(updated);
      setShowOverrideModal(false);
      setOverrideReason("");
    } catch (err) {
      alert("Error approving submission: " + errMsg(err));
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRequestChanges() {
    const note = prompt("Enter revision instructions for the author:") || "Please address flagged compliance findings.";
    setActionLoading("request-changes");
    try {
      const updated = await api.requestChanges(id, note);
      setSub(updated);
    } catch (err) {
      alert("Error: " + errMsg(err));
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRerun() {
    setActionLoading("rerun");
    try {
      await api.rerun(id);
      setSub((current) => current ? { ...current, status: "processing" } : current);
    } catch (err) {
      alert("Error re-running audit: " + errMsg(err));
    } finally {
      setActionLoading(null);
    }
  }

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentText.trim()) return;
    setActionLoading("comment");
    try {
      await api.comment(id, commentText.trim());
      setCommentText("");
      alert("Feedback logged in immutable audit trail.");
    } catch (err) {
      alert("Error logging comment: " + errMsg(err));
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: "80px 0", textAlign: "center", color: "var(--text-muted)" }}>
        <div className="pulse-dot" style={{ fontSize: 32, marginBottom: 12 }}>🛡️</div>
        <div>Loading compliance audit workspace...</div>
      </div>
    );
  }

  if (error || !sub) {
    return (
      <div style={{ maxWidth: 540, margin: "60px auto", textAlign: "center" }}>
        <div className="card" style={{ borderColor: "var(--punch-border)" }}>
          <AlertTriangle size={32} color="var(--inkloom-punch)" style={{ margin: "0 auto 12px" }} />
          <h2 style={{ color: "var(--status-danger-text)", marginBottom: 6 }}>Unable to Load Submission</h2>
          <p style={{ color: "var(--text-secondary)", marginBottom: 20 }}>{error || "Submission record not found."}</p>
          <Link href="/" className="btn btn-primary">Return to Dashboard</Link>
        </div>
      </div>
    );
  }

  const findings = sub.findings || [];
  const openCount = findings.filter((f) => f.status === "open").length;
  const acceptedCount = findings.filter((f) => f.status === "accepted").length;
  const rejectedCount = findings.filter((f) => f.status === "rejected").length;
  const highSevOpen = findings.filter((f) => f.severity === "high" && f.status === "open").length;
  const reviewPending = sub.status === "pending" || sub.status === "processing";

  const filteredFindings = findings.filter((f) => {
    const sevMatch = filterSeverity === "all" || f.severity === filterSeverity;
    const statusMatch = filterStatus === "all" || f.status === filterStatus;
    return sevMatch && statusMatch;
  });

  // Render text with interactive spans
  function renderHighlightedText(content: string) {
    if (!content) return <span style={{ color: "var(--text-muted)" }}>No text content</span>;

    const textFindings = findings
      .filter((f) => f.start_offset !== null && f.end_offset !== null && f.start_offset < f.end_offset)
      .sort((a, b) => (a.start_offset || 0) - (b.start_offset || 0));

    if (textFindings.length === 0) {
      return <span>{content}</span>;
    }

    const elements: React.ReactNode[] = [];
    let lastIdx = 0;

    textFindings.forEach((f, idx) => {
      const start = f.start_offset!;
      const end = f.end_offset!;

      if (start > lastIdx && start <= content.length) {
        elements.push(<span key={`text-${lastIdx}`}>{content.slice(lastIdx, start)}</span>);
      }

      const isSelected = selectedFindingId === f.id;
      const isAccepted = f.status === "accepted";
      const isRejected = f.status === "rejected";

      let highlightBg = "var(--status-danger-bg)";
      let highlightBorder = "var(--punch-border)";
      let textColor = "var(--inkloom-navy)";

      if (f.severity === "medium") {
        highlightBg = "var(--status-warning-bg)";
        highlightBorder = "var(--status-warning-border)";
      } else if (f.severity === "low") {
        highlightBg = "var(--status-info-bg)";
        highlightBorder = "var(--frosted-border)";
      }

      if (isAccepted) {
        highlightBg = "var(--status-success-bg)";
        highlightBorder = "var(--status-success-border)";
      } else if (isRejected) {
        highlightBg = "#EAEFF2";
        highlightBorder = "#D1DDE3";
        textColor = "var(--text-muted)";
      }

      elements.push(
        <mark
          key={`finding-${f.id}-${idx}`}
          onClick={() => setSelectedFindingId(f.id)}
          style={{
            backgroundColor: highlightBg,
            borderBottom: `2.5px solid ${highlightBorder}`,
            color: textColor,
            textDecoration: isAccepted ? "line-through" : "none",
            opacity: isRejected ? 0.65 : 1,
            padding: "2px 6px",
            borderRadius: 4,
            cursor: "pointer",
            fontWeight: isSelected ? 800 : 600,
            outline: isSelected ? "2px solid var(--inkloom-cerulean)" : "none",
            transition: "all var(--transition-fast)",
          }}
          title={`${f.type} (${f.severity}): ${f.message}`}
        >
          {content.slice(start, Math.min(end, content.length))}
        </mark>
      );
      lastIdx = Math.max(lastIdx, end);
    });

    if (lastIdx < content.length) {
      elements.push(<span key={`text-${lastIdx}`}>{content.slice(lastIdx)}</span>);
    }

    return elements;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Top Header Card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="card"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
          padding: "18px 24px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Link
            href="/"
            className="btn btn-secondary"
            style={{ padding: "6px 12px", fontSize: 13 }}
          >
            <ArrowLeft size={14} />
            <span>Dashboard</span>
          </Link>
          <div style={{ height: 24, width: 1, backgroundColor: "var(--border)" }} />
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h1 style={{ fontSize: 18, fontWeight: 800, color: "var(--inkloom-navy)" }}>
                {sub.title || `Submission #${sub.id}`}
              </h1>
              <SubmissionStatusBadge value={sub.status} />
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--inkloom-navy)",
                  backgroundColor: "var(--bg-subtle)",
                  border: "1px solid var(--border)",
                  padding: "2px 6px",
                  borderRadius: 4,
                }}
              >
                v{sub.version || 1}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                ID #{sub.id} • Audited on {fmtDate(sub.created_at)}
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--punch-red)", backgroundColor: "var(--punch-dim)", padding: "1px 6px", borderRadius: 4 }}>
                {openCount} open
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--status-success-text)", backgroundColor: "var(--status-success-bg)", padding: "1px 6px", borderRadius: 4 }}>
                {acceptedCount} applied
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", backgroundColor: "var(--bg-subtle)", padding: "1px 6px", borderRadius: 4 }}>
                {rejectedCount} dismissed
              </span>
              {highSevOpen > 0 && (
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--punch-red)", border: "1px solid var(--punch-border)", padding: "1px 6px", borderRadius: 4 }}>
                  {highSevOpen} high-severity
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button
            onClick={handleRerun}
            disabled={!!actionLoading || reviewPending}
            className="btn btn-secondary"
            title="Re-run pipeline against current guidelines"
          >
            <RotateCw size={14} />
            <span>Re-Audit</span>
          </button>

          <button
            onClick={handleRequestChanges}
            disabled={!!actionLoading || sub.status === "approved" || reviewPending}
            className="btn btn-secondary"
            style={{ color: "var(--status-warning-text)" }}
          >
            <AlertTriangle size={14} />
            <span>Request Revisions</span>
          </button>

          <button
            onClick={() => handleApprove(false)}
            disabled={!!actionLoading || sub.status === "approved" || reviewPending}
            className="btn btn-success"
          >
            <CheckCircle2 size={15} />
            <span>{sub.status === "approved" ? "Approved" : "Approve Content"}</span>
          </button>
        </div>
      </motion.div>

      {/* 9-Stage Animated Pipeline Stepper */}
      <PipelineProgress
        status={sub.status}
        findingsCount={findings.length}
        hasImage={sub.has_image}
      />

      {/* Main Split Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.15fr 0.85fr",
          gap: 20,
          alignItems: "start",
        }}
      >
        {/* Left Column: Document & Copy Inspector */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 16, minHeight: 640 }}>
          {/* View Mode Toggle */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: 12 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setViewMode("interactive")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 12px",
                  borderRadius: "var(--radius-sm)",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 700,
                  backgroundColor: viewMode === "interactive" ? "var(--inkloom-cerulean)" : "var(--bg-subtle)",
                  color: viewMode === "interactive" ? "#FFFFFF" : "var(--text-secondary)",
                }}
              >
                <FileText size={14} />
                <span>Original & Flagged Spans</span>
              </button>

              <button
                onClick={() => setViewMode("diff")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 12px",
                  borderRadius: "var(--radius-sm)",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 700,
                  backgroundColor: viewMode === "diff" ? "var(--inkloom-cerulean)" : "var(--bg-subtle)",
                  color: viewMode === "diff" ? "#FFFFFF" : "var(--text-secondary)",
                }}
              >
                <Sparkles size={14} />
                <span>Clean Revised Draft</span>
              </button>

              <button
                onClick={() => setViewMode("edit")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 12px",
                  borderRadius: "var(--radius-sm)",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 700,
                  backgroundColor: viewMode === "edit" ? "var(--inkloom-cerulean)" : "var(--bg-subtle)",
                  color: viewMode === "edit" ? "#FFFFFF" : "var(--text-secondary)",
                }}
              >
                <Edit3 size={14} />
                <span>Edit Copy</span>
              </button>

              {sub.has_image && (
                <button
                  onClick={() => setViewMode("image")}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 12px",
                    borderRadius: "var(--radius-sm)",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 700,
                    backgroundColor: viewMode === "image" ? "var(--inkloom-cerulean)" : "var(--bg-subtle)",
                    color: viewMode === "image" ? "#FFFFFF" : "var(--text-secondary)",
                  }}
                >
                  <ImageIcon size={14} />
                  <span>Visual Creative & OCR</span>
                </button>
              )}
            </div>

            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Click any highlight to view citation
            </span>
          </div>

          {viewMode === "interactive" && (
            <div
              style={{
                backgroundColor: "var(--bg-subtle)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                padding: "24px",
                fontSize: 15,
                lineHeight: 1.8,
                whiteSpace: "pre-wrap",
                fontFamily: "inherit",
                minHeight: 400,
                color: "var(--inkloom-navy)",
              }}
            >
              {renderHighlightedText(sub.original_text)}
            </div>
          )}

          {viewMode === "diff" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: "var(--status-success-text)" }}>
                <CheckCircle2 size={15} />
                <span>Output with Accepted AI Fixes Applied:</span>
              </div>
              <div
                style={{
                  backgroundColor: "var(--status-success-bg)",
                  border: "1px solid var(--status-success-border)",
                  borderRadius: "var(--radius-sm)",
                  padding: "24px",
                  fontSize: 15,
                  lineHeight: 1.8,
                  whiteSpace: "pre-wrap",
                  fontFamily: "inherit",
                  minHeight: 400,
                  color: "var(--inkloom-navy)",
                }}
              >
                {sub.current_text || sub.original_text}
              </div>
            </div>
          )}

          {viewMode === "edit" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--inkloom-navy)" }}>
                  Direct Manual Editing (Increments Version & Invalidates Prior Approval)
                </span>
                <button
                  onClick={handleSaveEdit}
                  disabled={actionLoading === "save-edit" || reviewPending}
                  className="btn btn-primary"
                  style={{ fontSize: 12, padding: "5px 12px" }}
                >
                  Save & Re-evaluate
                </button>
              </div>
              <textarea
                rows={14}
                value={editingText}
                onChange={(e) => setEditingText(e.target.value)}
                style={{
                  lineHeight: 1.6,
                  fontFamily: "inherit",
                  fontSize: 14.5,
                  resize: "vertical",
                }}
              />
            </div>
          )}

          {viewMode === "image" && sub.has_image && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                  Uploaded creative with OpenCV detected regions & color clusters
                </span>
                <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={showOverlays}
                    onChange={(e) => setShowOverlays(e.target.checked)}
                  />
                  <span>Show Vision Bounding Boxes</span>
                </label>
              </div>

              <div
                style={{
                  position: "relative",
                  borderRadius: "var(--radius-sm)",
                  overflow: "hidden",
                  border: "1px solid var(--border)",
                  backgroundColor: "#F0F3F8",
                  textAlign: "center",
                }}
              >
                <AuthenticatedImage
                  src={api.imageUrl(sub.id)}
                  alt="Submission Creative"
                  style={{ maxWidth: "100%", maxHeight: 500, objectFit: "contain", display: "inline-block" }}
                />
                {showOverlays &&
                  findings
                    .filter((f) => f.region)
                    .map((f) => {
                      const r = f.region!;
                      const left = `${(r.x / r.img_w) * 100}%`;
                      const top = `${(r.y / r.img_h) * 100}%`;
                      const width = `${(r.w / r.img_w) * 100}%`;
                      const height = `${(r.h / r.img_h) * 100}%`;
                      const isSel = selectedFindingId === f.id;
                      return (
                        <div
                          key={`box-${f.id}`}
                          onClick={() => setSelectedFindingId(f.id)}
                          style={{
                            position: "absolute",
                            left,
                            top,
                            width,
                            height,
                            border: isSel ? "3px solid var(--inkloom-cerulean)" : "2px solid var(--punch-border)",
                            backgroundColor: "rgba(230, 57, 70, 0.15)",
                            cursor: "pointer",
                            boxShadow: isSel ? "0 0 10px rgba(69, 123, 157, 0.6)" : "none",
                          }}
                          title={f.message}
                        />
                      );
                    })}
              </div>
            </div>
          )}

          {/* Quick Reviewer Log / Comment */}
          <form
            onSubmit={handleAddComment}
            style={{
              display: "flex",
              gap: 8,
              marginTop: "auto",
              paddingTop: 16,
              borderTop: "1px solid var(--border)",
            }}
          >
            <input
              type="text"
              placeholder="Add reviewer feedback or compliance notes to audit log..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              style={{ flex: 1 }}
            />
            <button
              type="submit"
              disabled={!commentText.trim()}
              className="btn btn-secondary"
              style={{ fontSize: 12 }}
            >
              <MessageSquare size={14} />
              <span>Log Note</span>
            </button>
          </form>
        </div>

        {/* Right Column: Findings Inspector & AI Fix Engine */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Filter Bar */}
          <div className="card" style={{ padding: "14px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: "var(--inkloom-navy)" }}>
                Compliance Findings ({findings.length})
              </span>
              <div style={{ display: "flex", gap: 6 }}>
                <select
                  value={filterSeverity}
                  onChange={(e) => setFilterSeverity(e.target.value)}
                  style={{ padding: "4px 8px", fontSize: 11 }}
                >
                  <option value="all">All Severities</option>
                  <option value="high">High Severity</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  style={{ padding: "4px 8px", fontSize: 11 }}
                >
                  <option value="all">All Statuses</option>
                  <option value="open">Open Only</option>
                  <option value="accepted">Fix Applied</option>
                  <option value="rejected">Dismissed</option>
                </select>
              </div>
            </div>

            {openCount > 0 && (
              <button
                onClick={handleAcceptAll}
                disabled={!!actionLoading || reviewPending}
                className="btn btn-primary"
                style={{ fontSize: 12, width: "100%", justifyContent: "center" }}
              >
                <Zap size={14} />
                <span>Apply All Proposed Fixes ({openCount})</span>
              </button>
            )}
          </div>

          {/* Finding Cards */}
          {filteredFindings.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: "44px 20px" }}>
              <CheckCircle2 size={32} color="var(--status-success-text)" style={{ margin: "0 auto 8px" }} />
              <p style={{ fontWeight: 700, color: "var(--inkloom-navy)" }}>No findings match your filter</p>
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                {findings.length === 0 ? "Content passed all compliance checks with zero violations!" : "Adjust filters to view all issues."}
              </p>
            </div>
          ) : (
            filteredFindings.map((f, fIdx) => {
              const isSelected = selectedFindingId === f.id;
              const hasFix = !!f.fix;
              const isBusy = actionLoading?.includes(String(f.id));

              // Check if finding is a claim and parse explicit state
              const isClaim = f.type === "claim" || f.message.startsWith("[");
              let claimState = "contradicted";
              if (f.message.includes("[SUPPORTED]")) claimState = "supported";
              else if (f.message.includes("[UNSUPPORTED]")) claimState = "unsupported";
              else if (f.message.includes("[UNCERTAIN]")) claimState = "uncertain";

              return (
                <motion.div
                  key={f.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: fIdx * 0.04 }}
                  onClick={() => setSelectedFindingId(f.id)}
                  className="card"
                  style={{
                    cursor: "pointer",
                    borderColor: isSelected ? "var(--inkloom-cerulean)" : "var(--border)",
                    boxShadow: isSelected ? "var(--shadow-cerulean)" : "var(--shadow-sm)",
                    backgroundColor: isSelected ? "#FFFFFF" : "var(--bg-surface)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                    padding: 16,
                    transition: "all var(--transition-fast)",
                  }}
                >
                  {/* Card Header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                      <TypeBadge value={f.type} />
                      <SeverityBadge value={f.severity} />
                      <FindingStatusBadge value={f.status} />
                    </div>
                    <ConfidencePill value={f.confidence} />
                  </div>

                  {/* Explicit Claim State Badge if applicable */}
                  {isClaim && (
                    <div style={{ marginTop: -2 }}>
                      <ClaimStateBadge state={claimState} />
                    </div>
                  )}

                  {/* Flagged Snippet & Explanation */}
                  <div>
                    {f.flagged_text && (
                      <div
                        style={{
                          fontSize: 12,
                          fontFamily: "var(--font-mono, monospace)",
                          color: "var(--status-danger-text)",
                          backgroundColor: "var(--status-danger-bg)",
                          padding: "4px 8px",
                          borderRadius: 4,
                          display: "inline-block",
                          marginBottom: 6,
                          fontWeight: 600,
                        }}
                      >
                        &ldquo;{f.flagged_text}&rdquo;
                      </div>
                    )}
                    <p style={{ fontSize: 13, color: "var(--inkloom-navy)", fontWeight: 600, lineHeight: 1.5 }}>
                      {f.message.replace(/^\[[A-Z_]+\]\s*/, "")}
                    </p>
                  </div>

                  {/* Evidence Citation from RAG */}
                  {f.evidence_quote && (
                    <div
                      style={{
                        padding: "10px 12px",
                        backgroundColor: "var(--cerulean-dim)",
                        borderLeft: "3px solid var(--inkloom-cerulean)",
                        borderRadius: "0 6px 6px 0",
                        fontSize: 12,
                      }}
                    >
                      <div style={{ fontWeight: 700, color: "var(--inkloom-navy)", marginBottom: 4, display: "flex", alignItems: "center", gap: 5 }}>
                        <BookOpen size={13} color="var(--inkloom-cerulean)" />
                        <span>Verified Brand Knowledge Citation:</span>
                      </div>
                      <p style={{ color: "var(--text-secondary)", fontStyle: "italic", lineHeight: 1.5 }}>
                        &ldquo;{f.evidence_quote}&rdquo;
                      </p>
                      {f.citation_title && (
                        <div style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 4 }}>
                          Source: {f.citation_title} {f.citation_page ? `(Page ${f.citation_page})` : ""}
                        </div>
                      )}
                    </div>
                  )}

                  {/* AI Fix Suggestion Box */}
                  {hasFix && (
                    <div
                      style={{
                        padding: "12px",
                        borderRadius: "var(--radius-sm)",
                        backgroundColor: "var(--status-success-bg)",
                        border: "1px solid var(--status-success-border)",
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--status-success-text)", textTransform: "uppercase" }}>
                          ⚡ Suggested Replacement
                        </span>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
                        <div style={{ color: "var(--status-danger-text)", textDecoration: "line-through", opacity: 0.85 }}>
                          - {f.fix?.original_text}
                        </div>
                        <div style={{ color: "var(--status-success-text)", fontWeight: 700 }}>
                          + {f.fix?.suggested_text}
                        </div>
                      </div>

                      {f.fix?.rationale && (
                        <p style={{ fontSize: 11, color: "var(--text-muted)", fontStyle: "italic" }}>
                          {f.fix.rationale}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 6, borderTop: "1px solid var(--border)" }}>
                    {f.status === "open" ? (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRejectFinding(f.id);
                          }}
                          disabled={isBusy || reviewPending}
                          className="btn btn-secondary"
                          style={{ fontSize: 12, padding: "5px 10px" }}
                        >
                          Dismiss
                        </button>
                        {hasFix && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAcceptFinding(f.id, f.fix?.suggested_text);
                            }}
                            disabled={isBusy || reviewPending}
                            className="btn btn-success"
                            style={{ fontSize: 12, padding: "5px 12px" }}
                          >
                            <CheckCircle2 size={13} />
                            <span>Accept Fix</span>
                          </button>
                        )}
                      </>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReopenFinding(f.id);
                        }}
                        disabled={isBusy || reviewPending}
                        className="btn btn-ghost"
                        style={{ fontSize: 11, padding: "4px 8px" }}
                      >
                        ↺ Reopen Issue
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      <section className="card" aria-labelledby="revision-history-heading">
        <h2 id="revision-history-heading" style={{ fontSize: 16, fontWeight: 800, color: "var(--inkloom-navy)", marginBottom: 12 }}>
          Content revision history
        </h2>
        {revisions.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>No saved revision snapshots are available.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {revisions.map((revision) => (
              <details key={revision.id} style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "10px 12px" }}>
                <summary style={{ cursor: "pointer", fontSize: 13, fontWeight: 700, color: "var(--inkloom-navy)" }}>
                  Version {revision.version} · {revision.reason} · {fmtDate(revision.created_at)}
                </summary>
                <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", marginTop: 10, fontSize: 12, color: "var(--text-secondary)" }}>
                  {revision.text}
                </pre>
              </details>
            ))}
          </div>
        )}
      </section>

      {/* Manager Force Override Modal */}
      <AnimatePresence>
        {showOverrideModal && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(29, 53, 87, 0.45)",
              backdropFilter: "blur(4px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 200,
              padding: 20,
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="card"
              style={{
                maxWidth: 480,
                width: "100%",
                padding: "26px",
                display: "flex",
                flexDirection: "column",
                gap: 16,
                boxShadow: "var(--shadow-lg)",
                borderColor: "var(--punch-border)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <ShieldAlert size={20} color="var(--inkloom-punch)" />
                  <h3 style={{ fontSize: 17, fontWeight: 800, color: "var(--inkloom-navy)" }}>
                    Manager Force Approval Required
                  </h3>
                </div>
                <button
                  onClick={() => setShowOverrideModal(false)}
                  style={{ border: "none", background: "none", cursor: "pointer", color: "var(--text-muted)" }}
                >
                  <X size={18} />
                </button>
              </div>

              <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                This submission contains <strong style={{ color: "var(--status-danger-text)" }}>unresolved or dismissed high-severity compliance findings</strong>. As a governance safeguard, approvals with high-severity violations require a mandatory justification recorded in the immutable audit log.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 12.5, fontWeight: 700, color: "var(--inkloom-navy)" }}>
                  Mandatory Force Override Justification *
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g., Legal team granted executive waiver under license #4892..."
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  style={{ fontSize: 13 }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
                <button
                  type="button"
                  onClick={() => setShowOverrideModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!overrideReason.trim()}
                  onClick={() => handleApprove(true, overrideReason.trim())}
                  className="btn btn-danger"
                >
                  Confirm Force Approval
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
