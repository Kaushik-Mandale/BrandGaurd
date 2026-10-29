"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import type { SubmissionListItem, Insights } from "@/lib/types";
import { SubmissionStatusBadge } from "@/components/Badges";
import { fmtDate, errMsg } from "@/lib/ui";
import {
  PlusCircle,
  BookOpen,
  Search,
  RotateCw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Layers,
  ArrowUpRight,
} from "lucide-react";

export default function Dashboard() {
  const [items, setItems] = useState<SubmissionListItem[]>([]);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [subs, ins] = await Promise.allSettled([
      api.listSubmissions(),
      api.insights(),
    ]);
    if (subs.status === "fulfilled") setItems(subs.value);
    if (ins.status === "fulfilled") setInsights(ins.value);
    const failures = [subs, ins].flatMap((result) =>
      result.status === "rejected" ? [errMsg(result.reason)] : [],
    );
    if (failures.length) setError(failures.join(" · "));
    setLoading(false);
  }, []);

  useEffect(() => {
    let ignore = false;
    async function fetchInitial() {
      const [subs, ins] = await Promise.allSettled([
        api.listSubmissions(),
        api.insights(),
      ]);
      if (ignore) return;
      if (subs.status === "fulfilled") setItems(subs.value);
      if (ins.status === "fulfilled") setInsights(ins.value);
      const failures = [subs, ins].flatMap((result) =>
        result.status === "rejected" ? [errMsg(result.reason)] : [],
      );
      if (failures.length) setError(failures.join(" · "));
      setLoading(false);
    }
    fetchInitial();
    return () => {
      ignore = true;
    };
  }, []);

  const filteredItems = items.filter((item) => {
    const matchesFilter =
      filter === "all" ||
      (filter === "in_review" && (item.status === "in_review" || item.status === "processing")) ||
      (filter === "approved" && item.status === "approved") ||
      (filter === "changes_requested" && item.status === "changes_requested");
    const matchesSearch =
      !search ||
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      String(item.id).includes(search);
    return matchesFilter && matchesSearch;
  });

  const total = items.length;
  const inReview = items.filter((i) => i.status === "in_review" || i.status === "processing").length;
  const approved = items.filter((i) => i.status === "approved").length;
  const changesReq = items.filter((i) => i.status === "changes_requested").length;
  const totalFindings = insights?.findings?.total ?? 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      {/* Summer Ocean Breeze Hero Banner */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="card-interactive"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 24,
          padding: "36px 40px",
          borderRadius: "var(--radius-lg)",
          backgroundColor: "#FFFFFF",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-md)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Top 5-Color Harmonic Rainbow Accent */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 5,
            background: "linear-gradient(90deg, var(--punch-red) 0%, var(--frosted-blue) 35%, var(--cerulean) 70%, var(--oxford-navy) 100%)",
          }}
        />

        <div style={{ maxWidth: 700 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <span
              className="shimmer-badge"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 11.5,
                fontWeight: 700,
                color: "var(--oxford-navy)",
                border: "1px solid var(--frosted-border)",
                padding: "4px 12px",
                borderRadius: "var(--radius-full)",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              <Sparkles size={13} color="var(--cerulean)" />
              <span>Inkloom Brand Governance</span>
            </span>

            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontSize: 11,
                fontWeight: 700,
                color: "var(--punch-red)",
                backgroundColor: "var(--punch-dim)",
                border: "1px solid var(--punch-border)",
                padding: "3px 9px",
                borderRadius: "var(--radius-full)",
              }}
            >
              <span className="pulse-dot" style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "var(--punch-red)" }} />
              Human-reviewed decisions
            </span>
          </div>

          <h1
            style={{
              fontSize: 32,
              fontWeight: 800,
              color: "var(--oxford-navy)",
              letterSpacing: "-0.035em",
              lineHeight: 1.15,
            }}
          >
            Brand Governance Command
          </h1>
          <p
            style={{
              color: "var(--text-secondary)",
              marginTop: 10,
              fontSize: 14.5,
              lineHeight: 1.65,
            }}
          >
            Review multi-channel copy and creative assets against approved guidelines and verifiable facts. Ensure tone, terminology, and visual consistency before publication with full human sign-off authority.
          </p>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <Link href="/knowledge" className="btn btn-secondary" style={{ padding: "10px 18px" }}>
            <BookOpen size={16} color="var(--cerulean)" />
            <span>Guidelines & Rules</span>
          </Link>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Link href="/submit" className="btn btn-primary" style={{ padding: "10px 22px", fontSize: 13.5 }}>
              <PlusCircle size={16} />
              <span>New Compliance Check</span>
            </Link>
          </motion.div>
        </div>
      </motion.div>

      {/* 4 KPI Stats Grid: Showcasing All 5 Palette Colors */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 18 }}>
        {/* Card 1: Total Audits (Oxford Navy #1D3557) */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          className="card card-interactive border-accent-navy"
          style={{ display: "flex", flexDirection: "column", gap: 12 }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Total Content Audits
            </span>
            <span style={{ width: 34, height: 34, borderRadius: 8, backgroundColor: "var(--cerulean-dim)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--cerulean)" }}>
              <Layers size={18} />
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontSize: 34, fontWeight: 800, color: "var(--oxford-navy)" }}>{total}</span>
            <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>records in workspace</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--status-success-text)", display: "flex", alignItems: "center", gap: 5 }}>
            <span className="pulse-dot" style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "var(--status-success-text)" }} />
            Stored workspace submissions
          </div>
        </motion.div>

        {/* Card 2: Review Queue (Cerulean #457B9D) */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
          className="card card-interactive border-accent-cerulean"
          style={{ display: "flex", flexDirection: "column", gap: 12 }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--cerulean)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Active Review Queue
            </span>
            <span style={{ width: 34, height: 34, borderRadius: 8, backgroundColor: "var(--frosted-dim)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--cerulean)" }}>
              <Clock size={18} />
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontSize: 34, fontWeight: 800, color: "var(--cerulean)" }}>{inReview}</span>
            <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>pending sign-off</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
            Non-destructive AI fix application ready
          </div>
        </motion.div>

        {/* Card 3: Approvals (Honeydew #F1FAEE + Cerulean) */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.15 }}
          className="card card-interactive border-accent-frosted"
          style={{ display: "flex", flexDirection: "column", gap: 12 }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--status-success-text)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Verified Approvals
            </span>
            <span style={{ width: 34, height: 34, borderRadius: 8, backgroundColor: "var(--status-success-bg)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--status-success-text)" }}>
              <CheckCircle2 size={18} />
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontSize: 34, fontWeight: 800, color: "var(--status-success-text)" }}>{approved}</span>
            <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>approved by a reviewer</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
            {changesReq} submissions requested revision
          </div>
        </motion.div>

        {/* Card 4: Compliance Findings (Punch Red #E63946) */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.2 }}
          className="card card-interactive border-accent-punch"
          style={{ display: "flex", flexDirection: "column", gap: 12 }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--punch-red)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Violations & Flagged
            </span>
            <span style={{ width: 34, height: 34, borderRadius: 8, backgroundColor: "var(--punch-dim)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--punch-red)" }}>
              <AlertTriangle size={18} />
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontSize: 34, fontWeight: 800, color: "var(--punch-red)" }}>
              {totalFindings}
            </span>
            <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>findings cataloged</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--punch-red)", fontWeight: 600 }}>
            {insights?.top_rules?.length ?? 0} rules with recorded findings
          </div>
        </motion.div>
      </div>

      {/* Main Submissions Audit Registry */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
        className="card"
        style={{ display: "flex", flexDirection: "column", gap: 20 }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div>
            <h2 style={{ fontSize: 19, fontWeight: 800, color: "var(--oxford-navy)" }}>
              Audited Content Registry
            </h2>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 3 }}>
              Trace findings directly to approved source documents, inspect suggested corrections, and complete human approvals.
            </p>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            {/* Filter Segmented Control */}
            <div
              style={{
                display: "flex",
                backgroundColor: "var(--honeydew)",
                borderRadius: "var(--radius-sm)",
                padding: 3,
                border: "1px solid var(--border)",
              }}
            >
              {[
                { id: "all", label: "All Audits" },
                { id: "in_review", label: "Needs Review" },
                { id: "changes_requested", label: "Revisions" },
                { id: "approved", label: "Approved" },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  style={{
                    padding: "6px 14px",
                    fontSize: 12,
                    fontWeight: filter === f.id ? 700 : 500,
                    borderRadius: 6,
                    border: "none",
                    cursor: "pointer",
                    backgroundColor: filter === f.id ? "var(--cerulean)" : "transparent",
                    color: filter === f.id ? "#FFFFFF" : "var(--text-secondary)",
                    transition: "all var(--transition-fast)",
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div style={{ position: "relative" }}>
              <Search
                size={14}
                style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}
              />
              <input
                type="text"
                placeholder="Search by title or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  paddingLeft: 32,
                  paddingRight: 12,
                  paddingTop: 8,
                  paddingBottom: 8,
                  fontSize: 13,
                  width: 210,
                }}
              />
            </div>

            <button
              onClick={loadData}
              title="Refresh audits"
              className="btn btn-secondary"
              style={{ padding: "8px 12px" }}
            >
              <RotateCw size={14} />
            </button>
          </div>
        </div>

        {error && (
          <div
            style={{
              padding: "14px 18px",
              borderRadius: "var(--radius-sm)",
              backgroundColor: "var(--status-danger-bg)",
              border: "1px solid var(--punch-border)",
              color: "var(--status-danger-text)",
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <ShieldAlert size={16} />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div style={{ padding: "64px 0", textAlign: "center", color: "var(--text-muted)" }}>
            <div className="pulse-dot" style={{ display: "inline-block", fontSize: 26, marginBottom: 10 }}>🛡️</div>
            <div style={{ fontSize: 13.5, fontWeight: 500 }}>Connecting to Neon Postgres pgvector backend...</div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div
            style={{
              padding: "54px 24px",
              textAlign: "center",
              border: "2px dashed var(--border)",
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--honeydew)",
            }}
          >
            <div style={{ width: 50, height: 50, borderRadius: 12, backgroundColor: "var(--cerulean-dim)", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--cerulean)", marginBottom: 14 }}>
              <BookOpen size={24} />
            </div>
            <h3 style={{ fontSize: 16.5, fontWeight: 700, color: "var(--oxford-navy)", marginBottom: 4 }}>
              {items.length === 0 ? "No compliance audits in workspace" : "No submissions match your query"}
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 20, maxWidth: 440, margin: "0 auto 20px" }}>
              {items.length === 0
                ? "Run an automated compliance check on marketing copy, financial claims, or visual creatives."
                : "Try adjusting your search query or reset the filter pill."}
            </p>
            {items.length === 0 ? (
              <Link href="/submit" className="btn btn-primary">
                <PlusCircle size={15} />
                <span>Run First Compliance Audit</span>
              </Link>
            ) : (
              <button
                onClick={() => { setFilter("all"); setSearch(""); }}
                className="btn btn-secondary"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr
                  style={{
                    borderBottom: "2px solid var(--border)",
                    color: "var(--text-muted)",
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    backgroundColor: "var(--honeydew)",
                  }}
                >
                  <th style={{ padding: "14px 16px" }}>Audit ID</th>
                  <th style={{ padding: "14px 16px" }}>Creative Title / Campaign</th>
                  <th style={{ padding: "14px 16px" }}>Workflow Status</th>
                  <th style={{ padding: "14px 16px" }}>Audited Timestamp</th>
                  <th style={{ padding: "14px 16px", textAlign: "right" }}>Governance Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((sub, idx) => (
                  <motion.tr
                    key={sub.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: idx * 0.025 }}
                    style={{
                      borderBottom: "1px solid var(--border-subtle)",
                      transition: "background-color var(--transition-fast)",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-hover)")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    <td style={{ padding: "14px 16px", fontFamily: "var(--font-mono, monospace)", fontSize: 13, color: "var(--text-muted)", fontWeight: 600 }}>
                      #{sub.id}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <Link
                        href={`/review/${sub.id}`}
                        style={{
                          fontWeight: 700,
                          fontSize: 14,
                          color: "var(--oxford-navy)",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <span>{sub.title || "Untitled Submission"}</span>
                        <ArrowUpRight size={13} color="var(--cerulean)" />
                      </Link>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <SubmissionStatusBadge value={sub.status} />
                    </td>
                    <td style={{ padding: "14px 16px", color: "var(--text-secondary)", fontSize: 13 }}>
                      {fmtDate(sub.created_at)}
                    </td>
                    <td style={{ padding: "14px 16px", textAlign: "right" }}>
                      <Link
                        href={`/review/${sub.id}`}
                        className="btn btn-secondary"
                        style={{
                          fontSize: 12,
                          padding: "6px 14px",
                          borderColor: "var(--border)",
                        }}
                      >
                        <span>Review & Fix</span>
                        <ArrowRight size={13} color="var(--cerulean)" />
                      </Link>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
}
