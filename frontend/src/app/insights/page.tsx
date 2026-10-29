"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import type { Insights } from "@/lib/types";
import { pct, errMsg } from "@/lib/ui";
import {
  BarChart3,
  ShieldCheck,
  AlertTriangle,
  RotateCw,
  CheckCircle2,
  Target,
} from "lucide-react";

export default function InsightsPage() {
  const [data, setData] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadInsights = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.insights();
      setData(res);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    async function fetchInitial() {
      try {
        const res = await api.insights();
        if (!ignore) {
          setData(res);
          setLoading(false);
        }
      } catch (err) {
        if (!ignore) {
          setError(errMsg(err));
          setLoading(false);
        }
      }
    }
    fetchInitial();
    return () => {
      ignore = true;
    };
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      {/* Editorial Banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
          padding: "32px 36px",
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
            <span>AI Model Evaluation & Quality Telemetry</span>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--oxford-navy)", letterSpacing: "-0.035em" }}>
            Compliance Intelligence & Performance
          </h1>
          <p style={{ color: "var(--text-secondary)", marginTop: 6, maxWidth: 640, fontSize: 14.5 }}>
            Continuous model evaluation metrics, reviewer acceptance rates, false-positive tracking, and brand rule health derived from real persisted records.
          </p>
        </div>
        <button onClick={loadInsights} className="btn btn-secondary" style={{ padding: "10px 18px" }}>
          <RotateCw size={14} />
          <span>Refresh Metrics</span>
        </button>
      </motion.div>

      {error && (
        <div style={{ padding: "14px 18px", borderRadius: "var(--radius-sm)", backgroundColor: "var(--status-danger-bg)", border: "1px solid var(--punch-border)", color: "var(--status-danger-text)", fontSize: 13 }}>
          ⚠ {error}
        </div>
      )}

      {loading ? (
        <div style={{ padding: "80px 0", textAlign: "center", color: "var(--text-muted)" }}>
          <div className="pulse-dot" style={{ fontSize: 24, marginBottom: 8 }}>📊</div>
          <div>Loading compliance intelligence metrics from database...</div>
        </div>
      ) : !data ? null : (
        <>
          {/* AI Precision & Operational Health KPIs */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 16 }}>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="card"
              style={{ display: "flex", flexDirection: "column", gap: 10, borderTop: "3px solid var(--status-success-text)" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--status-success-text)", textTransform: "uppercase" }}>
                  AI Fix Acceptance Rate
                </span>
                <span style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: "var(--status-success-bg)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--status-success-text)" }}>
                  <CheckCircle2 size={18} />
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontSize: 32, fontWeight: 800, color: "var(--status-success-text)" }}>
                  {pct(data.acceptance_rate)}
                </span>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>fixes accepted</span>
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                Reviewers agreed with AI proposals
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="card"
              style={{ display: "flex", flexDirection: "column", gap: 10, borderTop: "3px solid var(--cerulean)" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--status-info-text)", textTransform: "uppercase" }}>
                  Reviewer False Positive Rate
                </span>
                <span style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: "var(--status-info-bg)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--status-info-text)" }}>
                  <Target size={18} />
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontSize: 32, fontWeight: 800, color: "var(--status-info-text)" }}>
                  {pct(data.ai_findings?.false_positive_rate)}
                </span>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>dismissed</span>
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                {data.ai_findings?.rejected_by_reviewers ?? 0} dismissed by human reviewers
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="card"
              style={{ display: "flex", flexDirection: "column", gap: 10, borderTop: "3px solid var(--oxford-navy)" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--oxford-navy)", textTransform: "uppercase" }}>
                  Pipeline Hallucination Shield
                </span>
                <span style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: "var(--navy-dim)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--oxford-navy)" }}>
                  <ShieldCheck size={18} />
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontSize: 32, fontWeight: 800, color: "var(--oxford-navy)" }}>
                  {data.ai_findings?.dropped_by_verifier ?? 0}
                </span>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>findings pruned</span>
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                Dropped by 2-stage evidence verifier
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="card"
              style={{ display: "flex", flexDirection: "column", gap: 10, borderTop: "3px solid var(--punch-red)" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--punch-red)", textTransform: "uppercase" }}>
                  Ambiguous Rule Drift
                </span>
                <span style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: "var(--punch-dim)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--punch-red)" }}>
                  <AlertTriangle size={18} />
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontSize: 32, fontWeight: 800, color: "var(--punch-red)" }}>
                  {data.ambiguous_rules?.length ?? 0}
                </span>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>rules flagged</span>
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                Frequently disputed or rejected by reviewers
              </div>
            </motion.div>
          </div>

          {/* Breakdown Charts & Tables */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {/* Top Violations */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="card"
              style={{ display: "flex", flexDirection: "column", gap: 16 }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: "var(--oxford-navy)" }}>
                  Most Frequent Violations
                </h3>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Cataloged spans</span>
              </div>

              {data.top_flagged?.length === 0 ? (
                <div style={{ padding: "30px 0", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                  No violations cataloged in workspace yet.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {data.top_flagged?.map((item, idx) => (
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
                          “{item.text}”
                        </span>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)" }}>
                        {item.count}×
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Rule Health & Performance */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="card"
              style={{ display: "flex", flexDirection: "column", gap: 16 }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: "var(--oxford-navy)" }}>
                  Deterministic Rule Health
                </h3>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Triggered & Accepted</span>
              </div>

              {data.top_rules?.length === 0 ? (
                <div style={{ padding: "30px 0", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                  No rule statistics available.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {data.top_rules?.map((r, idx) => (
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
                        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                          Rule ID #{r.rule_id}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={{ fontSize: 12, color: "var(--status-success-text)", fontWeight: 700 }}>
                          {r.accepted} accepted
                        </span>
                        <span style={{ fontSize: 12, color: "var(--punch-red)", fontWeight: 700 }}>
                          {r.rejected} rejected
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
    </div>
  );
}
