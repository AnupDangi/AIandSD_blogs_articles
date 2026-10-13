import type { LessonVisualScenario } from "./visual-scenario-types";
export type { LessonVisualScenario } from "./visual-scenario-types";

export type LessonSection = {
  id: string;
  title: string;
  summary: string;
  visual: string;
  activity: string;
  resources: string[];
  hints: string[];
  illustration?: {
    src: string;
    alt: string;
    caption: string;
  };
};

export type Lesson = {
  id: string;
  slug: string;
  title: string;
  chapter: number;
  duration: number;
  summary: string;
  outcomes: string[];
  prerequisites: string[];
  moduleId: string;
  /** Canonical source retained from the original handbook draft. */
  sourceDraft: string;
  /** Editorial readiness is separate from the course's overall publication state. */
  contentStatus: "draft-needs-editorial-review" | "reviewed";
  formativeQuestionIds: string[];
  assessmentIds: string[];
  activityId: string;
  visual: string;
  sections: LessonSection[];
  /** Public simulator inputs frozen into published lesson-version metadata. */
  visualScenario?: LessonVisualScenario;
};

export type CourseModule = {
  id: string;
  title: string;
  summary: string;
  chapterRange: string;
  milestone: string;
  lessonIds: string[];
};

export type Course = {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  level: "Foundational" | "Intermediate" | "Advanced";
  duration: string;
  status: "complete" | "in-progress" | "roadmap";
  topic: string;
  modules: CourseModule[];
};

export type PublicQuestion = {
  id: string;
  prompt: string;
  choices: { id: string; text: string }[];
  lessonId: string;
  assessmentId: string;
  kind: "formative" | "module" | "final";
};

export type TopicEntry = {
  title: string;
  category: string;
  description: string;
  tags: string[];
  lessonSlug?: string;
  moduleId?: string;
  courseId?: string;
  /** Primary canonical topic for lesson-derived entries. */
  canonicalTopicId?: string;
  /** Canonical topics a roadmap course's outline actually overlaps. */
  canonicalTopicIds?: readonly string[];
};
