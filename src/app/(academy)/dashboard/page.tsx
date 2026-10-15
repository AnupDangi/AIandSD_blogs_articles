import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { courses, lessons } from "@/content/catalog";
import { LearnerDashboard } from "@/components/learner-dashboard";

export const metadata: Metadata = {
  title: "My learning",
  description: "Your saved reading, assessment history, and project submissions.",
};

export default function DashboardPage() {
  const course = courses.find((item) => item.id === "applied-ai");
  const firstLesson = lessons[0];
  const guestPreview = <section className="learning-home lh-guest">
    <div className="lh-heading"><div><h1>Explore your learning workspace.</h1><p>Read the lessons and try the visual labs. An account keeps your progress, assessment history, and project links together.</p></div><span className="lh-guest-label">Guest preview</span></div>
    <div className="lh-guest-feature"><div className="lh-guest-copy"><span className="lh-course-line">Reliable AI Applications</span><h2>A place to learn, experiment, and build.</h2><p>Follow 40 chapters from a model call to a reliable AI application. Each chapter connects an explanation, an experiment, and practical work.</p><div className="lh-actions"><Link className="lh-button" href="/sign-in?next=%2Fdashboard">Sign in to save your learning</Link><Link className="lh-text-link" href={firstLesson ? `/learn/${firstLesson.slug}` : "/courses"}>Explore the first lesson</Link></div><p className="lh-guest-note">Course drafts are open to read. Editorial review is in progress.</p></div><Image src="/retrieval-contextual-chunking.png" width={1672} height={941} alt="An illustrated document retrieval process with connected chunks and context." sizes="(max-width: 650px) 100vw, 440px" /></div>
    <div className="lh-guest-benefits"><div><h3>Pick up where you left off</h3><p>Save your reading activity and return to the section you last opened.</p></div><div><h3>Find what needs another pass</h3><p>Record assessment results and revisit concepts behind missed answers.</p></div><div><h3>Keep your project evidence</h3><p>Submit milestone links and reflections as a self-reported portfolio.</p></div></div>
  </section>;
  const dashboardLessons = lessons.map(({ id, slug, title, summary, chapter, duration, moduleId, sections }) => ({ id, slug, title, summary, chapter, duration, moduleId, sections: sections.map(({ id: sectionId, title: sectionTitle }) => ({ id: sectionId, title: sectionTitle })) }));
  const dashboardModules = course?.modules.map(({ id, title, lessonIds }) => ({ id, title, lessonIds })) ?? [];
  return <LearnerDashboard guest={guestPreview} lessons={dashboardLessons} modules={dashboardModules} />;
}
