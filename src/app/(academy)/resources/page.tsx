import Link from "next/link";
import { courses, lessons } from "@/content/catalog";
import { VideoPlayer } from "@/components/video-player";
import resourceManifest from "../../../../curriculum/resources.json";
import "@/components/library-discovery.css";

type ResourcePageProps = { searchParams: Promise<{ q?: string | string[]; format?: string | string[]; lesson?: string | string[]; module?: string | string[]; course?: string | string[] }> };
const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] ?? "" : value ?? "";

export default async function ResourcesPage({ searchParams }: ResourcePageProps) {
  const params = await searchParams;
  const query = first(params.q).trim().slice(0, 120);
  const formats = [...new Set(resourceManifest.map((item) => item.type))];
  const requestedFormat = first(params.format);
  const format = formats.includes(requestedFormat) ? requestedFormat : "";
  const requestedLesson = first(params.lesson);
  const lessonId = lessons.some((lesson) => lesson.id === requestedLesson) ? requestedLesson : "";
  const flagship = courses.find((course) => course.id === "applied-ai")!;
  const requestedModule = first(params.module);
  const moduleId = flagship.modules.some((module) => module.id === requestedModule) ? requestedModule : "";
  const requestedCourse = first(params.course);
  const courseId = courses.some((course) => course.id === requestedCourse) ? requestedCourse : "";
  const normalized = query.toLocaleLowerCase();
  const resources = resourceManifest.filter((item) =>
    (!format || item.type === format) &&
    (!lessonId || item.lessonIds.includes(lessonId)) &&
    (!moduleId || item.lessonIds.some((id) => lessons.some((lesson) => lesson.id === id && lesson.moduleId === moduleId))) &&
    (!courseId || courseId === "applied-ai") &&
    (!normalized || [item.title, item.provider, item.purpose, item.relevantSection].join(" ").toLocaleLowerCase().includes(normalized)),
  );
  const filtered = Boolean(query || format || lessonId || moduleId || courseId);

  return <section className="library-page studio-library resources-page">
    <header className="library-hero">
      <div className="lesson-breadcrumb"><Link href="/courses">Courses</Link><span>/</span><span>Resources</span></div>
      <h1>Go to the source.</h1>
      <p>Papers, documentation, and lectures selected for the Applied AI lessons. Each source explains why it helps and where to focus your study.</p>
      <div className="library-summary"><span>{resourceManifest.length} sources</span><span>{resourceManifest.filter((item) => item.type === "video").length} videos</span><Link href="/topics">Explore by topic</Link></div>
    </header>
    <form className="library-filter" action="/resources" role="search" aria-label="Filter study resources">
      <label className="library-filter-query" htmlFor="resource-query">Search sources<input id="resource-query" name="q" type="search" defaultValue={query} maxLength={120} placeholder="Title, provider, or concept"/></label>
      <label htmlFor="resource-format">Format<select name="format" id="resource-format" aria-label="Format" defaultValue={format}><option value="">All formats</option>{formats.map((value) => <option key={value} value={value}>{value.charAt(0).toUpperCase() + value.slice(1)}</option>)}</select></label>
      <label htmlFor="resource-course">Course<select name="course" id="resource-course" aria-label="Course" defaultValue={courseId}><option value="">All courses</option>{courses.map((course) => <option key={course.id} value={course.id}>{course.title}{course.id !== "applied-ai" ? " (no resources yet)" : ""}</option>)}</select></label>
      <label htmlFor="resource-module">Module<select name="module" id="resource-module" aria-label="Module" defaultValue={moduleId}><option value="">All modules</option>{flagship.modules.map((module) => <option key={module.id} value={module.id}>{module.title}</option>)}</select></label>
      <label htmlFor="resource-lesson">Lesson<select name="lesson" id="resource-lesson" aria-label="Lesson" defaultValue={lessonId}><option value="">All lessons</option>{lessons.map((lesson) => <option key={lesson.id} value={lesson.id}>{lesson.chapter}. {lesson.title}</option>)}</select></label>
      <button className="button-primary" type="submit">Apply filters</button>
    </form>
    <div className="library-results-summary"><p>{resources.length} {resources.length === 1 ? "source" : "sources"}{filtered ? " matching your filters" : " available"}</p>{filtered && <Link href="/resources">Clear filters</Link>}</div>
    {resources.length ? <div className="resource-list">{resources.map((item) => <article className="resource-row" key={item.id}>
      {item.type === "video" && <VideoPlayer url={item.url} title={item.title} section={item.section} />}
      <div className="resource-copy">
        <div className="resource-metadata"><span>{item.type.charAt(0).toUpperCase() + item.type.slice(1)}</span><span>{item.provider}</span>{item.durationMinutes && <span>{item.durationMinutes} min</span>}{item.timestamp && <span>{item.timestamp}</span>}</div>
        <h2><a href={item.url} target="_blank" rel="noopener noreferrer">{item.title}<span className="sr-only"> (opens in a new tab)</span></a></h2>
        <p>{item.purpose}</p>
        <details className="source-study-details"><summary>What to study and related lessons</summary><p>{item.relevantSection}</p><div className="resource-lessons">{item.lessonIds.map((id) => { const lesson = lessons.find((candidate) => candidate.id === id); return lesson ? <Link key={id} href={`/learn/${lesson.slug}`}>{lesson.title}</Link> : null; })}</div><small>{item.verificationStatus === "link-verified" ? `Link checked ${item.verifiedOn}` : "Link check pending"}</small></details>
      </div>
      <a className="source-open" href={item.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${item.title} at ${item.provider}`}>Open source <span aria-hidden="true">↗</span></a>
    </article>)}</div> : <div className="library-empty"><h2>No sources match these filters.</h2><p>Try a broader concept or choose another format or lesson.</p><Link href="/resources">Show all sources</Link></div>}
    <p className="resource-verification">Link checks confirm that a source resolves and matches its assigned topic. Lesson claims still require editorial review. Video timestamps and durations appear only when verified.</p>
  </section>;
}
