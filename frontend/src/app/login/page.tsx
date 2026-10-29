"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { errMsg } from "@/lib/ui";
import { Eye, EyeOff } from "lucide-react";

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
  const [busy, setBusy] = useState(false);
  const [checkingBackend, setCheckingBackend] = useState(true);
  const [backendError, setBackendError] = useState("");

  useEffect(() => {
    let active = true;
    api.authStatus().then(
      (status) => {
        if (active && (!status.authentication_enabled || (registering && !status.registration_enabled))) {
          setBackendError("Authentication or registration is disabled on this server.");
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

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (registering && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      if (registering) {
        await api.register(name, email, password, organization);
      } else {
        await api.login(email, password);
      }
      router.replace("/");
    } catch (reason) {
      const message = errMsg(reason);
      setError(message);
      if (registering && reason instanceof ApiError && reason.status === 409) {
        setError(`${message} Try signing in with this email instead.`);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "var(--honeydew)" }}>
      <form onSubmit={submit} className="card" style={{ width: "min(100%, 440px)", display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <h1 style={{ color: "var(--oxford-navy)", fontSize: 26, fontWeight: 800 }}>
            {registering ? "Create a new workspace" : "Sign in to BrandGuard"}
          </h1>
          <p style={{ color: "var(--text-secondary)", marginTop: 6 }}>
            {registering
              ? "Create a new, separate workspace. This does not join an existing organization."
              : "Use your work email and password to access your organization."}
          </p>
        </div>
        {registering && (
          <>
            <label className="login-form-label">Your name
              <input className="login-input" autoComplete="name" required maxLength={200} value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="login-form-label">Organization
              <input className="login-input" autoComplete="organization" required maxLength={200} value={organization} onChange={(e) => setOrganization(e.target.value)} />
            </label>
          </>
        )}
        <label className="login-form-label">Email
          <input className="login-input" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} required maxLength={200} value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="login-form-label">Password
          <span className="login-password-control">
            <input className="login-input" type={showPassword ? "text" : "password"} autoComplete={registering ? "new-password" : "current-password"} required minLength={registering ? 12 : 1} maxLength={256} value={password} onChange={(e) => setPassword(e.target.value)} />
            <button type="button" className="login-password-toggle" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Hide password" : "Show password"}>
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </span>
        </label>
        {registering && (
          <label className="login-form-label">Confirm password
            <input className="login-input" type={showPassword ? "text" : "password"} autoComplete="new-password" required minLength={12} maxLength={256} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </label>
        )}
        {backendError && <p role="alert" className="login-error">{backendError}</p>}
        {error && <p role="alert" className="login-error">{error}</p>}
        <button className="btn btn-primary" type="submit" disabled={busy || checkingBackend || !!backendError}>
          {checkingBackend ? "Checking authentication service..." : busy ? "Please wait..." : registering ? "Create workspace" : "Sign in"}
        </button>
        <button className="btn" type="button" onClick={() => { setRegistering(!registering); setError(""); }}>
          {registering ? "Already have an account? Sign in" : "New to BrandGuard? Create an organization"}
        </button>
        {!registering && <p style={{ color: "var(--text-muted)", fontSize: 12, textAlign: "center" }}>Need a password reset? Contact your workspace administrator.</p>}
      </form>
    </main>
  );
}
