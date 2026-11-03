"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import type { AuditEntry } from "@/lib/types";
import { fmtDate, errMsg } from "@/lib/ui";
import {
  ShieldCheck,
  RotateCw,
  ArrowRight,
  CheckCircle2,
  XCircle,
  FileText,
  MessageSquare,
  ChevronDown,
  Sparkles,
  AlertTriangle,
  User,
} from "lucide-react";

export default function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterAction, setFilterAction] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const loadAudit = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.audit();
      setEntries(data);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    async function fetchInitial() {
      try {
        const data = await api.audit();
        if (!ignore) {
          setEntries(data);
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
  }, []);

  const filtered = entries.filter((e) => {
    if (filterAction === "all") return true;
    return e.action.toLowerCase().includes(filterAction.toLowerCase());
  });

  function getEventSummary(entry: AuditEntry): { title: string; subtitle?: string; isCleanPass?: boolean } {
    const d = (entry.details || {}) as Record<string, unknown>;
    const action = entry.action.toLowerCase();

    if (action === "review_completed" || action === "audit_pipeline_completed") {
      const findingsCount = Number(d.findings ?? d.findings_count ?? 0);
      const droppedCount = Number(d.dropped_by_verifier ?? 0);
      if (findingsCount === 0) {
        return {
          title: "Clean Baseline Pass — 0 Violations Detected",
          subtitle: "Content fully satisfied all active brand rules, approved claims, and formatting standards with zero false positives.",
          isCleanPass: true,
        };
      }
      return {
        title: `Compliance Review Completed — ${findingsCount} Violation${findingsCount > 1 ? "s" : ""} Flagged`,
        subtitle: `${d.rule_findings ?? 0} Rule violations · ${d.ai_findings ?? 0} AI findings · ${d.vision_findings ?? 0} Vision checks · ${droppedCount} dropped by verifier`,
      };
    }

    if (action === "submission_created") {
      return {
        title: `Submission Created: “${d.title || "Untitled"}”`,
        subtitle: `${d.char_count ?? 0} characters queued for compliance intake`,
      };
    }

    if (action === "submission_approved") {
      return {
        title: "Content Approved for Publication",
        subtitle: `Approved by ${d.approved_by || "Reviewer"}${d.override ? " (with managerial override: " + d.override_reason + ")" : ""}`,
      };
    }

    if (action === "changes_requested") {
      return {
        title: "Changes Requested by Reviewer",
        subtitle: String(d.note || d.reason || "Revisions required before brand signoff"),
      };
    }

    if (action === "finding_accepted") {
      return {
        title: "AI Suggested Fix Applied",
        subtitle: d.suggested_text ? `Replaced with: “${d.suggested_text}”` : "Proposed correction adopted",
      };
    }

    if (action === "finding_rejected") {
      return {
        title: "Finding Dismissed by Reviewer",
        subtitle: "Reviewer deemed proposed finding non-actionable or intentional exception",
      };
    }

    if (action === "comment_added") {
      return {
        title: "Reviewer Feedback Logged",
        subtitle: String(d.text || "Compliance note recorded"),
      };
    }

    return {
      title: entry.action.replace(/_/g, " ").toUpperCase(),
      subtitle: JSON.stringify(d).slice(0, 100),
    };
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      {/* Editorial Banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
          padding: "32px 36px",
          borderRadius: "var(--radius-lg)",
          backgroundColor: "#FFFFFF",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-sm)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: "linear-gradient(90deg, var(--oxford-navy) 0%, var(--cerulean) 50%, var(--frosted-blue) 100%)",
          }}
        />

        <div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11.5,
              fontWeight: 700,
              color: "var(--cerulean)",
              backgroundColor: "var(--cerulean-dim)",
              padding: "4px 12px",
              borderRadius: "var(--radius-full)",
              marginBottom: 10,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            <ShieldCheck size={13} color="var(--cerulean)" />
            <span>Immutable Governance Record</span>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--oxford-navy)", letterSpacing: "-0.035em" }}>
            Audit Trail &amp; Decision History
          </h1>
          <p style={{ color: "var(--text-secondary)", marginTop: 6, maxWidth: 640, fontSize: 14.5 }}>
            Tamper-evident log of all compliance pipeline runs, evidence verification verdicts, reviewer approvals, manual revisions, and feedback events.
          </p>
        </div>
        <button onClick={loadAudit} className="btn btn-secondary" style={{ padding: "10px 18px" }}>
          <RotateCw size={14} />
          <span>Refresh Trail</span>
        </button>
      </motion.div>

      {error && (
        <div style={{ padding: "14px 18px", borderRadius: "var(--radius-sm)", backgroundColor: "var(--status-danger-bg)", border: "1px solid var(--punch-border)", color: "var(--status-danger-text)", fontSize: 13 }}>
          ⚠ {error}
        </div>
      )}

      {/* Audit Log Card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card"
        style={{ display: "flex", flexDirection: "column", gap: 20 }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--oxford-navy)" }}>
            Logged Audit Events ({filtered.length})
          </span>

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {[
              { id: "all", label: "All Events" },
              { id: "completed", label: "Reviews" },
              { id: "accept", label: "Accepted Fixes" },
              { id: "reject", label: "Dismissals" },
              { id: "approve", label: "Approvals" },
              { id: "comment", label: "Feedback" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilterAction(f.id)}
                style={{
                  padding: "6px 14px",
                  borderRadius: 6,
                  border: "1px solid var(--border)",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: filterAction === f.id ? 700 : 500,
                  backgroundColor: filterAction === f.id ? "var(--oxford-navy)" : "var(--bg-subtle)",
                  color: filterAction === f.id ? "#FFFFFF" : "var(--text-secondary)",
                  transition: "all var(--transition-fast)",
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ padding: "60px 0", textAlign: "center", color: "var(--text-muted)" }}>
            <div className="pulse-dot" style={{ fontSize: 24, marginBottom: 8 }}>📜</div>
            <div>Loading audit records from database...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-muted)" }}>
            No audit records found matching your filter.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map((entry, idx) => {
              const summary = getEventSummary(entry);

              let badgeColor = "var(--status-info-text)";
              let badgeBg = "var(--status-info-bg)";
              let Icon = FileText;

              if (summary.isCleanPass || entry.action.includes("approve")) {
                badgeColor = "var(--status-success-text)";
                badgeBg = "var(--status-success-bg)";
                Icon = CheckCircle2;
              } else if (entry.action.includes("accept")) {
                badgeColor = "var(--status-success-text)";
                badgeBg = "var(--status-success-bg)";
                Icon = Sparkles;
              } else if (entry.action.includes("reject") || entry.action.includes("fail")) {
                badgeColor = "var(--punch-red)";
                badgeBg = "var(--punch-dim)";
                Icon = XCircle;
              } else if (entry.action.includes("changes_requested")) {
                badgeColor = "var(--status-warning-text, #D97706)";
                badgeBg = "var(--status-warning-bg, #FEF3C7)";
                Icon = AlertTriangle;
              } else if (entry.action.includes("comment")) {
                badgeColor = "var(--cerulean)";
                badgeBg = "var(--cerulean-dim)";
                Icon = MessageSquare;
              }

              const isExpanded = expandedId === entry.id;

              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: idx * 0.02 }}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    padding: "16px 20px",
                    borderRadius: "var(--radius-sm)",
                    backgroundColor: isExpanded ? "#FFFFFF" : "var(--bg-card)",
                    border: isExpanded ? "1px solid var(--cerulean)" : "1px solid var(--border)",
                    boxShadow: isExpanded ? "var(--shadow-cerulean)" : "var(--shadow-xs)",
                    transition: "all var(--transition-fast)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      cursor: "pointer",
                      gap: 12,
                    }}
                    onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                      <span
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 8,
                          backgroundColor: badgeBg,
                          color: badgeColor,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          marginTop: 2,
                        }}
                      >
                        <Icon size={18} />
                      </span>

                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--oxford-navy)" }}>
                            {summary.title}
                          </span>
                          <span
                            style={{
                              fontSize: 10.5,
                              fontWeight: 700,
                              textTransform: "uppercase",
                              padding: "2px 7px",
                              borderRadius: 4,
                              backgroundColor: "var(--bg-subtle)",
                              color: "var(--text-muted)",
                              border: "1px solid var(--border)",
                            }}
                          >
                            {entry.action.replace(/_/g, " ")}
                          </span>
                          {entry.submission_id && (
                            <Link
                              href={`/review/${entry.submission_id}`}
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                fontSize: 12,
                                color: "var(--cerulean)",
                                fontWeight: 700,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 3,
                              }}
                            >
                              <span>Audit #{entry.submission_id}</span>
                              <ArrowRight size={11} />
                            </Link>
                          )}
                        </div>

                        {summary.subtitle && (
                          <div style={{ fontSize: 12.5, color: "var(--text-secondary)", marginTop: 4, lineHeight: 1.4 }}>
                            {summary.subtitle}
                          </div>
                        )}

                        <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 11.5, color: "var(--text-muted)", marginTop: 6 }}>
                          <span>{fmtDate(entry.created_at)}</span>
                          {entry.user_id && (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                              <User size={11} />
                              <span>Actor ID #{entry.user_id}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0, marginTop: 4 }}>
                      <span style={{ fontSize: 11.5, color: "var(--text-muted)", fontWeight: 600 }}>
                        {isExpanded ? "Collapse" : "Inspect Payload"}
                      </span>
                      <ChevronDown
                        size={14}
                        style={{
                          transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                          transition: "transform 0.2s ease",
                          color: "var(--text-muted)",
                        }}
                      />
                    </div>
                  </div>

                  {/* Expandable JSON Metadata */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border-subtle)" }}
                      >
                        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                          Persisted Telemetry &amp; Verification Payload:
                        </div>
                        <pre
                          style={{
                            margin: 0,
                            padding: 12,
                            borderRadius: 6,
                            backgroundColor: "var(--bg-subtle)",
                            border: "1px solid var(--border)",
                            fontSize: 12,
                            fontFamily: "var(--font-mono, monospace)",
                            color: "var(--oxford-navy)",
                            overflowX: "auto",
                          }}
                        >
                          {JSON.stringify(entry.details, null, 2)}
                        </pre>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}
