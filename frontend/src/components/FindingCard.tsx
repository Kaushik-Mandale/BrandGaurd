"use client";

import { useState } from "react";
import type { Finding } from "@/lib/types";
import { FindingStatusBadge, SeverityBadge, TypeBadge, Badge } from "./Badges";
import { Edit3, Check, X } from "lucide-react";

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

  return (
    <div
      id={`card-${f.id}`}
      onClick={onSelect}
      className="card"
      style={{
        cursor: "pointer",
        padding: "18px",
        borderColor: selected ? "var(--cerulean)" : "var(--border)",
        boxShadow: selected ? "var(--shadow-cerulean)" : "var(--shadow-sm)",
        opacity: resolved ? 0.78 : 1,
        transition: "all var(--transition-fast)",
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
        <TypeBadge value={f.type} />
        <SeverityBadge value={f.severity} />
        <FindingStatusBadge value={f.status} />
        {!f.verified && <Badge className="badge-low">unverified</Badge>}
        {f.confidence < 1 && (
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
            AI confidence {Math.round(f.confidence * 100)}%
          </span>
        )}
      </div>

      {!isAppend && f.flagged_text && (
        <p style={{ marginTop: 10, fontSize: 13.5, fontWeight: 700, color: "var(--oxford-navy)" }}>
          “{f.flagged_text}”
        </p>
      )}
      <p style={{ marginTop: 4, fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
        {f.message}
      </p>

      {(f.evidence_quote || f.citation_title) && (
        <div
          style={{
            marginTop: 10,
            borderRadius: 6,
            borderLeft: "3px solid var(--cerulean)",
            backgroundColor: "var(--cerulean-dim)",
            padding: "8px 12px",
            fontSize: 12,
            color: "var(--text-secondary)",
          }}
        >
          <div style={{ fontWeight: 700, color: "var(--oxford-navy)" }}>
            Evidence: {f.citation_title ?? "Approved brand guidelines"}
            {f.citation_page ? ` · p.${f.citation_page}` : ""}
          </div>
          {f.evidence_quote && <p style={{ marginTop: 4, fontStyle: "italic" }}>“{f.evidence_quote}”</p>}
        </div>
      )}

      {f.fix && (
        <div
          style={{
            marginTop: 12,
            borderRadius: 6,
            border: "1px solid var(--status-success-border)",
            backgroundColor: "var(--status-success-bg)",
            padding: "10px 12px",
            fontSize: 12,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 700, color: "var(--status-success-text)" }}>
              Suggested fix: “{draft}”
            </span>
            {canAct && !editing && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditing(true);
                }}
                className="btn btn-ghost"
                style={{ fontSize: 11, padding: "2px 6px" }}
                title="Edit suggested correction"
              >
                <Edit3 size={12} />
                <span>Customize</span>
              </button>
            )}
          </div>

          {editing ? (
            <div style={{ marginTop: 8, display: "flex", gap: 6 }} onClick={(e) => e.stopPropagation()}>
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                style={{ flex: 1, padding: "4px 8px", fontSize: 12 }}
              />
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="btn btn-secondary"
                style={{ padding: "4px 8px", fontSize: 11 }}
              >
                <Check size={12} />
              </button>
              <button
                type="button"
                onClick={() => {
                  setDraft(f.fix?.suggested_text ?? "");
                  setEditing(false);
                }}
                className="btn btn-ghost"
                style={{ padding: "4px 6px", fontSize: 11 }}
              >
                <X size={12} />
              </button>
            </div>
          ) : (
            f.fix.rationale && (
              <div style={{ marginTop: 4, color: "var(--text-muted)", fontSize: 11 }}>
                {f.fix.rationale}
              </div>
            )
          )}
        </div>
      )}

      {canAct && (
        <div style={{ marginTop: 14, display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            type="button"
            disabled={busy}
            onClick={(e) => {
              e.stopPropagation();
              onReject();
            }}
            className="btn btn-secondary"
            style={{ fontSize: 11.5, padding: "5px 10px" }}
          >
            Dismiss
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={(e) => {
              e.stopPropagation();
              onAccept(draft !== f.fix?.suggested_text ? draft : undefined);
            }}
            className="btn btn-primary"
            style={{ fontSize: 11.5, padding: "5px 12px" }}
          >
            Apply Fix
          </button>
        </div>
      )}

      {resolved && (
        <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
          <button
            type="button"
            disabled={busy}
            onClick={(e) => {
              e.stopPropagation();
              onReopen();
            }}
            className="btn btn-ghost"
            style={{ fontSize: 11, padding: "2px 8px" }}
          >
            Reopen Finding
          </button>
        </div>
      )}
    </div>
  );
}
