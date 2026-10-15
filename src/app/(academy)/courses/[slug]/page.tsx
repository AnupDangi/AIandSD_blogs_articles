import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { courses, lessons } from "@/content/catalog";
import { ArrowRight } from "@/components/icons";

const moduleAssessmentIds: Record<string, string> = {
  foundations: "foundations-assessment", retrieval: "retrieval-assessment", workflows: "workflows-assessment",
  evaluation: "evaluation-assessment", reliability: "reliability-assessment", safety: "safety-assessment",
  efficiency: "efficiency-assessment", capstone: "capstone-assessment",
};
export function generateStaticParams() { return courses.map((course) => ({ slug: course.slug })); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const course = courses.find((item) => item.slug === slug);
  return course ? { title: course.title, description: course.description } : {};
}

export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const course = courses.find((item) => item.slug === slug);
  if (!course) notFound();
  if (course.id !== "applied-ai") return <section className="track-page">
    <div className="lesson-breadcrumb"><Link href="/courses">Courses</Link><span>/</span><span>{course.topic}</span></div>
    <div className="track-cover"><span className="eyebrow">Learning path · roadmap</span><h1>{course.title}</h1><p className="track-subtitle">{course.subtitle}</p><p>{course.description}</p><div className="track-meta"><span>{course.duration}</span><span>{course.level}</span></div></div>
    <div className="track-notice"><p>This path is being developed into guided lessons and practical projects. It is not a complete course yet.</p></div>
    <div className="track-suggestion"><h2>Explore the Applied AI course</h2><p>Start with the open chapter drafts, visual labs, and local document intelligence project.</p><Link className="button-primary" href="/courses/reliable-ai-applications">Explore Reliable AI Applications<ArrowRight /></Link></div>
  </section>;

  const totalLessons = course.modules.reduce((sum, module) => sum + module.lessonIds.length, 0);
  const firstLesson = lessons.find((lesson) => lesson.id === course.modules[0]?.lessonIds[0]);
  const entry = firstLesson ? `/learn/${firstLesson.slug}` : "/topics";
  const reviewedLessons = lessons.filter((lesson) => course.modules.some((module) => module.lessonIds.includes(lesson.id)) && lesson.contentStatus === "reviewed").length;

  return <section className="course-overview">
    <div className="overview-hero">
      <div className="overview-copy">
        <div className="lesson-breadcrumb"><Link href="/courses">Courses</Link><span>/</span><span>{course.topic}</span></div>
        <span className="eyebrow">{course.topic} · {course.level}</span>
        <h1>{course.title}</h1><p className="overview-subtitle">{course.subtitle}</p><p>{course.description}</p>
        <div className="overview-meta"><span>{course.duration} estimated</span><span>{course.modules.length} modules</span><span>{totalLessons} draft lessons</span></div>
        <div className="hero-actions"><Link className="button-primary" href={entry}>Open chapter 01 draft<ArrowRight /></Link><Link className="overview-map-link" href="#curriculum">View course map</Link></div>
        <p className="overview-review-note">Course in development · {reviewedLessons} of {totalLessons} lessons reviewed. Reading and visual labs are open.</p>
      </div>
      <figure className="overview-course-art"><Image src="/retrieval-contextual-chunking.png" width={1672} height={941} sizes="(max-width: 760px) 100vw, 42vw" alt="Conceptual illustration connecting a source document to context-preserving chunks." /><figcaption>Learn to keep useful evidence connected to its source.</figcaption></figure>
    </div>
    <div className="overview-body">
      <div className="overview-main">
        <section className="overview-section"><h2>A document intelligence system that earns trust.</h2><p>Build a system that retrieves evidence, answers with citations, measures quality, and recovers when a model or provider fails. Each module adds one capability to the same Python project.</p>
          <div className="overview-project-facts"><span>Deterministic fixtures</span><span>Local tests</span><span>No paid API required</span></div>
          <Link className="final-assessment-link" href="/projects">See all eight project milestones<ArrowRight /></Link>
        </section>
        <section className="overview-section curriculum" id="curriculum">
          <div className="section-heading compact"><div><h2>Eight modules. One growing system.</h2></div></div>
          <p className="curriculum-intro">Open a module to explore its lessons, practical milestone, and knowledge check.</p>
          <div className="course-module-list">{course.modules.map((module, index) => {
            const moduleLessons = lessons.filter((lesson) => module.lessonIds.includes(lesson.id));
            return <details className="course-module" id={module.id} key={module.id} open={index === 0}>
              <summary><span className="course-module-number">{String(index + 1).padStart(2, "0")}</span><span className="course-module-title"><strong>{module.title}</strong><span>Chapters {module.chapterRange} · {moduleLessons.length} lessons</span></span><span className="course-module-toggle" aria-hidden="true">+</span></summary>
              <div className="course-module-body"><p>{module.summary}</p><div className="course-module-milestone"><span>Build this</span><p>{module.milestone}</p></div>
                <ol className="course-module-lessons">{moduleLessons.map((lesson) => <li key={lesson.id}><Link href={`/learn/${lesson.slug}`}><span>{String(lesson.chapter).padStart(2, "0")}</span><strong>{lesson.title}</strong><small>{lesson.contentStatus === "reviewed" ? "Reviewed" : "Draft"}</small></Link></li>)}</ol>
                <Link className="module-assessment-link" href={`/assessments/${moduleAssessmentIds[module.id]}`}>Module assessment · 10 questions<ArrowRight /></Link>
              </div>
            </details>;
          })}</div>
        </section>
      </div>
      <aside className="overview-sidebar"><div className="sidebar-card"><h2 className="overview-details-title">A practical learning path</h2><dl><div><dt>Level</dt><dd>{course.level}</dd></div><div><dt>Time</dt><dd>{course.duration}</dd></div><div><dt>Project language</dt><dd>Python 3.12</dd></div><div><dt>Prerequisites</dt><dd>Basic programming & Git</dd></div></dl><Link className="button-primary full-button" href={entry}>Open chapter 01 draft<ArrowRight /></Link><p>Sign in to save reading, assessments, and project submissions across devices.</p><Link className="sidebar-assessment-link" href="/assessments/final-assessment">Final assessment · 30 questions</Link></div><div className="sidebar-card project-card"><h3>Build, test, reflect.</h3><p>Submit your GitHub project and a reflection at each milestone. Submissions are self-reported; they are not verified credentials.</p><Link className="sidebar-assessment-link" href="/projects">Explore the project</Link></div></aside>
    </div>
  </section>;
}
