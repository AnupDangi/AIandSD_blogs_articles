"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { courses, lessons } from "@/content/catalog";
import { parseQuestionSnapshots, type SnapshotQuestion } from "@/lib/assessment-contract";

type AttemptPayload = {
  attemptId?: string;
  status?: string;
  assessment?: { id: string; title: string; version: number };
  questions?: unknown;
  responses?: unknown;
  error?: string;
  message?: string;
};
type SubmitResult = { attemptId?: string; scorePercent?: number | null; passed?: boolean | null; submittedAt?: string; remediationTopics?: string[]; remediationFeedback?: Array<{ topicId: string; text: string }>; error?: string; message?: string };
type State = "starting" | "in-progress" | "submitting" | "submitted" | "already-submitted" | "unauthorized" | "unavailable";
type DraftSaveState = "saved" | "saving" | "error";

const PASS_PERCENT = 80;

export function AssessmentRunner({ assessmentId, courseId, courseVersion, resumeAttemptId }: { assessmentId: string; courseId: string; courseVersion?: number; resumeAttemptId?: string }) {
  const router = useRouter();
  const keyStorage = `learnlikeadev:assessment:${courseId}:${courseVersion ?? "latest"}:${assessmentId}:idempotency-key`;
  const [attemptKey, setAttemptKey] = useState<string | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(resumeAttemptId ?? null);
  const [serverQuestions, setServerQuestions] = useState<SnapshotQuestion[]>([]);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const responsesRef = useRef<Record<string, string>>({});
  const dirtyResponsesRef = useRef(new Map<string, string>());
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const attemptGenerationRef = useRef(0);
  const draftConflictRef = useRef(false);
  const submittedAttemptIdRef = useRef<string | null>(null);
  const [draftSaveState, setDraftSaveState] = useState<DraftSaveState>("saved");
  const [state, setState] = useState<State>("starting");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<SubmitResult | null>(null);

  const numberAnswered = Object.keys(responses).length;

  const setCurrentResponses = useCallback((next: Record<string, string>) => {
    responsesRef.current = next;
    setResponses(next);
  }, []);

  const enqueueDraftSave = useCallback((forAttemptId: string) => {
    const generation = attemptGenerationRef.current;
    setDraftSaveState("saving");
    draftConflictRef.current = false;
    const save = saveQueueRef.current.catch(() => undefined).then(async () => {
      for (const [questionKey, choiceId] of dirtyResponsesRef.current) {
        if (attemptGenerationRef.current !== generation) return;
        const response = await fetch(`/api/attempts/${encodeURIComponent(forAttemptId)}/responses`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ questionKey, choiceId }),
        });
        if (attemptGenerationRef.current !== generation) return;
        if (response.status === 409) {
          const payload = await response.json().catch(() => ({})) as { error?: string };
          if (payload.error === "attempt_already_submitted") throw new Error("attempt_already_submitted");
          throw new Error("response_save_failed");
        }
        if (!response.ok) throw new Error("response_save_failed");
        if (dirtyResponsesRef.current.get(questionKey) === choiceId) dirtyResponsesRef.current.delete(questionKey);
      }
    });
    saveQueueRef.current = save;
    void save.then(() => {
      if (attemptGenerationRef.current !== generation) return;
      if (submittedAttemptIdRef.current === forAttemptId) return;
      setDraftSaveState(dirtyResponsesRef.current.size ? "saving" : "saved");
    }).catch((error: unknown) => {
      if (attemptGenerationRef.current !== generation) return;
      if (submittedAttemptIdRef.current === forAttemptId) return;
      draftConflictRef.current = error instanceof Error && error.message === "attempt_already_submitted";
      setDraftSaveState("error");
    });
  }, []);

  const openAttempt = useCallback(async (payload: AttemptPayload, localResponses: unknown = {}) => {
    attemptGenerationRef.current += 1;
    const questions = parseQuestionSnapshots(payload.questions);
    if (!payload.attemptId || !questions) {
      setState("unavailable");
      setMessage(payload.message ?? assessmentError(payload.error));
      return;
    }
    setAttemptId(payload.attemptId);
    setServerQuestions(questions);
    setResult(null);
    if (payload.status === "submitted") {
      submittedAttemptIdRef.current = payload.attemptId;
      dirtyResponsesRef.current.clear();
      setDraftSaveState("saved");
      const recovered = await recoverSubmittedResult(payload.attemptId, validResponses(questions, payload.responses));
      if (recovered?.remediationTopics && recovered.remediationFeedback && typeof recovered.scorePercent === "number") {
        setResult(recovered);
        setState("submitted");
        setMessage("");
        removeStoredValue(keyStorage);
        removeStoredValue(responseStorageKey(payload.attemptId));
        setAttemptKey(null);
      } else {
        setState("already-submitted");
        setMessage("This attempt was already submitted. Start another attempt to take the assessment again.");
      }
      return;
    }

    const savedResponses = validResponses(questions, payload.responses);
    submittedAttemptIdRef.current = null;
    draftConflictRef.current = false;
    const cachedResponses = validResponses(questions, localResponses);
    const mergedResponses = { ...cachedResponses, ...savedResponses };
    setCurrentResponses(mergedResponses);
    dirtyResponsesRef.current.clear();
    for (const [questionKey, choiceId] of Object.entries(cachedResponses)) {
      if (!Object.hasOwn(savedResponses, questionKey)) dirtyResponsesRef.current.set(questionKey, choiceId);
    }
    setDraftSaveState(dirtyResponsesRef.current.size ? "saving" : "saved");
    setState("in-progress");
    setMessage("");
    if (dirtyResponsesRef.current.size) enqueueDraftSave(payload.attemptId);
  }, [enqueueDraftSave, keyStorage, setCurrentResponses]);

  const loadAttempt = useCallback(async (id: string) => {
    attemptGenerationRef.current += 1;
    setState("starting");
    setMessage("Loading your saved assessment…");
    setResult(null);
    try {
      const response = await fetch(`/api/attempts/${encodeURIComponent(id)}`, { cache: "no-store" });
      const payload = await response.json() as AttemptPayload;
      if (response.status === 401) { setState("unauthorized"); setMessage("Sign in to resume this assessment attempt."); return; }
      if (response.status === 503) { setState("unavailable"); setMessage(payload.message ?? "Assessment storage is not configured yet."); return; }
      if (!response.ok) { setState("unavailable"); setMessage(assessmentError(payload.error)); return; }
      if (payload.assessment?.id !== assessmentId) { setState("unavailable"); setMessage("This saved attempt belongs to a different assessment."); return; }
      await openAttempt(payload, readStoredResponses(responseStorageKey(id)));
    } catch {
      setState("unavailable");
      setMessage("We could not reach the assessment service. Retry to load this saved attempt.");
    }
  }, [assessmentId, openAttempt]);

  const startAttempt = useCallback(async (key: string) => {
    setAttemptKey(key);
    setState("starting");
    setMessage("Opening your assessment…");
    setResult(null);
    try {
      const response = await fetch(`/api/assessments/${encodeURIComponent(assessmentId)}/attempts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, ...(courseVersion ? { courseVersion } : {}), idempotencyKey: key }),
      });
      const payload = await response.json() as AttemptPayload;
      if (response.status === 401) { setState("unauthorized"); setMessage("Sign in to start and save an assessment attempt."); return; }
      if (response.status === 503) { setState("unavailable"); setMessage(payload.message ?? "Assessment storage is not configured yet."); return; }
      if (!response.ok) { setState("unavailable"); setMessage(payload.message ?? assessmentError(payload.error)); return; }
      const cached = payload.attemptId ? readStoredResponses(responseStorageKey(payload.attemptId)) : {};
      await openAttempt(payload, cached);
    } catch {
      setState("unavailable");
      setMessage("We could not reach the assessment service. Retry to resume the same attempt.");
    }
  }, [assessmentId, courseId, courseVersion, openAttempt]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (resumeAttemptId) {
        void loadAttempt(resumeAttemptId);
        return;
      }
      let key = readStoredValue(keyStorage);
      if (!key) {
        key = createUuid();
        writeStoredValue(keyStorage, key);
      }
      void startAttempt(key);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [keyStorage, loadAttempt, resumeAttemptId, startAttempt]);

  function choose(questionKey: string, choiceId: string) {
    const next = { ...responsesRef.current, [questionKey]: choiceId };
    setCurrentResponses(next);
    if (attemptId) {
      writeStoredValue(responseStorageKey(attemptId), JSON.stringify(next));
      dirtyResponsesRef.current.set(questionKey, choiceId);
      enqueueDraftSave(attemptId);
    }
  }

  async function submit() {
    if (!attemptId || serverQuestions.length === 0 || Object.keys(responses).length !== serverQuestions.length || draftSaveState !== "saved") return;
    setState("submitting");
    setMessage("Grading your saved answers…");
    try {
      const response = await fetch(`/api/attempts/${encodeURIComponent(attemptId)}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expectedResponses: responsesRef.current }),
      });
      const payload = await response.json() as SubmitResult;
      if (response.status === 409 && payload.error === "responses_changed") {
        await loadAttempt(attemptId);
        setMessage("Answers changed in another tab. We reloaded the saved choices; review them before submitting again.");
        return;
      }
      if (response.status === 401) { setState("unauthorized"); setMessage("Your sign-in expired. Sign in again to submit this attempt."); return; }
      if (response.status === 503) { setState("unavailable"); setMessage(payload.message ?? "Assessment storage is not configured yet."); return; }
      if (!response.ok || typeof payload.scorePercent !== "number" || !Array.isArray(payload.remediationTopics) || !Array.isArray(payload.remediationFeedback)) { setState("unavailable"); setMessage(payload.message ?? assessmentError(payload.error)); return; }
      setResult(payload);
      setState("submitted");
      setMessage("");
      removeStoredValue(keyStorage);
      removeStoredValue(responseStorageKey(attemptId));
      setAttemptKey(null);
    } catch {
      setState("unavailable");
      setMessage("We could not reach the grading service. Retry the submission; the attempt is idempotent.");
    }
  }

  function newAttempt() {
    attemptGenerationRef.current += 1;
    submittedAttemptIdRef.current = null;
    draftConflictRef.current = false;
    const key = createUuid();
    writeStoredValue(keyStorage, key);
    setAttemptKey(key);
    setAttemptId(null);
    setServerQuestions([]);
    dirtyResponsesRef.current.clear();
    saveQueueRef.current = Promise.resolve();
    setDraftSaveState("saved");
    setCurrentResponses({});
    setResult(null);
    if (resumeAttemptId) {
      router.replace(`/assessments/${encodeURIComponent(assessmentId)}${courseVersion ? `?version=${courseVersion}` : ""}`, { scroll: false });
      return;
    }
    void startAttempt(key);
  }

  function retry() {
    if (draftSaveState === "error" && attemptId) {
      if (draftConflictRef.current) void loadAttempt(attemptId);
      else enqueueDraftSave(attemptId);
      return;
    }
    if (attemptId) void loadAttempt(attemptId);
    else if (attemptKey) void startAttempt(attemptKey);
  }

  const title = assessmentTitle(assessmentId);
  const guestGate = state === "unauthorized" && serverQuestions.length === 0;
  const sourceLesson = lessons.find((lesson) => lesson.assessmentIds.includes(assessmentId) && assessmentId === `${lesson.id}-formative`);
  const nextPath = `/assessments/${encodeURIComponent(assessmentId)}${resumeAttemptId ? `?attemptId=${encodeURIComponent(resumeAttemptId)}` : courseVersion ? `?version=${courseVersion}` : ""}`;
  const signInHref = `/sign-in?next=${encodeURIComponent(nextPath)}`;
  return <section className="assessment-page">
    <div className="lesson-breadcrumb"><Link href="/courses">Courses</Link><span>/</span><Link href="/courses/reliable-ai-applications">Reliable AI Applications</Link>{sourceLesson && <><span>/</span><Link href={`/learn/${sourceLesson.slug}`}>{sourceLesson.title}</Link></>}<span>/</span><span>Assessment</span></div>
    <header className="assessment-header"><span className="eyebrow">{sourceLesson ? "LESSON KNOWLEDGE CHECK" : "KNOWLEDGE CHECK"} · PASSING SCORE {PASS_PERCENT}%</span><h1>{title}</h1>{!guestGate && <p>Choose one response for each question. Your score and topics to revisit appear after submission; individual answer keys stay private.</p>}</header>
    {guestGate && <section className="guest-gate assessment-gate" aria-labelledby="assessment-gate-title">
      <h2 id="assessment-gate-title">Sign up to take this knowledge check</h2>
      <p>The check is graded on the server and saved to your account. You need {PASS_PERCENT}% to pass, and the lessons to revisit appear after you submit. Reading the lessons and using the labs stays open to everyone.</p>
      <div className="guest-gate-actions"><Link className="button-primary" href={signInHref}>Sign up or sign in <span aria-hidden="true">→</span></Link>{sourceLesson && <Link className="button-secondary" href={`/learn/${sourceLesson.slug}`}>Back to the lesson</Link>}</div>
    </section>}
    {!guestGate && <div className="assessment-status" role={state === "unavailable" || state === "unauthorized" || draftSaveState === "error" ? "alert" : "status"} aria-live="polite">
      {(state === "starting" || state === "submitting") && <span className="assessment-spinner" aria-hidden="true"></span>}{message}
      {state === "unauthorized" && <Link href={signInHref}>Sign in again <span aria-hidden="true">→</span></Link>}
      {(state === "unavailable" || (draftSaveState === "error" && result === null)) && <button type="button" onClick={retry}>{draftSaveState === "error" && result === null ? "Retry saving" : "Retry"}</button>}
      {state === "already-submitted" && <button type="button" onClick={newAttempt}>Start a new attempt</button>}
      {state === "in-progress" && draftSaveState === "saving" && <span role="status">Saving your answers…</span>}
      {state === "in-progress" && draftSaveState === "saved" && numberAnswered > 0 && <span role="status">Answers saved to your account.</span>}
      {state === "in-progress" && draftSaveState === "error" && <span>Your latest answer has not been saved yet.</span>}
    </div>}
    {state === "in-progress" || state === "submitting" ? <>
      {serverQuestions.length === 0 ? <div className="assessment-unavailable">The saved question snapshot is unavailable.</div> : <>
        <div className="assessment-progress"><span>{numberAnswered} of {serverQuestions.length} answered</span><div><i style={{ width: `${serverQuestions.length ? numberAnswered / serverQuestions.length * 100 : 0}%` }}></i></div><span>Attempt in progress</span></div>
        <div className="assessment-questions">{serverQuestions.map((question, index) => <fieldset className="assessment-question" key={question.key}><legend><span>QUESTION {String(index + 1).padStart(2, "0")}</span>{question.prompt.prompt}</legend><div className="assessment-choices">{question.prompt.choices.map((choice, choiceIndex) => <label className={responses[question.key] === choice.id ? "assessment-choice-selected" : ""} key={choice.id}><input type="radio" name={question.key} value={choice.id} checked={responses[question.key] === choice.id} onChange={() => choose(question.key, choice.id)} disabled={state === "submitting"}/><span className="assessment-choice-letter">{String.fromCharCode(65 + choiceIndex)}</span><span>{choice.text}</span></label>)}</div></fieldset>)}</div>
        <div className="assessment-submit-bar"><p>Scoring and answer feedback appear only after submission.</p><button className="button-primary" type="button" onClick={() => void submit()} disabled={state === "submitting" || draftSaveState !== "saved" || numberAnswered !== serverQuestions.length}>Submit answers <span>→</span></button></div>
      </>}
    </> : null}
    {state === "submitted" && result && <section className={`assessment-result ${result.passed ? "assessment-passed" : "assessment-needs-review"}`} aria-labelledby="result-heading"><div className="assessment-result-score"><span className="eyebrow">ATTEMPT RESULT</span><strong>{result.scorePercent}%</strong><span>{result.passed ? "Passed" : `Below ${PASS_PERCENT}% — review and retry`}</span></div><div className="assessment-result-body"><h2 id="result-heading">{result.passed ? "Good work. Keep building." : "Review these lessons, then try again."}</h2><p>Passing threshold: {PASS_PERCENT}%. Your attempt is stored with its assessment version.</p><div className="remediation-list">{result.remediationTopics?.map((topicId) => { const targetLesson = lessons.find((lesson) => lesson.id === topicId); const courseModule = courses.find((course) => course.id === courseId)?.modules.find((item) => item.id === topicId || item.lessonIds.includes(topicId)); const firstLesson = targetLesson ?? courseModule?.lessonIds.map((id) => lessons.find((lesson) => lesson.id === id)).find(Boolean); const notes = result.remediationFeedback?.filter((entry) => entry.topicId === topicId) ?? []; return <article key={topicId}><span className="eyebrow">REVISIT THIS LESSON</span><strong>{targetLesson?.title ?? courseModule?.title ?? formatTopic(topicId)}</strong>{notes.map((entry, index) => <p key={`${topicId}-${index}`}>{entry.text}</p>)}{firstLesson && <Link href={`/learn/${firstLesson.slug}`}>Open lesson <span>→</span></Link>}</article>; })}</div><button className="button-primary" type="button" onClick={newAttempt}>Retry assessment <span>↻</span></button></div></section>}
  </section>;
}

