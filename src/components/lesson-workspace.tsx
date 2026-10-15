"use client";

import Link from "next/link";
import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Course, Lesson, PublicQuestion } from "@/content/types";
import { courses, lessons } from "@/content/catalog";
import resourceManifest from "../../curriculum/resources.json";
import { VideoPlayer } from "@/components/video-player";
import { VisualEngine } from "@/components/visual-engine";
import { LessonDiagramSketch } from "@/components/lesson-diagram-sketch";
import { HintCoach } from "@/components/hint-coach";
import { ReadingPreferences } from "@/components/reading-preferences";

type Tab = "learn" | "simulate" | "practice";
type ProgressState = "visited" | "completed";
type ProgressSync = "loading" | "saved" | "guest" | "setup" | "unavailable";
type BookmarkSync = "loading" | "saved" | "guest" | "unavailable";

type BookmarkResponse = { bookmarks?: { courseId: string; lessonId: string; sectionId?: string }[] };

async function writeProgress(contentType: "section" | "lesson", contentId: string, state: ProgressState, courseVersion: { courseId: string; version: number; lessonId: string } | null): Promise<Exclude<ProgressSync, "loading">> {
  try {
    const response = await fetch("/api/progress", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ contentType, contentId, state, ...(courseVersion ? { courseVersion } : {}) }),
    });
    if (response.status === 401) return "guest";
    if (response.status === 503) return "setup";
    return response.ok ? "saved" : "unavailable";
  } catch {
    return "unavailable";
  }
}

