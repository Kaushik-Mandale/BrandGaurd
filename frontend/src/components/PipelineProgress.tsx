"use client";

import { CheckCircle2, Clock, AlertTriangle, ShieldCheck, FileText, Palette, UserCheck, Award } from "lucide-react";
import type { SubmissionStatus } from "@/lib/types";

interface PipelineStage {
  id: number;
  label: string;
  description: string;
  icon: typeof FileText;
}

const STAGES: PipelineStage[] = [
  { id: 1, label: "Content Submitted", description: "Copy or asset ingested", icon: FileText },
  { id: 2, label: "Brand Rules Checked", description: "Terminology & formatting", icon: ShieldCheck },
  { id: 3, label: "Claims Verified", description: "Evidence fact-checking", icon: ShieldCheck },
  { id: 4, label: "Visual Identity Checked", description: "Logo, colors & contrast", icon: Palette },
  { id: 5, label: "Human Review", description: "Findings evaluation & fixes", icon: UserCheck },
  { id: 6, label: "Final Decision", description: "Approved or revisions needed", icon: Award },
];

export default function PipelineProgress({
  status,
  findingsCount = 0,
}: {
  status: SubmissionStatus;
  findingsCount?: number;
  hasImage?: boolean;
}) {
  let activeStage = 5;
  let isAuditing = false;
  const isApproved = status === "approved";
  const isChangesRequested = status === "changes_requested";

  if (status === "pending") {
    activeStage = 1;
    isAuditing = true;
  } else if (status === "processing") {
    activeStage = 3;
    isAuditing = true;
  } else if (status === "in_review") {
    activeStage = 5;
    isAuditing = false;
  } else if (status === "changes_requested") {
    activeStage = 6;
    isAuditing = false;
  } else if (status === "approved") {
    activeStage = 6;
    isAuditing = false;
  }

  return (
    <div
      className="card"
      style={{
        padding: "20px 24px",
        backgroundColor: "#FFFFFF",
        border: "1px solid var(--border)",
        borderRadius: 14,
        boxShadow: "var(--shadow-sm)",
      }}
    >
      {/* Header Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 10,
          marginBottom: 18,
        }}
      >
        <div>
          <span style={{ fontSize: 14, fontWeight: 800, color: "var(--oxford-navy)", display: "block" }}>
            Brand Governance Workflow
          </span>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
            Standard 6-stage compliance and verification progression
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontSize: 11.5,
              fontWeight: 700,
              color: isAuditing
                ? "var(--cerulean)"
                : isApproved
                ? "var(--status-success-text)"
                : isChangesRequested
                ? "var(--punch-red)"
                : "var(--oxford-navy)",
              backgroundColor: isAuditing
                ? "var(--cerulean-dim)"
                : isApproved
                ? "var(--status-success-bg)"
                : isChangesRequested
                ? "var(--punch-dim)"
                : "var(--frosted-dim)",
              padding: "4px 10px",
              borderRadius: 20,
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            {isAuditing && <Clock size={12} className="pulse-dot" />}
            {isApproved && <CheckCircle2 size={12} />}
            {isChangesRequested && <AlertTriangle size={12} />}
            {!isAuditing && !isApproved && !isChangesRequested && <UserCheck size={12} />}
            <span>
              {isAuditing
                ? "Audit in Progress"
                : isApproved
                ? "Compliant & Approved"
                : isChangesRequested
                ? "Revisions Requested"
                : `Ready for Review (${findingsCount} issues found)`}
            </span>
          </span>
        </div>
      </div>

      {/* 6-Stage Stepper Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(6, 1fr)",
          gap: 8,
          alignItems: "start",
        }}
        className="pipeline-stages-grid"
      >
        {STAGES.map((stage) => {
          const Icon = stage.icon;
          const isDone = stage.id < activeStage || (stage.id === 6 && (isApproved || isChangesRequested));
          const isCurrent = stage.id === activeStage && !isDone;

          let badgeBg = "#F1F5F9";
          let badgeColor = "#64748B";
          let borderStyle = "1px solid #E2E8F0";

          if (isDone) {
            badgeBg = "var(--status-success-bg)";
            badgeColor = "var(--status-success-text)";
            borderStyle = "1px solid var(--status-success-border)";
          } else if (isCurrent) {
            badgeBg = isAuditing ? "var(--cerulean-dim)" : "var(--oxford-navy)";
            badgeColor = isAuditing ? "var(--cerulean)" : "#FFFFFF";
            borderStyle = "1.5px solid var(--cerulean)";
          }

          return (
            <div
              key={stage.id}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                position: "relative",
              }}
            >
              {/* Stage Circle */}
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  backgroundColor: badgeBg,
                  color: badgeColor,
                  border: borderStyle,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 800,
                  marginBottom: 6,
                  transition: "all 0.2s ease",
                }}
              >
                {isDone ? <CheckCircle2 size={16} /> : isCurrent && isAuditing ? <Clock size={16} className="pulse-dot" /> : <Icon size={15} />}
              </div>

              {/* Stage Title */}
              <span
                style={{
                  fontSize: 11.5,
                  fontWeight: isCurrent ? 800 : 700,
                  color: isCurrent ? "var(--oxford-navy)" : isDone ? "var(--oxford-navy)" : "var(--text-muted)",
                  lineHeight: 1.25,
                }}
              >
                {stage.id}. {stage.label}
              </span>

              {/* Stage Subtitle */}
              <span
                style={{
                  fontSize: 10,
                  color: "var(--text-muted)",
                  marginTop: 3,
                  lineHeight: 1.2,
                  display: "block",
                }}
              >
                {stage.description}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
