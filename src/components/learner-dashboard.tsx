"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { ArrowRight, Code, WarningCircle } from "@/components/icons";
import "./learning-home.css";

export type DashboardLesson = {
  id: string; slug: string; title: string; summary: string; chapter: number;
  duration: number; moduleId: string; sections: { id: string; title: string }[];
};
export type DashboardModule = { id: string; title: string; lessonIds: string[] };

type LearningData = {
  resumeLocation: { lessonId: string; lessonSlug: string; sectionId: string; version?: number; lesson?: DashboardLesson } | null;
  progress: { contentType: string; contentId: string; state: string; updatedAt: string; courseVersion?: { courseId: string; version: number } }[];
  attempts: {
    id: string; assessmentVersion: number; status: string; scorePercent: number | null;
    passed: boolean | null; startedAt: string; submittedAt: string | null;
    assessment: { id: string; key?: string; title: string };
  }[];
  submissions: {
    id: string; projectId: string; repositoryUrl: string; commitSha: string | null;
    submittedAt: string; status: string; courseVersion?: { courseId: string; version: number };
  }[];
  weakTopics: { topicId: string; misses: number }[];
};
type LoadResult = { state: "ready"; data: LearningData } | { state: "loading" | "guest" | "setup" | "unavailable" };
type BookmarkRecord = { id: string; courseId: string; lessonId: string; sectionId: string; createdAt: string };
type HintRecord = { id: string; createdAt: string; hintId: string; hintPackId: string; taskKey: string; lesson: { id: string; slug: string; title: string } | null; section: { id: string; title: string } | null };

