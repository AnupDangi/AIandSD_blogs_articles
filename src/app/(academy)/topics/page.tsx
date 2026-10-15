import type { Metadata } from "next";
import Link from "next/link";
import { courses, lessons } from "@/content/catalog";
import { topics } from "@/content/topics";
import { VisualEngineGallery } from "@/components/visual-engine";
import { TopicDirectory } from "@/components/topic-directory";
import "@/components/library-discovery.css";

export const metadata: Metadata = {
  title: "Topics",
  description: "Find the lesson, visual lab, and sources for an AI engineering concept.",
};

export default function TopicsPage() {
  const currentCourse = courses.find((course) => course.id === "applied-ai")!;
  const reviewedCount = lessons.filter((lesson) => lesson.contentStatus === "reviewed").length;

  return <section className="library-page studio-library topics-page">
    <header className="library-hero">
      <div className="lesson-breadcrumb"><Link href="/courses">Courses</Link><span>/</span><span>Topics</span></div>
      <h1>Explore a concept.</h1>
      <p>Find the lesson, experiment, and source material for the idea you want to understand. Follow a topic on its own, or study it within the Applied AI course.</p>
      <div className="library-summary"><span>{lessons.length} lesson drafts · {courses.length - 1} course roadmaps</span><span>{currentCourse.modules.length} course modules</span><Link href={`/courses/${currentCourse.slug}`}>View the full learning path</Link></div>
    </header>
    <TopicDirectory topics={topics} draftCount={lessons.length} reviewedCount={reviewedCount}/>
    <aside className="library-context"><strong>Choose an idea, then try it.</strong><p>Topic links open lesson drafts with their visual experiments. Course instruction and assessments are still being reviewed.</p><Link href="/resources">Browse supporting sources</Link></aside>
    <VisualEngineGallery />
  </section>;
}
