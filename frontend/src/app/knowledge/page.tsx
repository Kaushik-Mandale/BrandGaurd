"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
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
  Sliders,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

type KnowledgeTab = "documents" | "search" | "rules";

const RULE_CATEGORIES: { id: string; label: string; kind?: RuleKind }[] = [
  { id: "all", label: "All Rules" },
  { id: "banned_term", label: "Banned Terms", kind: "banned_term" },
  { id: "preferred_term", label: "Preferred Language", kind: "preferred_term" },
  { id: "required_text", label: "Required Disclaimers", kind: "required_text" },
  { id: "formatting", label: "Formatting Standards" },
  { id: "tone", label: "Tone & Messaging" },
];

export default function KnowledgePage() {
  const [activeTab, setActiveTab] = useState<KnowledgeTab>("documents");
  const [docs, setDocs] = useState<BrandDocument[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Document upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [docTitle, setDocTitle] = useState("");
  const [docType, setDocType] = useState("guideline");
  const [uploading, setUploading] = useState(false);

  // Rule creation modal state
  const [showAddRule, setShowAddRule] = useState(false);
  const [ruleKind, setRuleKind] = useState<RuleKind>("banned_term");
  const [pattern, setPattern] = useState("");
  const [replacement, setReplacement] = useState("");
  const [severity, setSeverity] = useState<Severity>("high");
  const [description, setDescription] = useState("");
  const [savingRule, setSavingRule] = useState(false);

  // Rules category filter
  const [ruleCategoryFilter, setRuleCategoryFilter] = useState("all");

  // Evidence Search state
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
    if (!confirm("Remove this approved brand guideline document from the knowledge base?")) return;
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
        description: description.trim() || `Flag usage of "${pattern.trim()}"`,
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
    if (!confirm("Delete this brand rule?")) return;
    try {
      await api.deleteRule(id);
      setRules((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      alert("Error deleting rule: " + errMsg(err));
    }
  }

  async function handleSearchEvidence(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const hits = await api.search(searchQuery.trim());
      setSearchHits(hits || []);
    } catch (err) {
      alert("Search failed: " + errMsg(err));
    } finally {
      setSearching(false);
    }
  }

  // Filtered rules
  const filteredRules = useMemo(() => {
    return rules.filter((r) => {
      if (ruleCategoryFilter === "all") return true;
      if (ruleCategoryFilter === "banned_term") return r.kind === "banned_term";
      if (ruleCategoryFilter === "preferred_term") return r.kind === "preferred_term";
      if (ruleCategoryFilter === "required_text") return r.kind === "required_text";
      if (ruleCategoryFilter === "formatting") return r.kind === "regex" || r.pattern.includes("\\d");
      if (ruleCategoryFilter === "tone") return r.description.toLowerCase().includes("tone") || r.description.toLowerCase().includes("slang");
      return true;
    });
  }, [rules, ruleCategoryFilter]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* ── Operational Purpose Header ─────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="card"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
          padding: "26px 32px",
          borderTop: "4px solid var(--cerulean)",
          borderRadius: 16,
          backgroundColor: "#FFFFFF",
        }}
      >
        <div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11,
              fontWeight: 800,
              color: "var(--cerulean)",
              backgroundColor: "var(--frosted-dim)",
              padding: "3px 10px",
              borderRadius: 20,
              marginBottom: 8,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            <BookOpen size={13} color="var(--cerulean)" />
            <span>Single Source of Truth</span>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--oxford-navy)", letterSpacing: "-0.03em" }}>
            Brand Knowledge Base & Governance Rules
          </h1>
          <p style={{ color: "var(--text-secondary)", marginTop: 4, maxWidth: 650, fontSize: 14 }}>
            Manage the approved documents and language standards used to verify brand claims and content during compliance checks.
          </p>
        </div>

        <Link href="/submit" className="btn btn-primary" style={{ padding: "10px 20px" }}>
          <Plus size={15} />
          <span>Start Brand Check</span>
        </Link>
      </motion.div>

      {/* ── 3 Clear Functional Tabs ────────────────────────────────────────── */}
      <div style={{ display: "flex", borderBottom: "2px solid var(--border)", gap: 14 }}>
        <button
          onClick={() => setActiveTab("documents")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 16px",
            border: "none",
            borderBottom: activeTab === "documents" ? "3px solid var(--cerulean)" : "3px solid transparent",
            backgroundColor: "transparent",
            cursor: "pointer",
            fontSize: 13.5,
            fontWeight: activeTab === "documents" ? 800 : 600,
            color: activeTab === "documents" ? "var(--cerulean)" : "var(--text-secondary)",
            marginBottom: -2,
            transition: "all 0.15s ease",
          }}
        >
          <FileText size={16} />
          <span>Approved Documents ({docs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("search")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 16px",
            border: "none",
            borderBottom: activeTab === "search" ? "3px solid var(--cerulean)" : "3px solid transparent",
            backgroundColor: "transparent",
            cursor: "pointer",
            fontSize: 13.5,
            fontWeight: activeTab === "search" ? 800 : 600,
            color: activeTab === "search" ? "var(--cerulean)" : "var(--text-secondary)",
            marginBottom: -2,
            transition: "all 0.15s ease",
          }}
        >
          <Search size={16} />
          <span>Search Approved Evidence</span>
        </button>

        <button
          onClick={() => setActiveTab("rules")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 16px",
            border: "none",
            borderBottom: activeTab === "rules" ? "3px solid var(--cerulean)" : "3px solid transparent",
            backgroundColor: "transparent",
            cursor: "pointer",
            fontSize: 13.5,
            fontWeight: activeTab === "rules" ? 800 : 600,
            color: activeTab === "rules" ? "var(--cerulean)" : "var(--text-secondary)",
            marginBottom: -2,
            transition: "all 0.15s ease",
          }}
        >
          <Sliders size={16} />
          <span>Brand Rules ({rules.length})</span>
        </button>
      </div>

      {error && (
        <div style={{ padding: "12px 16px", borderRadius: 8, backgroundColor: "var(--status-danger-bg)", border: "1px solid var(--punch-border)", color: "var(--status-danger-text)", fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 1: APPROVED DOCUMENTS (Section 6 Requirement)
         ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "documents" && (
        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 20 }}>
          {/* Documents Table */}
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: "var(--oxford-navy)" }}>
                Indexed Brand Documents
              </h2>
              <p style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 2 }}>
                Approved sources used to verify factual claims and enforce company guidelines.
              </p>
            </div>

            {loading ? (
              <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-muted)" }}>
                Loading approved documents...
              </div>
            ) : docs.length === 0 ? (
              <div style={{ padding: "36px 16px", textAlign: "center", color: "var(--text-muted)", backgroundColor: "var(--honeydew)", borderRadius: 8 }}>
                No guideline documents uploaded yet. Upload a brand manual or fact sheet to enable evidence verification.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                  <thead>
                    <tr style={{ borderBottom: "1.5px solid var(--border)", color: "var(--text-muted)", fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>
                      <th style={{ padding: "10px 12px" }}>Document Title</th>
                      <th style={{ padding: "10px 12px" }}>Category</th>
                      <th style={{ padding: "10px 12px" }}>Status</th>
                      <th style={{ padding: "10px 12px" }}>Added Date</th>
                      <th style={{ padding: "10px 12px", textAlign: "right" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {docs.map((d) => (
                      <tr key={d.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                        <td style={{ padding: "12px", fontWeight: 700, color: "var(--oxford-navy)", fontSize: 13 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <FileText size={15} color="var(--cerulean)" />
                            <span>{d.title}</span>
                          </div>
                        </td>
                        <td style={{ padding: "12px", fontSize: 12, color: "var(--text-secondary)" }}>
                          {d.doc_type || "Guideline"}
                        </td>
                        <td style={{ padding: "12px" }}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              fontSize: 11,
                              fontWeight: 700,
                              color: "var(--status-success-text)",
                              backgroundColor: "var(--status-success-bg)",
                              padding: "2px 8px",
                              borderRadius: 4,
                            }}
                          >
                            <CheckCircle2 size={12} />
                            <span>Indexed & Active</span>
                          </span>
                        </td>
                        <td style={{ padding: "12px", fontSize: 12, color: "var(--text-muted)" }}>
                          {fmtDate(d.created_at)}
                        </td>
                        <td style={{ padding: "12px", textAlign: "right" }}>
                          <button
                            onClick={() => handleDeleteDoc(d.id)}
                            className="btn btn-secondary"
                            style={{ padding: "4px 8px", color: "var(--punch-red)", borderColor: "var(--punch-border)" }}
                            title="Remove document"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Upload Document Card */}
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: "var(--oxford-navy)" }}>
                Upload Approved Brand Source
              </h2>
              <p style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 2 }}>
                Upload guidelines, claim sheets, or press releases (PDF, DOCX, TXT, MD).
              </p>
            </div>

            <form onSubmit={handleUploadDoc} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 12.5, fontWeight: 700, color: "var(--oxford-navy)", display: "block", marginBottom: 4 }}>
                  Document Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Master Brand Guidelines 2026"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  style={{ width: "100%", padding: "8px 12px", fontSize: 13, borderRadius: 6, border: "1px solid var(--border)" }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12.5, fontWeight: 700, color: "var(--oxford-navy)", display: "block", marginBottom: 4 }}>
                  Document Category
                </label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  style={{ width: "100%", padding: "8px 12px", fontSize: 13, borderRadius: 6, border: "1px solid var(--border)", backgroundColor: "#FFFFFF" }}
                >
                  <option value="guideline">Brand Guidelines Manual</option>
                  <option value="claim_fact_sheet">Clinical & Product Fact Sheet</option>
                  <option value="legal_disclaimer">Legal & Regulatory Terms</option>
                  <option value="tone_voice">Tone of Voice Guide</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12.5, fontWeight: 700, color: "var(--oxford-navy)", display: "block", marginBottom: 4 }}>
                  Source File (PDF, DOCX, TXT, MD)
                </label>
                <input
                  type="file"
                  accept=".pdf,.docx,.txt,.md"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setUploadFile(e.target.files[0]);
                      if (!docTitle) setDocTitle(e.target.files[0].name.replace(/\.[^/.]+$/, ""));
                    }
                  }}
                  style={{ width: "100%", padding: "8px", fontSize: 12.5, border: "1px dashed var(--border)", borderRadius: 6 }}
                />
              </div>

              <button
                type="submit"
                disabled={!uploadFile || uploading}
                className="btn btn-primary"
                style={{ marginTop: 4, width: "100%", padding: "10px" }}
              >
                <UploadCloud size={16} />
                <span>{uploading ? "Indexing Document..." : "Add to Knowledge Base"}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 2: SEARCH APPROVED EVIDENCE (Section 6 Requirement)
         ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "search" && (
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--oxford-navy)" }}>
              Search your approved brand documents
            </h2>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>
              Find the passages used to verify claims during a brand check. Enter any phrase, product promise, or guideline keyword.
            </p>
          </div>

          <form onSubmit={handleSearchEvidence} style={{ display: "flex", gap: 10 }}>
            <div style={{ position: "relative", flex: 1 }}>
              <Search
                size={16}
                style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}
              />
              <input
                type="text"
                placeholder="e.g. hydration test results, logo clear space, clinical study disclaimer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  paddingLeft: 38,
                  paddingRight: 14,
                  paddingTop: 10,
                  paddingBottom: 10,
                  fontSize: 13.5,
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                }}
              />
            </div>
            <button type="submit" disabled={searching} className="btn btn-primary" style={{ padding: "0 22px" }}>
              <span>{searching ? "Searching..." : "Search Evidence"}</span>
            </button>
          </form>

          {/* Quick query presets */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>Quick search:</span>
            {["HydraPlus hydration study", "Logo color variations", "Banned slang and hype terms", "Clinical trial sample size"].map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => {
                  setSearchQuery(q);
                  api.search(q).then((hits) => setSearchHits(hits || []));
                }}
                style={{
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: "var(--cerulean)",
                  backgroundColor: "var(--frosted-dim)",
                  border: "1px solid var(--frosted-border)",
                  borderRadius: 20,
                  padding: "3px 10px",
                  cursor: "pointer",
                }}
              >
                {q}
              </button>
            ))}
          </div>

          {/* Search Hits List */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 10 }}>
            {searchHits.length === 0 && !searching ? (
              <div style={{ padding: "32px", textAlign: "center", color: "var(--text-muted)", backgroundColor: "var(--honeydew)", borderRadius: 10 }}>
                {searchQuery ? "No matching evidence passages found in indexed guidelines." : "Enter a search query to inspect verified brand evidence."}
              </div>
            ) : (
              searchHits.map((hit) => (
                <div
                  key={hit.chunk_id}
                  style={{
                    backgroundColor: "#FFFFFF",
                    border: "1px solid var(--border)",
                    borderLeft: "3.5px solid var(--cerulean)",
                    borderRadius: 8,
                    padding: "14px 18px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <FileText size={15} color="var(--cerulean)" />
                      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--oxford-navy)" }}>
                        {hit.doc_title}
                      </span>
                      {hit.page && (
                        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                          Page {hit.page}
                        </span>
                      )}
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: "var(--status-success-text)",
                        backgroundColor: "var(--status-success-bg)",
                        padding: "2px 7px",
                        borderRadius: 4,
                      }}
                    >
                      Relevance: {(hit.score * 100).toFixed(0)}%
                    </span>
                  </div>

                  <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5, margin: 0 }}>
                    “{hit.text}”
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 3: BRAND RULES (Section 7 Requirement)
         ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "rules" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Header Bar + Category Filters + Add Rule Button */}
          <div className="card" style={{ padding: "18px 22px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
              <div>
                <h2 style={{ fontSize: 17, fontWeight: 800, color: "var(--oxford-navy)" }}>
                  Content & Language Standards
                </h2>
                <p style={{ fontSize: 12.5, color: "var(--text-secondary)", marginTop: 2 }}>
                  Define the language, formatting, and content standards your organization must follow.
                </p>
              </div>

              <button
                onClick={() => setShowAddRule(true)}
                className="btn btn-primary"
                style={{ padding: "8px 16px", fontSize: 13 }}
              >
                <Plus size={15} />
                <span>Add Brand Rule</span>
              </button>
            </div>

            {/* Category Filter Pills */}
            <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
              {RULE_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setRuleCategoryFilter(cat.id)}
                  style={{
                    padding: "5px 12px",
                    fontSize: 12,
                    fontWeight: ruleCategoryFilter === cat.id ? 700 : 500,
                    borderRadius: 6,
                    border: "none",
                    cursor: "pointer",
                    backgroundColor: ruleCategoryFilter === cat.id ? "var(--cerulean)" : "var(--honeydew)",
                    color: ruleCategoryFilter === cat.id ? "#FFFFFF" : "var(--text-secondary)",
                    transition: "all 0.15s ease",
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Rule Cards Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 14 }}>
            {filteredRules.map((rule) => {
              const categoryLabel =
                rule.kind === "banned_term"
                  ? "Banned Term"
                  : rule.kind === "preferred_term"
                  ? "Preferred Language"
                  : rule.kind === "required_text"
                  ? "Required Disclaimer"
                  : "Formatting Standard";

              return (
                <div
                  key={rule.id}
                  style={{
                    backgroundColor: "#FFFFFF",
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    borderLeft: rule.active ? "4px solid var(--cerulean)" : "4px solid #CBD5E0",
                    padding: "16px 18px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: 12,
                    boxShadow: "var(--shadow-xs)",
                    opacity: rule.active ? 1 : 0.65,
                  }}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <span
                        style={{
                          fontSize: 10.5,
                          fontWeight: 700,
                          color: "var(--cerulean)",
                          backgroundColor: "var(--frosted-dim)",
                          padding: "2px 7px",
                          borderRadius: 4,
                          textTransform: "uppercase",
                        }}
                      >
                        {categoryLabel}
                      </span>
                      <SeverityBadge value={rule.severity} />
                    </div>

                    <div style={{ fontSize: 14, fontWeight: 800, color: "var(--oxford-navy)", marginTop: 4 }}>
                      Detect: <code style={{ backgroundColor: "#F1F5F9", padding: "2px 6px", borderRadius: 4 }}>{rule.pattern}</code>
                    </div>

                    {rule.replacement && (
                      <div style={{ fontSize: 12.5, color: "var(--status-success-text)", fontWeight: 700, marginTop: 4 }}>
                        Replace with: &quot;{rule.replacement}&quot;
                      </div>
                    )}

                    <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 6, lineHeight: 1.4 }}>
                      {rule.description}
                    </p>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border-subtle)", paddingTop: 10 }}>
                    <button
                      onClick={() => handleToggleRule(rule.id)}
                      style={{
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        fontSize: 12,
                        fontWeight: 700,
                        color: rule.active ? "var(--status-success-text)" : "var(--text-muted)",
                      }}
                    >
                      {rule.active ? <ToggleRight size={20} color="#38A169" /> : <ToggleLeft size={20} />}
                      <span>{rule.active ? "Active Rule" : "Paused"}</span>
                    </button>

                    <button
                      onClick={() => handleDeleteRule(rule.id)}
                      style={{
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--punch-red)",
                        padding: 4,
                      }}
                      title="Delete rule"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add Rule Modal */}
          <AnimatePresence>
            {showAddRule && (
              <div
                style={{
                  position: "fixed",
                  inset: 0,
                  backgroundColor: "rgba(15, 29, 48, 0.5)",
                  backdropFilter: "blur(4px)",
                  display: "grid",
                  placeItems: "center",
                  zIndex: 300,
                  padding: 20,
                }}
                onClick={() => setShowAddRule(false)}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    width: "100%",
                    maxWidth: 500,
                    backgroundColor: "#FFFFFF",
                    borderRadius: 16,
                    padding: 24,
                    boxShadow: "var(--shadow-lg)",
                  }}
                >
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--oxford-navy)", marginBottom: 4 }}>
                    Create Brand Rule
                  </h3>
                  <p style={{ fontSize: 12.5, color: "var(--text-muted)", marginBottom: 16 }}>
                    Define the phrase or condition to detect and specify how content should be corrected.
                  </p>

                  <form onSubmit={handleCreateRule} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div>
                      <label style={{ fontSize: 12.5, fontWeight: 700, color: "var(--oxford-navy)", display: "block", marginBottom: 4 }}>
                        Rule Category
                      </label>
                      <select
                        value={ruleKind}
                        onChange={(e) => setRuleKind(e.target.value as RuleKind)}
                        style={{ width: "100%", padding: "8px 10px", fontSize: 13, borderRadius: 6, border: "1px solid var(--border)" }}
                      >
                        <option value="banned_term">Banned Term (Must not appear)</option>
                        <option value="preferred_term">Preferred Language (Suggest replacement)</option>
                        <option value="required_text">Required Disclaimer (Must be included)</option>
                        <option value="regex">Advanced Pattern (Regex)</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: 12.5, fontWeight: 700, color: "var(--oxford-navy)", display: "block", marginBottom: 4 }}>
                        Term or Phrase to Detect *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. crushing it, 100% guaranteed, cheap"
                        value={pattern}
                        onChange={(e) => setPattern(e.target.value)}
                        style={{ width: "100%", padding: "8px 10px", fontSize: 13, borderRadius: 6, border: "1px solid var(--border)" }}
                        required
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: 12.5, fontWeight: 700, color: "var(--oxford-navy)", display: "block", marginBottom: 4 }}>
                        Recommended Replacement (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. high-performing, affordable, verified"
                        value={replacement}
                        onChange={(e) => setReplacement(e.target.value)}
                        style={{ width: "100%", padding: "8px 10px", fontSize: 13, borderRadius: 6, border: "1px solid var(--border)" }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: 12.5, fontWeight: 700, color: "var(--oxford-navy)", display: "block", marginBottom: 4 }}>
                        Severity
                      </label>
                      <select
                        value={severity}
                        onChange={(e) => setSeverity(e.target.value as Severity)}
                        style={{ width: "100%", padding: "8px 10px", fontSize: 13, borderRadius: 6, border: "1px solid var(--border)" }}
                      >
                        <option value="high">High (Blocks approval until resolved)</option>
                        <option value="medium">Medium (Requires editorial attention)</option>
                        <option value="low">Low (Minor styling recommendation)</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: 12.5, fontWeight: 700, color: "var(--oxford-navy)", display: "block", marginBottom: 4 }}>
                        Why this rule matters (Guideline explanation)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Inconsistent with brand voice: maintain professional, grounded tone."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        style={{ width: "100%", padding: "8px 10px", fontSize: 13, borderRadius: 6, border: "1px solid var(--border)" }}
                      />
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
                      <button type="button" onClick={() => setShowAddRule(false)} className="btn btn-secondary">
                        Cancel
                      </button>
                      <button type="submit" disabled={savingRule || !pattern.trim()} className="btn btn-primary">
                        <span>{savingRule ? "Saving..." : "Create Rule"}</span>
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