function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function LearnerDashboard({ guest, lessons, modules }: { guest: ReactNode; lessons: DashboardLesson[]; modules: DashboardModule[] }) {
  const [result, setResult] = useState<LoadResult>({ state: "loading" });
  const [requestNumber, setRequestNumber] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/me/learning", { cache: "no-store", signal: controller.signal })
      .then(async (response): Promise<LoadResult> => {
        if (response.status === 401) return { state: "guest" };
        if (response.status === 503) return { state: "setup" };
        if (!response.ok) return { state: "unavailable" };
        return { state: "ready", data: await response.json() as LearningData };
      })
      .catch((): LoadResult => ({ state: "unavailable" }))
      .then((next) => { if (!controller.signal.aborted) setResult(next); });
    return () => controller.abort();
  }, [requestNumber]);

  const retry = () => { setResult({ state: "loading" }); setRequestNumber((number) => number + 1); };

  if (result.state === "loading") return <section className="learning-home lh-loading" aria-busy="true" aria-label="Loading your learning">
    <div className="lh-heading"><div><h1>Your learning</h1><p role="status">Loading your saved learning records…</p></div></div>
    <div className="lh-skeleton-feature" aria-hidden="true"><div /><div /><div /></div>
    <div className="lh-skeleton-row" aria-hidden="true"><div /><div /><div /></div>
  </section>;

  if (result.state === "guest") return <>{guest}</>;

  if (result.state === "setup" || result.state === "unavailable") return <section className="learning-home">
    <div className="lh-heading"><div><h1>Your learning</h1><p>Your lessons and visual labs are still available.</p></div></div>
    <div className="lh-service-state" role="status"><span className="lh-status-symbol" aria-hidden="true"><WarningCircle /></span><div>
      <h2>{result.state === "setup" ? "Saved learning is not connected yet" : "We couldn’t load your learning records"}</h2>
      <p>{result.state === "setup" ? "Your account is signed in, but learning storage still needs to be connected. Reading and simulations remain open." : "Try again to load your progress, assessments, and project links. This page has not changed your saved records."}</p>
      <div className="lh-actions"><button className="lh-button" onClick={retry}>Try again</button><Link className="lh-text-link" href="/courses/reliable-ai-applications">Open the course map</Link></div>
    </div></div>
  </section>;

  if (result.state !== "ready") return null;
  const data = result.data;
  const completedIds = new Set(data.progress.filter((item) => item.contentType === "lesson" && item.state === "completed" && lessons.some((lesson) => lesson.id === item.contentId)).map((item) => item.contentId));
  const sectionsRead = new Set(data.progress.filter((item) => item.contentType === "section" && item.state === "completed" && lessons.some((lesson) => lesson.sections.some((section) => section.id === item.contentId))).map((item) => item.contentId)).size;
  const location = data.resumeLocation;
  const resumeLesson = location?.lesson ?? (location && lessons.find((lesson) => lesson.id === location.lessonId && lesson.slug === location.lessonSlug && lesson.sections.some((section) => section.id === location.sectionId)));
  const activeLesson = resumeLesson || lessons[0];
  const resumeSection = resumeLesson?.sections.find((section) => section.id === location?.sectionId);
  const lessonHref = activeLesson ? `/learn/${activeLesson.slug}${location?.version ? `?version=${location.version}` : ""}${resumeLesson && location ? `#section-${location.sectionId}` : ""}` : "/courses/reliable-ai-applications";
  const submittedAttempts = [...data.attempts].filter((attempt) => attempt.status === "submitted").sort((a, b) => Date.parse(b.submittedAt ?? b.startedAt) - Date.parse(a.submittedAt ?? a.startedAt));
  const activeAttempts = data.attempts.filter((attempt) => attempt.status === "in_progress" && attempt.assessment.key);
  const passedAssessments = new Set(submittedAttempts.filter((attempt) => attempt.passed).map((attempt) => `${attempt.assessment.id}:${attempt.assessmentVersion}`)).size;
  const submissions = [...data.submissions].sort((a, b) => Date.parse(b.submittedAt) - Date.parse(a.submittedAt));
  const weakTopics = data.weakTopics.flatMap((topic) => {
    const lesson = lessons.find((item) => item.id === topic.topicId);
    const courseModule = modules.find((item) => `applied-ai-${item.id}` === topic.topicId || item.id === topic.topicId);
    const target = lesson ?? lessons.find((item) => item.id === courseModule?.lessonIds[0]);
    return target ? [{ ...topic, title: lesson?.title ?? courseModule?.title ?? target.title, href: `/learn/${target.slug}` }] : [];
  });
  const hasActivity = data.progress.length > 0 || data.attempts.length > 0 || data.submissions.length > 0;

  return <section className="learning-home">
    <div className="lh-heading"><div><h1>{hasActivity ? "Keep building your understanding." : "Your next chapter starts here."}</h1><p>{hasActivity ? "Return to your lesson, review a question, or build the next part of your project." : "Start with a lesson. Explore its visual lab. Put the idea to work in your project."}</p></div><Link className="lh-account-link" href="/settings">Account settings</Link></div>
    <div className="lh-workspace">
      <div className="lh-primary">
        <section className="lh-next-lesson" aria-labelledby="next-lesson-title">
          <div className="lh-lesson-copy"><div className="lh-course-line">Reliable AI Applications</div><p className="lh-context">{resumeLesson ? `Continue chapter ${resumeLesson.chapter}` : "Begin chapter 1"}</p><h2 id="next-lesson-title">{activeLesson?.title ?? "Explore the course map"}</h2><p>{activeLesson?.summary ?? "Choose a lesson and try its interactive lab."}</p>
            <div className="lh-lesson-meta">{activeLesson?.duration ? <span>{activeLesson.duration} min lesson estimate</span> : null}<span>Visual lab and practical work</span></div>
            {resumeSection && <p className="lh-resume-section">Saved section: <strong>{resumeSection.title}</strong></p>}
            <Link className="lh-button" href={lessonHref}>{resumeLesson ? "Resume learning" : "Start first lesson"}<ArrowRight /></Link>
          </div><div className="lh-lesson-art"><Image preload src="/academy-learning-studio.webp" width={1448} height={1086} alt="" sizes="(max-width: 650px) 100vw, 320px" /><span>Learn through explanation, experiments, and evidence.</span></div>
        </section>
        <div className="lh-record-summary" aria-label="Separate learning records">
          <div><span className="lh-record-number">{sectionsRead}</span><div><strong>Sections marked read</strong><span>{completedIds.size} lesson{completedIds.size === 1 ? "" : "s"} marked complete</span></div></div>
          <div><span className="lh-record-number">{passedAssessments}</span><div><strong>Assessment versions passed</strong><span>{submittedAttempts.length} submitted attempt{submittedAttempts.length === 1 ? "" : "s"}</span></div></div>
          <div><span className="lh-record-number">{submissions.length}</span><div><strong>Project links submitted</strong><span>Self-reported work</span></div></div>
        </div>
        <BookmarksSection lessons={lessons} />
        <section className="lh-section" aria-labelledby="assessment-history-title"><div className="lh-section-heading"><div><h2 id="assessment-history-title">Assessment history</h2><p>Your results, retries, and next questions.</p></div><Link className="lh-text-link" href="/courses/reliable-ai-applications">Find an assessment</Link></div>
          {activeAttempts.length > 0 && <div className="lh-active-attempts">{activeAttempts.map((attempt) => <div key={attempt.id}><div><span className="lh-record-label">In progress · Version {attempt.assessmentVersion}</span><strong>{attempt.assessment.title}</strong></div><Link className="lh-text-link" href={`/assessments/${encodeURIComponent(attempt.assessment.key!)}?attemptId=${encodeURIComponent(attempt.id)}`}>Resume assessment</Link></div>)}</div>}
          {submittedAttempts.length ? <div className="lh-history-list">{submittedAttempts.slice(0, 5).map((attempt) => <article key={attempt.id} className="lh-history-item"><div><span className="lh-record-label">{dateLabel(attempt.submittedAt ?? attempt.startedAt)} · Version {attempt.assessmentVersion}</span><h3>{attempt.assessment.title}</h3><span className={`lh-result-status ${attempt.passed ? "lh-passed" : ""}`}>{attempt.passed ? "Passed" : "Review recommended"}</span></div><div className="lh-score"><strong>{attempt.scorePercent === null ? "Score unavailable" : `${attempt.scorePercent}%`}</strong>{attempt.assessment.key && <Link className="lh-text-link" href={`/assessments/${encodeURIComponent(attempt.assessment.key)}`}>Open assessment</Link>}</div></article>)}</div> : <div className="lh-empty"><h3>Turn your next lesson into a knowledge check.</h3><p>Submit an assessment to save your score and see topics to revisit. Reading progress and assessment results stay separate.</p><Link className="lh-text-link" href="/courses/reliable-ai-applications">Choose your first assessment</Link></div>}
        </section>
        <section className="lh-section" aria-labelledby="portfolio-title"><div className="lh-section-heading"><div><h2 id="portfolio-title">Your project portfolio</h2><p>One application, built across eight milestones.</p></div><Link className="lh-text-link" href="/projects">Project workspace</Link></div>
          {submissions.length ? <><p className="lh-portfolio-note">Self-reported submissions. Repository contents and tests have not been verified.</p><div className="lh-history-list">{submissions.map((submission) => <article className="lh-history-item" key={submission.id}><div><span className="lh-record-label">{dateLabel(submission.submittedAt)}{submission.courseVersion ? ` · Course version ${submission.courseVersion.version}` : ""}</span><h3>{submission.projectId.startsWith("ai-milestone-") ? `Milestone ${submission.projectId.slice("ai-milestone-".length)}` : submission.projectId}</h3><span className="lh-repository-label">{submission.repositoryUrl.replace(/^https:\/\/github\.com\//, "")}</span>{submission.commitSha && <code className="lh-commit">{submission.commitSha.slice(0, 8)}</code>}</div><a className="lh-text-link" href={submission.repositoryUrl} target="_blank" rel="noopener noreferrer">Open repository<span className="lh-screen-reader"> (opens in a new tab)</span></a></article>)}</div></> : <div className="lh-project-empty"><div className="lh-project-symbol" aria-hidden="true"><Code /></div><div><h3>Build your document intelligence application.</h3><p>Run the starter locally, collect evidence, then submit a GitHub link and reflection. Submissions are recorded as self-reported work.</p><Link className="lh-text-link" href="/projects">Open the starter and milestones</Link></div></div>}
        </section>
      </div>
      <aside className="lh-sidebar">
        <section className="lh-course-outline" aria-labelledby="course-outline-title"><div className="lh-sidebar-heading"><h2 id="course-outline-title">Your course path</h2><span>{completedIds.size}/{lessons.length} lessons marked complete</span></div><ol>{modules.map((module, index) => {
          const moduleLesson = lessons.find((lesson) => lesson.id === module.lessonIds[0]);
          const done = module.lessonIds.filter((id) => completedIds.has(id)).length;
          return <li className={activeLesson?.moduleId === module.id ? "lh-current-module" : undefined} key={module.id}><span className="lh-module-number" aria-hidden="true">{index + 1}</span><div><Link href={moduleLesson ? `/learn/${moduleLesson.slug}` : "/courses/reliable-ai-applications"}>{module.title}</Link><span>{done}/{module.lessonIds.length} lessons marked complete</span></div></li>;
        })}</ol><Link className="lh-text-link" href="/courses/reliable-ai-applications">View full course map</Link></section>
        <section className="lh-review-queue" aria-labelledby="review-queue-title"><h2 id="review-queue-title">Topics to revisit</h2>{weakTopics.length ? <><p>Based on missed answers in your saved attempts.</p><ul>{weakTopics.slice(0, 5).map((topic) => <li key={topic.topicId}><Link href={topic.href}>{topic.title}</Link><span>{topic.misses} missed answer{topic.misses === 1 ? "" : "s"}</span></li>)}</ul></> : <><p>No review topics yet.</p><p>After an assessment, missed answers can point you to a useful lesson.</p></>}</section>
        <div className="lh-reading-note"><strong>Learning records are evidence of activity.</strong><p>Marked reading, passed assessments, and submitted projects each tell a different part of your learning story.</p></div>
        <HintHistorySection />
      </aside>
    </div>
   </section>;
}

function BookmarksSection({ lessons }: { lessons: DashboardLesson[] }) {
  const [items, setItems] = useState<BookmarkRecord[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/me/bookmarks", { cache: "no-store", signal: controller.signal })
      .then(async (response): Promise<{ items: BookmarkRecord[] | null; failed: boolean }> => {
        if (!response.ok) return { items: null, failed: true };
        const data = await response.json() as { bookmarks?: BookmarkRecord[] };
        return { items: data.bookmarks ?? [], failed: false };
      })
      .catch(() => ({ items: null, failed: true }))
      .then((next) => { if (!controller.signal.aborted) { setItems(next.items); setFailed(next.failed); } });
    return () => controller.abort();
  }, [attempt]);

  const entries = (items ?? [])
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .flatMap((item) => {
      const lesson = lessons.find((candidate) => candidate.id === item.lessonId);
      const section = item.sectionId ? lesson?.sections.find((candidate) => candidate.id === item.sectionId) : null;
      return lesson ? [{ ...item, lesson, section }] : [];
    });

  return <section className="lh-section" aria-labelledby="bookmarks-title">
    <div className="lh-section-heading"><div><h2 id="bookmarks-title">Saved bookmarks</h2><p>Lessons and sections you saved while reading.</p></div><Link className="lh-text-link" href="/courses/reliable-ai-applications">Browse lessons</Link></div>
    {failed ? <p className="lh-record-label">We couldn’t load your saved bookmarks. <button className="lh-text-link" type="button" onClick={() => { setItems(null); setFailed(false); setAttempt((number) => number + 1); }}>Retry bookmarks</button></p>
      : items === null ? <p className="lh-record-label" role="status" aria-busy="true">Loading your saved bookmarks…</p>
        : entries.length ? <div className="lh-history-list">{entries.map((entry) => <article className="lh-history-item" key={entry.id}><div><h3><Link href={`/learn/${entry.lesson.slug}${entry.section ? `#section-${entry.section.id}` : ""}`}>{entry.lesson.title}</Link></h3><span className="lh-record-label">{entry.section ? `Section ${entry.section.title} · ` : "Whole lesson · "}saved {dateLabel(entry.createdAt)}</span></div><Link className="lh-text-link" href={`/learn/${entry.lesson.slug}${entry.section ? `#section-${entry.section.id}` : ""}`}>{entry.section ? "Open section" : "Open lesson"}</Link></article>)}</div>
          : <div className="lh-empty"><h3>No saved bookmarks yet.</h3><p>Open a lesson and use the bookmark control in its header to save it for later. Bookmarks belong to your signed-in account.</p><Link className="lh-text-link" href="/courses/reliable-ai-applications">Open the course map</Link></div>}
  </section>;
}

function HintHistorySection() {
  const [history, setHistory] = useState<HintRecord[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/me/tutor-history", { cache: "no-store", signal: controller.signal })
      .then(async (response): Promise<{ items: HintRecord[] | null; failed: boolean }> => {
        if (!response.ok) return { items: null, failed: true };
        const data = await response.json() as { history?: HintRecord[] };
        return { items: data.history ?? [], failed: false };
      })
      .catch(() => ({ items: null, failed: true }))
      .then((next) => { if (!controller.signal.aborted) { setHistory(next.items); setFailed(next.failed); } });
    return () => controller.abort();
  }, [attempt]);

  const entries = [...(history ?? [])].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

  return <section className="lh-review-queue" aria-labelledby="hint-history-title">
    <h2 id="hint-history-title">Saved hint requests</h2>
    {failed ? <p>We couldn’t load your hint history. <button className="lh-text-link" type="button" onClick={() => { setHistory(null); setFailed(false); setAttempt((number) => number + 1); }}>Retry hint history</button></p>
      : history === null ? <p role="status" aria-busy="true">Loading your saved hint requests…</p>
        : entries.length ? <>
          <p>{entries.length} hint request{entries.length === 1 ? "" : "s"} saved, newest first.</p>
          <ul>{entries.slice(0, 5).map((item) => {
            const link = item.lesson ? <Link href={`/learn/${item.lesson.slug}${item.section ? `#section-${item.section.id}` : ""}`}>{item.lesson.title}</Link> : <span>Saved lesson unavailable</span>;
            return <li key={item.id}>{link}<span>{item.section ? `${item.section.title} · ` : ""}{dateLabel(item.createdAt)}</span></li>;
          })}</ul>
        </>
          : <>
            <p>No saved hint requests yet.</p>
            <p>When you ask the hint coach for help inside a lesson, your requests appear here. The coach only offers authored hints.</p>
          </>}
  </section>;
}
