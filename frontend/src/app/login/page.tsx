"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { api, ApiError, DemoAccountInfo } from "@/lib/api";
import { errMsg } from "@/lib/ui";
import {
  Eye,
  EyeOff,
  Sparkles,
  Copy,
  Check,
  Shield,
  ArrowRight,
  Info,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [registering, setRegistering] = useState(false);
  const [name, setName] = useState("");
  const [organization, setOrganization] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [checkingBackend, setCheckingBackend] = useState(true);
  const [backendError, setBackendError] = useState("");

  // Demo account state
  const [demoInfo, setDemoInfo] = useState<DemoAccountInfo | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [demoLoggingIn, setDemoLoggingIn] = useState(false);

  useEffect(() => {
    let active = true;
    api.authStatus().then(
      (status) => {
        if (!active) return;
        if (!status.authentication_enabled || (registering && !status.registration_enabled)) {
          setBackendError("Authentication or registration is disabled on this server.");
        }
        if (status.demo && status.demo.enabled) {
          setDemoInfo(status.demo);
        }
      },
      (reason) => {
        if (active) setBackendError(errMsg(reason));
      },
    ).finally(() => {
      if (active) setCheckingBackend(false);
    });
    return () => { active = false; };
  }, [registering]);

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2200);
    } catch {
      // Fallback
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2200);
    }
  };

  const handleContinueAsDemo = async () => {
    if (!demoInfo) return;
    setError("");
    setSuccessMessage("");
    setDemoLoggingIn(true);
    setBusy(true);

    // Pre-fill inputs so the evaluator sees them in the form
    setEmail(demoInfo.email);
    setPassword(demoInfo.password);

    try {
      await api.login(demoInfo.email, demoInfo.password);
      setSuccessMessage("Authenticated as Evaluator Demo Account. Loading workspace…");
      setTimeout(() => {
        router.replace("/");
      }, 450);
    } catch (reason) {
      setError(`Demo sign-in failed: ${errMsg(reason)}`);
      setBusy(false);
      setDemoLoggingIn(false);
    }
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccessMessage("");
    if (registering && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      if (registering) {
        await api.register(name, email, password, organization);
        setSuccessMessage("Account created successfully. Redirecting…");
      } else {
        await api.login(email, password);
        setSuccessMessage("Signed in successfully. Redirecting…");
      }
      setTimeout(() => {
        router.replace("/");
      }, 350);
    } catch (reason) {
      const message = errMsg(reason);
      setError(message);
      if (registering && reason instanceof ApiError && reason.status === 409) {
        setError(`${message} Try signing in with this email instead.`);
      }
      setBusy(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "32px 16px",
        background: "radial-gradient(ellipse at top, #E8F4F5 0%, var(--honeydew) 60%, #E2EFE7 100%)",
      }}
    >
      <div style={{ width: "min(100%, 460px)", display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Brand Header */}
        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 50,
              height: 50,
              borderRadius: 14,
              background: "linear-gradient(135deg, var(--oxford-navy) 0%, var(--cerulean) 100%)",
              border: "2px solid var(--frosted-blue)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#FFFFFF",
              boxShadow: "0 6px 18px rgba(29, 53, 87, 0.22)",
            }}
          >
            <Shield size={26} strokeWidth={2.4} />
          </div>
          <h1 style={{ color: "var(--oxford-navy)", fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em", marginTop: 4 }}>
            BrandGuard<span style={{ color: "var(--cerulean)" }}>.ai</span>
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, fontWeight: 500 }}>
            AI-Powered Brand Governance & Real-Time Content Compliance
          </p>
        </div>

        {/* ── Try Demo Section (Polished, Prominent for Hackathon Evaluators) ── */}
        {!registering && demoInfo && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.95)",
              border: "2px solid var(--frosted-blue)",
              borderRadius: 16,
              padding: "18px 20px",
              boxShadow: "0 8px 24px rgba(69, 123, 157, 0.12)",
              backdropFilter: "blur(10px)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    backgroundColor: "rgba(69, 123, 157, 0.12)",
                    color: "var(--cerulean)",
                  }}
                >
                  <Sparkles size={15} />
                </span>
                <span style={{ fontSize: 14, fontWeight: 800, color: "var(--oxford-navy)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Try Demo (Evaluators)
                </span>
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "3px 8px",
                  borderRadius: 999,
                  backgroundColor: "rgba(168, 218, 220, 0.35)",
                  color: "var(--oxford-navy)",
                }}
              >
                Instant Access
              </span>
            </div>

            <p style={{ color: "var(--text-secondary)", fontSize: 12.5, lineHeight: 1.45, marginBottom: 14 }}>
              Pre-loaded with <strong>Acme Corp</strong> guidelines, deterministic rules, visual palette, and sample audits for hackathon review.
            </p>

            {/* Credential Cards with Copy to Clipboard */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
              {/* Email Box */}
              <div
                style={{
                  backgroundColor: "var(--honeydew)",
                  border: "1px solid rgba(168, 218, 220, 0.6)",
                  borderRadius: 10,
                  padding: "8px 10px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 3,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                    Demo Email
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(demoInfo.email, "email")}
                    style={{
                      background: "none",
                      border: "none",
                      color: copiedField === "email" ? "#16A34A" : "var(--cerulean)",
                      cursor: "pointer",
                      padding: 2,
                      display: "flex",
                      alignItems: "center",
                      gap: 3,
                      fontSize: 10.5,
                      fontWeight: 600,
                    }}
                    title="Copy demo email"
                  >
                    {copiedField === "email" ? (
                      <>
                        <Check size={12} /> Copied
                      </>
                    ) : (
                      <>
                        <Copy size={12} /> Copy
                      </>
                    )}
                  </button>
                </div>
                <span
                  style={{
                    fontFamily: "var(--font-mono, monospace)",
                    fontSize: 11.5,
                    fontWeight: 600,
                    color: "var(--oxford-navy)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                  title={demoInfo.email}
                >
                  {demoInfo.email}
                </span>
              </div>

              {/* Password Box */}
              <div
                style={{
                  backgroundColor: "var(--honeydew)",
                  border: "1px solid rgba(168, 218, 220, 0.6)",
                  borderRadius: 10,
                  padding: "8px 10px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 3,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                    Password
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(demoInfo.password, "password")}
                    style={{
                      background: "none",
                      border: "none",
                      color: copiedField === "password" ? "#16A34A" : "var(--cerulean)",
                      cursor: "pointer",
                      padding: 2,
                      display: "flex",
                      alignItems: "center",
                      gap: 3,
                      fontSize: 10.5,
                      fontWeight: 600,
                    }}
                    title="Copy demo password"
                  >
                    {copiedField === "password" ? (
                      <>
                        <Check size={12} /> Copied
                      </>
                    ) : (
                      <>
                        <Copy size={12} /> Copy
                      </>
                    )}
                  </button>
                </div>
                <span
                  style={{
                    fontFamily: "var(--font-mono, monospace)",
                    fontSize: 11.5,
                    fontWeight: 600,
                    color: "var(--oxford-navy)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                  title={demoInfo.password}
                >
                  {demoInfo.password}
                </span>
              </div>
            </div>

            {/* 1-Click Continue as Demo Button */}
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleContinueAsDemo}
              disabled={busy || checkingBackend}
              style={{
                width: "100%",
                padding: "10px 16px",
                fontSize: 13.5,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                background: "linear-gradient(135deg, var(--cerulean) 0%, var(--oxford-navy) 100%)",
                boxShadow: "0 4px 14px rgba(69, 123, 157, 0.28)",
              }}
            >
              {demoLoggingIn ? (
                "Authenticating Demo Session..."
              ) : (
                <>
                  <span>Continue as Demo</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10, justifyContent: "center" }}>
              <Info size={12} style={{ color: "var(--text-muted)" }} />
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                Isolated sandbox workspace • Does not affect production users
              </span>
            </div>
          </motion.div>
        )}

        {/* ── Standard Authentication Form ── */}
        <form
          onSubmit={submit}
          className="card"
          style={{
            backgroundColor: "#FFFFFF",
            display: "flex",
            flexDirection: "column",
            gap: 16,
            borderRadius: 16,
            boxShadow: "0 8px 24px rgba(29, 53, 87, 0.08)",
          }}
        >
          <div>
            <h2 style={{ color: "var(--oxford-navy)", fontSize: 20, fontWeight: 800 }}>
              {registering ? "Create a new workspace" : "Sign in to workspace"}
            </h2>
            <p style={{ color: "var(--text-secondary)", marginTop: 4, fontSize: 12.5 }}>
              {registering
                ? "Create a new, separate workspace. This does not join an existing organization."
                : "Enter credentials to access your organization workspace."}
            </p>
          </div>

          {registering && (
            <>
              <label className="login-form-label">
                Your name
                <input
                  className="login-input"
                  autoComplete="name"
                  required
                  maxLength={200}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex Morgan"
                />
              </label>
              <label className="login-form-label">
                Organization name
                <input
                  className="login-input"
                  autoComplete="organization"
                  required
                  maxLength={200}
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  placeholder="e.g. Acme Corp"
                />
              </label>
            </>
          )}

          <label className="login-form-label">
            Work Email
            <input
              className="login-input"
              type="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              required
              maxLength={200}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@organization.com"
            />
          </label>

          <label className="login-form-label">
            Password
            <span className="login-password-control">
              <input
                className="login-input"
                type={showPassword ? "text" : "password"}
                autoComplete={registering ? "new-password" : "current-password"}
                required
                minLength={registering ? 12 : 1}
                maxLength={256}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
              />
              <button
                type="button"
                className="login-password-toggle"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </span>
          </label>

          {registering && (
            <label className="login-form-label">
              Confirm password
              <input
                className="login-input"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                minLength={12}
                maxLength={256}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••••"
              />
            </label>
          )}

          <AnimatePresence>
            {backendError && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                role="alert"
                className="login-error"
                style={{ display: "flex", alignItems: "center", gap: 6 }}
              >
                <AlertCircle size={15} style={{ flexShrink: 0 }} />
                <span>{backendError}</span>
              </motion.div>
            )}

            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                role="alert"
                className="login-error"
                style={{ display: "flex", alignItems: "center", gap: 6 }}
              >
                <AlertCircle size={15} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </motion.div>
            )}

            {successMessage && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  color: "#166534",
                  backgroundColor: "#DCFCE7",
                  border: "1px solid #BBF7D0",
                  padding: "10px 12px",
                  borderRadius: 8,
                  fontSize: 12.5,
                  fontWeight: 600,
                }}
              >
                <CheckCircle2 size={15} style={{ flexShrink: 0 }} />
                <span>{successMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            className="btn btn-primary"
            type="submit"
            disabled={busy || checkingBackend || !!backendError}
            style={{ width: "100%", padding: "10px 16px" }}
          >
            {checkingBackend
              ? "Checking authentication service..."
              : busy && !demoLoggingIn
              ? "Please wait..."
              : registering
              ? "Create workspace"
              : "Sign in"}
          </button>

          <button
            className="btn"
            type="button"
            onClick={() => {
              setRegistering(!registering);
              setError("");
              setSuccessMessage("");
            }}
            style={{ fontSize: 13 }}
          >
            {registering ? "Already have an account? Sign in" : "New to BrandGuard? Create an organization"}
          </button>

          {!registering && (
            <p style={{ color: "var(--text-muted)", fontSize: 11.5, textAlign: "center", margin: 0 }}>
              Need a password reset? Contact your workspace administrator.
            </p>
          )}
        </form>
      </div>
    </main>
  );
}
