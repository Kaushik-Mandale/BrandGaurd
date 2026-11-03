"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import type { BenchmarkResult, Insights } from "@/lib/types";
import { errMsg } from "@/lib/ui";
import {
  BarChart3,
  ShieldCheck,
  AlertTriangle,
  RotateCw,
  CheckCircle2,
  Target,
  FlaskConical,
  Play,
  ChevronDown,
  ChevronRight,
  BadgeCheck,
  XCircle,
  Info,
} from "lucide-react";

type Tab = "insights" | "benchmark";

const CATEGORY_LABELS: Record<string, string> = {
  terminology: "Terminology & Names",
  regex: "Regex & Punctuation",
  number_date: "Numbers, Dates & Pricing",
  claim: "Claims & Disclaimers",
  tone: "Tone & Sentiment",
  readability: "Readability & Word Count",
  logo: "Logo Placement & Size",
  palette: "Color Palette Compliance",
  contrast: "WCAG Accessibility Contrast",
};

export default function InsightsPage() {
  const [tab, setTab] = useState<Tab>("insights");
  const [data, setData] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [benchLoading, setBenchLoading] = useState(false);
  const [benchError, setBenchError] = useState<string | null>(null);
  const [benchResult, setBenchResult] = useState<BenchmarkResult | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const loadInsights = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.insights();
      setData(res);
      if (res.benchmark) {
        setBenchResult(res.benchmark as BenchmarkResult);
      }
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    async function fetchInitial() {
      setLoading(true);
      setError(null);
      try {
        const res = await api.insights();
        if (!ignore) {
          setData(res);
          if (res.benchmark) {
            setBenchResult(res.benchmark as BenchmarkResult);
          }
        }
      } catch (err) {
        if (!ignore) setError(errMsg(err));
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    fetchInitial();
    return () => {
      ignore = true;
    };
  }, []);

  const runBenchmark = async () => {
    setBenchLoading(true);
    setBenchError(null);
    try {
      const result = await api.triggerBenchmark();
      setBenchResult(result);
    } catch (err) {
      setBenchError(errMsg(err));
    } finally {
      setBenchLoading(false);
    }
  };

  const toggleRow = (idx: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const tabStyle = (active: boolean) =>
    ({
      display: "inline-flex",
      alignItems: "center",
      gap: 7,
      padding: "9px 20px",
      borderRadius: "var(--radius-sm)",
      fontSize: 13.5,
      fontWeight: 700,
      cursor: "pointer",
      border: "none",
      backgroundColor: active ? "var(--oxford-navy)" : "transparent",
      color: active ? "#FFFFFF" : "var(--text-secondary)",
      transition: "all 0.15s",
    } as React.CSSProperties);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      {/* Header Banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
          padding: "30px 34px",
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
            background:
              "linear-gradient(90deg, var(--oxford-navy) 0%, var(--cerulean) 50%, var(--frosted-blue) 100%)",
          }}
        />

        <div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11.5,
              fontWeight: 700,
              color: "var(--cerulean)",
              backgroundColor: "var(--cerulean-dim)",
              padding: "4px 12px",
              borderRadius: "var(--radius-full)",
              marginBottom: 10,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            <BarChart3 size={13} color="var(--cerulean)" />
            <span>Telemetry &amp; Benchmark Center</span>
          </div>
          <h1
            style={{
              fontSize: 27,
              fontWeight: 800,
              color: "var(--oxford-navy)",
              letterSpacing: "-0.035em",
            }}
          >
            Compliance Intelligence &amp; Performance
          </h1>
          <p
            style={{
              color: "var(--text-secondary)",
              marginTop: 6,
              maxWidth: 680,
              fontSize: 14,
              lineHeight: 1.5,
            }}
          >
            Audited metrics derived from real reviewer activity in your workspace, plus automated pipeline quality evaluations against versioned brand ground truth.
          </p>
        </div>
        <button
          onClick={loadInsights}
          className="btn btn-secondary"
          style={{ padding: "10px 18px", display: "inline-flex", alignItems: "center", gap: 7 }}
        >
          <RotateCw size={14} />
          <span>Refresh Telemetry</span>
        </button>
      </motion.div>

      {/* Tab switcher with clear source distinction */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div
          style={{
            display: "flex",
            gap: 4,
            backgroundColor: "var(--bg-subtle)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            padding: 4,
            width: "fit-content",
          }}
        >
          <button style={tabStyle(tab === "insights")} onClick={() => setTab("insights")}>
            <BarChart3 size={15} />
            Operational Telemetry (Live Workspace)
          </button>
          <button style={tabStyle(tab === "benchmark")} onClick={() => setTab("benchmark")}>
            <FlaskConical size={15} />
            Automated Benchmark (Standardized Test Suite)
          </button>
        </div>
        <div style={{ fontSize: 12.5, color: "var(--text-muted)", paddingLeft: 4 }}>
          {tab === "insights"
            ? "Showing live reviewer interactions, accepted suggestions, and rule dispute data stored in your PostgreSQL database."
            : "Showing deterministic regression results evaluated against labeled ground-truth dataset v2.2 (18 test cases)."}
        </div>
      </div>

      {/* ── OPERATIONAL TELEMETRY TAB ─────────────────────────────────────────── */}
      {tab === "insights" && (
        <>
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
              ⚠ {error}
            </div>
          )}

          {loading ? (
            <div style={{ padding: "80px 0", textAlign: "center", color: "var(--text-muted)" }}>
              <div className="pulse-dot" style={{ fontSize: 24, marginBottom: 8 }}>
                📊
              </div>
              <div>Loading compliance intelligence metrics from database...</div>
            </div>
          ) : !data ? null : (
            <>
              {/* KPI Cards */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                  gap: 16,
                }}
              >
                {/* 1. Reviewer Agreement Rate */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 }}
                  className="card"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    borderTop: "3px solid var(--status-success-text)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span
                      style={{
                        fontSize: 11.5,
                        fontWeight: 700,
                        color: "var(--status-success-text)",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                      }}
                    >
                      Reviewer Agreement
                    </span>
                    <span
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        backgroundColor: "var(--status-success-bg)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--status-success-text)",
                      }}
                    >
                      <CheckCircle2 size={18} />
                    </span>
                  </div>

                  {data.acceptance_rate !== null ? (
                    <>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                        <span style={{ fontSize: 32, fontWeight: 800, color: "var(--status-success-text)" }}>
                          {(data.acceptance_rate * 100).toFixed(1)}%
                        </span>
                        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>corrections accepted</span>
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        Human reviewers accepted the recommended brand fixes in review queue.
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                        <span style={{ fontSize: 32, fontWeight: 800, color: "var(--text-muted)" }}>
                          —
                        </span>
                        <span
                          style={{
                            fontSize: 11.5,
                            fontWeight: 700,
                            color: "var(--cerulean)",
                            backgroundColor: "var(--cerulean-dim)",
                            padding: "2px 8px",
                            borderRadius: 4,
                          }}
                        >
                          Awaiting Reviews
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        No reviewer actions recorded yet. Accepts and dismissals will compute here.
                      </div>
                    </>
                  )}
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-muted)",
                      borderTop: "1px solid var(--border)",
                      paddingTop: 8,
                      fontFamily: "monospace",
                    }}
                  >
                    Formula: Accepted / (Accepted + Dismissed)
                  </div>
                </motion.div>

                {/* 2. Reviewer Dismissal Rate */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="card"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    borderTop: "3px solid var(--cerulean)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span
                      style={{
                        fontSize: 11.5,
                        fontWeight: 700,
                        color: "var(--status-info-text)",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                      }}
                    >
                      Reviewer Dismissal Rate
                    </span>
                    <span
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        backgroundColor: "var(--status-info-bg)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--status-info-text)",
                      }}
                    >
                      <Target size={18} />
                    </span>
                  </div>

                  {data.ai_findings?.false_positive_rate !== null &&
                  data.ai_findings?.false_positive_rate !== undefined ? (
                    <>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                        <span style={{ fontSize: 32, fontWeight: 800, color: "var(--status-info-text)" }}>
                          {(data.ai_findings.false_positive_rate * 100).toFixed(1)}%
                        </span>
                        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>flags dismissed</span>
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        {data.ai_findings.rejected_by_reviewers ?? 0} flags dismissed by reviewers as acceptable brand usage.
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                        <span style={{ fontSize: 32, fontWeight: 800, color: "var(--text-muted)" }}>
                          0.0%
                        </span>
                        <span
                          style={{
                            fontSize: 11.5,
                            fontWeight: 700,
                            color: "var(--status-success-text)",
                            backgroundColor: "var(--status-success-bg)",
                            padding: "2px 8px",
                            borderRadius: 4,
                          }}
                        >
                          Zero Overrides
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        No candidate flags have been dismissed by reviewers as false positives.
                      </div>
                    </>
                  )}
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-muted)",
                      borderTop: "1px solid var(--border)",
                      paddingTop: 8,
                      fontFamily: "monospace",
                    }}
                  >
                    Formula: Dismissed Flags / Total AI Findings
                  </div>
                </motion.div>

                {/* 3. Evidence Verifier Pruning */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="card"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    borderTop: "3px solid var(--oxford-navy)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span
                      style={{
                        fontSize: 11.5,
                        fontWeight: 700,
                        color: "var(--oxford-navy)",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                      }}
                    >
                      Evidence Verifier Pruning
                    </span>
                    <span
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        backgroundColor: "var(--navy-dim)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--oxford-navy)",
                      }}
                    >
                      <ShieldCheck size={18} />
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                    <span style={{ fontSize: 32, fontWeight: 800, color: "var(--oxford-navy)" }}>
                      {data.ai_findings?.dropped_by_verifier ?? 0}
                    </span>
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>candidate flags pruned</span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    Candidate flags pruned by Stage 03 evidence checks before reaching reviewer attention.
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-muted)",
                      borderTop: "1px solid var(--border)",
                      paddingTop: 8,
                    }}
                  >
                    Protects reviewers from noise and ungrounded flags
                  </div>
                </motion.div>

                {/* 4. Rules Needing Clarification */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="card"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    borderTop: "3px solid var(--punch-red)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span
                      style={{
                        fontSize: 11.5,
                        fontWeight: 700,
                        color: "var(--punch-red)",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                      }}
                    >
                      Rules Needing Clarification
                    </span>
                    <span
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        backgroundColor: "var(--punch-dim)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--punch-red)",
                      }}
                    >
                      <AlertTriangle size={18} />
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                    <span style={{ fontSize: 32, fontWeight: 800, color: "var(--punch-red)" }}>
                      {data.ambiguous_rules?.length ?? 0}
                    </span>
                    <span
                      style={{
                        fontSize: 11.5,
                        fontWeight: 700,
                        color:
                          (data.ambiguous_rules?.length ?? 0) === 0
                            ? "var(--status-success-text)"
                            : "var(--punch-red)",
                        backgroundColor:
                          (data.ambiguous_rules?.length ?? 0) === 0
                            ? "var(--status-success-bg)"
                            : "var(--punch-dim)",
                        padding: "2px 8px",
                        borderRadius: 4,
                      }}
                    >
                      {(data.ambiguous_rules?.length ?? 0) === 0 ? "High Consensus" : "Disputes Detected"}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    {(data.ambiguous_rules?.length ?? 0) === 0
                      ? "All active brand rules show high reviewer consensus without repeat dismissals."
                      : `${data.ambiguous_rules?.length} active rule(s) frequently dismissed by reviewers (≥2 dismissals).`}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-muted)",
                      borderTop: "1px solid var(--border)",
                      paddingTop: 8,
                    }}
                  >
                    Criteria: Disputed ≥ 2 times and dismissals ≥ acceptances
                  </div>
                </motion.div>
              </div>

              {/* Data Breakdown Sections */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                {/* Most Frequent Violations */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="card"
                  style={{ display: "flex", flexDirection: "column", gap: 16 }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <h3 style={{ fontSize: 16, fontWeight: 800, color: "var(--oxford-navy)" }}>
                        Most Frequent Brand Violations
                      </h3>
                      <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                        Top recurring violation patterns captured across all submissions
                      </p>
                    </div>
                  </div>

                  {!data.top_flagged || data.top_flagged.length === 0 ? (
                    <div
                      style={{
                        padding: "36px 0",
                        textAlign: "center",
                        color: "var(--text-muted)",
                        fontSize: 13,
                        backgroundColor: "var(--bg-subtle)",
                        borderRadius: "var(--radius-sm)",
                      }}
                    >
                      No recurring violations cataloged in this workspace yet.
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {data.top_flagged.map((item, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "10px 14px",
                            borderRadius: 6,
                            backgroundColor: "var(--bg-subtle)",
                            border: "1px solid var(--border)",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                padding: "2px 7px",
                                borderRadius: 4,
                                backgroundColor: "var(--cerulean-dim)",
                                color: "var(--cerulean)",
                                textTransform: "uppercase",
                              }}
                            >
                              {item.type}
                            </span>
                            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--oxford-navy)" }}>
                              &ldquo;{item.text}&rdquo;
                            </span>
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)" }}>
                            {item.count}× flagged
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>

                {/* Deterministic Rule Health */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="card"
                  style={{ display: "flex", flexDirection: "column", gap: 16 }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <h3 style={{ fontSize: 16, fontWeight: 800, color: "var(--oxford-navy)" }}>
                        Deterministic Rule Health
                      </h3>
                      <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                        Reviewer consensus on active terminology, style, and regex rules
                      </p>
                    </div>
                  </div>

                  {!data.top_rules || data.top_rules.length === 0 ? (
                    <div
                      style={{
                        padding: "36px 0",
                        textAlign: "center",
                        color: "var(--text-muted)",
                        fontSize: 13,
                        backgroundColor: "var(--bg-subtle)",
                        borderRadius: "var(--radius-sm)",
                      }}
                    >
                      No rule trigger statistics cataloged yet.
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {data.top_rules.map((r, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "10px 14px",
                            borderRadius: 6,
                            backgroundColor: "var(--bg-subtle)",
                            border: "1px solid var(--border)",
                          }}
                        >
                          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--oxford-navy)" }}>
                              /{r.pattern}/
                            </span>
                            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Rule ID #{r.rule_id}</span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <span style={{ fontSize: 12, color: "var(--status-success-text)", fontWeight: 700 }}>
                              {r.accepted} accepted
                            </span>
                            <span style={{ fontSize: 12, color: "var(--punch-red)", fontWeight: 700 }}>
                              {r.rejected} dismissed
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              </div>
            </>
          )}
        </>
      )}

      {/* ── AUTOMATED BENCHMARK TAB ─────────────────────────────────────────── */}
      {tab === "benchmark" && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ display: "flex", flexDirection: "column", gap: 20 }}
        >
          {/* Benchmark Header Card */}
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                flexWrap: "wrap",
                gap: 16,
              }}
            >
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
                    borderRadius: "var(--radius-full)",
                    marginBottom: 8,
                    textTransform: "uppercase",
                  }}
                >
                  <FlaskConical size={12} />
                  Automated CI/CD Quality Benchmark
                </div>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--oxford-navy)" }}>
                  Compliance Pipeline Regression Evaluation
                </h2>
                <p
                  style={{
                    color: "var(--text-secondary)",
                    fontSize: 13.5,
                    marginTop: 4,
                    maxWidth: 620,
                    lineHeight: 1.5,
                  }}
                >
                  Evaluates the compliance pipeline against versioned ground-truth dataset <strong>eval_set.json (v2.2, 18 labeled cases)</strong>. Computes deterministic precision, recall, F1, and clean-content accuracy with regression threshold verification.
                </p>
              </div>

              <button
                onClick={runBenchmark}
                className="btn btn-primary"
                disabled={benchLoading}
                style={{
                  padding: "11px 22px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 13.5,
                  fontWeight: 700,
                }}
              >
                {benchLoading ? (
                  <RotateCw size={15} style={{ animation: "spin 1s linear infinite" }} />
                ) : (
                  <Play size={15} />
                )}
                {benchLoading ? "Evaluating Pipeline…" : "Run Benchmark"}
              </button>
            </div>

            {benchError && (
              <div
                style={{
                  padding: "12px 16px",
                  borderRadius: "var(--radius-sm)",
                  backgroundColor: "var(--status-danger-bg)",
                  border: "1px solid var(--punch-border)",
                  color: "var(--status-danger-text)",
                  fontSize: 13,
                }}
              >
                ⚠ {benchError}
              </div>
            )}

            {!benchResult && !benchLoading && (
              <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                <FlaskConical size={32} style={{ opacity: 0.3, marginBottom: 10 }} />
                <div>No benchmark results loaded. Click <strong>Run Benchmark</strong> to evaluate the pipeline.</div>
              </div>
            )}

            {benchLoading && (
              <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-muted)" }}>
                <div className="pulse-dot" style={{ fontSize: 22, marginBottom: 8 }}>
                  🔬
                </div>
                <div>Evaluating pipeline against 18 labeled test cases in eval_set.json…</div>
              </div>
            )}
          </div>

          {benchResult && !benchLoading && (
            <>
              {/* Benchmark Scope & Known Limitations Box */}
              <div
                style={{
                  padding: "14px 18px",
                  borderRadius: "var(--radius-sm)",
                  backgroundColor: "var(--bg-subtle)",
                  border: "1px solid var(--border)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Info size={15} color="var(--cerulean)" />
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--oxford-navy)" }}>
                    Evaluation Scope &amp; Methodology
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "var(--cerulean)",
                      backgroundColor: "var(--cerulean-dim)",
                      padding: "2px 8px",
                      borderRadius: 4,
                      marginLeft: "auto",
                    }}
                  >
                    Dataset: {benchResult.dataset_version} ({benchResult.sample_count} Cases)
                  </span>
                </div>
                <div style={{ fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                  <strong>Stages Evaluated:</strong> Stage 02 (Brand Rules, Banned Terms &amp; Regex), Stage 03 (Claims, Formatting &amp; Numbers), and Stage 04 (Contrast &amp; Accessibility).
                  <br />
                  <strong>Deterministic Offline Mode:</strong> Runs without external LLM API latency for predictable, reproducible regression checks. Multimodal visual identity checks (logos &amp; custom palettes) are validated via dedicated test assets in visual regression suite.
                </div>
              </div>

              {/* Regression Status Banner */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "14px 20px",
                  borderRadius: "var(--radius-sm)",
                  backgroundColor: benchResult.passed_regression
                    ? "var(--status-success-bg)"
                    : "var(--status-danger-bg)",
                  border: `1px solid ${
                    benchResult.passed_regression ? "var(--status-success-text)" : "var(--punch-red)"
                  }`,
                  color: benchResult.passed_regression
                    ? "var(--status-success-text)"
                    : "var(--status-danger-text)",
                  fontWeight: 700,
                  fontSize: 14,
                }}
              >
                {benchResult.passed_regression ? <BadgeCheck size={20} /> : <XCircle size={20} />}
                <span>
                  {benchResult.passed_regression
                    ? "✅ All regression thresholds passed — precision ≥ 75%, recall ≥ 60%, clean-content accuracy = 100%."
                    : "❌ One or more regression thresholds failed — review flagged cases below."}
                </span>
                <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 400, opacity: 0.85 }}>
                  {benchResult.sample_count} test cases · {benchResult.duration_seconds}s execution ·{" "}
                  {new Date(benchResult.executed_at).toLocaleTimeString()}
                </span>
              </div>

              {/* Metric Cards with Explicit Definitions */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
                  gap: 14,
                }}
              >
                {[
                  {
                    label: "Precision",
                    value: `${(benchResult.precision * 100).toFixed(1)}%`,
                    formula: "TP / (TP + FP)",
                    explanation: "Ratio of flagged violations that were actual brand breaches.",
                    color: "#2E7D32",
                    threshold: "Threshold: ≥ 75.0%",
                  },
                  {
                    label: "Recall",
                    value: `${(benchResult.recall * 100).toFixed(1)}%`,
                    formula: "TP / (TP + FN)",
                    explanation: "Ratio of true violations in ground truth detected by pipeline.",
                    color: "var(--cerulean)",
                    threshold: "Threshold: ≥ 60.0%",
                  },
                  {
                    label: "F1 Score",
                    value: `${(benchResult.f1 * 100).toFixed(1)}%`,
                    formula: "2 × (P × R) / (P + R)",
                    explanation: "Harmonic mean balancing precision and violation detection.",
                    color: "var(--oxford-navy)",
                    threshold: "Balanced quality metric",
                  },
                  {
                    label: "False Positive Rate",
                    value: `${(benchResult.false_positive_rate * 100).toFixed(1)}%`,
                    formula: "FP / (FP + TP)",
                    explanation: "Share of flags raised erroneously on compliant content.",
                    color: "var(--punch-red)",
                    threshold: "Target: Lower is better",
                  },
                  {
                    label: "Clean Content Accuracy",
                    value: `${(benchResult.clean_posts_accuracy * 100).toFixed(0)}%`,
                    formula: `${benchResult.clean_posts_passed}/${benchResult.clean_posts_total} passed`,
                    explanation: "Clean, compliant samples that passed with zero false flags.",
                    color: "#1565C0",
                    threshold: "Target: 100.0%",
                  },
                ].map((m, i) => (
                  <div
                    key={i}
                    className="card"
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                      borderTop: `3px solid ${m.color}`,
                    }}
                  >
                    <span style={{ fontSize: 11, fontWeight: 700, color: m.color, textTransform: "uppercase" }}>
                      {m.label}
                    </span>
                    <span style={{ fontSize: 30, fontWeight: 800, color: m.color }}>{m.value}</span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "monospace" }}>
                      {m.formula}
                    </span>
                    <p style={{ fontSize: 11.5, color: "var(--text-secondary)", margin: 0, lineHeight: 1.4 }}>
                      {m.explanation}
                    </p>
                    <span
                      style={{
                        fontSize: 10.5,
                        color: "var(--text-muted)",
                        fontStyle: "italic",
                        borderTop: "1px solid var(--border)",
                        paddingTop: 6,
                        marginTop: 4,
                      }}
                    >
                      {m.threshold}
                    </span>
                  </div>
                ))}
              </div>

              {/* TP / FP / FN Breakdown */}
              <div
                className="card"
                style={{
                  display: "flex",
                  gap: 24,
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "space-around",
                }}
              >
                {[
                  {
                    label: "True Positives (TP)",
                    value: benchResult.tp,
                    sub: "Real brand violations successfully caught",
                    color: "#2E7D32",
                  },
                  {
                    label: "False Positives (FP)",
                    value: benchResult.fp,
                    sub: "Erroneously flagged compliant phrasing",
                    color: "var(--punch-red)",
                  },
                  {
                    label: "False Negatives (FN)",
                    value: benchResult.fn,
                    sub: "Expected violations missed by engine",
                    color: "#E65100",
                  },
                ].map((m, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      flex: 1,
                      minWidth: 180,
                      flexDirection: "column",
                      alignItems: "center",
                      textAlign: "center",
                      gap: 4,
                      padding: "8px 0",
                    }}
                  >
                    <span style={{ fontSize: 28, fontWeight: 800, color: m.color }}>{m.value}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--oxford-navy)" }}>{m.label}</span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{m.sub}</span>
                  </div>
                ))}
              </div>

              {/* Category Breakdown */}
              <div className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 800, color: "var(--oxford-navy)" }}>
                      Evaluation by Issue Category
                    </h3>
                    <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                      Performance breakdown across specific compliance dimensions
                    </p>
                  </div>
                </div>

                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      {["Category", "True Positives", "False Positives", "False Negatives", "Precision", "Recall"].map(
                        (h) => (
                          <th
                            key={h}
                            style={{
                              textAlign: h === "Category" ? "left" : "center",
                              padding: "8px 12px",
                              fontSize: 11,
                              fontWeight: 700,
                              color: "var(--text-muted)",
                              textTransform: "uppercase",
                              letterSpacing: "0.04em",
                            }}
                          >
                            {h}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(benchResult.by_type).map(([type, stats], i) => {
                      const prec =
                        stats.tp + stats.fp > 0
                          ? (stats.tp / (stats.tp + stats.fp) * 100).toFixed(0) + "%"
                          : "—";
                      const rec =
                        stats.tp + stats.fn > 0
                          ? (stats.tp / (stats.tp + stats.fn) * 100).toFixed(0) + "%"
                          : "—";
                      return (
                        <tr
                          key={i}
                          style={{
                            borderBottom: "1px solid var(--border)",
                            backgroundColor: i % 2 === 0 ? "transparent" : "var(--bg-subtle)",
                          }}
                        >
                          <td style={{ padding: "10px 12px", fontWeight: 600, color: "var(--oxford-navy)" }}>
                            {CATEGORY_LABELS[type] ?? type}
                          </td>
                          <td
                            style={{
                              padding: "10px 12px",
                              textAlign: "center",
                              color: "#2E7D32",
                              fontWeight: 700,
                            }}
                          >
                            {stats.tp}
                          </td>
                          <td
                            style={{
                              padding: "10px 12px",
                              textAlign: "center",
                              color: stats.fp > 0 ? "var(--punch-red)" : "var(--text-muted)",
                              fontWeight: stats.fp > 0 ? 700 : 400,
                            }}
                          >
                            {stats.fp}
                          </td>
                          <td
                            style={{
                              padding: "10px 12px",
                              textAlign: "center",
                              color: stats.fn > 0 ? "#E65100" : "var(--text-muted)",
                              fontWeight: stats.fn > 0 ? 700 : 400,
                            }}
                          >
                            {stats.fn}
                          </td>
                          <td
                            style={{
                              padding: "10px 12px",
                              textAlign: "center",
                              color: "var(--text-secondary)",
                              fontWeight: 600,
                            }}
                          >
                            {prec}
                          </td>
                          <td
                            style={{
                              padding: "10px 12px",
                              textAlign: "center",
                              color: "var(--text-secondary)",
                              fontWeight: 600,
                            }}
                          >
                            {rec}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Individual Test Case Inspection */}
              <div className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 800, color: "var(--oxford-navy)" }}>
                      Test Case Inspection ({benchResult.details.length} Test Samples)
                    </h3>
                    <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                      Click any test row to inspect expected versus detected findings
                    </p>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {benchResult.details.map((detail, idx) => {
                    const expanded = expandedRows.has(idx);
                    const hasFail = detail.failed;
                    return (
                      <div
                        key={idx}
                        style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}
                      >
                        <button
                          onClick={() => toggleRow(idx)}
                          style={{
                            display: "flex",
                            width: "100%",
                            alignItems: "center",
                            gap: 10,
                            padding: "10px 14px",
                            backgroundColor: hasFail
                              ? "rgba(230,57,70,0.05)"
                              : "var(--status-success-bg-light, #f0faf0)",
                            border: "none",
                            cursor: "pointer",
                            textAlign: "left",
                          }}
                        >
                          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          <span
                            style={{
                              flex: 1,
                              fontSize: 13,
                              fontWeight: 600,
                              color: "var(--oxford-navy)",
                            }}
                          >
                            {detail.title}
                          </span>
                          <span
                            style={{
                              fontSize: 11,
                              padding: "2px 8px",
                              borderRadius: 4,
                              fontWeight: 700,
                              backgroundColor: hasFail
                                ? "var(--status-danger-bg)"
                                : "var(--status-success-bg)",
                              color: hasFail
                                ? "var(--status-danger-text)"
                                : "var(--status-success-text)",
                            }}
                          >
                            {hasFail ? "FAILED" : "PASSED"}
                          </span>
                          <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 8 }}>
                            {detail.findings_count} found / {detail.expected_count} expected
                          </span>
                        </button>
                        {expanded && (
                          <div
                            style={{
                              padding: "12px 14px",
                              display: "flex",
                              flexDirection: "column",
                              gap: 10,
                              backgroundColor: "#FAFAFA",
                              borderTop: "1px solid var(--border)",
                            }}
                          >
                            {detail.missed.length > 0 && (
                              <div>
                                <div
                                  style={{
                                    fontSize: 11,
                                    fontWeight: 700,
                                    color: "#E65100",
                                    textTransform: "uppercase",
                                    marginBottom: 6,
                                  }}
                                >
                                  Missed Violations ({detail.missed.length})
                                </div>
                                {detail.missed.map((m, mi) => (
                                  <div
                                    key={mi}
                                    style={{
                                      fontSize: 12,
                                      padding: "4px 10px",
                                      backgroundColor: "rgba(230,101,0,0.07)",
                                      borderRadius: 4,
                                      marginBottom: 4,
                                    }}
                                  >
                                    <span
                                      style={{ fontWeight: 700, textTransform: "uppercase", marginRight: 8 }}
                                    >
                                      {m.type}
                                    </span>
                                    <span style={{ color: "var(--text-secondary)" }}>
                                      contains &ldquo;{m.contains}&rdquo;
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {detail.false_positives.length > 0 && (
                              <div>
                                <div
                                  style={{
                                    fontSize: 11,
                                    fontWeight: 700,
                                    color: "var(--punch-red)",
                                    textTransform: "uppercase",
                                    marginBottom: 6,
                                  }}
                                >
                                  False Positives ({detail.false_positives.length})
                                </div>
                                {detail.false_positives.map((fp, fpi) => (
                                  <div
                                    key={fpi}
                                    style={{
                                      fontSize: 12,
                                      padding: "4px 10px",
                                      backgroundColor: "rgba(230,57,70,0.06)",
                                      borderRadius: 4,
                                      marginBottom: 4,
                                    }}
                                  >
                                    <span
                                      style={{ fontWeight: 700, textTransform: "uppercase", marginRight: 8 }}
                                    >
                                      {fp.type}
                                    </span>
                                    <span style={{ color: "var(--text-secondary)" }}>
                                      &ldquo;{fp.flagged_text}&rdquo; — {fp.message}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {!hasFail && (
                              <div
                                style={{
                                  fontSize: 12,
                                  color: "var(--status-success-text)",
                                  fontWeight: 600,
                                }}
                              >
                                ✓ All expected violations caught with 100% precision.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </motion.div>
      )}
    </div>
  );
}
