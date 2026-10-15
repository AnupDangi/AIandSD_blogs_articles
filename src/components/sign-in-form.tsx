"use client";

import { useState, useSyncExternalStore, type FormEvent } from "react";
import { callbackErrorMessage } from "@/lib/auth-errors";
import { ArrowRight, ArrowUpRight, GithubLogo, GoogleLogo } from "@/components/icons";

type Status = { kind: "idle" | "loading" | "sent" | "error"; message: string };

export function SignInForm({ next, initialError, canonicalOrigin }: { next: string; initialError?: string; canonicalOrigin?: string }) {
  const currentOrigin = useSyncExternalStore(subscribeNever, () => window.location.origin, () => "");
  const wrongOrigin = canonicalOrigin && currentOrigin && currentOrigin !== canonicalOrigin ? canonicalOrigin : null;
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
        setStatus({ kind: "sent", message: `If ${email} can receive mail, a sign-in link is on its way. Open it in this same browser. New accounts are created automatically the first time you sign in.` });
        return;
      }
      setStatus({ kind: "error", message: "Sign-in could not be started. Please try again." });
    } catch {
      setStatus({ kind: "error", message: "We could not reach the sign-in service. Please try again." });
    }
  }

  return <div className="sign-in-form-wrap">
    {wrongOrigin && <div className="sign-in-status sign-in-status-error" role="alert">Sign-in only works at <a href={`${wrongOrigin}/sign-in?next=${encodeURIComponent(next)}`}>{wrongOrigin}</a>. You opened this page at {currentOrigin}, so the sign-in cookie and redirect would not match.</div>}
    <div className="oauth-sign-in-options">
      <button className="oauth-sign-in" type="button" disabled={status.kind === "loading"} onClick={() => void submit("google")}><GoogleLogo />Continue with Google<ArrowUpRight /></button>
      <button className="oauth-sign-in github-sign-in" type="button" disabled={status.kind === "loading"} onClick={() => void submit("github")}><GithubLogo />Continue with GitHub<ArrowUpRight /></button>
    </div>
    <div className="sign-in-divider"><span>or use email</span></div>
    <form className="email-sign-in" onSubmit={(event) => void submit("email", event)}>
      <label htmlFor="sign-in-email">Email address</label>
      <input id="sign-in-email" name="email" type="email" autoComplete="email" autoCapitalize="none" required maxLength={320} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" disabled={status.kind === "loading"} />
      <button className="button-primary sign-in-submit" type="submit" disabled={status.kind === "loading" || !email.trim()}>{status.kind === "loading" ? "Please wait…" : "Email me a sign-in link"}{status.kind !== "loading" && <ArrowRight />}</button>
    </form>
    <div className={`sign-in-status sign-in-status-${status.kind}`} aria-live="polite" role={status.kind === "error" ? "alert" : "status"}>{status.message}</div>
    <p className="sign-in-privacy">We use your account to sync learning progress. Reading and interactive previews remain open to guests.</p>
  </div>;
}

const subscribeNever = () => () => {};
function errorMessage(error?: string) { return callbackErrorMessage(error); }
