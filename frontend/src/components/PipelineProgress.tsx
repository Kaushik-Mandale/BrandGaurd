"use client";

import {
  FileText,
  ShieldCheck,
  Search,
  Palette,
  UserCheck,
  Award,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import type { SubmissionStatus } from "@/lib/types";

export interface PipelineStageConfig {
  number: string;
  id: number;
  label: string;
  subtitle: string;
  description: string;
  icon: typeof FileText;
}

export const PIPELINE_STAGES: PipelineStageConfig[] = [
  {
    number: "01",
    id: 1,
    label: "Submit Content",
    subtitle: "Intake & Extraction",
    description: "Provide text, a document, or a creative asset.",
    icon: FileText,
  },
  {
    number: "02",
    id: 2,
    label: "Check Brand Rules",
    subtitle: "Deterministic Rules",
    description: "Check terminology, tone, formatting, and required disclaimers.",
    icon: ShieldCheck,
  },
  {
    number: "03",
    id: 3,
    label: "Verify Claims",
    subtitle: "Evidence Grounding",
    description: "Check factual claims against approved brand evidence.",
    icon: Search,
  },
  {
    number: "04",
    id: 4,
    label: "Check Visual Identity",
    subtitle: "Visual & Accessibility",
    description: "Inspect logos, colors, and accessibility contrast.",
    icon: Palette,
  },
  {
    number: "05",
    id: 5,
    label: "Review Findings",
    subtitle: "Human Governance",
    description: "Inspect issues and suggested corrections.",
    icon: UserCheck,
  },
  {
    number: "06",
    id: 6,
    label: "Make Final Decision",
    subtitle: "Audit Clearance",
    description: "Approve compliant content or request changes.",
    icon: Award,
  },
];

interface PipelineProgressProps {
  status?: SubmissionStatus;
  currentStage?: number;
  findingsCount?: number;
  highSevCount?: number;
  hasImage?: boolean;
  className?: string;
}

export default function PipelineProgress({
  status,
  currentStage,
  findingsCount = 0,
  highSevCount = 0,
  className = "",
}: PipelineProgressProps) {
  // Determine active stage based on status or explicit override
  let activeStage = currentStage ?? 5;
  let isAuditing = false;
  const isApproved = status === "approved";
  const isChangesRequested = status === "changes_requested";

  if (status) {
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
  }

  return (
    <section
      className={`card ${className}`}
      aria-label="6-Stage Brand Governance Pipeline"
      style={{
        padding: "22px 24px",
        backgroundColor: "#FFFFFF",
        border: "1px solid var(--border)",
        borderRadius: 14,
        boxShadow: "var(--shadow-sm)",
      }}
    >
      {/* Workflow Header with Contextual Status */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 20,
          paddingBottom: 14,
          borderBottom: "1px solid #EEF2F6",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                fontSize: 10,
                fontWeight: 800,
                color: "var(--inkloom-cerulean)",
                backgroundColor: "rgba(69, 123, 157, 0.12)",
                padding: "2px 8px",
                borderRadius: 4,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              Standard Governance Pipeline
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--inkloom-navy)" }}>
              Continuous 6-Stage Compliance Progression
            </span>
          </div>
          <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0 }}>
            Every asset undergoes systematic deterministic rule validation, evidence verification, visual inspection, and human approval.
          </p>
        </div>

        {/* Global Lifecycle Badge */}
        <div>
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 12px",
              borderRadius: 20,
              backgroundColor: isAuditing
                ? "rgba(69, 123, 157, 0.14)"
                : isApproved
                ? "#E6F4EA"
                : isChangesRequested
                ? "rgba(230, 57, 70, 0.12)"
                : "rgba(29, 53, 87, 0.08)",
              color: isAuditing
                ? "var(--inkloom-cerulean)"
                : isApproved
                ? "#276749"
                : isChangesRequested
                ? "var(--inkloom-punch)"
                : "var(--inkloom-navy)",
              border: `1px solid ${
                isAuditing
                  ? "rgba(69, 123, 157, 0.3)"
                  : isApproved
                  ? "#A3D9A5"
                  : isChangesRequested
                  ? "rgba(230, 57, 70, 0.3)"
                  : "rgba(29, 53, 87, 0.2)"
              }`,
            }}
          >
            {isAuditing && <Clock size={13} className="animate-spin" />}
            {isApproved && <CheckCircle2 size={13} color="#276749" />}
            {isChangesRequested && <AlertTriangle size={13} color="var(--inkloom-punch)" />}
            {!isAuditing && !isApproved && !isChangesRequested && <UserCheck size={13} />}
            <span>
              {isAuditing
                ? "Audit Processing in Progress..."
                : isApproved
                ? "Stage 6 Completed: Approved for Publication"
                : isChangesRequested
                ? "Stage 6: Changes Requested by Reviewer"
                : `Stage ${activeStage}: Human Review Queue (${findingsCount} findings)`}
            </span>
          </span>
        </div>
      </div>

      {/* Connected 6-Stage Stepper Track */}
      <div
        className="pipeline-stages-container"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(6, 1fr)",
          gap: 10,
          position: "relative",
        }}
      >
        {PIPELINE_STAGES.map((stage, idx) => {
          const Icon = stage.icon;
          const isDone = stage.id < activeStage || (stage.id === 6 && (isApproved || isChangesRequested));
          const isCurrent = stage.id === activeStage && !isDone;
          const isBlocked = stage.id === 6 && activeStage === 5 && highSevCount > 0;

          // Visual states
          let stateLabel = "Pending";
          let circleBg = "#F1F5F9";
          let circleColor = "#64748B";
          let cardBg = "#FFFFFF";
          let borderColor = "#E2E8F0";

          if (isDone) {
            stateLabel = "Completed";
            circleBg = "#2E7D32";
            circleColor = "#FFFFFF";
            cardBg = "#F7FBF7";
            borderColor = "#C8E6C9";
          } else if (isCurrent) {
            stateLabel = isAuditing ? "Processing" : "Active";
            circleBg = isAuditing ? "#457B9D" : "#1D3557";
            circleColor = "#FFFFFF";
            cardBg = isAuditing ? "#F0F7FB" : "#F4F7FB";
            borderColor = "#457B9D";
          } else if (isBlocked) {
            stateLabel = "Blocked";
            circleBg = "#FFEBEE";
            circleColor = "#D32F2F";
            cardBg = "#FFF8F8";
            borderColor = "#FFCDD2";
          }

          return (
            <div
              key={stage.id}
              style={{
                position: "relative",
                display: "flex",
                flexDirection: "column",
                gap: 8,
                padding: "14px 12px 16px",
                borderRadius: 10,
                backgroundColor: cardBg,
                border: `1.5px solid ${borderColor}`,
                boxShadow: isCurrent ? "0 2px 8px rgba(69, 123, 157, 0.16)" : "none",
                transition: "all 0.2s ease",
              }}
            >
              {/* Top row: Stage Number & Status Badge */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: "50%",
                      backgroundColor: circleBg,
                      color: circleColor,
                      fontSize: 11.5,
                      fontWeight: 800,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {isDone ? <CheckCircle2 size={15} /> : stage.number}
                  </div>
                  <Icon size={14} color={isCurrent ? "var(--inkloom-cerulean)" : isDone ? "#2E7D32" : "#7E9AB8"} />
                </div>

                <span
                  style={{
                    fontSize: 9.5,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    padding: "2px 6px",
                    borderRadius: 4,
                    backgroundColor: isDone
                      ? "#E8F5E9"
                      : isCurrent
                      ? "rgba(69, 123, 157, 0.14)"
                      : isBlocked
                      ? "#FFEBEE"
                      : "#F1F5F9",
                    color: isDone
                      ? "#2E7D32"
                      : isCurrent
                      ? "var(--inkloom-cerulean)"
                      : isBlocked
                      ? "#D32F2F"
                      : "#64748B",
                  }}
                >
                  {stateLabel}
                </span>
              </div>

              {/* Stage Title & Subtitle */}
              <div style={{ marginTop: 2 }}>
                <div
                  style={{
                    fontSize: 12.5,
                    fontWeight: 800,
                    color: isCurrent ? "var(--inkloom-navy)" : isDone ? "#1E3A1E" : "#334155",
                    lineHeight: 1.3,
                  }}
                >
                  {stage.label}
                </div>
                <div style={{ fontSize: 10.5, fontWeight: 600, color: "var(--inkloom-cerulean)", marginTop: 1 }}>
                  {stage.subtitle}
                </div>
              </div>

              {/* Concise Explanation */}
              <p
                style={{
                  fontSize: 11,
                  color: "var(--text-secondary)",
                  lineHeight: 1.35,
                  margin: "4px 0 0",
                  flex: 1,
                }}
              >
                {stage.description}
              </p>

              {/* Connector Arrow (desktop) */}
              {idx < PIPELINE_STAGES.length - 1 && (
                <div
                  className="pipeline-connector-arrow"
                  style={{
                    position: "absolute",
                    top: "50%",
                    right: -10,
                    transform: "translateY(-50%)",
                    zIndex: 2,
                    color: isDone ? "#2E7D32" : "#CBD5E1",
                    backgroundColor: "#FFFFFF",
                    borderRadius: "50%",
                    padding: 1,
                    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                  }}
                >
                  <ArrowRight size={14} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Responsive Style Overrides */}
      <style jsx>{`
        @media (max-width: 1024px) {
          .pipeline-stages-container {
            grid-template-columns: repeat(3, 1fr) !important;
          }
          .pipeline-connector-arrow {
            display: none !important;
          }
        }
        @media (max-width: 640px) {
          .pipeline-stages-container {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}
