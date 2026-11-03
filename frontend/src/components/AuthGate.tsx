"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import AppShell from "@/components/AppShell";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;

    // Login page — no auth check needed
    if (pathname === "/login") return;

    api.me().then(
      () => {
        if (active) setIsAuthenticated(true);
      },
      () => {
        if (active) {
          setIsAuthenticated(false);
          router.replace("/login");
        }
      }
    );

    return () => {
      active = false;
    };
  }, [pathname, router]);

  useEffect(() => {
    const handleUnauthorized = () => {
      setIsAuthenticated(false);
      router.replace("/login");
    };
    window.addEventListener("brandguard:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("brandguard:unauthorized", handleUnauthorized);
  }, [router]);

  if (pathname === "/login") {
    return <>{children}</>;
  }

  if (isAuthenticated === true) {
    return <AppShell>{children}</AppShell>;
  }

  // Null = initial loading state
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
        backgroundColor: "#0F1D30",
        color: "#A8DADC",
        fontSize: 14,
        fontWeight: 600,
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          border: "3px solid rgba(168, 218, 220, 0.2)",
          borderTopColor: "#A8DADC",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }}
      />
      <span>Authenticating BrandGuard workspace session...</span>
    </div>
  );
}
