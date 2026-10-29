"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { errMsg } from "@/lib/ui";
import {
  ArrowLeft,
  FileText,
  UploadCloud,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Shield,
} from "lucide-react";

export default function SubmitPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"text" | "file">("text");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (tab === "text" && !text.trim()) {
      setError("Please provide the content you want to review.");
      return;
    }
    if (tab === "file" && !file) {
      setError("Please select a document or creative asset to upload.");
      return;
    }

    setLoading(true);

    try {
      let res: { id: number; status: string };
      if (tab === "text") {
        res = await api.createSubmission(title.trim() || "Compliance Audit", text);
      } else {
        res = await api.uploadSubmission(file!, title.trim() || file!.name);
      }
      router.push(`/review/${res.id}`);
    } catch (err) {
      setError(errMsg(err));
      setLoading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
      setTab("file");
    }
  }

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", display: "flex", flexDirection: "column", gap: 28 }}>
      {/* Breadcrumb Navigation */}
      <motion.div
        initial={{ opacity: 0, x: -6 }}
        animate={{ opacity: 1, x: 0 }}
        style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}
      >
        <Link
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            color: "var(--text-secondary)",
            fontWeight: 600,
          }}
        >
          <ArrowLeft size={14} />
          <span>Dashboard</span>
        </Link>
        <span style={{ color: "var(--text-muted)" }}>/</span>
        <span style={{ color: "var(--oxford-navy)", fontWeight: 700 }}>New Audit Engine</span>
      </motion.div>

      {/* Header Banner */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{
          borderLeft: "4px solid var(--cerulean)",
          paddingLeft: 18,
        }}
      >
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--oxford-navy)", letterSpacing: "-0.035em" }}>
          Submit Content for Governance Audit
        </h1>
        <p style={{ color: "var(--text-secondary)", marginTop: 6, fontSize: 14.5 }}>
          Review your content against the brand rules and approved evidence configured in your workspace.
        </p>
      </motion.div>

      {/* Main Submission Form */}
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="processing"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="card"
            style={{
              padding: "54px 32px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 20,
              backgroundColor: "#FFFFFF",
              borderTop: "4px solid var(--cerulean)",
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 16,
                backgroundColor: "var(--cerulean-dim)",
                border: "2px solid var(--frosted-border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--cerulean)",
              }}
            >
              <Shield size={32} className="pulse-dot" />
            </div>

            <div>
              <h2 style={{ fontSize: 21, fontWeight: 800, color: "var(--oxford-navy)" }}>
                Submitting content...
              </h2>
              <p style={{ color: "var(--text-secondary)", fontSize: 14, marginTop: 6 }}>
                Your review will open when the submission is ready.
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            onSubmit={handleSubmit}
            className="card border-accent-cerulean"
            style={{ display: "flex", flexDirection: "column", gap: 22 }}
          >
            {/* Tab Selection */}
            <div style={{ display: "flex", borderBottom: "1px solid var(--border)", paddingBottom: 14, gap: 10 }}>
              <button
                type="button"
                onClick={() => setTab("text")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 18px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid transparent",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 700,
                  backgroundColor: tab === "text" ? "var(--cerulean)" : "var(--honeydew)",
                  color: tab === "text" ? "#FFFFFF" : "var(--text-secondary)",
                  transition: "all var(--transition-fast)",
                }}
              >
                <FileText size={16} />
                <span>Marketing Copy Audit</span>
              </button>
              <button
                type="button"
                onClick={() => setTab("file")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 18px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid transparent",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 700,
                  backgroundColor: tab === "file" ? "var(--cerulean)" : "var(--honeydew)",
                  color: tab === "file" ? "#FFFFFF" : "var(--text-secondary)",
                  transition: "all var(--transition-fast)",
                }}
              >
                <UploadCloud size={16} />
                <span>Document & Creative Upload (PDF, DOCX, PNG, JPG)</span>
              </button>
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
                <AlertTriangle size={16} />
                <span>{error}</span>
              </div>
            )}

            {/* Campaign / Creative Title */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: "var(--oxford-navy)" }}>
                Campaign or Asset Title
              </label>
              <input
                type="text"
                placeholder="e.g. Q4 Global Brand Campaign Copy"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {tab === "text" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 700, color: "var(--oxford-navy)" }}>
                  Marketing Content to Audit *
                </label>
                <textarea
                  rows={9}
                  placeholder="Paste marketing copy, promotional claims, press releases, or ad copy..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  style={{
                    lineHeight: 1.6,
                    resize: "vertical",
                  }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-muted)" }}>
                  <span>{text.length} characters</span>
                  <span>Evaluates banned terms, unsubstantiated claims, and required disclaimers</span>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label style={{ fontSize: 13, fontWeight: 700, color: "var(--oxford-navy)" }}>
                  Upload Document or Creative *
                </label>
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  style={{
                    border: `2px dashed ${isDragging ? "var(--cerulean)" : "var(--border)"}`,
                    borderRadius: "var(--radius-md)",
                    padding: "48px 24px",
                    textAlign: "center",
                    backgroundColor: isDragging ? "var(--cerulean-dim)" : "var(--honeydew)",
                    cursor: "pointer",
                    transition: "all var(--transition-fast)",
                  }}
                  onClick={() => document.getElementById("file-upload-input")?.click()}
                >
                  <div style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: "var(--cerulean-dim)", border: "1px solid var(--frosted-border)", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--cerulean)", marginBottom: 14 }}>
                    <UploadCloud size={26} />
                  </div>
                  <p style={{ fontWeight: 700, color: "var(--oxford-navy)", fontSize: 15, marginBottom: 4 }}>
                    {file ? file.name : "Click to select or drag and drop a file"}
                  </p>
                  <p style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
                    Supported: PDF, DOCX, TXT, MD, PNG, JPG (Includes OCR text extraction & OpenCV vision checks)
                  </p>
                  <input
                    id="file-upload-input"
                    type="file"
                    style={{ display: "none" }}
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    accept=".txt,.md,.pdf,.docx,.png,.jpg,.jpeg"
                  />
                </div>
                {file && (
                  <div style={{ fontSize: 12.5, color: "var(--status-success-text)", display: "flex", alignItems: "center", gap: 6 }}>
                    <CheckCircle2 size={14} />
                    <span>Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 8 }}>
              <Link href="/" className="btn btn-secondary">
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{ minWidth: 180 }}
              >
                <Sparkles size={15} />
                <span>Start Compliance Audit</span>
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
