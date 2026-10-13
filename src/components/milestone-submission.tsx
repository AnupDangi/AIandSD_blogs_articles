"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { projectMilestones } from "@/content/project-milestones";

const milestones = projectMilestones;

type SubmissionResponse = { submission?: { id: string; repositoryUrl: string; submittedAt: string; status: string }; error?: string; message?: string };
type SubmissionState = { kind: "idle" | "submitting" | "submitted" | "unauthorized" | "setup" | "unavailable"; message?: string; result?: SubmissionResponse["submission"] };
type EnrollmentVersions = {
  enrollments?: { courseVersion?: { courseId?: string; version?: number } }[];
  submissions?: { courseVersion?: { courseId?: string; version?: number } }[];
  submittedProjectVersions?: { courseId?: string; version?: number }[];
};

export function MilestoneSubmission({ courseId, courseVersion }: { courseId: string; courseVersion: number }) {
  const [milestoneId, setMilestoneId] = useState<(typeof milestones)[number]["id"]>(milestones[0].id);
  const [selectedVersion, setSelectedVersion] = useState(courseVersion);
  const [availableVersions, setAvailableVersions] = useState([courseVersion]);
  const milestone = milestones.find((item) => item.id === milestoneId)!;
  const [repositoryUrl, setRepositoryUrl] = useState("");
  const [commitSha, setCommitSha] = useState("");
  const [checked, setChecked] = useState<string[]>([]);
  const [reflection, setReflection] = useState("");
  const [submissionKey, setSubmissionKey] = useState<string | null>(null);
  const [state, setState] = useState<SubmissionState>({ kind: "idle" });
  const signInHref = useMemo(() => `/sign-in?next=${encodeURIComponent("/projects")}`, []);
  const storageKey = `learnlikeadev:submission:${courseId}:${selectedVersion}:${milestoneId}`;

  useEffect(() => {
    let active = true;
    fetch("/api/me/learning", { cache: "no-store" })
      .then(async (response) => response.ok ? await response.json() as EnrollmentVersions : null)
      .then((data) => {
        if (!active || !data?.enrollments) return;
        const knownVersions = [
          ...(data.enrollments ?? []).map((record) => record.courseVersion),
          ...(data.submissions ?? []).map((record) => record.courseVersion),
          ...(data.submittedProjectVersions ?? []),
        ].flatMap((version) => version?.courseId === courseId && Number.isInteger(version.version) ? [version.version as number] : []);
        setAvailableVersions([...new Set([courseVersion, ...knownVersions])].sort((a, b) => b - a));
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [courseId, courseVersion]);

  function startNewSubmission() {
    setSubmissionKey(null);
    setState({ kind: "idle" });
    try { sessionStorage.removeItem(storageKey); } catch { /* storage may be unavailable */ }
  }

  function changeMilestone(value: (typeof milestones)[number]["id"]) {
    setMilestoneId(value);
    setChecked([]);
    startNewSubmission();
  }

  function changeCourseVersion(value: number) {
    startNewSubmission();
    setSelectedVersion(value);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submission = {
      courseId,
      courseVersion: selectedVersion,
      repositoryUrl: repositoryUrl.trim(),
      ...(commitSha.trim() ? { commitSha: commitSha.trim() } : {}),
      checklist: milestone.checklist.map((item, index) => ({ itemId: `${milestone.id}-item-${index + 1}`, completed: checked.includes(`${milestone.id}-item-${index + 1}`) })),
      reflection: reflection.trim(),
    };
    const fingerprint = JSON.stringify(submission);
    let key = submissionKey;
    try {
      const saved = sessionStorage.getItem(storageKey);
      const record = saved ? JSON.parse(saved) as { key?: string; fingerprint?: string } : null;
      if (record?.fingerprint === fingerprint && record.key) key = record.key;
    } catch { /* generate a fresh key when session storage is unavailable */ }
    key ??= createIdempotencyKey();
    setSubmissionKey(key);
    try { sessionStorage.setItem(storageKey, JSON.stringify({ key, fingerprint })); } catch { /* in-memory retry still uses the same key */ }
    setState({ kind: "submitting", message: "Sending your submission…" });
    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(milestone.id)}/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idempotencyKey: key, ...submission }),
      });
      const result = await response.json() as SubmissionResponse;
      if (response.status === 401) {
        setState({ kind: "unauthorized", message: "Sign in to attach this submission to your learning record." });
        return;
      }
      if (response.status === 503 && result.error === "setup_required") {
        setState({ kind: "setup", message: "Submission storage is not configured on this deployment yet." });
        return;
      }
      if (response.status === 404 && result.error === "project_not_found") {
        setState({ kind: "unavailable", message: "This milestone is not published for submissions yet. You can still browse and build the project as a guest." });
        return;
      }
      if (!response.ok || !result.submission) {
        setState({ kind: "unavailable", message: result.message ?? "We could not submit this milestone right now. Retry to safely check the same submission." });
        return;
      }
      setState({ kind: "submitted", result: result.submission, message: "Your milestone was submitted—self-reported." });
      try { sessionStorage.removeItem(storageKey); } catch { /* submission is already recorded */ }
    } catch {
      setState({ kind: "unavailable", message: "We could not reach the submission service. Retry to safely check the same submission." });
    }
  }

  function updateRepository(value: string) { setRepositoryUrl(value); startNewSubmission(); }
  function updateSha(value: string) { setCommitSha(value); startNewSubmission(); }
  function updateReflection(value: string) { setReflection(value); startNewSubmission(); }
  function toggleChecklist(itemId: string) {
    setChecked((current) => current.includes(itemId) ? current.filter((item) => item !== itemId) : [...current, itemId]);
    startNewSubmission();
  }

  return <section className="submission-section" aria-labelledby="submission-heading">
    <div className="submission-heading"><div><span className="eyebrow">SAVE YOUR WORK</span><h2 id="submission-heading">Submit a milestone</h2><p>Share your repository and what you learned. We store the link and your reflection; we do not fetch or run your code.</p></div><span className="submission-status-tag">{state.kind === "submitted" ? "SUBMITTED" : "SELF-REPORTED"}</span></div>
    <form className="submission-form" onSubmit={(event) => void submit(event)}>
      <label className="submission-field"><span>Project milestone</span><select value={milestoneId} onChange={(event) => changeMilestone(event.target.value as (typeof milestones)[number]["id"])} disabled={state.kind === "submitting"}><option value="">Choose a milestone</option>{milestones.map((item) => <option value={item.id} key={item.id}>{item.id.slice(-2)} · {item.title}</option>)}</select></label>
      <label className="submission-field"><span>Course version</span><select value={selectedVersion} onChange={(event) => changeCourseVersion(Number(event.target.value))} disabled={state.kind === "submitting"}>{availableVersions.map((version) => <option value={version} key={version}>Version {version}{version === courseVersion ? " · current" : " · enrolled"}</option>)}</select></label>
      <label className="submission-field"><span>GitHub repository URL <b>Required</b></span><input type="url" required inputMode="url" autoComplete="url" placeholder="https://github.com/you/document-intelligence" pattern="https://github\.com/[^/]+/[^/?#]+" value={repositoryUrl} onChange={(event) => updateRepository(event.target.value)} disabled={state.kind === "submitting"} aria-describedby="github-url-help"/><small id="github-url-help">Use an HTTPS link to a public or private GitHub repository, e.g. https://github.com/owner/repo</small></label>
      <label className="submission-field"><span>Commit SHA <small>Optional</small></span><input type="text" autoComplete="off" placeholder="7–64 character commit hash" pattern="[a-fA-F0-9]{7,64}" maxLength={64} value={commitSha} onChange={(event) => updateSha(event.target.value)} disabled={state.kind === "submitting"}/></label>
      <fieldset className="submission-checklist"><legend>Milestone checklist <small>Select the work you completed</small></legend>{milestone.checklist.map((item, index) => { const itemId = `${milestone.id}-item-${index + 1}`; return <label key={itemId}><input type="checkbox" checked={checked.includes(itemId)} onChange={() => toggleChecklist(itemId)} disabled={state.kind === "submitting"}/><span>{item}</span></label>; })}</fieldset>
      <label className="submission-field"><span>Reflection <b>Required</b></span><textarea required minLength={10} maxLength={4000} rows={4} placeholder="What did you build, what surprised you, and what would you improve next?" value={reflection} onChange={(event) => updateReflection(event.target.value)} disabled={state.kind === "submitting"}/><small>{reflection.length}/4000 characters · at least 10</small></label>
      <div className="submission-disclosure"><strong>Submission status: submitted—self-reported.</strong> A saved link does not verify code ownership, successful execution, or mastery.</div>
      <button className="button-primary submission-submit" type="submit" disabled={state.kind === "submitting" || state.kind === "submitted"}>{state.kind === "submitting" ? "Submitting…" : state.kind === "submitted" ? "Milestone submitted" : "Submit milestone"}<span aria-hidden="true">→</span></button>
      {state.message && <div className={`submission-feedback submission-feedback-${state.kind}`} role={state.kind === "unauthorized" || state.kind === "unavailable" || state.kind === "setup" ? "alert" : "status"} aria-live="polite"><p>{state.message}</p>{state.kind === "unauthorized" && <Link href={signInHref}>Sign in to continue <span>↗</span></Link>}{state.kind === "setup" && <Link href="/courses">Keep browsing the course <span>→</span></Link>}{state.kind === "unavailable" && <button type="button" onClick={() => setState({ kind: "idle" })}>Retry submission</button>}{state.kind === "submitted" && state.result && <><span>{state.result.repositoryUrl}</span><small>Submitted {new Date(state.result.submittedAt).toLocaleString()}</small><button type="button" onClick={startNewSubmission}>Submit another revision</button></>}</div>}
    </form>
  </section>;
}

function createIdempotencyKey() {
  return crypto.randomUUID();
}
