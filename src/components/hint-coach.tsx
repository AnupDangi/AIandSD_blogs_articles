"use client";

import Link from "next/link";
import { useState } from "react";

type Hint = { id: string; level: number; text: string; followUp?: string };

export function HintCoach({ lessonId, sectionId, courseVersion, returnPath }: { lessonId: string; sectionId: string; courseVersion?: number; returnPath: string }) {
  const [observation, setObservation] = useState("");
  const [hints, setHints] = useState<Hint[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "complete" | "error" | "unauthorized" | "setup">("idle");
  const [message, setMessage] = useState("");

  async function requestHint() {
    const idempotencyStorageKey = `learnlikeadev:tutor:${courseVersion ?? "latest"}:${sectionId}:pending-request`;
    let idempotencyKey = sessionStorage.getItem(idempotencyStorageKey);
    if (!idempotencyKey) {
      idempotencyKey = crypto.randomUUID();
      sessionStorage.setItem(idempotencyStorageKey, idempotencyKey);
    }
    setStatus("loading");
    setMessage("Choosing a reviewed hint…");
    try {
      const response = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idempotencyKey, lessonId, sectionId, ...(courseVersion ? { courseVersion } : {}), ...(observation.trim() ? { observation: observation.trim() } : {}) }),
      });
      const payload = await response.json() as { hint?: Hint; message?: string; error?: string; pending?: boolean };
      if (response.status < 500 && !payload.pending) sessionStorage.removeItem(idempotencyStorageKey);
      if (payload.pending) { setStatus("error"); setMessage(payload.message ?? "This hint request is still processing. Retry shortly to receive its saved result."); return; }
      if (response.status === 401) { setStatus("unauthorized"); setMessage("Sign in to use the hint coach. You can keep reading as a guest."); return; }
      if (response.status === 503 && payload.error === "setup_required") { setStatus("setup"); setMessage("Hint coaching is not configured on this deployment. The lesson and lab are still available."); return; }
      if (response.status === 404) { setStatus("error"); setMessage("Reviewed hints for this chapter are not published yet."); return; }
      if (!response.ok) { setStatus("error"); setMessage(payload.message ?? "The hint service is unavailable. Try again in a moment."); return; }
      if (!payload.hint) { setStatus("complete"); setMessage(payload.message ?? "You have reached the end of the reviewed hints for this task."); return; }
      setHints((current) => [...current, payload.hint!]);
      setStatus("idle");
      setMessage("");
    } catch {
      setStatus("error");
      setMessage("We could not reach the hint service. Try again to request another authored hint.");
    }
  }

  const signInHref = `/sign-in?next=${encodeURIComponent(returnPath)}`;
  return <section className="hint-coach" aria-labelledby="hint-coach-heading">
    <div className="hint-coach-heading"><span className="hint-icon" aria-hidden="true">✳</span><div><span className="eyebrow">A LITTLE NUDGE</span><h2 id="hint-coach-heading">Hint coach</h2></div><span className="hint-level-count">{hints.length} / 3</span></div>
    <p className="hint-coach-intro">Get one reviewed clue at a time. Hints point you toward an experiment without giving away an answer.</p>
    {hints.map((hint) => <article className="authored-hint" key={hint.id}><span className="eyebrow">HINT {hint.level}</span><p>{hint.text}</p>{hint.followUp && <small>{hint.followUp}</small>}</article>)}
    <label className="hint-observation-label" htmlFor={`hint-observation-${sectionId}`}>What are you unsure about? <span>Optional</span></label>
    <textarea id={`hint-observation-${sectionId}`} value={observation} onChange={(event) => setObservation(event.target.value.slice(0, 1200))} maxLength={1200} rows={2} placeholder="Describe what you tried or what seems confusing…" disabled={status === "loading" || status === "complete"}/>
    {message && status !== "setup" && <div className={`hint-coach-status hint-status-${status}`} role={status === "error" || status === "unauthorized" ? "alert" : "status"} aria-live="polite">{message}{status === "unauthorized" && <Link href={signInHref}>Sign in <span>↗</span></Link>}</div>}
    {status === "setup" && <div className="hint-coach-status hint-status-setup" role="status">{message}<Link href="/courses">Continue learning as a guest <span>→</span></Link></div>}
    <button className="hint-request-button" type="button" onClick={() => void requestHint()} disabled={status === "loading" || status === "complete" || hints.length >= 3}>{status === "loading" ? "Finding a clue…" : hints.length >= 3 || status === "complete" ? "No more hints" : hints.length ? "Show next hint" : "Ask for a hint"}<span aria-hidden="true">{status === "loading" ? "…" : "→"}</span></button>
    <small className="hint-coach-footnote">Reviewed hints only · the coach never receives answer keys or reference solutions.</small>
  </section>;
}
