import type { Metadata } from "next";
import "./globals.css";
import AuthGate from "@/components/AuthGate";

export const metadata: Metadata = {
  title: "BrandGuard AI — Brand Compliance Auditing",
  description: "AI-driven compliance checker that evaluates content against brand guidelines and facts.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="page-wrapper">
          <AuthGate>{children}</AuthGate>
        </div>
      </body>
    </html>
  );
}