export function LessonWorkspace({ lesson, questions, sourceSections, courseVersion, courseSnapshot, lessonSnapshots, resourceSnapshot }: { lesson: Lesson; questions: PublicQuestion[]; sourceSections: ReactNode[]; courseVersion: { courseId: string; version: number } | null; courseSnapshot: Course | null; lessonSnapshots: Lesson[] | null; resourceSnapshot: (typeof resourceManifest)[number][] | null }) {
  const router = useRouter();
  const [sectionIndex, setSectionIndex] = useState(0);
  const [sectionLocationReady, setSectionLocationReady] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [tab, setTab] = useState<Tab>("learn");
  const [courseMapOpen, setCourseMapOpen] = useState(false);
  const [selectedByQuestion, setSelectedByQuestion] = useState<Record<string, string>>({});
  const [recordedQuestions, setRecordedQuestions] = useState<string[]>([]);
  const [sectionProgress, setSectionProgress] = useState<Record<string, ProgressState>>({});
  const [progressSync, setProgressSync] = useState<ProgressSync>("loading");
  const [bookmarked, setBookmarked] = useState(false);
  const [bookmarkSync, setBookmarkSync] = useState<BookmarkSync>("loading");
  const [bookmarkPending, setBookmarkPending] = useState(false);
  const [readerSize, setReaderSize] = useState(18);
  const section = lesson.sections[sectionIndex];
  const question = questions.length ? questions[questionIndex] : null;
  const course = courseSnapshot ?? courses.find((item) => item.id === "applied-ai");
  const courseLessons = lessonSnapshots ?? lessons;
  const lessonModule = course?.modules.find((item) => item.id === lesson.moduleId);
  const sectionResources = (resourceSnapshot ?? resourceManifest).filter((item) => section.resources.includes(item.id));
  const reviewedCount = courseLessons.filter((item) => item.contentStatus === "reviewed").length;
  const formativeAssessmentId = lesson.assessmentIds.find((id) => id === `${lesson.id}-formative`);
  const versionQuery = courseVersion ? `?version=${courseVersion.version}` : "";

  useEffect(() => {
    let active = true;
    fetch("/api/me/learning", { cache: "no-store" })
      .then(async (response) => {
        if (response.status === 401) return { state: "guest" as const };
        if (response.status === 503) return { state: "setup" as const };
        if (!response.ok) return { state: "unavailable" as const };
        const data = await response.json() as { progress?: { contentType: string; contentId: string; state: string; courseVersion?: { courseId: string; version: number } }[] };
        return { state: "saved" as const, progress: data.progress ?? [] };
      })
      .catch(() => ({ state: "unavailable" as const }))
      .then((result) => {
        if (!active) return;
        setProgressSync(result.state);
        if (result.state === "saved") {
          const loaded = Object.fromEntries(result.progress.filter((item) => item.contentType === "section" && item.state === "completed" && (courseVersion ? item.courseVersion?.version === courseVersion.version : !item.courseVersion)).map((item) => [item.contentId, "completed" as const]));
          setSectionProgress((current) => ({ ...loaded, ...current }));
        }
      });
    return () => { active = false; };
  }, [lesson.id, courseVersion]);

  useEffect(() => {
    let active = true;
    fetch("/api/me/bookmarks", { cache: "no-store" })
      .then(async (response): Promise<{ sync: BookmarkSync; bookmarked: boolean }> => {
        if (response.status === 401) return { sync: "guest", bookmarked: false };
        if (!response.ok) return { sync: "unavailable", bookmarked: false };
        const data = await response.json() as BookmarkResponse;
        const found = (data.bookmarks ?? []).some((item) => item.courseId === "reliable-ai-applications" && item.lessonId === lesson.id && !item.sectionId);
        return { sync: "saved", bookmarked: found };
      })
      .catch(() => ({ sync: "unavailable" as const, bookmarked: false }))
      .then((result) => {
        if (!active) return;
        setBookmarkSync(result.sync);
        setBookmarked(result.bookmarked);
      });
    return () => { active = false; };
  }, [lesson.id]);

  useEffect(() => {
    function openLinkedSection() {
      const sectionKey = window.location.hash.match(/^#section-(.+)$/)?.[1];
      const index = sectionKey ? lesson.sections.findIndex((item) => item.id === sectionKey) : -1;
      if (index >= 0) {
        setSectionIndex(index);
        setQuestionIndex(Math.min(index, Math.max(questions.length - 1, 0)));
        setTab("learn");
      }
      setSectionLocationReady(true);
    }
    openLinkedSection();
    window.addEventListener("hashchange", openLinkedSection);
    return () => window.removeEventListener("hashchange", openLinkedSection);
  }, [lesson.id, lesson.sections, questions.length]);

  useEffect(() => {
    const sectionId = lesson.sections[sectionIndex]?.id;
    if (!sectionLocationReady || !sectionId) return;
    let active = true;
    void writeProgress("section", sectionId, "visited", courseVersion ? { ...courseVersion, lessonId: lesson.id } : null).then((state) => { if (active) setProgressSync(state); });
    return () => { active = false; };
  }, [lesson.id, sectionIndex, sectionLocationReady, lesson.sections, courseVersion]);

  function chooseSection(index: number) {
    setSectionIndex(index);
    setQuestionIndex(Math.min(index, Math.max(questions.length - 1, 0)));
    setTab("learn");
    window.history.replaceState(null, "", `#section-${lesson.sections[index].id}`);
  }

  async function completeSectionAndContinue() {
    const currentSection = lesson.sections[sectionIndex];
    if (!currentSection) return;
    const saved = await writeProgress("section", currentSection.id, "completed", courseVersion ? { ...courseVersion, lessonId: lesson.id } : null);
    setProgressSync(saved);
    if (saved === "saved") setSectionProgress((current) => ({ ...current, [currentSection.id]: "completed" }));
    const allSectionsComplete = lesson.sections.every((item) => item.id === currentSection.id || sectionProgress[item.id] === "completed");
    if (sectionIndex === lesson.sections.length - 1) {
      if (allSectionsComplete && saved === "saved") setProgressSync(await writeProgress("lesson", lesson.id, "completed", courseVersion ? { ...courseVersion, lessonId: lesson.id } : null));
      setTab("practice");
      return;
    }
    chooseSection(sectionIndex + 1);
  }

  async function toggleBookmark() {
    if (bookmarkPending) return;
    setBookmarkPending(true);
    const next = !bookmarked;
    setBookmarked(next);
    try {
      const response = next
        ? await fetch("/api/me/bookmarks", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ courseId: "reliable-ai-applications", lessonId: lesson.id }) })
        : await fetch("/api/me/bookmarks", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ lessonId: lesson.id }) });
      if (response.status === 401) {
        setBookmarked(!next);
        setBookmarkSync("guest");
        router.replace(`/sign-in?next=${encodeURIComponent(`/learn/${lesson.slug}${versionQuery}`)}`);
        return;
      }
      if (!response.ok) setBookmarked(!next);
    } catch {
      setBookmarked(!next);
    } finally {
      setBookmarkPending(false);
    }
  }

  return (
    <div className="lesson-page">
      <div className="lesson-breadcrumb"><Link href="/courses">Courses</Link><span>/</span><Link href={`/courses/${course?.slug ?? "reliable-ai-applications"}`}>{course?.title ?? "Applied AI"}</Link><span>/</span><span>Chapter {String(lesson.chapter).padStart(2, "0")}</span></div>
      <div className="lesson-heading"><div><span className="eyebrow">{lessonModule?.title ?? "APPLIED AI"}</span><h1>{lesson.title}</h1><p>{lesson.summary}</p></div><div className="lesson-time"><span className="time-icon">◷</span><span>{lesson.duration} min<br/><small>at your pace</small></span></div></div>
      <div className="lesson-meta"><span><i className="meta-dot"></i> {lesson.contentStatus === "reviewed" ? "Reviewed lesson" : "Chapter preview · editorial review"}</span><span>Chapter {String(lesson.chapter).padStart(2, "0")}</span><span>{lesson.sourceDraft.split("/").at(-1)}</span><button className="lesson-bookmark" type="button" aria-pressed={bookmarked} aria-busy={bookmarkPending || bookmarkSync === "loading"} disabled={bookmarkSync === "loading"} aria-label="Bookmark this lesson" onClick={() => void toggleBookmark()}>{bookmarked ? "★ Bookmarked" : "☆ Bookmark"}</button><button className="lesson-predict" type="button" onClick={() => setTab("practice")}>Make a prediction <span>↓</span></button></div>
      <div className="mobile-course-map">
        <button className="mobile-course-map-toggle" aria-expanded={courseMapOpen} aria-controls="mobile-course-map-panel" onClick={() => setCourseMapOpen((open) => !open)}>{courseMapOpen ? "Close course map" : "Course map · 40 chapters"}<span aria-hidden="true">{courseMapOpen ? "−" : "+"}</span></button>
        {courseMapOpen && <nav id="mobile-course-map-panel" className="mobile-course-map-panel" aria-label="Course chapters">{course?.modules.map((module) => <section key={module.id}><h2>{module.title}</h2>{module.lessonIds.map((id) => { const item = courseLessons.find((candidate) => candidate.id === id); return item ? <Link key={item.id} aria-current={item.id === lesson.id ? "page" : undefined} href={`/learn/${item.slug}${versionQuery}`} onClick={() => setCourseMapOpen(false)}><span>{String(item.chapter).padStart(2, "0")}</span>{item.title}</Link> : null; })}</section>)}</nav>}
      </div>
      <div className="mobile-tabs" role="group" aria-label="Lesson workspace view">
        {(["learn", "simulate", "practice"] as const).map((item) => <button key={item} type="button" aria-pressed={tab === item} onClick={() => setTab(item)}>{item === "learn" ? "Learn" : item === "simulate" ? "Simulate" : "Practice"}</button>)}
      </div>
      <div className="lesson-layout">
        <aside className="lesson-sidebar" aria-label="Course lesson navigation">
          <div className="sidebar-course"><span className="sidebar-course-icon">AI</span><div><strong>Reliable AI</strong><small>{courseVersion ? `Published version ${courseVersion.version}` : "Course in development"}</small></div></div>
          <div className="sidebar-progress"><div><span>COURSE CONTENT</span><strong>{reviewedCount} reviewed</strong></div><span className="progress-track"><i style={{ width: `${courseLessons.length ? (reviewedCount / courseLessons.length) * 100 : 0}%` }}></i></span><small>{courseVersion ? "Archived lesson version" : `${courseLessons.length} chapter drafts · editorial review in progress`}</small></div>
          {lesson.sections.map((item, index) => <button key={item.id} className={`section-nav ${index === sectionIndex ? "section-current" : ""}`} onClick={() => chooseSection(index)}><span className="section-number">{String(index + 1).padStart(2, "0")}</span><span>{item.title}</span>{sectionProgress[item.id] === "completed" && <span className="section-check" aria-label="Completed">✓</span>}</button>)}
          <div className="sidebar-next"><span className="eyebrow">SOURCE DRAFT</span><p>{lesson.sourceDraft.split("/").at(-1)}</p><span className="coming-soon">Needs editorial review</span></div>
        </aside>
        <article id={`section-${section.id}`} className={`lesson-reading ${tab !== "learn" ? "mobile-hidden" : ""}`} style={{ "--lesson-reader-size": `${readerSize}px` } as CSSProperties}>
          <div className="reading-kicker"><span>SECTION {String(sectionIndex + 1).padStart(2, "0")}</span><span>·</span><span>6 MIN READ</span></div>
          <h2>{section.title}</h2>
          <p className="reading-lead">{section.summary}</p>
          <ReadingPreferences size={readerSize} onSizeChange={setReaderSize} />
          {section.illustration && <figure className="lesson-illustration"><Image src={section.illustration.src} alt={section.illustration.alt} width={1672} height={941} sizes="(max-width: 760px) calc(100vw - 44px), 680px" /><figcaption>{section.illustration.caption}</figcaption></figure>}
          <div className="insight-note"><span className="note-mark">↗</span><p><strong>Section activity.</strong> Use the lesson’s lab to test the specific objective above. Change one control, record the visible output, and explain the trade-off in your own words.</p></div>
          {sourceSections[sectionIndex] ?? sourceSections[0]}
          <section className="lesson-references" aria-labelledby="lesson-references-title"><span className="eyebrow">AFTER THIS SECTION</span><h3 id="lesson-references-title">Read or watch next</h3>{sectionResources.map((resource) => <article key={resource.id}>{resource.type === "video" && <VideoPlayer url={resource.url} title={resource.title} section={resource.section} compact />}<div><span className="reference-type">{resource.type}</span><a href={resource.url} target="_blank" rel="noopener noreferrer">{resource.title} <span aria-hidden="true">↗</span></a><small>{resource.provider}{resource.durationMinutes ? ` · ${resource.durationMinutes} min` : ""}{resource.timestamp ? ` · ${resource.timestamp}` : ""}</small><p>{resource.purpose}</p></div><span className="reference-status">{resource.verificationStatus === "link-verified" ? "LINK CHECKED" : "CHECK PENDING"}</span></article>)}<Link href="/resources">Browse all course resources <span>→</span></Link></section>
          <div className="lesson-objectives"><span className="eyebrow">YOU WILL BE ABLE TO</span>{lesson.outcomes.map((outcome) => <p key={outcome}><span>✓</span>{outcome}</p>)}</div>
          <div className="lesson-footer-nav"><button disabled={sectionIndex === 0} onClick={() => chooseSection(sectionIndex - 1)}>← Previous section</button><button onClick={() => void completeSectionAndContinue()}>{sectionIndex < lesson.sections.length - 1 ? "Mark complete and continue" : "Mark section complete"} <span>→</span></button><span className="progress-sync" role="status">{progressSync === "saved" ? "Progress saved" : progressSync === "guest" ? "Sign in to sync progress" : progressSync === "setup" ? "Account storage is not configured" : progressSync === "unavailable" ? "Progress could not be saved" : "Checking saved progress…"}</span></div>
        </article>
        <aside className={`lesson-aside ${tab === "learn" ? "mobile-hidden" : "mobile-active"}`}>
          <div className={`visual-pane ${tab === "practice" ? "visual-pane-hidden" : ""}`}><div className="lesson-lab-scenario"><span className="eyebrow">{lesson.title} · SECTION SCENARIO</span><p>{section.summary}</p></div><VisualEngine visualId={section.visual} lessonId={lesson.id} sectionId={section.id} scenario={lesson.visualScenario} /><LessonDiagramSketch lessonId={lesson.id} /></div>
          <section className={`practice-card ${tab === "practice" ? "practice-visible" : "practice-hidden"}`}><span className="eyebrow">PREDICTION PRACTICE · {question ? questionIndex + 1 : 0} OF {questions.length}</span><h2>Pause and predict</h2>{question ? <><p>{question.prompt}</p><div className="answer-options">{question.choices.map((choice, choiceIndex) => { const selected = selectedByQuestion[question.id] === choice.id; const recorded = recordedQuestions.includes(question.id); return <button key={choice.id} onClick={() => !recorded && setSelectedByQuestion((answers) => ({ ...answers, [question.id]: choice.id }))} className={selected ? "answer-selected" : ""} disabled={recorded}><span className="choice-letter">{String.fromCharCode(65 + choiceIndex)}</span>{choice.text}</button>; })}</div>{recordedQuestions.includes(question.id) ? <div className="answer-feedback"><strong>Reflection cue</strong><p>This local prediction is not graded. Compare your reasoning with the explanation and lab output.</p></div> : <button className="button-primary answer-submit" disabled={!selectedByQuestion[question.id]} onClick={() => setRecordedQuestions((recorded) => [...recorded, question.id])}>Record prediction <span>→</span></button>}<nav className="practice-question-nav" aria-label="Prediction questions"><button disabled={questionIndex === 0} onClick={() => setQuestionIndex((index) => index - 1)}>← Previous question</button><span>Question {questionIndex + 1} of {questions.length}</span><button disabled={questionIndex >= questions.length - 1} onClick={() => setQuestionIndex((index) => index + 1)}>Next question →</button></nav></> : <p>This lesson’s prediction practice is being prepared.</p>}<p className="practice-disclaimer">Predictions stay on this device and are not graded.</p>{formativeAssessmentId && <Link className="sidebar-assessment-link" href={`/assessments/${formativeAssessmentId}${versionQuery}`}>Take the 5-question saved knowledge check <span aria-hidden="true">→</span></Link>}</section>
          <HintCoach key={`${courseVersion?.version ?? "current"}:${section.id}`} lessonId={lesson.id} sectionId={section.id} courseVersion={courseVersion?.version} returnPath={`/learn/${lesson.slug}${versionQuery}`} />
        </aside>
      </div>
    </div>
  );
}
