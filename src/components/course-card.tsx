import Image from "next/image";
import Link from "next/link";
import type { Course } from "@/content/types";
import "./discovery.css";

export function CourseCard({ course, featured = false }: { course: Course; featured?: boolean }) {
  const overviewHref = `/courses/${course.slug}`;
  const isAI = course.id === "applied-ai";
  const statusLabel = course.status === "in-progress" ? "Course in development" : course.status === "roadmap" ? "Roadmap" : "Complete course";
  const lessonCount = course.modules.reduce((count, module) => count + module.lessonIds.length, 0);
  return (
    <article className={`discovery-course-card ${featured ? "discovery-course-featured" : "discovery-course-track"}`}>
      {isAI ? <div className="discovery-course-image"><Image src="/academy-learning-studio.webp" width={1448} height={1086} sizes="(max-width: 760px) 100vw, 40vw" alt="Conceptual learning workbench with connected teal panels and an open notebook." /></div> : <div className={`discovery-track-symbol discovery-track-symbol-${course.id}`} aria-hidden="true"><span /><span /><span /></div>}
      <div className="discovery-course-content">
        <div className="discovery-course-top"><span className="discovery-course-topic">{course.topic}</span><span className="discovery-course-status">{statusLabel}</span></div>
        <h3><Link href={overviewHref}>{course.title}</Link></h3>
        <p className="discovery-course-subtitle">{course.subtitle}</p>
        <p className="discovery-course-description">{course.description}</p>
        <div className="discovery-course-meta"><span>{course.level}</span><span>{course.duration}</span>{lessonCount > 0 && <span>{lessonCount} draft lessons</span>}</div>
        <div className="discovery-course-bottom"><span>{course.modules.length ? `${course.modules.length} modules with one cumulative project` : "See the planned learning path"}</span><Link className="discovery-inline-link" href={overviewHref} aria-label={`Explore ${course.title}`}>{isAI ? "Explore course" : "Explore path"}</Link></div>
      </div>
    </article>
  );
}
