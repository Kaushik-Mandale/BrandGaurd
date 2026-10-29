"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Clock, XCircle, Sparkles } from "lucide-react";
import type { SubmissionStatus } from "@/lib/types";

interface PipelineStep {
  id: number;
  label: string;
  subtext: string;
}

const STEPS: PipelineStep[] = [
  { id: 1, label: "Content Intake", subtext: "Ingestion & payload validation" },
  { id: 2, label: "Extraction", subtext: "OCR, spans & page mapping" },
  { id: 3, label: "Rule Engine", subtext: "Deterministic terminology & regex" },
  { id: 4, label: "Claim & RAG", subtext: "pgvector similarity over facts" },
  { id: 5, label: "Visual & A11y", subtext: "CIELAB palette, logo & WCAG" },
  { id: 6, label: "Findings Aggregation", subtext: "Deduplication & scoring" },
  { id: 7, label: "Intent-Preserving Fixes", subtext: "Minimal localized edits" },
  { id: 8, label: "Human Review", subtext: "Editorial sign-off & feedback" },
  { id: 9, label: "Final Decision", subtext: "Approved or revision requested" },
];

export default function PipelineProgress({
  status,
  findingsCount = 0,
  hasImage = false,
}: {
  status: SubmissionStatus;
  findingsCount?: number;
  hasImage?: boolean;
}) {
  let currentStep = 9;
  let isProcessing = false;
  const isFailed = status === "failed";
  const isApproved = status === "approved";

  if (status === "pending") {
    currentStep = 1;
    isProcessing = true;
  } else if (status === "processing") {
    currentStep = 4;
    isProcessing = true;
  } else if (status === "in_review" || status === "changes_requested") {
    currentStep = 8;
    isProcessing = false;
  } else if (status === "approved") {
    currentStep = 9;
    isProcessing = false;
  }

  return (
    <div
      className="card"
      style={{
        padding: "22px 26px",
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        gap: 16,
        borderRadius: "var(--radius-md)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              backgroundColor: "var(--cerulean-dim)",
              color: "var(--cerulean)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Sparkles size={15} />
          </div>
          <div>
            <span style={{ fontSize: 14, fontWeight: 800, color: "var(--oxford-navy)", display: "block" }}>
              Multi-Stage Compliance Analysis Flow
            </span>
            <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
              Deterministic + RAG Evidence Grounding + Human Approval Gates
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontSize: 11.5,
              fontWeight: 700,
              color: isProcessing ? "var(--cerulean)" : isApproved ? "var(--status-success-text)" : isFailed ? "var(--punch-red)" : "var(--oxford-navy)",
              backgroundColor: isProcessing ? "var(--cerulean-dim)" : isApproved ? "var(--status-success-bg)" : isFailed ? "var(--punch-dim)" : "var(--frosted-dim)",
              padding: "4px 10px",
              borderRadius: 9999,
              border: `1px solid ${isProcessing ? "var(--frosted-border)" : isApproved ? "var(--status-success-border)" : isFailed ? "var(--punch-border)" : "var(--frosted-border)"}`,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {isProcessing && <span className="pulse-dot" style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "var(--cerulean)" }} />}
            {isApproved && <CheckCircle2 size={13} />}
            {isFailed && <XCircle size={13} />}
            <span>{isProcessing ? "Analyzing Live" : isApproved ? "Sign-off Approved" : isFailed ? "Analysis Failed" : "Awaiting Human Review"}</span>
          </span>

          <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 600 }}>
            {findingsCount} {findingsCount === 1 ? "finding" : "findings"} • {hasImage ? "Multi-modal vision" : "Copy audit"}
          </span>
        </div>
      </div>

      {/* 9-Stage Flowing Interactive Stepper */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(9, minmax(110px, 1fr))",
          gap: 6,
          overflowX: "auto",
          paddingBottom: 6,
        }}
      >
        {STEPS.map((step, idx) => {
          const isDone = !isProcessing && (currentStep > step.id || (currentStep === 9 && !isFailed));
          const isActive = isProcessing && currentStep === step.id;

          let badgeBg = "var(--bg-subtle)";
          let badgeBorder = "var(--border)";
          let badgeColor = "var(--text-muted)";
          let barBg = "var(--border-subtle)";

          if (isDone) {
            badgeBg = "var(--status-success-bg)";
            badgeBorder = "var(--status-success-border)";
            badgeColor = "var(--status-success-text)";
            barBg = "var(--cerulean)";
          } else if (isActive) {
            badgeBg = "var(--cerulean-dim)";
            badgeBorder = "var(--cerulean)";
            badgeColor = "var(--cerulean)";
            barBg = "var(--cerulean)";
          }

          return (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: idx * 0.03 }}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                padding: "8px 6px",
                borderRadius: "var(--radius-sm)",
                backgroundColor: isActive ? "rgba(69, 123, 157, 0.05)" : "transparent",
              }}
            >
              {/* Connector Bar */}
              <div
                style={{
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: barBg,
                  transition: "background-color 0.3s ease",
                }}
              />

              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 10.5,
                    fontWeight: 700,
                    backgroundColor: badgeBg,
                    border: `1px solid ${badgeBorder}`,
                    color: badgeColor,
                    flexShrink: 0,
                  }}
                >
                  {isDone ? <CheckCircle2 size={13} /> : isActive ? <Clock size={13} className="pulse-dot" /> : step.id}
                </span>

                <span
                  style={{
                    fontSize: 11.5,
                    fontWeight: isActive || isDone ? 700 : 600,
                    color: isActive ? "var(--cerulean)" : isDone ? "var(--oxford-navy)" : "var(--text-muted)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                  title={step.label}
                >
                  {step.label}
                </span>
              </div>

              <span
                style={{
                  fontSize: 10,
                  color: "var(--text-muted)",
                  lineHeight: 1.25,
                  height: 26,
                  overflow: "hidden",
                }}
              >
                {step.subtext}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
