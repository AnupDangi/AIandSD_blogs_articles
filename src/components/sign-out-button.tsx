"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SignOutButton() {
  const router = useRouter();
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    setStatus("Signing out…");
    try {
      const response = await fetch("/auth/sign-out", { method: "POST" });
      if (!response.ok) {
        setStatus("Sign out is unavailable. Please reload and try again.");
        setBusy(false);
        return;
      }
      router.replace("/courses");
      router.refresh();
    } catch {
      setStatus("We could not reach the sign-out service. Please try again.");
      setBusy(false);
    }
  }

  return <div className="settings-signout"><button className="button-secondary" type="button" onClick={() => void signOut()} disabled={busy}>{busy ? "Signing out…" : "Sign out"}</button><span aria-live="polite" role="status">{status}</span></div>;
}
