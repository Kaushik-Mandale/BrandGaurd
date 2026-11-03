"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import AuthenticatedImage from "@/components/AuthenticatedImage";
import type { BrandAsset } from "@/lib/types";
import { errMsg } from "@/lib/ui";
import {
  Palette,
  Upload,
  PlusCircle,
  Trash2,
  Image as ImageIcon,
  RotateCw,
  AlertTriangle,
  Eye,
  Type,
  ShieldCheck,
} from "lucide-react";

type VisualTab = "logos" | "colors" | "typography" | "accessibility" | "history";

export default function VisualIdentityPage() {
  const [activeTab, setActiveTab] = useState<VisualTab>("logos");
  const [assets, setAssets] = useState<BrandAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Logo upload state
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoName, setLogoName] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Palette creation state
  const [paletteName, setPaletteName] = useState("");
  const [colorInput, setColorInput] = useState("#1D3557, #457B9D, #A8DADC, #F1FAEE, #E63946");
  const [creatingPalette, setCreatingPalette] = useState(false);

  const loadAssets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listAssets();
      setAssets(data);
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
        const data = await api.listAssets();
        if (!ignore) {
          setAssets(data);
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

  async function handleUploadLogo(e: React.FormEvent) {
    e.preventDefault();
    if (!logoFile) return;
    setUploadingLogo(true);
    try {
      await api.uploadLogo(logoFile, logoName.trim() || logoFile.name);
      setLogoFile(null);
      setLogoName("");
      await loadAssets();
    } catch (err) {
      alert("Error uploading logo: " + errMsg(err));
    } finally {
      setUploadingLogo(false);
    }
  }

  async function handleCreatePalette(e: React.FormEvent) {
    e.preventDefault();
    if (!paletteName.trim()) return;
    const colors = colorInput
      .split(",")
      .map((c) => c.trim())
      .filter((c) => c.startsWith("#"));

    if (colors.length === 0) {
      alert("Please enter at least one valid hex code (e.g. #1D3557)");
      return;
    }

    setCreatingPalette(true);
    try {
      await api.createPalette(paletteName.trim(), colors);
      setPaletteName("");
      setColorInput("#1D3557, #457B9D, #A8DADC, #F1FAEE, #E63946");
      await loadAssets();
    } catch (err) {
      alert("Error creating palette: " + errMsg(err));
    } finally {
      setCreatingPalette(false);
    }
  }

  async function handleDeleteAsset(id: number) {
    if (!confirm("Remove this visual brand asset?")) return;
    try {
      await api.deleteAsset(id);
      setAssets((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      alert("Error deleting asset: " + errMsg(err));
    }
  }

  const logos = assets.filter((a) => a.kind === "logo");
  const palettes = assets.filter((a) => a.kind === "palette");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* ── Operational Header Banner ───────────────────────────────────────── */}
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
            <Palette size={13} color="var(--cerulean)" />
            <span>Creative Brand Standards</span>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--oxford-navy)", letterSpacing: "-0.03em" }}>
            Visual Identity & Design Governance
          </h1>
          <p style={{ color: "var(--text-secondary)", marginTop: 4, maxWidth: 680, fontSize: 14 }}>
            Configure and inspect approved brand logos, color palettes, typography standards, and accessibility contrast requirements.
          </p>
        </div>

        <button onClick={loadAssets} className="btn btn-secondary" style={{ padding: "8px 16px" }}>
          <RotateCw size={14} />
          <span>Refresh Assets</span>
        </button>
      </motion.div>

      {/* ── 5 Organized Visual Identity Tabs (Section 8 Requirement) ────────── */}
      <div style={{ display: "flex", borderBottom: "2px solid var(--border)", gap: 12, flexWrap: "wrap" }}>
        {[
          { id: "logos", label: `Approved Logos (${logos.length})`, icon: ImageIcon },
          { id: "colors", label: `Brand Colors (${palettes.length})`, icon: Palette },
          { id: "typography", label: "Typography & Text in Images", icon: Type },
          { id: "accessibility", label: "Accessibility & Contrast Standards", icon: Eye },
          { id: "history", label: "Visual Audit Inspection History", icon: ShieldCheck },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as VisualTab)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                padding: "12px 14px",
                border: "none",
                borderBottom: isActive ? "3px solid var(--cerulean)" : "3px solid transparent",
                backgroundColor: "transparent",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: isActive ? 800 : 600,
                color: isActive ? "var(--cerulean)" : "var(--text-secondary)",
                marginBottom: -2,
                transition: "all 0.15s ease",
              }}
            >
              <Icon size={15} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {error && (
        <div style={{ padding: "12px 16px", borderRadius: 8, backgroundColor: "var(--status-danger-bg)", border: "1px solid var(--punch-border)", color: "var(--status-danger-text)", fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 1: APPROVED LOGOS
         ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "logos" && (
        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 20 }}>
          {/* Registered Logos List */}
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: "var(--oxford-navy)" }}>
                Approved Logo References
              </h2>
              <p style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 2 }}>
                Master reference images matched across multi-scale creative assets.
              </p>
            </div>

            {loading ? (
              <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-muted)" }}>Loading logos...</div>
            ) : logos.length === 0 ? (
              <div style={{ padding: "32px", textAlign: "center", color: "var(--text-muted)", backgroundColor: "var(--honeydew)", borderRadius: 8 }}>
                No logo references uploaded yet. Upload a high-resolution PNG of the master brand logo.
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>
                {logos.map((logo) => (
                  <div
                    key={logo.id}
                    style={{
                      border: "1px solid var(--border)",
                      borderRadius: 10,
                      padding: 12,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 8,
                      backgroundColor: "#FAFCFA",
                    }}
                  >
                    <div
                      style={{
                        width: "100%",
                        height: 100,
                        backgroundColor: "#FFFFFF",
                        borderRadius: 6,
                        border: "1px solid var(--border-subtle)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        overflow: "hidden",
                      }}
                    >
                      <AuthenticatedImage
                        src={api.assetFileUrl(logo.id)}
                        alt={logo.name}
                        style={{ maxHeight: "80%", maxWidth: "80%", objectFit: "contain" }}
                      />
                    </div>

                    <div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--oxford-navy)", display: "block" }}>
                          {logo.name}
                        </span>
                        <span style={{ fontSize: 11, color: "var(--status-success-text)", fontWeight: 600 }}>
                          ✓ Active Reference
                        </span>
                      </div>

                      <button
                        onClick={() => handleDeleteAsset(logo.id)}
                        style={{ background: "transparent", border: "none", color: "var(--punch-red)", cursor: "pointer", padding: 4 }}
                        title="Delete logo"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upload Logo Card */}
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: "var(--oxford-navy)" }}>
                Register Master Brand Logo
              </h2>
              <p style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 2 }}>
                Upload an official brand logo (PNG with transparency recommended).
              </p>
            </div>

            <form onSubmit={handleUploadLogo} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 12.5, fontWeight: 700, color: "var(--oxford-navy)", display: "block", marginBottom: 4 }}>
                  Logo Asset Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Acme Primary Lockup (Navy & Cerulean)"
                  value={logoName}
                  onChange={(e) => setLogoName(e.target.value)}
                  style={{ width: "100%", padding: "8px 12px", fontSize: 13, borderRadius: 6, border: "1px solid var(--border)" }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: 12.5, fontWeight: 700, color: "var(--oxford-navy)", display: "block", marginBottom: 4 }}>
                  Logo Image File (PNG, JPG) *
                </label>
                <input
                  type="file"
                  accept=".png,.jpg,.jpeg"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setLogoFile(e.target.files[0]);
                      if (!logoName) setLogoName(e.target.files[0].name.replace(/\.[^/.]+$/, ""));
                    }
                  }}
                  style={{ width: "100%", padding: "8px", fontSize: 12.5, border: "1px dashed var(--border)", borderRadius: 6 }}
                  required
                />
              </div>

              <div style={{ fontSize: 12, color: "var(--text-secondary)", backgroundColor: "var(--honeydew)", padding: "10px", borderRadius: 6 }}>
                <strong>How the check works:</strong> The engine automatically matches submitted creatives against this template at multiple pyramid scales (0.35x to 1.5x) to verify presence and clear space.
              </div>

              <button
                type="submit"
                disabled={!logoFile || uploadingLogo}
                className="btn btn-primary"
                style={{ width: "100%", padding: "10px" }}
              >
                <Upload size={16} />
                <span>{uploadingLogo ? "Uploading..." : "Save Brand Logo"}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 2: BRAND COLORS
         ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "colors" && (
        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 20 }}>
          {/* Palettes List */}
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: "var(--oxford-navy)" }}>
                Approved Color Palettes
              </h2>
              <p style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 2 }}>
                Colors are evaluated using perceptual color distance (Delta E) to flag off-brand shades.
              </p>
            </div>

            {loading ? (
              <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-muted)" }}>Loading color palettes...</div>
            ) : palettes.length === 0 ? (
              <div style={{ padding: "32px", textAlign: "center", color: "var(--text-muted)", backgroundColor: "var(--honeydew)", borderRadius: 8 }}>
                No custom palette configured yet. The default 5-color enterprise palette is active.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {palettes.map((palette) => {
                  const colors = ((palette.data?.colors as string[]) || []);
                  return (
                    <div
                      key={palette.id}
                      style={{
                        border: "1px solid var(--border)",
                        borderRadius: 10,
                        padding: 14,
                        backgroundColor: "#FFFFFF",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                        <span style={{ fontSize: 14, fontWeight: 800, color: "var(--oxford-navy)" }}>
                          {palette.name}
                        </span>
                        <button
                          onClick={() => handleDeleteAsset(palette.id)}
                          style={{ background: "transparent", border: "none", color: "var(--punch-red)", cursor: "pointer" }}
                          title="Delete palette"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {colors.map((c, i) => (
                          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, backgroundColor: "#F8FAFC", padding: "4px 8px", borderRadius: 6, border: "1px solid #E2E8F0" }}>
                            <span style={{ width: 16, height: 16, borderRadius: 4, backgroundColor: c, border: "1px solid rgba(0,0,0,0.15)" }} />
                            <code style={{ fontSize: 12, fontWeight: 700, color: "var(--oxford-navy)" }}>{c}</code>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Create Palette Card */}
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: "var(--oxford-navy)" }}>
                Add Brand Palette
              </h2>
              <p style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 2 }}>
                Specify approved HEX color codes separated by commas.
              </p>
            </div>

            <form onSubmit={handleCreatePalette} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 12.5, fontWeight: 700, color: "var(--oxford-navy)", display: "block", marginBottom: 4 }}>
                  Palette Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Summer Campaign Primary Palette"
                  value={paletteName}
                  onChange={(e) => setPaletteName(e.target.value)}
                  style={{ width: "100%", padding: "8px 12px", fontSize: 13, borderRadius: 6, border: "1px solid var(--border)" }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: 12.5, fontWeight: 700, color: "var(--oxford-navy)", display: "block", marginBottom: 4 }}>
                  HEX Color Values (comma-separated) *
                </label>
                <input
                  type="text"
                  value={colorInput}
                  onChange={(e) => setColorInput(e.target.value)}
                  style={{ width: "100%", padding: "8px 12px", fontSize: 13, borderRadius: 6, border: "1px solid var(--border)", fontFamily: "monospace" }}
                  required
                />
              </div>

              {/* Swatch Preview */}
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {colorInput
                  .split(",")
                  .map((c) => c.trim())
                  .filter((c) => c.startsWith("#"))
                  .map((c, i) => (
                    <div
                      key={i}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 6,
                        backgroundColor: c,
                        border: "1px solid rgba(0,0,0,0.15)",
                      }}
                      title={c}
                    />
                  ))}
              </div>

              <button
                type="submit"
                disabled={creatingPalette || !paletteName.trim()}
                className="btn btn-primary"
                style={{ width: "100%", padding: "10px" }}
              >
                <PlusCircle size={16} />
                <span>{creatingPalette ? "Saving..." : "Save Palette"}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 3: TYPOGRAPHY & TEXT IN IMAGES
         ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "typography" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: "var(--oxford-navy)" }}>
              Text Detected in Images (Visual Text Inspection)
            </h2>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
              When creative banners, social cards, or product posters are submitted, text extracted from inside the image is screened against all brand rules, banned terminology, and required disclaimers.
            </p>

            <div style={{ backgroundColor: "var(--honeydew)", padding: "14px", borderRadius: 8, border: "1px solid var(--border)", fontSize: 12.5, color: "var(--text-secondary)" }}>
              <strong>Operational Capability:</strong>
              <ul style={{ paddingLeft: 18, marginTop: 6, display: "flex", flexDirection: "column", gap: 4 }}>
                <li>Extracts headline, subhead, and fine-print text from PNG and JPG images.</li>
                <li>Identifies bounding box coordinates of flagged phrases.</li>
                <li>Verifies mandatory disclaimers inside product packaging or promotional hero banners.</li>
              </ul>
            </div>
          </div>

          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: "var(--oxford-navy)" }}>
              Typography Hierarchy Guidelines
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--cerulean)", textTransform: "uppercase" }}>Primary Brand Font</span>
                <div style={{ fontSize: 16, fontWeight: 800, color: "var(--oxford-navy)" }}>Plus Jakarta Sans</div>
                <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>Weights: 400 (Regular), 600 (Semibold), 800 (Bold)</div>
              </div>

              <div style={{ padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--cerulean)", textTransform: "uppercase" }}>Technical & Disclaimers</span>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--oxford-navy)", fontFamily: "monospace" }}>JetBrains Mono</div>
                <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>Used for audit citations, regulatory references, and telemetry</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 4: ACCESSIBILITY & CONTRAST STANDARDS (WCAG AA)
         ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "accessibility" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: "var(--oxford-navy)" }}>
              WCAG AA Accessibility Contrast Requirements
            </h2>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
              All promotional creatives and digital assets must meet Web Content Accessibility Guidelines (WCAG) 2.1 Level AA for readable text contrast:
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 4 }}>
              <div style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 14, backgroundColor: "#F8FAFC" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--cerulean)", textTransform: "uppercase" }}>
                  Standard Text (&lt; 18pt)
                </span>
                <div style={{ fontSize: 24, fontWeight: 800, color: "var(--oxford-navy)", margin: "4px 0" }}>
                  4.5 : 1
                </div>
                <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
                  Minimum contrast ratio between text and its background. Text below this ratio is automatically flagged as an accessibility issue.
                </p>
              </div>

              <div style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 14, backgroundColor: "#F8FAFC" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--cerulean)", textTransform: "uppercase" }}>
                  Large Text (&ge; 18pt or &ge; 14pt bold)
                </span>
                <div style={{ fontSize: 24, fontWeight: 800, color: "var(--oxford-navy)", margin: "4px 0" }}>
                  3.0 : 1
                </div>
                <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
                  Minimum contrast ratio for large headlines and prominent promotional callouts.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 5: VISUAL AUDIT INSPECTION HISTORY & SAMPLE CHECKS
         ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "history" && (
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: "var(--oxford-navy)" }}>
              Visual Check Demonstrations & Verified Inspections
            </h2>
            <p style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 2 }}>
              How visual identity violations are identified, explained, and corrected:
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Example 1: Off-Brand Color */}
            <div style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "16px", backgroundColor: "#FAFCFA" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <AlertTriangle size={16} color="var(--punch-red)" />
                  <span style={{ fontSize: 14, fontWeight: 800, color: "var(--oxford-navy)" }}>
                    Color Check: Off-Brand Neon Accent Detected
                  </span>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--punch-red)", backgroundColor: "var(--punch-dim)", padding: "2px 8px", borderRadius: 4 }}>
                  Delta E: 48.2 (Exceeds 35.0 Threshold)
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, fontSize: 12.5, color: "var(--text-secondary)" }}>
                <div>
                  <strong>Expected Color:</strong>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                    <span style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: "#457B9D" }} />
                    <code>#457B9D (Cerulean Primary)</code>
                  </div>
                </div>

                <div>
                  <strong>Detected Color:</strong>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                    <span style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: "#00E5FF" }} />
                    <code>#00E5FF (Unapproved Cyan)</code>
                  </div>
                </div>

                <div>
                  <strong>Recommended Correction:</strong>
                  <div style={{ marginTop: 4, color: "var(--status-success-text)", fontWeight: 600 }}>
                    Replace unapproved neon background with Cerulean (#457B9D) or Frosted Blue (#A8DADC).
                  </div>
                </div>
              </div>
            </div>

            {/* Example 2: Contrast Ratio Check */}
            <div style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "16px", backgroundColor: "#FAFCFA" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <AlertTriangle size={16} color="#D69E2E" />
                  <span style={{ fontSize: 14, fontWeight: 800, color: "var(--oxford-navy)" }}>
                    Contrast Check: Low Contrast on Subtitle Callout
                  </span>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#975A16", backgroundColor: "var(--status-warning-bg)", padding: "2px 8px", borderRadius: 4 }}>
                  Ratio: 2.4:1 (Requires 4.5:1)
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, fontSize: 12.5, color: "var(--text-secondary)" }}>
                <div>
                  <strong>Foreground Text:</strong>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                    <span style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: "#A8DADC" }} />
                    <code>#A8DADC (Light Blue)</code>
                  </div>
                </div>

                <div>
                  <strong>Background:</strong>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                    <span style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: "#FFFFFF" }} />
                    <code>#FFFFFF (White Canvas)</code>
                  </div>
                </div>

                <div>
                  <strong>Recommended Correction:</strong>
                  <div style={{ marginTop: 4, color: "var(--status-success-text)", fontWeight: 600 }}>
                    Darken text to Oxford Navy (#1D3557) to achieve compliant 11.2:1 contrast ratio.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
