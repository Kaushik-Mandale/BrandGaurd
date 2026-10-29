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
            <span>Governance & Compliance Records</span>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--oxford-navy)", letterSpacing: "-0.035em" }}>
            Audit Trail & Decision History
          </h1>
          <p style={{ color: "var(--text-secondary)", marginTop: 6, maxWidth: 640, fontSize: 14.5 }}>
            Every submission, rule trigger, AI proposal, reviewer sign-off, force override, and revision is persistently recorded for regulatory accountability.
          </p>
        </div>
        <button onClick={loadAudit} className="btn btn-secondary" style={{ padding: "10px 18px" }}>
          <RotateCw size={14} />
          <span>Refresh History</span>
        </button>
      </motion.div>

      {error && (
        <div style={{ padding: "14px 18px", borderRadius: "var(--radius-sm)", backgroundColor: "var(--status-danger-bg)", border: "1px solid var(--punch-border)", color: "var(--status-danger-text)", fontSize: 13 }}>
          ⚠ {error}
        </div>
      )}

      {/* Main Audit List */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="card"
        style={{ display: "flex", flexDirection: "column", gap: 20 }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--oxford-navy)" }}>
            Activity Stream ({filtered.length})
          </h2>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {[
              { id: "all", label: "All Events" },
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
                  backgroundColor: filterAction === f.id ? "var(--cerulean)" : "var(--bg-subtle)",
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
              let badgeColor = "var(--status-info-text)";
              let badgeBg = "var(--status-info-bg)";
              let Icon = FileText;

              if (entry.action.includes("accept") || entry.action.includes("approve")) {
                badgeColor = "var(--status-success-text)";
                badgeBg = "var(--status-success-bg)";
                Icon = CheckCircle2;
              } else if (entry.action.includes("reject") || entry.action.includes("fail")) {
                badgeColor = "var(--status-danger-text)";
                badgeBg = "var(--status-danger-bg)";
                Icon = XCircle;
              } else if (entry.action.includes("comment")) {
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
                    padding: "14px 18px",
                    borderRadius: "var(--radius-sm)",
                    backgroundColor: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    boxShadow: "var(--shadow-xs)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      cursor: "pointer",
                    }}
                    onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          backgroundColor: badgeBg,
                          color: badgeColor,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <Icon size={16} />
                      </span>

                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--oxford-navy)" }}>
                            {entry.action.replace(/_/g, " ").toUpperCase()}
                          </span>
                          {entry.submission_id && (
                            <Link
                              href={`/review/${entry.submission_id}`}
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                fontSize: 12,
                                color: "var(--cerulean)",
                                fontWeight: 600,
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
                        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                          {fmtDate(entry.created_at)}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        {isExpanded ? "Collapse" : "Details"}
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
                        style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border-subtle)" }}
                      >
                        <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--text-muted)", marginBottom: 4 }}>
                          EVENT METADATA & ACTOR RECORD:
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
