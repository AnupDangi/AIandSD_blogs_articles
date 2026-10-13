import type { Course } from "./types";
import { lessons, questions } from "./applied-ai";

export const courses: Course[] = [
  {
    id: "applied-ai",
    slug: "reliable-ai-applications",
    title: "Reliable AI Applications",
    subtitle: "From model call to production",
    description:
      "Build a document intelligence system that can find evidence, explain its decisions, survive failure, and stay within its operating budget.",
    level: "Intermediate",
    duration: "60–80 hours",
    status: "in-progress",
    topic: "Applied AI",
    modules: [
      { id: "foundations", title: "Foundations and model boundaries", summary: "From token budgets and typed outputs to dependable model choices.", chapterRange: "01–07", milestone: "Ship a typed model-call service with a measurable baseline.", lessonIds: ["ai-01", "ai-02", "ai-03", "ai-04", "ai-05", "ai-06", "ai-07"] },
      { id: "retrieval", title: "Measurable retrieval", summary: "Build a retrieval pipeline whose quality can be tested.", chapterRange: "08–14", milestone: "Compare retrieval approaches and cite the evidence behind each answer.", lessonIds: ["ai-08", "ai-09", "ai-10", "ai-11", "ai-12", "ai-13", "ai-14"] },
      { id: "workflows", title: "Tools and durable workflows", summary: "Add bounded actions, state, and safe recovery.", chapterRange: "15–21", milestone: "Build a tool-using workflow that survives interruption.", lessonIds: ["ai-15", "ai-16", "ai-17", "ai-18", "ai-19", "ai-20", "ai-21"] },
      { id: "evaluation", title: "Evaluation and observability", summary: "Find regressions, calibrate judges, and understand a run.", chapterRange: "22–26", milestone: "Create an evaluation report and trace a failed answer.", lessonIds: ["ai-22", "ai-23", "ai-24", "ai-25", "ai-26"] },
      { id: "reliability", title: "Latency and release reliability", summary: "Engineer deadlines, retries, graceful fallback, and canaries.", chapterRange: "27–30", milestone: "Measure local latency, test fallback paths, and document what still needs production evidence.", lessonIds: ["ai-27", "ai-28", "ai-29", "ai-30"] },
      { id: "safety", title: "Safe autonomy and evidence", summary: "Limit permissions and make claims traceable.", chapterRange: "31–34", milestone: "Test trust boundaries and document the approval policy.", lessonIds: ["ai-31", "ai-32", "ai-33", "ai-34"] },
      { id: "efficiency", title: "Efficiency and recovery", summary: "Reduce repeated work and recover from provider outages.", chapterRange: "35–38", milestone: "Measure caching gains and resume interrupted jobs.", lessonIds: ["ai-35", "ai-36", "ai-37", "ai-38"] },
      { id: "capstone", title: "Production capstone", summary: "Bring the system together and defend your design.", chapterRange: "39–40", milestone: "Complete a readiness review, threat model, runbook, and demo.", lessonIds: ["ai-39", "ai-40"] },
    ],
  },
  { id: "system-design", slug: "system-design", title: "Practical System Design", subtitle: "Learn the systems beneath the products", description: "A growing topic library covering networking, data, distributed systems, and production reliability.", level: "Advanced", duration: "52 topics", status: "roadmap", topic: "System Design", modules: [] },
  { id: "cloud", slug: "cloud-engineering", title: "Cloud Production Engineering", subtitle: "Run software in production with confidence", description: "A roadmap for infrastructure, delivery, observability, security, and operational decisions.", level: "Advanced", duration: "19 topics", status: "roadmap", topic: "Cloud", modules: [] },
  { id: "sprint", slug: "60-day-sprint", title: "60-Day AI + System Design Sprint", subtitle: "Build a daily learning habit", description: "Sixty paired AI and System Design reading prompts from the original roadmap.", level: "Foundational", duration: "60 days", status: "roadmap", topic: "Learning path", modules: [] },
];

export { lessons, questions };

export function getCourse(slug: string) { return courses.find((course) => course.slug === slug); }
export function getLesson(slug: string) { return lessons.find((lesson) => lesson.slug === slug); }
