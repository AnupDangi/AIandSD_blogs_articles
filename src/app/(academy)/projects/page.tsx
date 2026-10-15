import type { Metadata } from "next";
import Link from "next/link";
import { courses } from "@/content/catalog";
import { projectMilestones } from "@/content/project-milestones";
import courseManifest from "../../../../curriculum/applied-ai-course.json";
import { MilestoneSubmission } from "@/components/milestone-submission";
import "@/components/library-discovery.css";

export const metadata: Metadata = {
  title: "Projects",
  description: "Build a reliable AI application in TypeScript across eight self-reported milestones.",
};

export default function ProjectsPage() {
  const course = courses.find((item) => item.id === courseManifest.courseId)!;

  return <section className="library-page studio-library projects-page">
    <header className="library-hero project-library-hero">
      <div className="lesson-breadcrumb"><Link href="/courses">Courses</Link><span>/</span><span>Projects</span></div>
      <h1>Build a system, one step at a time.</h1>
      <p>Carry one reliable AI application through the Applied AI course, in your own GitHub repository. Each milestone adds a capability you can test, explain, and submit.</p>
    </header>
    <article className="project-brief">
      <div><span className="status-pill">{course.status === "in-progress" ? "Course in development" : "Available"}</span><h2>A reliable AI application with evidence</h2><p>Answer questions from sources you choose, cite the evidence, measure answer quality, and recover from failures.</p><div className="library-summary"><span>{projectMilestones.length} milestones</span><span>TypeScript</span><span>Your own repository and tests</span></div><Link className="button-primary" href={`/courses/${course.slug}`}>View the project learning path</Link></div>
      <aside><h3>Work locally. Keep your evidence.</h3><p>Fixture-based activities work without a paid model API. Submit a GitHub repository and reflection when you are ready.</p><a href="#project-submission">Go to milestone submission</a></aside>
    </article>
    <section className="project-milestone-section" aria-labelledby="project-milestones-heading">
      <div className="library-section-heading"><h2 id="project-milestones-heading">Your build sequence</h2><p>Open a milestone to see the work it asks you to demonstrate.</p></div>
      <ol className="project-milestone-list">{projectMilestones.map((milestone, index) => <li key={milestone.id}>
        <details><summary><span className="milestone-sequence">{index + 1}</span><span><strong>{milestone.title}</strong><small>{course.modules[index]?.title}</small></span><span className="milestone-expand" aria-hidden="true">+</span></summary><div className="project-milestone-content"><ul>{milestone.checklist.map((item) => <li key={item}>{item}</li>)}</ul><Link href={`/courses/${course.slug}#${course.modules[index]?.id ?? "curriculum"}`}>Study this module</Link></div></details>
      </li>)}</ol>
    </section>
    <aside className="library-context"><strong>Submitted work is self-reported.</strong><p>A saved repository link records your submission and reflection. It does not verify ownership, passing tests, or engineering mastery.</p><Link href="/dashboard">View your submitted work</Link></aside>
    <div id="project-submission"><MilestoneSubmission courseId={courseManifest.courseId} courseVersion={courseManifest.version}/></div>
  </section>;
}
