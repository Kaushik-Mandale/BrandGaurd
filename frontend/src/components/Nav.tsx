"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import {
  Shield,
  LayoutDashboard,
  PlusCircle,
  BookOpen,
  Palette,
  ShieldCheck,
  BarChart3,
  Sparkles,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/submit", label: "New Audit", icon: PlusCircle },
  { href: "/knowledge", label: "Guidelines & Rules", icon: BookOpen },
  { href: "/visual", label: "Visual Assets", icon: Palette },
  { href: "/audit", label: "Audit Trail", icon: ShieldCheck },
  { href: "/insights", label: "Intelligence", icon: BarChart3 },
];

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [apiHealthy, setApiHealthy] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function checkHealth() {
      try {
        await api.health();
        if (isMounted) setApiHealthy(true);
      } catch {
        if (isMounted) setApiHealthy(false);
      }
    }
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <header
      style={{
        borderBottom: "1px solid var(--border)",
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        position: "sticky",
        top: 0,
        zIndex: 100,
        boxShadow: "0 2px 8px rgba(29, 53, 87, 0.05)",
      }}
    >
      <div
        className="app-nav-inner"
      >
        {/* Brand Logo & Descriptor */}
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            textDecoration: "none",
            flexShrink: 0,
          }}
        >
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: "linear-gradient(135deg, var(--oxford-navy) 0%, var(--cerulean) 100%)",
              border: "1.5px solid var(--frosted-blue)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#FFFFFF",
              boxShadow: "0 2px 10px rgba(29, 53, 87, 0.25)",
            }}
          >
            <Shield size={21} strokeWidth={2.4} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
            style={{ display: "flex", flexDirection: "column" }}
          >
            <span
              style={{
                fontSize: 17.5,
                fontWeight: 800,
                color: "var(--oxford-navy)",
                letterSpacing: "-0.035em",
                lineHeight: 1.1,
              }}
            >
              BrandGuard<span style={{ color: "var(--cerulean)" }}>.ai</span>
            </span>
            <span
              style={{
                fontSize: 9.5,
                fontWeight: 700,
                color: "var(--text-muted)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginTop: 2,
              }}
            >
              INKLOOM BRAND GOVERNANCE
            </span>
          </motion.div>
        </Link>

        {/* Navigation Items (Single-line, No Wrapping) */}
        <nav
          className="app-nav-links"
        >
          {NAV_ITEMS.map((item, idx) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

            return (
              <motion.div
                key={item.href}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: 0.04 * idx }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Link
                  href={item.href}
                  className={`nav-link ${isActive ? "active" : ""}`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 7,
                    padding: "8px 9px",
                    borderRadius: "var(--radius-sm)",
                    fontSize: 13,
                    fontWeight: isActive ? 700 : 600,
                    whiteSpace: "nowrap",
                    backgroundColor: isActive ? "var(--cerulean)" : "transparent",
                    color: isActive ? "#FFFFFF" : "var(--text-secondary)",
                    boxShadow: isActive ? "var(--shadow-cerulean)" : "none",
                  }}
                >
                  <Icon size={16} strokeWidth={isActive ? 2.2 : 1.8} />
                  <span>{item.label}</span>
                </Link>
              </motion.div>
            );
          })}
        </nav>

        {/* Health endpoint confirms API liveness only; it does not imply retrieval health. */}
        <motion.div
          className="app-nav-actions"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.25 }}
        >
          {apiHealthy === true && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                padding: "6px 13px",
                borderRadius: 9999,
                backgroundColor: "var(--status-success-bg)",
                border: "1px solid var(--status-success-border)",
                color: "var(--status-success-text)",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              <span
                className="pulse-dot"
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  backgroundColor: "var(--status-success-text)",
                }}
              />
              <span>API Online</span>
            </div>
          )}

          <button
            type="button"
            className="btn"
            onClick={async () => {
              try {
                await api.logout();
                router.replace("/login");
              } catch (error) {
                alert(`Could not confirm sign-out with the server: ${error instanceof Error ? error.message : "Unknown error"}`);
                router.replace("/login");
              } finally {
                router.refresh();
              }
            }}
            style={{ whiteSpace: "nowrap" }}
          >
            Sign out
          </button>

          {apiHealthy === false && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                padding: "6px 13px",
                borderRadius: 9999,
                backgroundColor: "var(--punch-dim)",
                border: "1px solid var(--punch-border)",
                color: "var(--punch-red)",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  backgroundColor: "var(--punch-red)",
                }}
              />
              <span>API Unavailable</span>
            </div>
          )}

          {apiHealthy === null && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                padding: "6px 13px",
                borderRadius: 9999,
                backgroundColor: "var(--bg-subtle)",
                border: "1px solid var(--border)",
                color: "var(--text-muted)",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              <span className="pulse-dot" style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: "var(--text-muted)" }} />
              <span>Checking API...</span>
            </div>
          )}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              fontSize: 12,
              fontWeight: 700,
              color: "var(--oxford-navy)",
              backgroundColor: "var(--frosted-dim)",
              border: "1px solid var(--frosted-border)",
              padding: "4px 9px",
              borderRadius: "var(--radius-sm)",
            }}
          >
            <Sparkles size={13} color="var(--cerulean)" />
            <span>v2.2</span>
          </div>
        </motion.div>
      </div>
    </header>
  );
}
