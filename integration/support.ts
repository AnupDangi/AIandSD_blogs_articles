import { AsyncLocalStorage } from "node:async_hooks";
import { getDatabase } from "../src/lib/server/db";
import { requireIntegrationDatabaseUrl } from "../scripts/integration-database";
import courseManifest from "../curriculum/applied-ai-course.json";
import { lessons } from "../src/content/catalog";

export const identities = new AsyncLocalStorage<string>();
export function asUser<T>(userId: string, operation: () => T): T {
  return identities.run(userId, operation);
}

export async function resetDatabase() {
  const lesson = lessons.find(({ id }) => id === "ai-01")!;
  const target = requireIntegrationDatabaseUrl(process.env);
  if (target !== process.env.DATABASE_URL) throw new Error("The Prisma runtime must use the explicit local test target.");
  const db = getDatabase();
  if (!db) throw new Error("Local test database is not configured.");
  // This cleanup is restricted by the independent loopback/test-name/test-role
  // guard above. Tests run sequentially and never reset a Supabase target.
  await db.$transaction([
    db.aiUsageReservation.deleteMany(), db.aiBudgetPeriod.deleteMany(), db.aiRequestQuota.deleteMany(),
    db.hintSession.deleteMany(), db.tutorRequest.deleteMany(), db.hintPack.deleteMany(),
    db.attemptResponse.deleteMany(), db.attempt.deleteMany(), db.assessmentQuestion.deleteMany(),
    db.assessment.deleteMany(), db.projectSubmission.deleteMany(), db.project.deleteMany(),
    db.enrollment.deleteMany(), db.versionedLearningProgress.deleteMany(), db.lessonSnapshot.deleteMany(),
    db.courseVersion.deleteMany(), db.learningProgress.deleteMany(), db.bookmark.deleteMany(),
    db.profile.deleteMany(),
  ]);
  const courseVersion = await db.courseVersion.create({ data: {
    courseId: "applied-ai", version: courseManifest.version, title: "Synthetic acceptance course", publishedAt: new Date(),
  } });
  await db.lessonSnapshot.create({ data: {
    courseVersionId: courseVersion.id,
    lessonId: "ai-01",
    slug: lesson.slug,
    title: lesson.title,
    chapter: lesson.chapter,
    sourcePath: lesson.sourceDraft,
    contentMarkdown: "# Immutable v1 lesson\n\nOriginal version text.",
    contentSha256: "fixture-v1-hash",
    metadata: lesson,
  } });
  const assessment = await db.assessment.create({ data: {
    key: "acceptance-assessment", courseVersionId: courseVersion.id, title: "Synthetic assessment", version: 1,
    passPercent: 80, publishedAt: new Date(), questions: { create: {
      key: "q1", position: 0,
      prompt: { prompt: "Which measurement uses labeled relevant documents?", choices: [{ id: "a", text: "Retrieval recall" }, { id: "b", text: "Request latency" }] },
      answerKey: "a", topicTags: ["retrieval"], feedback: "Compare returned evidence with the labeled relevant set.",
    } },
  } });
  const project = await db.project.create({ data: {
    id: "ai-milestone-01", courseVersionId: courseVersion.id, title: "Synthetic project", publishedAt: new Date(),
  } });
  const hintPack = await db.hintPack.create({ data: {
    taskKey: "ai-01", version: courseManifest.version, approved: true,
    hints: [1, 2, 3].flatMap((level) => [
      { id: `ai-01-hint-${level}`, level, text: `Authored concept reminder ${level}: inspect the service boundary.`, misconceptionTags: ["boundary"] },
      { id: `ai-01-hint-${level}-alternate`, level, text: `Authored diagnostic hint ${level}: compare the recorded evidence.`, misconceptionTags: ["evidence"] },
    ]),
  } });
  return { db, courseVersion, assessment, project, hintPack };
}
