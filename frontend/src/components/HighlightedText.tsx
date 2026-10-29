"use client";

import type { Finding } from "@/lib/types";

interface HighlightedTextProps {
  content: string;
  findings: Finding[];
  selectedFindingId?: number | null;
  onSelectFinding?: (id: number) => void;
}

export default function HighlightedText({
  content,
  findings,
  selectedFindingId,
  onSelectFinding,
}: HighlightedTextProps) {
  if (!content) {
    return <span style={{ color: "var(--text-muted)" }}>No text content</span>;
  }

  // Filter findings that have valid offsets
  const validFindings = findings
    .filter((f) => f.start_offset !== null && f.end_offset !== null && f.start_offset < f.end_offset)
    .sort((a, b) => (a.start_offset || 0) - (b.start_offset || 0));

  if (validFindings.length === 0) {
    return (
      <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.8, fontSize: 14.5, color: "var(--text-main)" }}>
        {content}
      </div>
    );
  }

  const elements: React.ReactNode[] = [];
  let lastIndex = 0;

  validFindings.forEach((f, idx) => {
    const start = f.start_offset!;
    const end = f.end_offset!;

    if (start < lastIndex) {
      // Overlapping span, skip or append remainder
      return;
    }

    if (start > lastIndex) {
      elements.push(
        <span key={`text-${lastIndex}`}>{content.slice(lastIndex, start)}</span>
      );
    }

    const isSelected = selectedFindingId === f.id;
    const isAccepted = f.status === "accepted";
    const isRejected = f.status === "rejected";
    const isHigh = f.severity === "high";

    let bg = "rgba(230, 57, 70, 0.14)";
    let border = "1px solid var(--punch-border)";
    let textColor = "var(--punch-red)";

    if (isAccepted) {
      bg = "var(--status-success-bg)";
      border = "1px solid var(--status-success-border)";
      textColor = "var(--status-success-text)";
    } else if (isRejected) {
      bg = "rgba(29, 53, 87, 0.08)";
      border = "1px solid var(--border)";
      textColor = "var(--text-muted)";
    } else if (!isHigh) {
      bg = "rgba(69, 123, 157, 0.12)";
      border = "1px solid var(--frosted-border)";
      textColor = "var(--cerulean)";
    }

    elements.push(
      <mark
        key={`finding-${f.id}-${idx}`}
        onClick={() => onSelectFinding?.(f.id)}
        style={{
          backgroundColor: bg,
          color: textColor,
          border: isSelected ? "2px solid var(--cerulean)" : border,
          borderRadius: 4,
          padding: "2px 4px",
          margin: "0 1px",
          cursor: "pointer",
          fontWeight: isSelected ? 700 : 600,
          boxShadow: isSelected ? "0 0 0 2px var(--frosted-blue)" : "none",
          transition: "all 0.15s ease",
          textDecoration: isRejected ? "line-through" : "none",
        }}
        title={`Finding #${f.id}: ${f.message}`}
      >
        {content.slice(start, end)}
      </mark>
    );

    lastIndex = end;
  });

  if (lastIndex < content.length) {
    elements.push(
      <span key={`text-end`}>{content.slice(lastIndex)}</span>
    );
  }

  return (
    <div
      style={{
        whiteSpace: "pre-wrap",
        lineHeight: 1.8,
        fontSize: 14.5,
        color: "var(--text-main)",
        fontFamily: "inherit",
      }}
    >
      {elements}
    </div>
  );
}

