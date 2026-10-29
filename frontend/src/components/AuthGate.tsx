"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import Nav from "@/components/Nav";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [authorizedPath, setAuthorizedPath] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (pathname === "/login") return () => { active = false; };
    window.localStorage.removeItem("brandguard.access_token");
    api.me().then(
      () => { if (active) setAuthorizedPath(pathname); },
      () => { if (active) router.replace("/login"); },
    );
    return () => { active = false; };
  }, [pathname, router]);

  useEffect(() => {
    const handleUnauthorized = () => router.replace("/login");
    window.addEventListener("brandguard:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("brandguard:unauthorized", handleUnauthorized);
  }, [router]);

  if (pathname === "/login") return <>{children}</>;
  if (authorizedPath === pathname) {
    return (
      <>
        <Nav />
        <main className="main-content">{children}</main>
      </>
    );
  }
  return (
    <div style={{ minHeight: "50vh", display: "grid", placeItems: "center", color: "var(--text-muted)" }}>
      Checking your secure session...
    </div>
  );
}
