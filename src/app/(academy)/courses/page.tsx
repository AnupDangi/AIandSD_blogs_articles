import type { Metadata } from "next";
import Link from "next/link";
import { courses } from "@/content/catalog";
import { CourseCard } from "@/components/course-card";
import "@/components/discovery.css";

export const metadata: Metadata = {
  title: "Courses",
  description: "Explore the Applied AI course in development and reading paths in System Design, Cloud Engineering, and the 60-Day Sprint.",
};

export default function CoursesPage() {
  const flagship = courses.find((course) => course.id === "applied-ai")!;
  return (
    <div className="discovery-catalog discovery-width">
      <header className="discovery-catalog-heading"><div><h1>Choose what to build next.</h1><p>Learn the mechanisms, experiment with the trade-offs, and apply them to a system.</p></div><Link className="discovery-button discovery-button-secondary" href="/dashboard">My learning</Link></header>
      <section aria-labelledby="featured-course-heading"><div className="discovery-catalog-section-title"><h2 id="featured-course-heading">Build an AI application</h2><p>Our first project-based course, currently in development.</p></div><CourseCard course={flagship} featured /></section>
      <section className="discovery-catalog-other" aria-labelledby="other-courses-heading"><div className="discovery-catalog-section-title"><h2 id="other-courses-heading">More ways to explore</h2><p>Future learning paths. These are not complete assessed courses.</p></div><div className="discovery-track-list">{courses.filter((course) => course.id !== "applied-ai").map((course) => <CourseCard course={course} key={course.id} />)}</div></section>
      <aside className="discovery-catalog-note"><div><h2>Looking for a specific idea?</h2><p>Find a topic, lesson, project, or source across the academy.</p></div><Link className="discovery-button discovery-button-secondary" href="/search">Search the academy</Link></aside>
    </div>
  );
}