function validResponses(questions: SnapshotQuestion[], input: unknown): Record<string, string> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const values = input as Record<string, unknown>;
  return Object.fromEntries(questions.flatMap((question) => {
    const value = values[question.key];
    return typeof value === "string" && question.prompt.choices.some((choice) => choice.id === value) ? [[question.key, value]] : [];
  }));
}

function responseStorageKey(attemptId: string) { return `learnlikeadev:assessment:${attemptId}:responses`; }
async function recoverSubmittedResult(attemptId: string, expectedResponses: Record<string, string>): Promise<SubmitResult | null> {
  try {
    const response = await fetch(`/api/attempts/${encodeURIComponent(attemptId)}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expectedResponses }),
    });
    if (!response.ok) return null;
    return await response.json() as SubmitResult;
  } catch { return null; }
}
function createUuid() { return crypto.randomUUID(); }
function readStoredValue(key: string): string | null { try { return localStorage.getItem(key); } catch { return null; } }
function writeStoredValue(key: string, value: string) { try { localStorage.setItem(key, value); } catch { /* Server persistence remains authoritative. */ } }
function removeStoredValue(key: string) { try { localStorage.removeItem(key); } catch { /* Storage may be unavailable. */ } }
function readStoredResponses(key: string): unknown {
  try {
    const value = readStoredValue(key);
    return value ? JSON.parse(value) as unknown : {};
  } catch { return {}; }
}
function assessmentTitle(id: string) {
  const lesson = lessons.find((item) => id === `${item.id}-formative` && item.assessmentIds.includes(id));
  if (lesson) return `${lesson.title} knowledge check`;
  return id === "final-assessment" ? "Final assessment" : `${id.replace(/-assessment$/, "").replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())} module assessment`;
}
function formatTopic(topic: string) { return topic.replace(/[-_]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function assessmentError(error?: string) {
  if (error === "assessment_not_found") return "This assessment is not published yet.";
  if (error === "attempt_not_found") return "The saved attempt is no longer available. Start a new attempt.";
  return "The assessment could not be loaded or submitted. Please try again.";
}
