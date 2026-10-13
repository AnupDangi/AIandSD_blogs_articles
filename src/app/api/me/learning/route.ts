import { authenticateRequest, noStoreJson, setupRequired } from "@/lib/server/http";
import { getDatabase } from "@/lib/server/db";
import { lessons } from "@/content/catalog";

export async function GET() {
  const auth = await authenticateRequest();
  if (!auth.user) return auth.response;
  const database = getDatabase();
  if (!database) return setupRequired();

  const [enrollments, progress, versionedProgress, attempts, activeAttempts, submissions, submittedProjectVersions] = await Promise.all([
    database.enrollment.findMany({
      where: { userId: auth.user.id, courseVersion: { publishedAt: { not: null } } },
      orderBy: { enrolledAt: "desc" },
      include: { courseVersion: { select: { courseId: true, version: true, title: true } } },
    }),
    database.learningProgress.findMany({
      where: { userId: auth.user.id },
      orderBy: { updatedAt: "desc" },
      select: { contentType: true, contentId: true, state: true, readAt: true, updatedAt: true },
    }),
    database.versionedLearningProgress.findMany({
      where: { userId: auth.user.id, courseVersion: { publishedAt: { not: null } } },
      orderBy: { updatedAt: "desc" },
      select: {
        contentType: true, contentId: true, state: true, readAt: true, updatedAt: true,
        lessonId: true,
        courseVersion: { select: { courseId: true, version: true } },
        snapshot: { select: { slug: true, metadata: true } },
      },
    }),
    database.attempt.findMany({
      where: { userId: auth.user.id, status: "submitted" },
      orderBy: { startedAt: "desc" },
      take: 50,
      select: {
        id: true,
        assessmentVersion: true,
        status: true,
        scorePercent: true,
        passed: true,
        startedAt: true,
        submittedAt: true,
        assessment: { select: { id: true, key: true, title: true } },
        responses: { where: { correct: false }, select: { question: { select: { topicTags: true } } } },
      },
    }),
    database.attempt.findMany({
      where: { userId: auth.user.id, status: "in_progress" },
      orderBy: { startedAt: "desc" },
      select: {
        id: true,
        assessmentVersion: true,
        status: true,
        scorePercent: true,
        passed: true,
        startedAt: true,
        submittedAt: true,
        assessment: { select: { id: true, key: true, title: true } },
        responses: { where: { correct: false }, select: { question: { select: { topicTags: true } } } },
      },
    }),
    database.projectSubmission.findMany({
      where: { userId: auth.user.id },
      orderBy: { submittedAt: "desc" },
      take: 50,
      select: {
        id: true,
        projectId: true,
        courseVersionId: true,
        courseVersion: { select: { courseId: true, version: true } },
        repositoryUrl: true,
        commitSha: true,
        submittedAt: true,
      },
    }),
    database.courseVersion.findMany({
      where: { submissions: { some: { userId: auth.user.id } } },
      select: { courseId: true, version: true },
    }),
  ]);

  const weakTopicCounts = new Map<string, number>();
  const sectionLocations = new Map(lessons.flatMap((lesson) =>
    lesson.sections.map((section) => [section.id, { lessonId: lesson.id, lessonSlug: lesson.slug, sectionId: section.id }] as const),
  ));
  const versionedLocations = versionedProgress
    .filter((item) => item.contentType === "section")
    .map((item) => ({
      updatedAt: item.updatedAt,
      location: { lessonId: item.lessonId, lessonSlug: item.snapshot.slug, sectionId: item.contentId, version: item.courseVersion.version, lesson: item.snapshot.metadata },
    }));
  const mappedLegacyKeys = new Set(versionedProgress.map((item) => `${item.contentType}:${item.contentId}`));
  const legacyLocations = progress
    .filter((item) => item.contentType === "section" && !mappedLegacyKeys.has(`${item.contentType}:${item.contentId}`))
    .map((item) => ({ updatedAt: item.updatedAt, location: sectionLocations.get(item.contentId) }))
    .filter((item): item is { updatedAt: Date; location: NonNullable<typeof item.location> } => item.location !== undefined);
  const resumeLocation = [...versionedLocations, ...legacyLocations]
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0]?.location ?? null;
  for (const attempt of attempts) {
    for (const response of attempt.responses) {
      for (const tag of response.question.topicTags) {
        weakTopicCounts.set(tag, (weakTopicCounts.get(tag) ?? 0) + 1);
      }
    }
  }

  return noStoreJson({
    enrollments,
    progress: [
      ...progress,
      ...versionedProgress.map(({ courseVersion, ...item }) => ({ ...item, courseVersion: { courseId: courseVersion.courseId, version: courseVersion.version } })),
    ],
    resumeLocation,
    attempts: [...activeAttempts, ...attempts].map((attempt) => ({
      id: attempt.id,
      assessmentVersion: attempt.assessmentVersion,
      status: attempt.status,
      scorePercent: attempt.scorePercent,
      passed: attempt.passed,
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,
      assessment: attempt.assessment,
    })),
    submissions: submissions.map((submission) => ({ ...submission, status: "submitted—self-reported" })),
    submittedProjectVersions,
    weakTopics: [...weakTopicCounts].map(([topicId, misses]) => ({ topicId, misses })).sort((a, b) => b.misses - a.misses),
  });
}
