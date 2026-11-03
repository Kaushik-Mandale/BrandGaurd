"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import type { SubmissionListItem } from "@/lib/types";
import { SubmissionStatusBadge } from "@/components/Badges";
import PipelineProgress from "@/components/PipelineProgress";
import { fmtDate, errMsg } from "@/lib/ui";
import {
  ShieldCheck,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  RotateCw,
  Image as ImageIcon,
  PlusCircle,
  UserCheck,
} from "lucide-react";

export default function ReviewQueuePage() {
  const [items, setItems] = useState<SubmissionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listSubmissions();
      setItems(data);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    api.listSubmissions().then(
      (data) => { if (!ignore) { setItems(data); setLoading(false); } },
      (err) => { if (!ignore) { setError(errMsg(err)); setLoading(false); } }
    );
    return () => { ignore = true; };
  }, []);

  const needsReview = items.filter((i) => i.status === "in_review");
  const changesRequested = items.filter((i) => i.status === "changes_requested");
  const recentlyApproved = items.filter((i) => i.status === "approved").slice(0, 5);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          padding: "28px 32px",
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
            background: "linear-gradient(90deg, var(--oxford-navy) 0%, var(--cerulean) 100%)",
          }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 11,
                fontWeight: 700,
                color: "var(--cerulean)",
                backgroundColor: "var(--cerulean-dim)",
                padding: "3px 10px",
                borderRadius: 20,
                marginBottom: 10,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              <UserCheck size={12} />
              <span>Stage 5 of 6: Human Review</span>
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--oxford-navy)", letterSpacing: "-0.03em" }}>
              Review Queue
            </h1>
            <p style={{ color: "var(--text-secondary)", marginTop: 6, fontSize: 14, maxWidth: 600 }}>
              Submissions that have completed automated analysis and are awaiting your human review. Open each submission to inspect
              findings, apply suggested fixes, and make a final compliance decision.
            </p>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                marginTop: 10,
                padding: "8px 14px",
                backgroundColor: needsReview.length > 0 ? "rgba(230, 57, 70, 0.07)" : "#F0F7F4",
                border: `1px solid ${needsReview.length > 0 ? "rgba(230, 57, 70, 0.2)" : "#C3E6CB"}`,
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                color: needsReview.length > 0 ? "var(--inkloom-punch)" : "#276749",
              }}
            >
              {needsReview.length > 0 ? (
                <>
                  <AlertTriangle size={14} />
                  <span>{needsReview.length} submission{needsReview.length !== 1 ? "s" : ""} awaiting your review</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={14} />
                  <span>Review queue is clear — no pending reviews</span>
                </>
              )}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={load} disabled={loading} className="btn btn-secondary">
              <RotateCw size={14} className={loading ? "animate-spin" : ""} />
              <span>Refresh</span>
            </button>
            <Link href="/submit" className="btn btn-primary">
              <PlusCircle size={14} />
              <span>New Brand Check</span>
            </Link>
          </div>
        </div>
      </motion.div>

      {/* 6-Stage Operational Stepper: Stage 5 (Human Review) Active */}
      <PipelineProgress currentStage={5} findingsCount={needsReview.length} />

      {error && (
        <div
          style={{
            padding: "14px 18px",
            borderRadius: "var(--radius-sm)",
            backgroundColor: "var(--status-danger-bg)",
            border: "1px solid var(--punch-border)",
            color: "var(--status-danger-text)",
            fontSize: 13,
          }}
        >
          ⚠ Unable to load review queue: {error}
        </div>
      )}

      {/* Awaiting Review */}
      <section>
        <h2
          style={{
            fontSize: 15,
            fontWeight: 800,
            color: "var(--oxford-navy)",
            marginBottom: 12,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Clock size={16} color="var(--cerulean)" />
          <span>Awaiting Your Review ({needsReview.length})</span>
          {needsReview.length > 0 && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                backgroundColor: "rgba(230, 57, 70, 0.1)",
                color: "var(--inkloom-punch)",
                padding: "2px 8px",
                borderRadius: 10,
              }}
            >
              Action Required
            </span>
          )}
        </h2>

        {loading ? (
          <div className="card" style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
            Loading review queue...
          </div>
        ) : needsReview.length === 0 ? (
          <div
            className="card"
            style={{
              padding: "40px 32px",
              textAlign: "center",
              color: "var(--text-muted)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 10,
            }}
          >
            <CheckCircle2 size={32} color="#276749" strokeWidth={1.5} />
            <div style={{ fontSize: 15, fontWeight: 700, color: "#276749" }}>Queue is clear</div>
            <p style={{ fontSize: 13, maxWidth: 400 }}>
              No submissions are awaiting review. Submit new content to start the brand compliance pipeline.
            </p>
            <Link href="/submit" className="btn btn-primary" style={{ marginTop: 6 }}>
              <PlusCircle size={14} />
              <span>Submit Content for Review</span>
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {needsReview.map((item, idx) => (
              <SubmissionCard key={item.id} item={item} idx={idx} priority />
            ))}
          </div>
        )}
      </section>

      {/* Changes Requested */}
      {changesRequested.length > 0 && (
        <section>
          <h2
            style={{
              fontSize: 15,
              fontWeight: 800,
              color: "var(--oxford-navy)",
              marginBottom: 12,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <AlertTriangle size={16} color="#D97706" />
            <span>Changes Requested ({changesRequested.length})</span>
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {changesRequested.map((item, idx) => (
              <SubmissionCard key={item.id} item={item} idx={idx} />
            ))}
          </div>
        </section>
      )}

      {/* Recently Approved */}
      {recentlyApproved.length > 0 && (
        <section>
          <h2
            style={{
              fontSize: 15,
              fontWeight: 800,
              color: "var(--oxford-navy)",
              marginBottom: 12,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <ShieldCheck size={16} color="#276749" />
            <span>Recently Approved</span>
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {recentlyApproved.map((item, idx) => (
              <SubmissionCard key={item.id} item={item} idx={idx} />
            ))}
          </div>
        </section>
      )}

      {/* Link to full submissions list */}
      <div style={{ textAlign: "center", paddingBottom: 8 }}>
        <Link
          href="/submissions"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            fontWeight: 600,
            color: "var(--cerulean)",
            textDecoration: "none",
          }}
        >
          <span>View all submissions</span>
          <ArrowRight size={13} />
        </Link>
      </div>
    </div>
  );
}

