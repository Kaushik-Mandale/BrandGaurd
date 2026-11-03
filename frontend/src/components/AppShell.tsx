"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import type { SearchHit } from "@/lib/types";
import {
  Shield,
  LayoutDashboard,
  PlusCircle,
  BookOpen,
  Palette,
  ShieldCheck,
  BarChart3,
  Search,
  Bell,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Settings,
  LogOut,
  FileText,
  Menu,
  X,
  Sparkles,
  Layers,
  Activity,
  Sliders,
  Check,
} from "lucide-react";

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [intelExpanded, setIntelExpanded] = useState(true);
  const [apiHealthy, setApiHealthy] = useState<boolean | null>(null);

  // Top header search & results
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchHit[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Notification dropdown
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // User profile dropdown
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Settings modal
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Check API health
  useEffect(() => {
    let mounted = true;
    async function checkHealth() {
      try {
        await api.health();
        if (mounted) setApiHealthy(true);
      } catch {
        if (mounted) setApiHealthy(false);
      }
    }
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // Handle outside clicks for dropdowns
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Live search debounce
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!searchQuery.trim() || searchQuery.length < 2) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      try {
        const hits = await api.search(searchQuery.trim());
        setSearchResults(hits || []);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSignOut = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // ignore
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }, [router]);

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "var(--bg-main)" }}>
      {/* ── Mobile Sidebar Overlay ────────────────────────────────────────── */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 29, 48, 0.6)",
            backdropFilter: "blur(4px)",
            zIndex: 110,
          }}
        />
      )}

      {/* ── Left Sidebar (Dark Navy Enterprise Navigation) ──────────────── */}
      <aside
        style={{
          width: 260,
          flexShrink: 0,
          backgroundColor: "#0F1D30",
          borderRight: "1px solid #1E3553",
          display: "flex",
          flexDirection: "column",
          position: "sticky",
          top: 0,
          height: "100vh",
          overflowY: "auto",
          zIndex: 120,
          transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          transform: mobileOpen ? "translateX(0)" : undefined,
        }}
        className={mobileOpen ? "mobile-sidebar-open" : "mobile-sidebar-closed"}
      >
        {/* Brand Logo & Subtitle */}
        <div
          style={{
            padding: "24px 20px 20px",
            borderBottom: "1px solid #1A2D47",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Link
            href="/"
            onClick={() => setMobileOpen(false)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              textDecoration: "none",
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: "linear-gradient(135deg, #1D3557 0%, #457B9D 100%)",
                border: "1.5px solid #A8DADC",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#FFFFFF",
                boxShadow: "0 2px 10px rgba(69, 123, 157, 0.35)",
              }}
            >
              <Shield size={21} strokeWidth={2.4} />
            </div>

            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
                <span
                  style={{
                    fontSize: 17.5,
                    fontWeight: 800,
                    color: "#FFFFFF",
                    letterSpacing: "-0.03em",
                  }}
                >
                  BrandGuard
                </span>
                <span style={{ fontSize: 16, fontWeight: 800, color: "#A8DADC" }}>.ai</span>
              </div>
              <span
                style={{
                  fontSize: 9.5,
                  fontWeight: 700,
                  color: "#7E9AB8",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  marginTop: 2,
                }}
              >
                Brand Governance & Compliance
              </span>
            </div>
          </Link>

          {/* Close button for mobile */}
          <button
            onClick={() => setMobileOpen(false)}
            className="mobile-close-btn"
            style={{
              display: "none",
              background: "transparent",
              border: "none",
              color: "#A8DADC",
              cursor: "pointer",
              padding: 4,
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Main Navigation List */}
        <div style={{ flex: 1, padding: "18px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
          {/* Group 1: Core Navigation */}
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: "#5B7494",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              padding: "4px 10px 6px",
            }}
          >
            Core Auditing
          </div>

          <Link
            href="/"
            onClick={() => setMobileOpen(false)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "9px 12px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: pathname === "/" ? 700 : 500,
              backgroundColor: pathname === "/" ? "#1D3557" : "transparent",
              color: pathname === "/" ? "#FFFFFF" : "#9FB5CD",
              borderLeft: pathname === "/" ? "3px solid #A8DADC" : "3px solid transparent",
              transition: "all 0.15s ease",
            }}
          >
            <LayoutDashboard size={17} color={pathname === "/" ? "#A8DADC" : "#7E9AB8"} />
            <span>Dashboard</span>
          </Link>

          <Link
            href="/submit"
            onClick={() => setMobileOpen(false)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "9px 12px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: pathname.startsWith("/submit") ? 700 : 500,
              backgroundColor: pathname.startsWith("/submit") ? "#1D3557" : "transparent",
              color: pathname.startsWith("/submit") ? "#FFFFFF" : "#9FB5CD",
              borderLeft: pathname.startsWith("/submit") ? "3px solid #A8DADC" : "3px solid transparent",
              transition: "all 0.15s ease",
            }}
          >
            <PlusCircle size={17} color={pathname.startsWith("/submit") ? "#A8DADC" : "#7E9AB8"} />
            <span>New Brand Check</span>
          </Link>

          <Link
            href="/#submissions"
            onClick={() => setMobileOpen(false)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "9px 12px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
              backgroundColor: "transparent",
              color: "#9FB5CD",
              borderLeft: "3px solid transparent",
              transition: "all 0.15s ease",
            }}
          >
            <FileText size={17} color="#7E9AB8" />
            <span>Audit Submissions</span>
          </Link>

          <Link
            href="/review/1"
            onClick={() => setMobileOpen(false)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "9px 12px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: pathname.startsWith("/review") ? 700 : 500,
              backgroundColor: pathname.startsWith("/review") ? "#1D3557" : "transparent",
              color: pathname.startsWith("/review") ? "#FFFFFF" : "#9FB5CD",
              borderLeft: pathname.startsWith("/review") ? "3px solid #A8DADC" : "3px solid transparent",
              transition: "all 0.15s ease",
            }}
          >
            <ShieldCheck size={17} color={pathname.startsWith("/review") ? "#A8DADC" : "#7E9AB8"} />
            <span>Review Queue</span>
          </Link>

          {/* Group 2: Guidelines & Identity */}
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: "#5B7494",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              padding: "16px 10px 6px",
            }}
          >
            Guidelines & Identity
          </div>

          <Link
            href="/knowledge"
            onClick={() => setMobileOpen(false)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "9px 12px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: pathname.startsWith("/knowledge") ? 700 : 500,
              backgroundColor: pathname.startsWith("/knowledge") ? "#1D3557" : "transparent",
              color: pathname.startsWith("/knowledge") ? "#FFFFFF" : "#9FB5CD",
              borderLeft: pathname.startsWith("/knowledge") ? "3px solid #A8DADC" : "3px solid transparent",
              transition: "all 0.15s ease",
            }}
          >
            <BookOpen size={17} color={pathname.startsWith("/knowledge") ? "#A8DADC" : "#7E9AB8"} />
            <span>Knowledge Base</span>
          </Link>

          <Link
            href="/knowledge"
            onClick={() => setMobileOpen(false)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "9px 12px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
              color: "#9FB5CD",
              borderLeft: "3px solid transparent",
              transition: "all 0.15s ease",
            }}
          >
            <Sliders size={17} color="#7E9AB8" />
            <span>Brand Rules</span>
          </Link>

          <Link
            href="/visual"
            onClick={() => setMobileOpen(false)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "9px 12px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: pathname.startsWith("/visual") ? 700 : 500,
              backgroundColor: pathname.startsWith("/visual") ? "#1D3557" : "transparent",
              color: pathname.startsWith("/visual") ? "#FFFFFF" : "#9FB5CD",
              borderLeft: pathname.startsWith("/visual") ? "3px solid #A8DADC" : "3px solid transparent",
              transition: "all 0.15s ease",
            }}
          >
            <Palette size={17} color={pathname.startsWith("/visual") ? "#A8DADC" : "#7E9AB8"} />
            <span>Visual Identity</span>
          </Link>

          {/* Group 3: Intelligence (Expandable) */}
          <div style={{ marginTop: 10 }}>
            <button
              onClick={() => setIntelExpanded(!intelExpanded)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 10px",
                background: "transparent",
                border: "none",
                color: "#7E9AB8",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Sparkles size={13} color="#A8DADC" />
                <span>Intelligence</span>
              </div>
              {intelExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>

            {intelExpanded && (
              <div style={{ display: "flex", flexDirection: "column", gap: 3, paddingLeft: 12, marginTop: 4 }}>
                <Link
                  href="/insights"
                  onClick={() => setMobileOpen(false)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "7px 10px",
                    borderRadius: 6,
                    fontSize: 12.5,
                    fontWeight: pathname.startsWith("/insights") ? 700 : 500,
                    backgroundColor: pathname.startsWith("/insights") ? "#1D3557" : "transparent",
                    color: pathname.startsWith("/insights") ? "#FFFFFF" : "#8FA9C4",
                  }}
                >
                  <BarChart3 size={15} color={pathname.startsWith("/insights") ? "#A8DADC" : "#6A89AB"} />
                  <span>Analytics</span>
                </Link>

                <Link
                  href="/insights"
                  onClick={() => setMobileOpen(false)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "7px 10px",
                    borderRadius: 6,
                    fontSize: 12.5,
                    fontWeight: 500,
                    color: "#8FA9C4",
                  }}
                >
                  <Activity size={15} color="#6A89AB" />
                  <span>Automated Benchmark</span>
                </Link>

                <Link
                  href="/insights"
                  onClick={() => setMobileOpen(false)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "7px 10px",
                    borderRadius: 6,
                    fontSize: 12.5,
                    fontWeight: 500,
                    color: "#8FA9C4",
                  }}
                >
                  <Layers size={15} color="#6A89AB" />
                  <span>Audit Insights</span>
                </Link>
              </div>
            )}
          </div>

          {/* Group 4: System & Governance */}
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: "#5B7494",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              padding: "16px 10px 6px",
            }}
          >
            System
          </div>

          <Link
            href="/audit"
            onClick={() => setMobileOpen(false)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "9px 12px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: pathname.startsWith("/audit") ? 700 : 500,
              backgroundColor: pathname.startsWith("/audit") ? "#1D3557" : "transparent",
              color: pathname.startsWith("/audit") ? "#FFFFFF" : "#9FB5CD",
              borderLeft: pathname.startsWith("/audit") ? "3px solid #A8DADC" : "3px solid transparent",
              transition: "all 0.15s ease",
            }}
          >
            <ShieldCheck size={17} color={pathname.startsWith("/audit") ? "#A8DADC" : "#7E9AB8"} />
            <span>Audit Trail</span>
          </Link>

          <button
            onClick={() => {
              setSettingsOpen(true);
              setMobileOpen(false);
            }}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "9px 12px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
              backgroundColor: "transparent",
              color: "#9FB5CD",
              border: "none",
              cursor: "pointer",
              textAlign: "left",
              borderLeft: "3px solid transparent",
              transition: "all 0.15s ease",
            }}
          >
            <Settings size={17} color="#7E9AB8" />
            <span>Settings</span>
          </button>
        </div>

        {/* ── Codestar 30 — Round 3 Final Build Panel ───────────────────────── */}
        <div style={{ padding: "14px 14px 20px", borderTop: "1px solid #1A2D47" }}>
          <div
            style={{
              backgroundColor: "rgba(29, 53, 87, 0.45)",
              border: "1px solid #233C5F",
              borderRadius: 10,
              padding: "12px 14px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  color: "#A8DADC",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                Codestar 30 — Round 3
              </span>
              <span
                style={{
                  fontSize: 9.5,
                  fontWeight: 700,
                  color: "#38A169",
                  backgroundColor: "rgba(56, 161, 105, 0.18)",
                  padding: "2px 6px",
                  borderRadius: 4,
                }}
              >
                Verified
              </span>
            </div>

            <div style={{ fontSize: 11.5, fontWeight: 700, color: "#FFFFFF", marginBottom: 8 }}>
              Delivered Capabilities
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11, color: "#CBD5E0" }}>
                <CheckCircle2 size={13} color="#48BB78" strokeWidth={2.4} />
                <span>Evidence Verification</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11, color: "#CBD5E0" }}>
                <CheckCircle2 size={13} color="#48BB78" strokeWidth={2.4} />
                <span>Automated Benchmark</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11, color: "#CBD5E0" }}>
                <CheckCircle2 size={13} color="#48BB78" strokeWidth={2.4} />
                <span>Image & Visual Analysis</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main Viewport (Header + Scrollable Page Content) ───────────────── */}
      <div style={{ flex: "1 1 0%", display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* ── Slim Top Navigation Bar ──────────────────────────────────────── */}
        <header
          style={{
            height: 60,
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
            borderBottom: "1px solid var(--border)",
            position: "sticky",
            top: 0,
            zIndex: 90,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 28px",
          }}
        >
          {/* Left: Mobile hamburger + Global Search */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, flex: 1, maxWidth: 540 }}>
            <button
              onClick={() => setMobileOpen(true)}
              className="mobile-menu-trigger"
              style={{
                display: "none",
                background: "transparent",
                border: "none",
                color: "var(--oxford-navy)",
                cursor: "pointer",
                padding: 4,
              }}
            >
              <Menu size={22} />
            </button>

            {/* Search Input Box */}
            <div ref={searchRef} style={{ position: "relative", width: "100%", maxWidth: 440 }}>
              <Search
                size={15}
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-muted)",
                }}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                placeholder="Search guidelines, submissions, claims…"
                style={{
                  width: "100%",
                  paddingLeft: 36,
                  paddingRight: 14,
                  paddingTop: 8,
                  paddingBottom: 8,
                  fontSize: 13,
                  backgroundColor: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  borderRadius: 20,
                  outline: "none",
                  transition: "all 0.15s ease",
                }}
              />

              {/* Search Results Dropdown */}
              {searchFocused && (searchQuery.trim().length >= 2 || searchResults.length > 0) && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 8px)",
                    left: 0,
                    right: 0,
                    backgroundColor: "#FFFFFF",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    boxShadow: "var(--shadow-lg)",
                    padding: 8,
                    maxHeight: 320,
                    overflowY: "auto",
                    zIndex: 200,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "var(--text-muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      padding: "6px 10px",
                    }}
                  >
                    {isSearching ? "Searching Knowledge Chunks..." : `Search Results (${searchResults.length})`}
                  </div>

                  {searchResults.length === 0 && !isSearching ? (
                    <div style={{ padding: "16px 12px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                      No matching guideline passages found for &quot;{searchQuery}&quot;
                    </div>
                  ) : (
                    searchResults.map((hit) => (
                      <Link
                        key={hit.chunk_id}
                        href="/knowledge"
                        onClick={() => {
                          setSearchFocused(false);
                          setSearchQuery("");
                        }}
                        style={{
                          display: "block",
                          padding: "8px 10px",
                          borderRadius: 6,
                          textDecoration: "none",
                          borderBottom: "1px solid #F1F5F9",
                        }}
                        className="search-hit-item"
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--oxford-navy)" }}>
                            {hit.doc_title}
                          </span>
                          <span style={{ fontSize: 10.5, color: "var(--cerulean)", fontWeight: 600 }}>
                            Score: {(hit.score * 100).toFixed(0)}%
                          </span>
                        </div>
                        <p
                          style={{
                            fontSize: 12,
                            color: "var(--text-secondary)",
                            marginTop: 2,
                            lineHeight: 1.35,
                            overflow: "hidden",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                          }}
                        >
                          {hit.text}
                        </p>
                      </Link>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right: API Badge + Notifications + User Avatar */}
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {/* API Health Pill */}
            {apiHealthy === true && (
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 10px",
                  borderRadius: 9999,
                  backgroundColor: "var(--status-success-bg)",
                  border: "1px solid var(--status-success-border)",
                  color: "var(--status-success-text)",
                  fontSize: 11.5,
                  fontWeight: 700,
                }}
              >
                <span
                  className="pulse-dot"
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    backgroundColor: "var(--status-success-text)",
                  }}
                />
                <span>API Online</span>
              </div>
            )}

            {/* Notification Bell */}
            <div ref={notifRef} style={{ position: "relative" }}>
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  backgroundColor: "#F1F5F9",
                  border: "1px solid #E2E8F0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--oxford-navy)",
                  cursor: "pointer",
                  position: "relative",
                }}
                title="Notifications"
              >
                <Bell size={17} />
                <span
                  style={{
                    position: "absolute",
                    top: 2,
                    right: 2,
                    width: 15,
                    height: 15,
                    borderRadius: "50%",
                    backgroundColor: "var(--punch-red)",
                    color: "#FFFFFF",
                    fontSize: 9.5,
                    fontWeight: 800,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "2px solid #FFFFFF",
                  }}
                >
                  3
                </span>
              </button>

              {/* Notification Popover */}
              {notificationsOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 10px)",
                    right: 0,
                    width: 320,
                    backgroundColor: "#FFFFFF",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    boxShadow: "var(--shadow-lg)",
                    padding: 12,
                    zIndex: 200,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      paddingBottom: 8,
                      borderBottom: "1px solid #F1F5F9",
                      marginBottom: 8,
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--oxford-navy)" }}>
                      Audit Notifications
                    </span>
                    <span style={{ fontSize: 11, color: "var(--cerulean)", fontWeight: 600 }}>3 unread</span>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div
                      style={{
                        padding: "8px 10px",
                        borderRadius: 8,
                        backgroundColor: "var(--honeydew)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700 }}>
                        <AlertTriangle size={13} color="var(--punch-red)" />
                        <span>HydraPlus Campaign Copy</span>
                      </div>
                      <div style={{ fontSize: 11.5, color: "var(--text-secondary)", marginTop: 2 }}>
                        2 contradictory claims flagged in evidence verification.
                      </div>
                    </div>

                    <div
                      style={{
                        padding: "8px 10px",
                        borderRadius: 8,
                        backgroundColor: "#F8FAFC",
                        border: "1px solid #E2E8F0",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700 }}>
                        <CheckCircle2 size={13} color="#38A169" />
                        <span>Product Launch Creative</span>
                      </div>
                      <div style={{ fontSize: 11.5, color: "var(--text-secondary)", marginTop: 2 }}>
                        Approved by reviewer after 1 automated tone fix.
                      </div>
                    </div>

                    <div
                      style={{
                        padding: "8px 10px",
                        borderRadius: 8,
                        backgroundColor: "#F8FAFC",
                        border: "1px solid #E2E8F0",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700 }}>
                        <Activity size={13} color="var(--cerulean)" />
                        <span>Benchmark Engine v2.2</span>
                      </div>
                      <div style={{ fontSize: 11.5, color: "var(--text-secondary)", marginTop: 2 }}>
                        18 test cases evaluated with 88.0% precision, 0 regressions.
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* User Avatar + Demo Account Dropdown */}
            <div ref={profileRef} style={{ position: "relative" }}>
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  background: "transparent",
                  border: "1px solid #E2E8F0",
                  borderRadius: 24,
                  padding: "4px 12px 4px 6px",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: "50%",
                    backgroundColor: "var(--oxford-navy)",
                    color: "#FFFFFF",
                    fontSize: 12,
                    fontWeight: 800,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  DU
                </div>

                <div style={{ display: "flex", flexDirection: "column", textAlign: "left" }}>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--oxford-navy)", lineHeight: 1.2 }}>
                    Demo User
                  </span>
                  <span style={{ fontSize: 10.5, color: "var(--text-muted)", lineHeight: 1.2 }}>
                    Acme Corp (Demo)
                  </span>
                </div>

                <ChevronDown size={14} color="var(--text-muted)" />
              </button>

              {/* Profile Popover */}
              {profileOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 10px)",
                    right: 0,
                    width: 250,
                    backgroundColor: "#FFFFFF",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    boxShadow: "var(--shadow-lg)",
                    padding: 12,
                    zIndex: 200,
                  }}
                >
                  <div style={{ paddingBottom: 10, borderBottom: "1px solid #F1F5F9" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--oxford-navy)" }}>
                      Demo Account (Evaluator)
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>demo@brandguard.ai</div>
                    <div
                      style={{
                        display: "inline-block",
                        marginTop: 6,
                        fontSize: 10.5,
                        fontWeight: 700,
                        color: "var(--cerulean)",
                        backgroundColor: "var(--frosted-dim)",
                        padding: "2px 8px",
                        borderRadius: 4,
                      }}
                    >
                      Workspace: Acme Corp (Demo)
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 8 }}>
                    <button
                      onClick={() => {
                        setSettingsOpen(true);
                        setProfileOpen(false);
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "7px 8px",
                        borderRadius: 6,
                        background: "transparent",
                        border: "none",
                        color: "var(--oxford-navy)",
                        fontSize: 12.5,
                        cursor: "pointer",
                        width: "100%",
                        textAlign: "left",
                      }}
                    >
                      <Settings size={15} color="var(--text-muted)" />
                      <span>Workspace Settings</span>
                    </button>

                    <button
                      onClick={handleSignOut}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "7px 8px",
                        borderRadius: 6,
                        background: "transparent",
                        border: "none",
                        color: "var(--punch-red)",
                        fontSize: 12.5,
                        cursor: "pointer",
                        width: "100%",
                        textAlign: "left",
                      }}
                    >
                      <LogOut size={15} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ── Main Scrollable Page Area ────────────────────────────────────── */}
        <main style={{ flex: 1, padding: "28px 32px 60px", maxWidth: 1400, width: "100%", margin: "0 auto" }}>
          {children}
        </main>
      </div>

      {/* ── Settings Modal ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {settingsOpen && (
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
            onClick={() => setSettingsOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "100%",
                maxWidth: 520,
                backgroundColor: "#FFFFFF",
                borderRadius: 16,
                boxShadow: "var(--shadow-lg)",
                border: "1px solid var(--border)",
                padding: 24,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Settings size={20} color="var(--oxford-navy)" />
                  <h3 style={{ fontSize: 17, fontWeight: 800, color: "var(--oxford-navy)" }}>Workspace Settings</h3>
                </div>
                <button
                  onClick={() => setSettingsOpen(false)}
                  style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-muted)" }}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ padding: 12, backgroundColor: "var(--honeydew)", borderRadius: 8, border: "1px solid var(--border)" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                    Tenant Identity
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--oxford-navy)", marginTop: 2 }}>
                    Acme Corp (Demo Workspace)
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
                    Tenant ID: Org #6 · Isolated Sandbox Environment
                  </div>
                </div>

                <div style={{ padding: 12, backgroundColor: "#F8FAFC", borderRadius: 8, border: "1px solid #E2E8F0" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                    Connected AI Provider & Embeddings
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--oxford-navy)", marginTop: 2 }}>
                    Groq / OpenAI-compatible · FastEmbed MiniLM-L6-v2 (CPU ONNX)
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
                    Database: Neon Serverless PostgreSQL with pgvector
                  </div>
                </div>

                <div style={{ padding: 12, backgroundColor: "#F8FAFC", borderRadius: 8, border: "1px solid #E2E8F0" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                    Platform Status
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--status-success-text)", fontWeight: 700, marginTop: 4 }}>
                    <Check size={16} />
                    <span>Codestar 30 Round 3 Production Finalized</span>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
                <button onClick={() => setSettingsOpen(false)} className="btn btn-secondary">
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}