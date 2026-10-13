"use client";

import { useState, type FormEvent } from "react";

type Status = { kind: "idle" | "loading" | "sent" | "error"; message: string };

export function SignInForm({ next, initialError }: { next: string; initialError?: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>(initialError ? { kind: "error", message: errorMessage(initialError) } : { kind: "idle", message: "" });

  async function submit(provider: "email" | "github" | "google", event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const providerName = provider === "google" ? "Google" : "GitHub";
    setStatus({ kind: "loading", message: provider === "email" ? "Sending your sign-in link…" : `Connecting to ${providerName}…` });
    try {
      const response = await fetch("/auth/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(provider === "email" ? { provider, email, next } : { provider, next }),
      });
      const result = await response.json() as { sent?: boolean; url?: string; message?: string; error?: string };
      if (!response.ok) {
        setStatus({ kind: "error", message: result.message ?? errorMessage(result.error) });
        return;
      }
      if ((provider === "github" || provider === "google") && result.url) {
        window.location.assign(result.url);
        return;
      }
      if (provider === "email" && result.sent) {
        setStatus({ kind: "sent", message: `If ${email} can receive mail, a sign-in link is on its way. Check your inbox.` });
        return;
      }
      setStatus({ kind: "error", message: "Sign-in could not be started. Please try again." });
    } catch {
      setStatus({ kind: "error", message: "We could not reach the sign-in service. Please try again." });
    }
  }

  return <div className="sign-in-form-wrap">
    <div className="oauth-sign-in-options">
      <button className="oauth-sign-in" type="button" disabled={status.kind === "loading"} onClick={() => void submit("google")}>Continue with Google <span aria-hidden="true">↗</span></button>
      <button className="oauth-sign-in github-sign-in" type="button" disabled={status.kind === "loading"} onClick={() => void submit("github")}>Continue with GitHub <span aria-hidden="true">↗</span></button>
    </div>
    <div className="sign-in-divider"><span>OR USE EMAIL</span></div>
    <form className="email-sign-in" onSubmit={(event) => void submit("email", event)}>
      <label htmlFor="sign-in-email">Email address</label>
      <input id="sign-in-email" name="email" type="email" autoComplete="email" autoCapitalize="none" required maxLength={320} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" disabled={status.kind === "loading"} />
      <button className="button-primary sign-in-submit" type="submit" disabled={status.kind === "loading" || !email.trim()}>{status.kind === "loading" ? "Please wait…" : "Email me a sign-in link"}<span aria-hidden="true">→</span></button>
    </form>
    <div className={`sign-in-status sign-in-status-${status.kind}`} aria-live="polite" role={status.kind === "error" ? "alert" : "status"}>{status.message}</div>
    <p className="sign-in-privacy">We use your account to sync learning progress. Reading and interactive previews remain open to guests.</p>
  </div>;
}

function errorMessage(error?: string) {
  if (error === "setup_required") return "Sign-in is not configured on this deployment yet. You can continue learning as a guest.";
  if (error === "missing_code" || error === "callback_failed") return "That sign-in link could not be completed. Request a fresh link or try GitHub again.";
  return "Sign-in is temporarily unavailable. Please try again, or continue as a guest.";
}
