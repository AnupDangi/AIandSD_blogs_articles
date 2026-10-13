import { courses, lessons } from "@/content/catalog";
import { topics } from "@/content/topics";
import resources from "../../curriculum/resources.json";

export type SearchResult = {
  id: string;
  kind: "Course" | "Lesson" | "Topic" | "Resource";
  title: string;
  description: string;
  href: string;
  meta: string;
  score: number;
};
type SearchCandidate = Omit<SearchResult, "score"> & { content: string };

function normalize(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function rank(query: string, title: string, content: string) {
  const normalizedQuery = normalize(query.trim());
  const tokens = [...new Set(normalizedQuery.split(/[^\p{L}\p{N}]+/u).filter(Boolean))];
  if (!tokens.length) return 0;
  const normalizedTitle = normalize(title);
  const normalizedContent = normalize(content);
  const titleMatches = tokens.filter((token) => normalizedTitle.includes(token)).length;
  const contentMatches = tokens.filter((token) => normalizedContent.includes(token)).length;
  if (contentMatches === 0) return 0;
  const exactPhrase = normalizedTitle.includes(normalizedQuery) ? 8 : 0;
  return exactPhrase + titleMatches * 4 + contentMatches;
}

export function searchContent(query: string, limit = 24): SearchResult[] {
  const safeQuery = query.trim().slice(0, 120);
  if (!safeQuery) return [];
  const candidates: SearchCandidate[] = [
    ...courses.map((course) => ({
      id: course.id,
      kind: "Course" as const,
      title: course.title,
      description: course.description,
      href: `/courses/${course.slug}`,
      meta: `${course.topic} · ${course.status.replaceAll("-", " ")}`,
      content: [course.subtitle, course.level, ...course.modules.map((module) => `${module.title} ${module.summary}`)].join(" "),
    })),
    ...lessons.map((lesson) => ({
      id: lesson.id,
      kind: "Lesson" as const,
      title: lesson.title,
      description: lesson.summary,
      href: `/learn/${lesson.slug}`,
      meta: `Applied AI · Chapter ${String(lesson.chapter).padStart(2, "0")}`,
      content: [...lesson.outcomes, ...lesson.prerequisites, ...lesson.sections.map((section) => `${section.title} ${section.summary}`)].join(" "),
    })),
    ...topics.map((topic) => ({
      id: topic.title,
      kind: "Topic" as const,
      title: topic.title,
      description: topic.description,
      href: topic.lessonSlug ? `/learn/${topic.lessonSlug}` : "/topics",
      meta: topic.category,
      content: topic.tags.join(" "),
    })),
    ...resources.map((resource) => ({
      id: resource.id,
      kind: "Resource" as const,
      title: resource.title,
      description: resource.purpose,
      href: resource.url,
      meta: `${resource.provider} · ${resource.type}`,
      content: `${resource.section} ${resource.relevantSection} ${resource.lessonIds.join(" ")}`,
    })),
  ];

  return candidates
    .map(({ content, ...result }) => ({ ...result, score: rank(safeQuery, result.title, `${result.title} ${result.description} ${content} ${result.meta}`) }))
    .filter((result) => result.score > 0)
    .sort((left, right) => right.score - left.score || left.title.localeCompare(right.title))
    .slice(0, Math.max(0, Math.min(limit, 50)));
}
