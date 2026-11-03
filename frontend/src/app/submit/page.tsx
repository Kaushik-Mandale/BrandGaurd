"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { errMsg } from "@/lib/ui";
import PipelineProgress from "@/components/PipelineProgress";
import {
  ArrowLeft,
  FileText,
  UploadCloud,
  AlertTriangle,
  ShieldCheck,
  X,
  FileCheck,
  HelpCircle,
} from "lucide-react";

export default function SubmitPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"text" | "file">("text");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [contextNote, setContextNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [auditStage, setAuditStage] = useState<string>("Analyzing content against brand rules...");
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Sample copy snippets for quick evaluator testing
  const sampleSnippets = [
    {
      label: "Campaign Copy with Claims",
      title: "HydraPlus Product Launch Copy",
      text: "Experience HydraPlus! It is clinically proven to eliminate 100% of fine lines and wrinkles in just 24 hours. Our revolutionary patented blend hydrates 10x deeper than leading luxury creams without irritation. Don't miss out on the world's #1 breakthrough skincare formula.",
    },
    {
      label: "Clean Compliant Copy",
      title: "Product Launch Press Release — Verified Baseline",
      text: "Acme Corporation today introduced its next-generation brand asset library, delivering streamlined workflows for distributed creative teams. The new release integrates with established enterprise content pipelines to maintain brand consistency across regional marketing channels.",
    },
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (tab === "text" && !text.trim()) {
      setError("Please provide the marketing copy you want to evaluate.");
      return;
    }
    if (tab === "file" && !file) {
      setError("Please select a document (PDF, DOCX) or visual creative (PNG, JPG) to upload.");
      return;
    }

    setLoading(true);
    setAuditStage("Submitting content to BrandGuard compliance engine...");

    try {
      let res: { id: number; status: string };
      const fullText = contextNote.trim()
        ? `[Context: ${contextNote.trim()}]\n\n${text}`
        : text;

      if (tab === "text") {
        res = await api.createSubmission(title.trim() || "Marketing Copy Brand Check", fullText);
      } else {
        res = await api.uploadSubmission(file!, title.trim() || file!.name);
      }

      setAuditStage("Content received! Navigating to live audit review...");
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
      const droppedFile = e.dataTransfer.files[0];
      const ext = droppedFile.name.substring(droppedFile.name.lastIndexOf(".")).toLowerCase();
      if ([".pdf", ".docx", ".png", ".jpg", ".jpeg"].includes(ext)) {
        setFile(droppedFile);
        if (!title) setTitle(droppedFile.name.replace(/\.[^/.]+$/, ""));
      } else {
        setError(`Unsupported file type: ${ext}. Please upload a PDF, DOCX, PNG, or JPG file.`);
      }
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>
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
        <span style={{ color: "var(--oxford-navy)", fontWeight: 700 }}>New Brand Check</span>
      </motion.div>

      {/* Header Banner with Clear Operational Purpose */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{
          borderLeft: "4px solid var(--cerulean)",
          paddingLeft: 18,
        }}
      >
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--oxford-navy)", letterSpacing: "-0.03em" }}>
          Start a Brand Governance Check
        </h1>
        <p style={{ color: "var(--text-secondary)", marginTop: 6, fontSize: 14, lineHeight: 1.5 }}>
          Your content will be checked against your approved brand guidelines and factual evidence. You will be able to review the findings and apply corrections before making a final sign-off decision.
        </p>
      </motion.div>

      {/* 6-Stage Workflow Stepper: Stage 1 Active */}
      <PipelineProgress currentStage={1} />

      {/* Submission Mode Selector */}
      <div
        style={{
          display: "flex",
          borderBottom: "2px solid var(--border)",
          gap: 12,
        }}
      >
        <button
          type="button"
          onClick={() => {
            setTab("text");
            setError(null);
          }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 18px",
            border: "none",
            borderBottom: tab === "text" ? "3px solid var(--cerulean)" : "3px solid transparent",
            backgroundColor: "transparent",
            cursor: "pointer",
            fontSize: 14,
            fontWeight: tab === "text" ? 800 : 600,
            color: tab === "text" ? "var(--cerulean)" : "var(--text-secondary)",
            marginBottom: -2,
            transition: "all 0.15s ease",
          }}
        >
          <FileText size={17} />
          <span>Check Marketing Copy</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setTab("file");
            setError(null);
          }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 18px",
            border: "none",
            borderBottom: tab === "file" ? "3px solid var(--cerulean)" : "3px solid transparent",
            backgroundColor: "transparent",
            cursor: "pointer",
            fontSize: 14,
            fontWeight: tab === "file" ? 800 : 600,
            color: tab === "file" ? "var(--cerulean)" : "var(--text-secondary)",
            marginBottom: -2,
            transition: "all 0.15s ease",
          }}
        >
          <UploadCloud size={17} />
          <span>Check a Document or Creative (PDF, DOCX, PNG, JPG)</span>
        </button>
      </div>

      {/* Main Submission Form or Processing State */}
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
              borderRadius: 16,
            }}
          >
            <div
              style={{
                width: 68,
                height: 68,
                borderRadius: 18,
                backgroundColor: "var(--cerulean-dim)",
                border: "2px solid var(--frosted-border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--cerulean)",
              }}
            >
              <ShieldCheck size={36} className="pulse-dot" />
            </div>

            <div>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--oxford-navy)" }}>
                Auditing Content in Real Time...
              </h2>
              <p style={{ color: "var(--cerulean)", fontSize: 14.5, fontWeight: 700, marginTop: 8 }}>
                {auditStage}
              </p>
              <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>
                Review workspace will open automatically when verification completes.
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
            className="card"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 20,
              backgroundColor: "#FFFFFF",
              borderRadius: 16,
              padding: "28px 30px",
              border: "1px solid var(--border)",
            }}
          >
            {error && (
              <div
                style={{
                  padding: "12px 16px",
                  borderRadius: 8,
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

            {/* Campaign / Asset Name */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: "var(--oxford-navy)" }}>
                Campaign or Asset Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Q4 Global Brand Campaign Copy"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={{
                  padding: "10px 14px",
                  fontSize: 13.5,
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                }}
              />
            </div>

            {/* Mode 1: Check Marketing Copy */}
            {tab === "text" ? (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <label style={{ fontSize: 13, fontWeight: 700, color: "var(--oxford-navy)" }}>
                      Marketing Content *
                    </label>

                    {/* Quick Evaluator Sample Presets */}
                    <div style={{ display: "flex", gap: 6 }}>
                      {sampleSnippets.map((s) => (
                        <button
                          key={s.label}
                          type="button"
                          onClick={() => {
                            setTitle(s.title);
                            setText(s.text);
                          }}
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            padding: "3px 8px",
                            borderRadius: 4,
                            border: "1px solid var(--border)",
                            backgroundColor: "var(--honeydew)",
                            color: "var(--cerulean)",
                            cursor: "pointer",
                          }}
                        >
                          Use {s.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <textarea
                    rows={8}
                    placeholder="Paste your marketing copy, promotional claims, press release, social caption, or advertising text here..."
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    style={{
                      padding: "12px 14px",
                      fontSize: 13.5,
                      borderRadius: 8,
                      border: "1px solid var(--border)",
                      lineHeight: 1.6,
                      fontFamily: "inherit",
                    }}
                  />
                </div>

                {/* Optional Campaign Context */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 700, color: "var(--oxford-navy)", display: "flex", alignItems: "center", gap: 5 }}>
                    <span>Optional Context</span>
                    <span style={{ fontSize: 11, fontWeight: 500, color: "var(--text-muted)" }}>
                      (e.g. Target audience, channel: Instagram, Email, Billboard)
                    </span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Social media paid advertisement targeting US consumers"
                    value={contextNote}
                    onChange={(e) => setContextNote(e.target.value)}
                    style={{
                      padding: "9px 12px",
                      fontSize: 13,
                      borderRadius: 8,
                      border: "1px solid var(--border)",
                    }}
                  />
                </div>
              </>
            ) : (
              /* Mode 2: Check a Document or Creative */
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <label style={{ fontSize: 13, fontWeight: 700, color: "var(--oxford-navy)" }}>
                  Upload Document or Visual Asset *
                </label>

                {/* Dropzone */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  style={{
                    border: isDragging ? "2px dashed var(--cerulean)" : "2px dashed var(--border)",
                    borderRadius: 12,
                    padding: "36px 20px",
                    textAlign: "center",
                    backgroundColor: isDragging ? "var(--frosted-dim)" : "var(--honeydew)",
                    transition: "all 0.15s ease",
                  }}
                >
                  {file ? (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 10,
                          backgroundColor: "var(--cerulean-dim)",
                          color: "var(--cerulean)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <FileCheck size={26} />
                      </div>

                      <div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: "var(--oxford-navy)" }}>
                          {file.name}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                          Type: {file.type || "Document/Image"} · Size: {(file.size / 1024).toFixed(1)} KB
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setFile(null)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          fontSize: 12,
                          color: "var(--punch-red)",
                          backgroundColor: "transparent",
                          border: "none",
                          cursor: "pointer",
                          fontWeight: 700,
                          marginTop: 4,
                        }}
                      >
                        <X size={13} />
                        <span>Remove file</span>
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 10,
                          backgroundColor: "var(--cerulean-dim)",
                          color: "var(--cerulean)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <UploadCloud size={24} />
                      </div>

                      <div>
                        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--oxford-navy)" }}>
                          Drag and drop your file here, or{" "}
                        </span>
                        <label
                          htmlFor="file-upload"
                          style={{
                            color: "var(--cerulean)",
                            fontWeight: 700,
                            cursor: "pointer",
                            textDecoration: "underline",
                            fontSize: 14,
                          }}
                        >
                          browse files
                        </label>
                      </div>

                      <input
                        id="file-upload"
                        type="file"
                        accept=".pdf,.docx,.png,.jpg,.jpeg"
                        style={{ display: "none" }}
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            const f = e.target.files[0];
                            setFile(f);
                            if (!title) setTitle(f.name.replace(/\.[^/.]+$/, ""));
                          }
                        }}
                      />

                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                        Accepted formats: <strong>PDF, DOCX, PNG, JPG</strong> (up to 15 MB)
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Explanation of What Happens After Taking Action */}
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                backgroundColor: "var(--bg-main)",
                padding: "12px 14px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                fontSize: 12.5,
                color: "var(--text-secondary)",
              }}
            >
              <HelpCircle size={17} color="var(--cerulean)" style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <strong>What happens after clicking Start Brand Check?</strong>
                <p style={{ marginTop: 2, lineHeight: 1.45 }}>
                  The engine extracts text and visual elements, verifies terminology against active brand rules, checks factual claims against approved documents in the knowledge base, and checks contrast and logo guidelines. You can inspect every finding and decide whether to accept, fix, or dismiss it.
                </p>
              </div>
            </div>

            {/* Primary Action Button */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 6 }}>
              <Link href="/" className="btn btn-secondary" style={{ padding: "10px 18px" }}>
                Cancel
              </Link>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ padding: "10px 24px", fontSize: 14 }}
              >
                <ShieldCheck size={16} />
                <span>Start Brand Check</span>
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
