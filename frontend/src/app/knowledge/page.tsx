"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import type { BrandDocument, Rule, RuleKind, Severity, SearchHit } from "@/lib/types";
import { SeverityBadge } from "@/components/Badges";
import { fmtDate, errMsg } from "@/lib/ui";
import {
  BookOpen,
  UploadCloud,
  Search,
  Plus,
  Trash2,
  CheckCircle2,
  FileText,
} from "lucide-react";

export default function KnowledgePage() {
  const [docs, setDocs] = useState<BrandDocument[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [docTitle, setDocTitle] = useState("");
  const [docType, setDocType] = useState("guideline");
  const [uploading, setUploading] = useState(false);

  // Rule creation state
  const [showAddRule, setShowAddRule] = useState(false);
  const [ruleKind, setRuleKind] = useState<RuleKind>("banned_term");
  const [pattern, setPattern] = useState("");
  const [replacement, setReplacement] = useState("");
  const [severity, setSeverity] = useState<Severity>("high");
  const [description, setDescription] = useState("");
  const [savingRule, setSavingRule] = useState(false);

  // Semantic search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchHits, setSearchHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [d, r] = await Promise.all([api.listDocuments(), api.listRules()]);
      setDocs(d);
      setRules(r);
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
        const [d, r] = await Promise.all([api.listDocuments(), api.listRules()]);
        if (!ignore) {
          setDocs(d);
          setRules(r);
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

  async function handleUploadDoc(e: React.FormEvent) {
    e.preventDefault();
    if (!uploadFile) return;
    setUploading(true);
    try {
      await api.uploadDocument(uploadFile, docTitle.trim() || uploadFile.name, docType);
      setUploadFile(null);
      setDocTitle("");
      await loadData();
    } catch (err) {
      alert("Error uploading document: " + errMsg(err));
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteDoc(id: number) {
    if (!confirm("Permanently delete this brand guideline document and all associated vector embeddings?")) return;
    try {
      await api.deleteDocument(id);
      setDocs((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      alert("Error deleting document: " + errMsg(err));
    }
  }

  async function handleCreateRule(e: React.FormEvent) {
    e.preventDefault();
    if (!pattern.trim()) return;
    setSavingRule(true);
    try {
      const created = await api.createRule({
        kind: ruleKind,
        pattern: pattern.trim(),
        replacement: replacement.trim() || null,
        severity,
        description: description.trim() || `Enforce ${ruleKind.replace(/_/g, " ")}`,
      });
      setRules((prev) => [created, ...prev]);
      setShowAddRule(false);
      setPattern("");
      setReplacement("");
      setDescription("");
    } catch (err) {
      alert("Error creating rule: " + errMsg(err));
    } finally {
      setSavingRule(false);
    }
  }

  async function handleToggleRule(id: number) {
    try {
      const updated = await api.toggleRule(id);
      setRules((prev) => prev.map((r) => (r.id === id ? updated : r)));
    } catch (err) {
      alert("Error toggling rule: " + errMsg(err));
    }
  }

  async function handleDeleteRule(id: number) {
    if (!confirm("Permanently delete this brand rule?")) return;
    try {
      await api.deleteRule(id);
      setRules((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      alert("Error deleting rule: " + errMsg(err));
    }
  }

  async function handleSemanticSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const hits = await api.search(searchQuery.trim());
      setSearchHits(hits);
    } catch (err) {
      alert("Search failed: " + errMsg(err));
    } finally {
      setSearching(false);
    }
  }

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
            background: "linear-gradient(90deg, var(--inkloom-navy) 0%, var(--inkloom-cerulean) 100%)",
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
              color: "var(--inkloom-cerulean)",
              backgroundColor: "var(--cerulean-dim)",
              padding: "4px 12px",
              borderRadius: "var(--radius-full)",
              marginBottom: 10,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            <BookOpen size={13} color="var(--inkloom-cerulean)" />
            <span>Single Source of Truth</span>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--inkloom-navy)", letterSpacing: "-0.035em" }}>
            Brand Knowledge & Governance Rules
          </h1>
          <p style={{ color: "var(--text-secondary)", marginTop: 6, maxWidth: 640, fontSize: 14.5 }}>
            Manage approved guideline manuals indexed into pgvector for semantic claim verification, alongside zero-latency deterministic rules.
          </p>
        </div>
        <Link href="/submit" className="btn btn-primary" style={{ padding: "10px 20px" }}>
          <Plus size={15} />
          <span>New Compliance Check</span>
        </Link>
      </motion.div>

      {error && (
        <div style={{ padding: "14px 18px", borderRadius: "var(--radius-sm)", backgroundColor: "var(--status-danger-bg)", border: "1px solid var(--punch-border)", color: "var(--status-danger-text)", fontSize: 13 }}>
          ⚠ {error}
        </div>
      )}

      {/* Grid: Guidelines Ingestion & Live Vector Search */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Ingested Documents Card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="card"
          style={{ display: "flex", flexDirection: "column", gap: 16 }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: "var(--inkloom-navy)" }}>Brand Guidelines & Manuals</h2>
              <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Chunked and indexed into Neon pgvector embeddings</p>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--inkloom-cerulean)" }}>
              {docs.length} docs indexed
            </span>
          </div>

          {/* Upload Form */}
          <form
            onSubmit={handleUploadDoc}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
              backgroundColor: "var(--bg-subtle)",
              padding: 14,
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border)",
            }}
          >
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="text"
                placeholder="Document title (e.g. Q3 Brand Guidelines Manual)"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                style={{ flex: 1, padding: "8px 12px", fontSize: 13 }}
              />
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                style={{ padding: "8px 12px", fontSize: 12 }}
              >
                <option value="guideline">Guideline</option>
                <option value="product_fact">Product Fact</option>
                <option value="legal">Legal/Disclaimer</option>
              </select>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <input
                type="file"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                accept=".txt,.md,.pdf,.docx"
                style={{ fontSize: 12, color: "var(--text-secondary)" }}
              />
              <button
                type="submit"
                disabled={!uploadFile || uploading}
                className="btn btn-primary"
                style={{ fontSize: 12, padding: "7px 14px" }}
              >
                <UploadCloud size={14} />
                <span>{uploading ? "Indexing..." : "Upload & Vectorize"}</span>
              </button>
            </div>
          </form>

          {/* Docs list */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 260, overflowY: "auto" }}>
            {loading ? (
              <div style={{ padding: "30px 0", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                Loading guideline documents...
              </div>
            ) : docs.length === 0 ? (
              <div style={{ padding: "30px 0", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                No guideline documents uploaded yet.
              </div>
            ) : (
              docs.map((d) => (
                <div
                  key={d.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 14px",
                    borderRadius: "var(--radius-sm)",
                    backgroundColor: "var(--bg-surface)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <FileText size={16} color="var(--inkloom-cerulean)" />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--inkloom-navy)" }}>{d.title}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        Type: {d.doc_type} • Added {fmtDate(d.created_at)}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteDoc(d.id)}
                    className="btn btn-ghost"
                    style={{ color: "var(--status-danger-text)", padding: "4px 8px" }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Live Semantic Search Vector Tester */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="card"
          style={{ display: "flex", flexDirection: "column", gap: 16 }}
        >
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: "var(--inkloom-navy)" }}>Live Semantic RAG Query</h2>
            <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Test vector cosine distance matching against the indexed brand facts in real time.
            </p>
          </div>

          <form onSubmit={handleSemanticSearch} style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              placeholder="e.g. What is our uptime SLA commitment?"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ flex: 1, padding: "8px 12px", fontSize: 13 }}
            />
            <button
              type="submit"
              disabled={searching || !searchQuery.trim()}
              className="btn btn-secondary"
              style={{ fontSize: 12 }}
            >
              <Search size={14} />
              <span>{searching ? "Searching..." : "Query"}</span>
            </button>
          </form>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 300, overflowY: "auto" }}>
            {searchHits.length === 0 ? (
              <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                Enter a claim or question to inspect semantic chunks retrieved for LLM evaluation.
              </div>
            ) : (
              searchHits.map((h, i) => (
                <div
                  key={i}
                  style={{
                    padding: "12px",
                    borderRadius: "var(--radius-sm)",
                    backgroundColor: "var(--cerulean-dim)",
                    border: "1px solid var(--inkloom-cerulean)",
                    fontSize: 12,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, color: "var(--inkloom-navy)" }}>
                      {h.doc_title} {h.page ? `(p. ${h.page})` : ""}
                    </span>
                    <span style={{ color: "var(--status-success-text)", fontFamily: "monospace", fontWeight: 700 }}>
                      Score: {h.score.toFixed(3)}
                    </span>
                  </div>
                  <p style={{ color: "var(--text-secondary)", lineHeight: 1.5, fontStyle: "italic" }}>
                    &ldquo;{h.text}&rdquo;
                  </p>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>

      {/* Deterministic Rule Engine Section */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="card"
        style={{ display: "flex", flexDirection: "column", gap: 20 }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--inkloom-navy)" }}>Deterministic Rule Engine</h2>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 2 }}>
              High-precision banned terms, preferred phrasing replacements, required disclaimers, and regex patterns.
            </p>
          </div>
          <button
            onClick={() => setShowAddRule(!showAddRule)}
            className="btn btn-primary"
            style={{ fontSize: 13 }}
          >
            <Plus size={14} />
            <span>{showAddRule ? "Close Rule Creator" : "Create Brand Rule"}</span>
          </button>
        </div>

        {/* Add Rule Drawer */}
        {showAddRule && (
          <form
            onSubmit={handleCreateRule}
            style={{
              padding: 18,
              borderRadius: "var(--radius-sm)",
              backgroundColor: "var(--bg-subtle)",
              border: "1px solid var(--border-focus)",
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>
                  Rule Kind
                </label>
                <select
                  value={ruleKind}
                  onChange={(e) => setRuleKind(e.target.value as RuleKind)}
                  style={{ width: "100%" }}
                >
                  <option value="banned_term">Banned Term</option>
                  <option value="preferred_term">Preferred Replacement</option>
                  <option value="required_text">Required Disclosure</option>
                  <option value="regex">Regex Pattern</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>
                  Severity Level
                </label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as Severity)}
                  style={{ width: "100%" }}
                >
                  <option value="high">High (Blocks Approval)</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low (Advisory)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>
                  Target Term or Pattern *
                </label>
                <input
                  type="text"
                  placeholder="e.g. cheap or 100% uptime"
                  value={pattern}
                  onChange={(e) => setPattern(e.target.value)}
                  style={{ width: "100%" }}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>
                  Proposed Replacement (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. cost-effective or 99.9% uptime SLA"
                  value={replacement}
                  onChange={(e) => setReplacement(e.target.value)}
                  style={{ width: "100%" }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>
                  Compliance Explanation / Rationale
                </label>
                <input
                  type="text"
                  placeholder="e.g. Protects enterprise positioning."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{ width: "100%" }}
                />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                type="button"
                onClick={() => setShowAddRule(false)}
                className="btn btn-secondary"
                style={{ fontSize: 12 }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingRule || !pattern.trim()}
                className="btn btn-primary"
                style={{ fontSize: 12 }}
              >
                <CheckCircle2 size={13} />
                <span>{savingRule ? "Saving..." : "Save Rule"}</span>
              </button>
            </div>
          </form>
        )}

        {/* Rules Table */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--text-muted)", fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>
                <th style={{ padding: "12px 14px" }}>Status</th>
                <th style={{ padding: "12px 14px" }}>Type</th>
                <th style={{ padding: "12px 14px" }}>Target Pattern</th>
                <th style={{ padding: "12px 14px" }}>Replacement</th>
                <th style={{ padding: "12px 14px" }}>Severity</th>
                <th style={{ padding: "12px 14px" }}>Description</th>
                <th style={{ padding: "12px 14px", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => (
                <tr
                  key={r.id}
                  style={{
                    borderBottom: "1px solid var(--border-subtle)",
                    opacity: r.active ? 1 : 0.45,
                  }}
                >
                  <td style={{ padding: "12px 14px" }}>
                    <button
                      onClick={() => handleToggleRule(r.id)}
                      style={{
                        padding: "3px 8px",
                        borderRadius: 4,
                        border: "none",
                        cursor: "pointer",
                        fontSize: 10,
                        fontWeight: 800,
                        backgroundColor: r.active ? "var(--status-success-bg)" : "var(--bg-subtle)",
                        color: r.active ? "var(--status-success-text)" : "var(--text-muted)",
                      }}
                    >
                      {r.active ? "ACTIVE" : "PAUSED"}
                    </button>
                  </td>
                  <td style={{ padding: "12px 14px", fontSize: 12, color: "var(--inkloom-navy)", fontWeight: 700 }}>
                    {r.kind.replace(/_/g, " ")}
                  </td>
                  <td style={{ padding: "12px 14px", fontFamily: "var(--font-mono, monospace)", color: "var(--inkloom-navy)", fontSize: 13, fontWeight: 600 }}>
                    &ldquo;{r.pattern}&rdquo;
                  </td>
                  <td style={{ padding: "12px 14px", color: r.replacement ? "var(--status-success-text)" : "var(--text-muted)", fontSize: 13, fontWeight: 600 }}>
                    {r.replacement ? `→ \u201C${r.replacement}\u201D` : "—"}
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <SeverityBadge value={r.severity} />
                  </td>
                  <td style={{ padding: "12px 14px", color: "var(--text-secondary)", fontSize: 12 }}>
                    {r.description}
                  </td>
                  <td style={{ padding: "12px 14px", textAlign: "right" }}>
                    <button
                      onClick={() => handleDeleteRule(r.id)}
                      className="btn btn-ghost"
                      style={{ color: "var(--status-danger-text)", padding: "4px 8px" }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
