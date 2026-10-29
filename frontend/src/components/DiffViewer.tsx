"use client";

import { ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";

interface DiffViewerProps {
  originalText: string;
  currentText: string;
  flaggedText?: string;
  suggestedText?: string;
  title?: string;
}

export default function DiffViewer({
  originalText,
  currentText,
  flaggedText,
  suggestedText,
  title = "Content Revision Comparison",
}: DiffViewerProps) {
  const hasChanges = originalText !== currentText || (flaggedText && suggestedText);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        padding: 20,
        backgroundColor: "var(--bg-card)",
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--border)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h4 style={{ fontSize: 13.5, fontWeight: 700, color: "var(--oxford-navy)", margin: 0 }}>
          {title}
        </h4>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            padding: "3px 9px",
            borderRadius: 9999,
            backgroundColor: hasChanges ? "var(--status-info-bg)" : "var(--bg-subtle)",
            color: hasChanges ? "var(--cerulean)" : "var(--text-muted)",
            border: `1px solid ${hasChanges ? "var(--frosted-border)" : "var(--border)"}`,
          }}
        >
          {hasChanges ? "Proposed Intent-Preserving Fix" : "Identical Content"}
        </span>
      </div>

      {flaggedText && suggestedText !== undefined && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            gap: 14,
            alignItems: "center",
            padding: "14px 16px",
            backgroundColor: "var(--honeydew)",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border)",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--punch-red)", textTransform: "uppercase" }}>
              Original Violation
            </span>
            <div
              style={{
                fontFamily: "var(--font-mono, monospace)",
                fontSize: 13,
                color: "var(--punch-red)",
                backgroundColor: "var(--punch-dim)",
                padding: "8px 12px",
                borderRadius: 6,
                border: "1px solid var(--punch-border)",
                textDecoration: "line-through",
              }}
            >
              {flaggedText || "(empty text)"}
            </div>
          </div>

          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              backgroundColor: "var(--cerulean)",
              color: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ArrowRight size={16} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--status-success-text)", textTransform: "uppercase" }}>
              Compliant Replacement
            </span>
            <div
              style={{
                fontFamily: "var(--font-mono, monospace)",
                fontSize: 13,
                color: "var(--status-success-text)",
                backgroundColor: "var(--status-success-bg)",
                padding: "8px 12px",
                borderRadius: 6,
                border: "1px solid var(--status-success-border)",
                fontWeight: 600,
              }}
            >
              {suggestedText || "(remove phrase)"}
            </div>
          </div>
        </div>
      )}

      {/* Side-by-Side Full Text View */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            padding: 14,
            borderRadius: "var(--radius-sm)",
            backgroundColor: "var(--bg-subtle)",
            border: "1px solid var(--border)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, fontWeight: 700, color: "var(--text-muted)" }}>
            <AlertCircle size={13} color="var(--punch-red)" />
            <span>ORIGINAL SUBMISSION</span>
          </div>
          <div
            style={{
              fontSize: 13,
              lineHeight: 1.6,
              color: "var(--text-main)",
              whiteSpace: "pre-wrap",
              maxHeight: 220,
              overflowY: "auto",
            }}
          >
            {originalText}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            padding: 14,
            borderRadius: "var(--radius-sm)",
            backgroundColor: "var(--bg-subtle)",
            border: "1px solid var(--border)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, fontWeight: 700, color: "var(--status-success-text)" }}>
            <CheckCircle2 size={13} color="var(--status-success-text)" />
            <span>CURRENT / CORRECTED COPY</span>
          </div>
          <div
            style={{
              fontSize: 13,
              lineHeight: 1.6,
              color: "var(--text-main)",
              whiteSpace: "pre-wrap",
              maxHeight: 220,
              overflowY: "auto",
            }}
          >
            {currentText}
          </div>
        </div>
      </div>
    </div>
  );
}