function SubmissionCard({
  item,
  idx,
  priority = false,
}: {
  item: SubmissionListItem;
  idx: number;
  priority?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.04 }}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 20px",
        borderRadius: "var(--radius-sm)",
        backgroundColor: "#FFFFFF",
        border: priority ? "1.5px solid rgba(69, 123, 157, 0.3)" : "1px solid var(--border)",
        boxShadow: priority ? "0 2px 8px rgba(69, 123, 157, 0.1)" : "var(--shadow-xs)",
        gap: 16,
        flexWrap: "wrap",
      }}
    >
      {/* Left: icon + info */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            backgroundColor: priority ? "var(--cerulean-dim)" : "var(--bg-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {item.has_image ? (
            <ImageIcon size={18} color="var(--cerulean)" />
          ) : (
            <FileText size={18} color="var(--cerulean)" />
          )}
        </div>

        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "var(--oxford-navy)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {item.title}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 3, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>#{item.id}</span>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Submitted {fmtDate(item.created_at)}</span>
            {(item.findings_count ?? 0) > 0 && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "#92400E", fontWeight: 600 }}>
                <AlertTriangle size={11} color="#D97706" />
                {item.findings_count} {item.findings_count === 1 ? "finding" : "findings"}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right: status + action */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <SubmissionStatusBadge value={item.status} />
        <Link
          href={`/review/${item.id}`}
          className="btn btn-primary"
          style={{ padding: "7px 14px", fontSize: 13, whiteSpace: "nowrap" }}
        >
          <span>Open Review</span>
          <ArrowRight size={13} />
        </Link>
      </div>
    </motion.div>
  );
}

