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
} from "lucide-react";

export default function VisualIdentityPage() {
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
    if (!confirm("Delete this brand asset?")) return;
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
            <Palette size={13} color="var(--cerulean)" />
            <span>Computer Vision & Creative Governance</span>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--oxford-navy)", letterSpacing: "-0.035em" }}>
            Visual Identity & Brand Assets
          </h1>
          <p style={{ color: "var(--text-secondary)", marginTop: 6, maxWidth: 640, fontSize: 14.5 }}>
            Register official brand logos, vector references, and approved CIELAB color palettes. Submitted banner ads and creatives are analyzed via multi-scale OpenCV template matching and perceptual color distance.
          </p>
        </div>
        <button onClick={loadAssets} className="btn btn-secondary" style={{ padding: "10px 18px" }}>
          <RotateCw size={14} />
          <span>Refresh Assets</span>
        </button>
      </motion.div>

      {error && (
        <div style={{ padding: "14px 18px", borderRadius: "var(--radius-sm)", backgroundColor: "var(--status-danger-bg)", border: "1px solid var(--punch-border)", color: "var(--status-danger-text)", fontSize: 13 }}>
          ⚠ {error}
        </div>
      )}

      {/* Main Grid: Palettes + Logos */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        {/* Left Column: Brand Color Palettes */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="card"
            style={{ display: "flex", flexDirection: "column", gap: 16 }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Palette size={18} color="var(--cerulean)" />
              <h2 style={{ fontSize: 16.5, fontWeight: 800, color: "var(--oxford-navy)", margin: 0 }}>
                Define Approved Color Palette
              </h2>
            </div>

            <form onSubmit={handleCreatePalette} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>
                  Palette Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Inkloom Summer Ocean Breeze Palette"
                  value={paletteName}
                  onChange={(e) => setPaletteName(e.target.value)}
                  style={{ width: "100%", padding: "8px 12px", fontSize: 13 }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>
                  Hex Colors (comma-separated, audited in CIELAB ΔE)
                </label>
                <input
                  type="text"
                  placeholder="#1D3557, #457B9D, #A8DADC, #F1FAEE, #E63946"
                  value={colorInput}
                  onChange={(e) => setColorInput(e.target.value)}
                  style={{ width: "100%", padding: "8px 12px", fontSize: 13, fontFamily: "var(--font-mono, monospace)" }}
                  required
                />
              </div>

              {/* Swatch Preview */}
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                {colorInput
                  .split(",")
                  .map((c) => c.trim())
                  .filter((c) => c.startsWith("#"))
                  .map((hex, i) => (
                    <div
                      key={i}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 6,
                        backgroundColor: hex,
                        border: "1px solid var(--border)",
                        boxShadow: "var(--shadow-xs)",
                      }}
                      title={hex}
                    />
                  ))}
              </div>

              <button
                type="submit"
                disabled={creatingPalette}
                className="btn btn-primary"
                style={{ alignSelf: "flex-start", marginTop: 4 }}
              >
                <PlusCircle size={14} />
                <span>{creatingPalette ? "Saving..." : "Register Palette"}</span>
              </button>
            </form>
          </motion.div>

          {/* Active Registered Palettes */}
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: "var(--oxford-navy)", margin: 0 }}>
              Active Brand Palettes ({palettes.length})
            </h3>

            {loading ? (
              <div style={{ padding: "20px 0", textAlign: "center", color: "var(--text-muted)" }}>Loading palettes...</div>
            ) : palettes.length === 0 ? (
              <div style={{ padding: "24px 0", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                No palettes registered yet.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {palettes.map((p) => {
                  const colors: string[] = (p.data?.colors as string[]) || [];
                  return (
                    <div
                      key={p.id}
                      style={{
                        padding: 14,
                        borderRadius: "var(--radius-sm)",
                        backgroundColor: "var(--bg-subtle)",
                        border: "1px solid var(--border)",
                        display: "flex",
                        flexDirection: "column",
                        gap: 10,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--oxford-navy)" }}>
                          {p.name}
                        </span>
                        <button
                          onClick={() => handleDeleteAsset(p.id)}
                          className="btn btn-ghost"
                          style={{ fontSize: 11, color: "var(--status-danger-text)", padding: "2px 6px" }}
                        >
                          <Trash2 size={12} />
                          <span>Delete</span>
                        </button>
                      </div>

                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        {colors.map((c, idx) => (
                          <div key={idx} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <div
                              style={{
                                width: 22,
                                height: 22,
                                borderRadius: 4,
                                backgroundColor: c,
                                border: "1px solid var(--border)",
                              }}
                            />
                            <span style={{ fontSize: 11, fontFamily: "var(--font-mono, monospace)", color: "var(--text-secondary)" }}>
                              {c}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Registered Brand Logos */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="card"
            style={{ display: "flex", flexDirection: "column", gap: 16 }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <ImageIcon size={18} color="var(--cerulean)" />
              <h2 style={{ fontSize: 16.5, fontWeight: 800, color: "var(--oxford-navy)", margin: 0 }}>
                Register Reference Brand Logo
              </h2>
            </div>

            <form onSubmit={handleUploadLogo} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>
                  Logo Asset Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Nexus Primary Horizontal Vector"
                  value={logoName}
                  onChange={(e) => setLogoName(e.target.value)}
                  style={{ width: "100%", padding: "8px 12px", fontSize: 13 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>
                  Logo Template File (PNG / JPG / WebP)
                </label>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                  style={{ width: "100%", fontSize: 12 }}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={uploadingLogo || !logoFile}
                className="btn btn-primary"
                style={{ alignSelf: "flex-start", marginTop: 4 }}
              >
                <Upload size={14} />
                <span>{uploadingLogo ? "Uploading..." : "Upload Reference Logo"}</span>
              </button>
            </form>
          </motion.div>

          {/* Active Registered Logos */}
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: "var(--oxford-navy)", margin: 0 }}>
              Registered Logo References ({logos.length})
            </h3>

            {loading ? (
              <div style={{ padding: "20px 0", textAlign: "center", color: "var(--text-muted)" }}>Loading logos...</div>
            ) : logos.length === 0 ? (
              <div style={{ padding: "24px 0", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                No logo reference templates registered yet. Upload a template to enable OpenCV multi-scale matching.
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12 }}>
                {logos.map((l) => (
                  <div
                    key={l.id}
                    style={{
                      padding: 12,
                      borderRadius: "var(--radius-sm)",
                      backgroundColor: "var(--bg-subtle)",
                      border: "1px solid var(--border)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                      textAlign: "center",
                    }}
                  >
                    <div style={{ height: 80, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF", borderRadius: 6, padding: 6, border: "1px solid var(--border)" }}>
                      <AuthenticatedImage
                        src={api.assetFileUrl(l.id)}
                        alt={l.name}
                        style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain" }}
                      />
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--oxford-navy)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {l.name}
                    </div>
                    <button
                      onClick={() => handleDeleteAsset(l.id)}
                      className="btn btn-ghost"
                      style={{ fontSize: 11, color: "var(--status-danger-text)", padding: "2px 6px", alignSelf: "center" }}
                    >
                      <Trash2 size={12} />
                      <span>Delete</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
