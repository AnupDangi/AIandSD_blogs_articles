import type { Lesson } from "../src/content/types";

type LegacyProgress = {
  userId: string;
  contentType: string;
  contentId: string;
  state: string;
  readAt: Date | null;
  updatedAt: Date;
};

/** Legacy activity must only be anchored to a snapshot learners can actually open. */
export function shouldBackfillLegacyProgress(publishedVersionCount: number, publishedAt: Date | null): boolean {
  return publishedVersionCount === 0 && publishedAt !== null;
}

/** Preserve recognizable v1 lesson/section activity; report unknown rows without deleting them. */
export function mapLegacyProgressToVersion(rows: readonly LegacyProgress[], lessons: readonly Lesson[], courseVersionId: string) {
  const sectionOwners = new Map(lessons.flatMap((lesson) => lesson.sections.map((section) => [section.id, lesson.id] as const)));
  const lessonIds = new Set(lessons.map((lesson) => lesson.id));
  const mapped: Array<LegacyProgress & { courseVersionId: string; lessonId: string }> = [];
  const unmapped: string[] = [];

  for (const row of rows) {
    const lessonId = row.contentType === "lesson"
      ? (lessonIds.has(row.contentId) ? row.contentId : undefined)
      : row.contentType === "section" ? sectionOwners.get(row.contentId) : undefined;
    if (!lessonId) {
      unmapped.push(`${row.contentType}:${row.contentId}`);
      continue;
    }
    mapped.push({ ...row, courseVersionId, lessonId });
  }
  return { mapped, unmapped };
}
