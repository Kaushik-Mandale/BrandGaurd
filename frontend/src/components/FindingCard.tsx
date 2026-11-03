"use client";

import { useState } from "react";
import type { Finding } from "@/lib/types";
import { FindingStatusBadge, SeverityBadge, TypeBadge, ClaimStateBadge } from "./Badges";
import { Edit3, Check, X, ShieldCheck } from "lucide-react";

interface Props {
  finding: Finding;
  selected: boolean;
  busy: boolean;
  editable: boolean;
  onSelect: () => void;
  onAccept: (customText?: string) => void;
  onReject: () => void;
  onReopen: () => void;
}

export default function FindingCard({
  finding: f,
  selected,
  busy,
  editable,
  onSelect,
  onAccept,
  onReject,
  onReopen,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(f.fix?.suggested_text ?? "");

  const hasSpan = f.start_offset !== null && f.end_offset !== null;
  const isAppend = hasSpan && f.start_offset === f.end_offset;
  const resolved = f.status !== "open";
  const canAct = editable && f.status === "open";

  // Claim verdict determination
  const isClaim = f.type === "claim" || f.message.startsWith("[");
  let claimState = "contradicted";
  if (f.message.includes("[SUPPORTED]")) claimState = "supported";
  else if (f.message.includes("[UNSUPPORTED]")) claimState = "unsupported";
  else if (f.message.includes("[UNCERTAIN]")) claimState = "uncertain";

  const cleanMessage = f.message.replace(/^\[[A-Z_]+\]\s*/, "");

  return (
    <div
      id={`card-${f.id}`}
      onClick={onSelect}
      className="card"
      style={{
        cursor: "pointer",
        padding: "20px",
        borderColor: selected ? "var(--cerulean)" : resolved ? "#E2E8F0" : "var(--border)",
        borderLeft: selected
          ? "4px solid var(--cerulean)"
          : f.severity === "high"
          ? "4px solid var(--punch-red)"
          : f.severity === "medium"
          ? "4px solid #D69E2E"
          : "4px solid var(--frosted-blue)",
        boxShadow: selected ? "var(--shadow-cerulean)" : "var(--shadow-sm)",
        backgroundColor: resolved ? "#FAFCFA" : "#FFFFFF",
        opacity: resolved ? 0.85 : 1,
        transition: "all var(--transition-fast)",
      }}
    >
      {/* ── Header: Badges & Severity ──────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
          <TypeBadge value={f.type} />
          <SeverityBadge value={f.severity} />
          <FindingStatusBadge value={f.status} />
        </div>

        {isClaim && (
          <div>
            <ClaimStateBadge state={claimState} />
          </div>
        )}
      </div>

      {/* ── Section 1: What was found ───────────────────────────────────────── */}
      <div style={{ marginTop: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          What was found
        </div>
        {!isAppend && f.flagged_text ? (
          <div
            style={{
              marginTop: 4,
              fontSize: 14,
              fontWeight: 700,
              color: "var(--oxford-navy)",
              backgroundColor: "var(--honeydew)",
              padding: "6px 10px",
              borderRadius: 6,
              border: "1px solid var(--border)",
              display: "inline-block",
            }}
          >
            “{f.flagged_text}”
          </div>
        ) : (
          <div style={{ marginTop: 4, fontSize: 13, color: "var(--text-secondary)", fontStyle: "italic" }}>
            Missing required text or disclaimer
          </div>
        )}
      </div>

      {/* ── Section 2: Why it matters ───────────────────────────────────────── */}
      <div style={{ marginTop: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Why it matters
        </div>
        <p style={{ marginTop: 4, fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
          {cleanMessage}
        </p>
      </div>

      {/* ── Section 3: What supports this finding (Evidence/Guideline) ──────── */}
      {(f.evidence_quote || f.citation_title) && (
        <div
          style={{
            marginTop: 12,
            borderRadius: 8,
            backgroundColor: "var(--cerulean-dim)",
            border: "1px solid var(--frosted-border)",
            padding: "10px 14px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, fontWeight: 700, color: "var(--oxford-navy)" }}>
            <ShieldCheck size={14} color="var(--cerulean)" />
            <span>
              Evidence Reference: {f.citation_title ?? "Approved Brand Guidelines"}
              {f.citation_page ? ` (Page ${f.citation_page})` : ""}
            </span>
          </div>
          {f.evidence_quote && (
            <p style={{ marginTop: 4, fontSize: 12, color: "var(--text-secondary)", fontStyle: "italic", lineHeight: 1.45 }}>
              “{f.evidence_quote}”
            </p>
          )}
        </div>
      )}

      {/* ── Section 4: How to fix it (Recommended Correction) ───────────────── */}
      {f.fix && (
        <div
          style={{
            marginTop: 12,
            borderRadius: 8,
            backgroundColor: "#F8FAFC",
            border: "1px solid #E2E8F0",
            padding: "10px 14px",
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Recommended Correction
          </div>

          {!editing ? (
            <div style={{ marginTop: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "var(--status-success-text)",
                    backgroundColor: "var(--status-success-bg)",
                    padding: "3px 8px",
                    borderRadius: 4,
                  }}
                >
                  {f.fix.suggested_text}
                </span>

                {canAct && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditing(true);
                    }}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "var(--cerulean)",
                      cursor: "pointer",
                      fontSize: 11.5,
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: 3,
                    }}
                  >
                    <Edit3 size={12} />
                    <span>Customize edit</span>
                  </button>
                )}
              </div>

              {f.fix.rationale && (
                <p style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 4 }}>
                  {f.fix.rationale}
                </p>
              )}
            </div>
          ) : (
            <div style={{ marginTop: 8 }} onClick={(e) => e.stopPropagation()}>
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                style={{
                  width: "100%",
                  padding: "6px 10px",
                  fontSize: 13,
                  borderRadius: 6,
                  border: "1px solid var(--border)",
                }}
              />
              <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                <button
                  type="button"
                  onClick={() => {
                    onAccept(draft);
                    setEditing(false);
                  }}
                  className="btn btn-primary"
                  style={{ fontSize: 11.5, padding: "4px 10px" }}
                >
                  Save & Apply
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="btn btn-secondary"
                  style={{ fontSize: 11.5, padding: "4px 10px" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Section 5: Review Actions ───────────────────────────────────────── */}
      <div
        style={{
          marginTop: 16,
          paddingTop: 12,
          borderTop: "1px solid var(--border-subtle)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 10,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {resolved ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>
              {f.status === "accepted" ? "Fix has been applied to text." : "Finding dismissed by reviewer."}
            </span>
            {editable && (
              <button
                type="button"
                onClick={() => onReopen()}
                disabled={busy}
                className="btn btn-secondary"
                style={{ fontSize: 11.5, padding: "4px 10px" }}
              >
                Reopen Finding
              </button>
            )}
          </div>
        ) : canAct ? (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", width: "100%" }}>
            {f.fix && (
              <button
                type="button"
                onClick={() => onAccept()}
                disabled={busy}
                className="btn btn-primary"
                style={{ fontSize: 12, padding: "6px 14px" }}
              >
                <Check size={14} />
                <span>Apply Suggested Fix</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onAccept()}
              disabled={busy}
              className="btn btn-secondary"
              style={{ fontSize: 12, padding: "6px 12px" }}
            >
              <span>Accept Finding</span>
            </button>

            <button
              type="button"
              onClick={() => onReject()}
              disabled={busy}
              className="btn"
              style={{
                fontSize: 12,
                padding: "6px 12px",
                backgroundColor: "transparent",
                border: "1px solid var(--border)",
                color: "var(--punch-red)",
              }}
            >
              <X size={14} />
              <span>Dismiss Finding</span>
            </button>
          </div>
        ) : (
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
            Review closed
          </span>
        )}
      </div>
    </div>
  );
}
