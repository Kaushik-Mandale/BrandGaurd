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
  FileText,
  RotateCw,
  PlusCircle,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Image as ImageIcon,
  Search,
} from "lucide-react";

const STATUS_FILTERS = [
  { id: "all", label: "All Submissions" },
  { id: "in_review", label: "Awaiting Review" },
  { id: "changes_requested", label: "Changes Requested" },
  { id: "approved", label: "Approved" },
  { id: "processing", label: "Processing" },
];

export default function SubmissionsPage() {
  const [items, setItems] = useState<SubmissionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

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

  const filtered = items.filter((item) => {
    const matchStatus =
      filter === "all" ||
      (filter === "in_review" && (item.status === "in_review" || item.status === "pending")) ||
      item.status === filter;
    const matchSearch =
      !search ||
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      String(item.id).includes(search);
    return matchStatus && matchSearch;
  });

  const awaitingCount = items.filter((i) => i.status === "in_review").length;
  const changesCount = items.filter((i) => i.status === "changes_requested").length;
  const approvedCount = items.filter((i) => i.status === "approved").length;

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
            background: "linear-gradient(90deg, var(--oxford-navy) 0%, var(--cerulean) 50%, var(--frosted-blue) 100%)",
          }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
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
              <FileText size={12} />
              <span>Audit Submissions</span>
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--oxford-navy)", letterSpacing: "-0.03em" }}>
              All Brand Compliance Submissions
            </h1>
            <p style={{ color: "var(--text-secondary)", marginTop: 6, fontSize: 14 }}>
              Every piece of content submitted to BrandGuard for compliance review. Open any submission to inspect findings and take review actions.
            </p>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
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

        {/* Status summary row */}
        <div style={{ display: "flex", gap: 20, marginTop: 20, flexWrap: "wrap" }}>
          {[
            { label: "Awaiting Review", value: awaitingCount, color: "var(--cerulean)", icon: <Clock size={14} /> },
            { label: "Changes Requested", value: changesCount, color: "#D97706", icon: <AlertTriangle size={14} /> },
            { label: "Approved", value: approvedCount, color: "#276749", icon: <CheckCircle2 size={14} /> },
            { label: "Total Submissions", value: items.length, color: "var(--oxford-navy)", icon: <FileText size={14} /> },
          ].map((stat) => (
            <div key={stat.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: stat.color }}>{stat.icon}</span>
              <span style={{ fontSize: 20, fontWeight: 800, color: stat.color }}>{stat.value}</span>
              <span style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>{stat.label}</span>
            </div>
          ))}
        </div>
      </motion.div>

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
          ⚠ Unable to load submissions: {error}
        </div>
      )}

      {/* 6-Stage Operational Stepper */}
      <PipelineProgress currentStage={5} findingsCount={awaitingCount} />

      {/* Filters & Search */}
      <div
        className="card"
        style={{ display: "flex", flexDirection: "column", gap: 16 }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                style={{
                  padding: "6px 13px",
                  borderRadius: 6,
                  border: "1px solid var(--border)",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: filter === f.id ? 700 : 500,
                  backgroundColor: filter === f.id ? "var(--oxford-navy)" : "var(--bg-subtle)",
                  color: filter === f.id ? "#FFFFFF" : "var(--text-secondary)",
                  transition: "all 0.15s ease",
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div style={{ position: "relative" }}>
            <Search
              size={14}
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-muted)",
              }}
            />
            <input
              type="text"
              placeholder="Search by title or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                paddingLeft: 32,
                paddingRight: 12,
                paddingTop: 7,
                paddingBottom: 7,
                borderRadius: 8,
                border: "1px solid var(--border)",
                fontSize: 13,
                backgroundColor: "#FFFFFF",
                outline: "none",
                width: 220,
              }}
            />
          </div>
        </div>

        {/* Submissions Table */}
        {loading ? (
          <div style={{ padding: "60px 0", textAlign: "center", color: "var(--text-muted)" }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>🔄</div>
            <div>Loading submissions...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div
            style={{
              padding: "60px 24px",
              textAlign: "center",
              color: "var(--text-muted)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
            }}
          >
            <FileText size={36} color="var(--text-muted)" strokeWidth={1.5} />
            <div style={{ fontSize: 15, fontWeight: 700 }}>No submissions found</div>
            <p style={{ fontSize: 13 }}>
              {items.length === 0
                ? "No content has been submitted for review yet."
                : "No submissions match your current filter."}
            </p>
            <Link href="/submit" className="btn btn-primary" style={{ marginTop: 4 }}>
              <PlusCircle size={14} />
              <span>Submit Content for Review</span>
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {/* Header */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 140px 130px 110px 100px",
                gap: 12,
                padding: "8px 16px",
                fontSize: 11,
                fontWeight: 700,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <span>Content Title</span>
              <span>Status</span>
              <span>Findings</span>
              <span>Submitted</span>
              <span>Action</span>
            </div>

            {filtered.map((item, idx) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 140px 130px 110px 100px",
                  gap: 12,
                  padding: "14px 16px",
                  alignItems: "center",
                  borderBottom: "1px solid var(--border-subtle)",
                  backgroundColor: idx % 2 === 0 ? "#FFFFFF" : "var(--bg-card)",
                  transition: "background-color 0.1s ease",
                }}
              >
                {/* Title */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                  {item.has_image ? (
                    <ImageIcon size={15} color="var(--cerulean)" />
                  ) : (
                    <FileText size={15} color="var(--cerulean)" />
                  )}
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--oxford-navy)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {item.title}
                  </span>
                </div>

                {/* Status */}
                <SubmissionStatusBadge value={item.status} />

                {/* Findings */}
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {(item.findings_count ?? 0) > 0 ? (
                    <>
                      <AlertTriangle size={13} color="#D97706" />
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: "#92400E" }}>
                        {item.findings_count} {item.findings_count === 1 ? "finding" : "findings"}
                      </span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={13} color="#276749" />
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: "#276749" }}>Clean pass</span>
                    </>
                  )}
                </div>

                {/* Date */}
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  {fmtDate(item.created_at)}
                </span>

                {/* Action */}
                <Link
                  href={`/review/${item.id}`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "5px 10px",
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 700,
                    backgroundColor: "var(--cerulean-dim)",
                    color: "var(--cerulean)",
                    textDecoration: "none",
                    transition: "all 0.15s ease",
                    whiteSpace: "nowrap",
                  }}
                >
                  <span>Open Review</span>
                  <ArrowRight size={12} />
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

