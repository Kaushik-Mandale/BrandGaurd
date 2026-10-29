"use client";

import type { ReactNode } from "react";
import type { FindingStatus, Severity, SubmissionStatus } from "@/lib/types";
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  Palette,
  Eye,
  Type,
  Hash,
  Sparkles,
} from "lucide-react";

export function Badge({
  children,
  className = "",
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span className={`badge ${className}`} style={style}>
      {children}
    </span>
  );
}

export function SeverityBadge({ value }: { value: Severity }) {
  if (value === "high") {
    return (
      <Badge className="badge-high">
        <AlertTriangle size={11} strokeWidth={2.5} />
        <span>High</span>
      </Badge>
    );
  }
  if (value === "medium") {
    return (
      <Badge className="badge-medium">
        <AlertCircle size={11} strokeWidth={2.5} />
        <span>Medium</span>
      </Badge>
    );
  }
  return (
    <Badge className="badge-low">
      <Info size={11} strokeWidth={2.5} />
      <span>Low</span>
    </Badge>
  );
}

export function FindingStatusBadge({ value }: { value: FindingStatus }) {
  if (value === "accepted") {
    return (
      <Badge className="badge-accepted">
        <CheckCircle2 size={11} strokeWidth={2.5} />
        <span>Fix Applied</span>
      </Badge>
    );
  }
  if (value === "rejected") {
    return (
      <Badge className="badge-rejected">
        <XCircle size={11} strokeWidth={2} />
        <span>Dismissed</span>
      </Badge>
    );
  }
  return (
    <Badge className="badge-open">
      <Clock size={11} strokeWidth={2.5} />
      <span>Open Issue</span>
    </Badge>
  );
}

export function SubmissionStatusBadge({ value }: { value: SubmissionStatus }) {
  switch (value) {
    case "approved":
      return (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            padding: "4px 10px",
            borderRadius: 9999,
            backgroundColor: "var(--status-success-bg)",
            color: "var(--status-success-text)",
            border: "1px solid var(--status-success-border)",
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          <CheckCircle2 size={13} strokeWidth={2.5} />
          <span>Approved</span>
        </span>
      );
    case "in_review":
      return (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            padding: "4px 10px",
            borderRadius: 9999,
            backgroundColor: "var(--frosted-dim)",
            color: "var(--inkloom-navy)",
            border: "1px solid var(--frosted-border)",
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          <AlertCircle size={13} strokeWidth={2.5} />
          <span>In Review</span>
        </span>
      );
    case "processing":
      return (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            padding: "4px 10px",
            borderRadius: 9999,
            backgroundColor: "var(--status-info-bg)",
            color: "var(--status-info-text)",
            border: "1px solid var(--frosted-border)",
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          <Clock size={13} className="pulse-dot" />
          <span>Auditing...</span>
        </span>
      );
    case "changes_requested":
      return (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            padding: "4px 10px",
            borderRadius: 9999,
            backgroundColor: "var(--status-warning-bg)",
            color: "var(--status-warning-text)",
            border: "1px solid var(--status-warning-border)",
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          <AlertTriangle size={13} strokeWidth={2.5} />
          <span>Revisions Needed</span>
        </span>
      );
    default:
      return (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            padding: "4px 10px",
            borderRadius: 9999,
            backgroundColor: "var(--bg-subtle)",
            color: "var(--text-secondary)",
            border: "1px solid var(--border)",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {value.replace(/_/g, " ")}
        </span>
      );
  }
}

export function ClaimStateBadge({ state }: { state: string }) {
  const norm = state.toLowerCase();
  if (norm.includes("support") && !norm.includes("unsupport")) {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          padding: "3px 8px",
          borderRadius: 6,
          backgroundColor: "var(--status-success-bg)",
          color: "var(--status-success-text)",
          border: "1px solid var(--status-success-border)",
          fontSize: 11,
          fontWeight: 700,
          textTransform: "uppercase",
        }}
      >
        <CheckCircle2 size={11} /> Supported by Evidence
      </span>
    );
  }
  if (norm.includes("contradict")) {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          padding: "3px 8px",
          borderRadius: 6,
          backgroundColor: "var(--status-danger-bg)",
          color: "var(--status-danger-text)",
          border: "1px solid var(--punch-border)",
          fontSize: 11,
          fontWeight: 700,
          textTransform: "uppercase",
        }}
      >
        <XCircle size={11} /> Contradicted by Facts
      </span>
    );
  }
  if (norm.includes("unsupport")) {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          padding: "3px 8px",
          borderRadius: 6,
          backgroundColor: "var(--status-warning-bg)",
          color: "var(--status-warning-text)",
          border: "1px solid var(--status-warning-border)",
          fontSize: 11,
          fontWeight: 700,
          textTransform: "uppercase",
        }}
      >
        <AlertTriangle size={11} /> Unsupported Claim
      </span>
    );
  }
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "3px 8px",
        borderRadius: 6,
        backgroundColor: "var(--status-info-bg)",
        color: "var(--status-info-text)",
        border: "1px solid var(--frosted-border)",
        fontSize: 11,
        fontWeight: 700,
        textTransform: "uppercase",
      }}
    >
      <Info size={11} /> Uncertain / Ambiguous
    </span>
  );
}

export function TypeBadge({ value }: { value: string }) {
  let Icon = FileText;
  if (value === "terminology") Icon = Type;
  else if (value === "regex" || value === "number_date") Icon = Hash;
  else if (value === "claim") Icon = Sparkles;
  else if (value === "logo") Icon = Eye;
  else if (value === "palette" || value === "contrast") Icon = Palette;

  return (
    <Badge className="badge-type">
      <Icon size={12} color="var(--inkloom-cerulean)" />
      <span>{value.replace(/_/g, " ")}</span>
    </Badge>
  );
}

export function ConfidencePill({ value }: { value: number }) {
  if (value >= 1) return null;
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        color: "var(--text-muted)",
        backgroundColor: "var(--bg-subtle)",
        padding: "2px 6px",
        borderRadius: 4,
        border: "1px solid var(--border)",
      }}
    >
      {Math.round(value * 100)}% confidence
    </span>
  );
}
