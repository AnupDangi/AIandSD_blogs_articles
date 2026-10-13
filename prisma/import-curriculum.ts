import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "../src/generated/prisma/client";
import { buildLessonSnapshots } from "./lesson-snapshot";
import { mapLegacyProgressToVersion, shouldBackfillLegacyProgress } from "./lesson-progress-backfill";
import { z } from "zod";
import { courses, lessons, questions } from "../src/content/catalog";
import resourceManifest from "../curriculum/resources.json";
import { validateFormativeAnswerPattern } from "./import-integrity";
import { thresholdToPercent } from "./assessment-threshold";
import { orderAssessmentChoices } from "../src/lib/assessment-order";
import { assessmentFeedbackBundleSchema, assertFeedbackDoesNotRepeatAnswers, validateAssessmentFeedback } from "./assessment-feedback";
import { assertAuthoredHintPacksAreSafe } from "./assessment-hint-safety";
import { assertImportTargetIdentity, requireDirectUrl, type ImportTarget } from "./target-guards";
import { assertPublicationReviewEvidence, reviewBundleSha256, type PublicationReviewEvidence } from "./publication-review";

const PRIVATE_DIR = join(process.cwd(), "curriculum", "private");
const require = createRequire(import.meta.url);
const { loadEnvConfig } = require("@next/env") as typeof import("@next/env");
const questionKeyFileSchema = z.object({
  status: z.literal("private-grading-fixture"),
  courseId: z.string(),
  version: z.number().int().positive(),
  keys: z.array(z.object({
    questionId: z.string().min(1),
    assessmentId: z.string().min(1),
    correctChoiceId: z.string().min(1),
  }).strict()).min(1),
}).strict();
const hintFileSchema = z.object({
  visibility: z.literal("protected-import-required"),
  note: z.string().max(500).optional(),
  hints: z.array(z.object({
    lessonId: z.string().min(1),
    levels: z.array(z.object({
      id: z.string().min(1).max(80),
      level: z.number().int().min(1).max(3),
      label: z.string().min(1).max(100),
      text: z.string().min(1).max(1200),
      misconceptionTags: z.array(z.string().min(1).max(48)).max(4).default([]),
    }).strict()).min(3).max(18),
  }).strict()).min(1),
}).strict();
const reviewRecordSchema = z.object({
  status: z.enum(["pending", "reviewed"]),
  reviewer: z.string().nullable(),
  reviewedAt: z.string().nullable(),
  sha256: z.string().nullable(),
  itemCount: z.number().int().nonnegative(),
}).strict();
const publicationReviewSchema = z.object({
  courseId: z.string(),
  version: z.number().int().positive(),
  assessment: reviewRecordSchema,
  hints: reviewRecordSchema,
}).strict();

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8")) as unknown;
}

function parseArguments() {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== "--check" && arg !== "--publish" && arg !== "--publish-staging")) {
    throw new Error("Only --check, --publish-staging, or --publish is supported.");
  }
  if (args.filter((arg) => arg !== "--check").length > 1 || (args.includes("--check") && args.length > 1)) {
    throw new Error("Choose exactly one importer mode.");
  }
  return {
    checkOnly: args.includes("--check"),
    publishProduction: args.includes("--publish"),
    publishStaging: args.includes("--publish-staging"),
  };
}

function buildImportPlan(publicationTarget: "staging" | "production" | null) {
  const publish = publicationTarget !== null;
  const course = courses.find((entry) => entry.id === "applied-ai");
  if (!course) throw new Error("The Applied AI course is missing from the public catalog.");
  if (course.modules.length !== 8) throw new Error("The flagship course must define exactly eight milestone modules.");
  const courseManifest = readJson(join(process.cwd(), "curriculum", "applied-ai-course.json")) as {
    courseId?: unknown;
    version?: unknown;
    publicationStatus?: unknown;
    readiness?: unknown;
    modules?: Array<{ id?: unknown; assessmentId?: unknown }>;
    finalAssessment?: { passThreshold?: unknown };
  };
  const keys = questionKeyFileSchema.parse(readJson(join(PRIVATE_DIR, "assessment-keys.json")));
  const authoredHints = hintFileSchema.parse(readJson(join(PRIVATE_DIR, "authored-hints.json")));
  const assessmentFeedbackBundles = [
    "formative.json",
    "foundations-workflows.json",
    "evaluation-safety.json",
    "efficiency-capstone-final.json",
  ].map((filename) => assessmentFeedbackBundleSchema.parse(readJson(join(PRIVATE_DIR, "assessment-feedback", filename))));
  const assessmentFeedback = validateAssessmentFeedback(questions, assessmentFeedbackBundles, course.id, keys.version);

  if (courseManifest.courseId !== course.id || keys.courseId !== course.id) throw new Error("Course IDs do not match the private import bundle.");
  if (courseManifest.version !== keys.version) throw new Error("Curriculum and private answer bundle versions do not match.");
  if (questions.length !== 310 || keys.keys.length !== questions.length) throw new Error("The public question bank and private answer key must contain exactly 310 matching questions.");
  if (new Set(questions.map((question) => question.id)).size !== questions.length) throw new Error("Public question IDs must be unique.");

  const publicQuestions = new Map(questions.map((question) => [question.id, question]));
  const privateKeys = new Map<string, (typeof keys.keys)[number]>();
  for (const entry of keys.keys) {
    if (privateKeys.has(entry.questionId)) throw new Error("The private answer bundle contains duplicate question IDs.");
    const question = publicQuestions.get(entry.questionId);
    if (!question || question.assessmentId !== entry.assessmentId) throw new Error("The private answer bundle does not match the public question manifest.");
    if (!question.choices.some((choice) => choice.id === entry.correctChoiceId)) throw new Error("A private answer key points to a choice that is not present in its public question.");
    privateKeys.set(entry.questionId, entry);
  }
  if (publicQuestions.size !== privateKeys.size || [...publicQuestions.keys()].some((id) => !privateKeys.has(id))) {
    throw new Error("Every public question must have exactly one private answer key.");
  }
  assertAuthoredHintPacksAreSafe(
    questions,
    new Map(keys.keys.map(({ questionId, correctChoiceId }) => [questionId, correctChoiceId])),
    authoredHints.hints,
  );
  assertFeedbackDoesNotRepeatAnswers(
    questions,
    new Map(keys.keys.map(({ questionId, correctChoiceId }) => [questionId, correctChoiceId])),
    assessmentFeedback,
  );
  const formativeQuestions = questions.filter((question) => question.kind === "formative");
  const formativeIds = new Set(formativeQuestions.map(({ id }) => id));
  validateFormativeAnswerPattern(
    formativeQuestions.map((question) => ({ id: question.id, choiceIds: question.choices.map((choice) => choice.id) })),
    keys.keys.filter(({ questionId }) => formativeIds.has(questionId)).map(({ questionId, correctChoiceId }) => ({ questionId, correctChoiceId })),
  );

  const lessonIds = new Set(lessons.map((lesson) => lesson.id));
  if (authoredHints.hints.length !== lessons.length || new Set(authoredHints.hints.map((entry) => entry.lessonId)).size !== authoredHints.hints.length) {
    throw new Error("The protected hint bundle must contain one pack for every course lesson.");
  }
  for (const hintPack of authoredHints.hints) {
    if (!lessonIds.has(hintPack.lessonId)) throw new Error("The protected hint bundle references an unknown lesson.");
    if ([1, 2, 3].some((level) => !hintPack.levels.some((entry) => entry.level === level))) throw new Error("Each protected hint pack must include at least one hint for levels one through three.");
    if (new Set(hintPack.levels.map((entry) => entry.id)).size !== hintPack.levels.length) throw new Error("Protected hint IDs must be unique within each lesson.");
  }
  const privateHintIdsByLesson = new Map(authoredHints.hints.map((pack) => [pack.lessonId, new Set(pack.levels.map((hint) => hint.id))]));
  const privateHintLevelsByLesson = new Map(authoredHints.hints.map((pack) => [
    pack.lessonId,
    new Map(pack.levels.map((hint) => [hint.id, hint.level])),
  ]));
  for (const lesson of lessons) {
    const privateHintIds = privateHintIdsByLesson.get(lesson.id);
    const privateHintLevels = privateHintLevelsByLesson.get(lesson.id);
    if (!privateHintIds || lesson.sections.some((section) =>
      section.hints.length === 0 || section.hints.some((hintId) => !privateHintIds.has(hintId)))) {
      throw new Error("Every lesson section must explicitly allowlist only IDs from its protected hint pack.");
    }
    if (!privateHintLevels || lesson.sections.some((section) =>
      [1, 2, 3].some((level) => !section.hints.some((hintId) => privateHintLevels.get(hintId) === level)))) {
      throw new Error("Every lesson section must allow at least one protected hint at each of the three levels.");
    }
  }

  const publishAt = publish ? new Date() : null;
  const assessmentTitles = new Map<string, { title: string; passPercent: number }>();
  for (const assessment of courseManifest.modules ?? []) {
    if (typeof assessment.id !== "string" || typeof assessment.assessmentId !== "string") continue;
    const courseModule = course.modules.find((candidate) => candidate.id === assessment.id);
    if (courseModule) assessmentTitles.set(assessment.assessmentId, { title: courseModule.title, passPercent: 80 });
  }
  for (const lesson of lessons) assessmentTitles.set(`${lesson.id}-formative`, { title: `${lesson.title} practice`, passPercent: 80 });
  const finalThreshold = courseManifest.finalAssessment?.passThreshold;
  assessmentTitles.set("final-assessment", {
    title: "Final assessment",
    passPercent: finalThreshold === undefined ? 80 : thresholdToPercent(finalThreshold),
  });

  const groupedQuestions = new Map<string, typeof questions>();
  for (const question of questions) {
    const group = groupedQuestions.get(question.assessmentId) ?? [];
    group.push(question);
    groupedQuestions.set(question.assessmentId, group);
  }
  if ([...groupedQuestions.keys()].some((assessmentId) => !assessmentTitles.has(assessmentId))) {
    throw new Error("A public question references an assessment that is not present in the course manifest.");
  }

  if (publicationTarget === "production") {
    if (course.status !== "complete" || courseManifest.publicationStatus !== "complete" || courseManifest.readiness !== "ready" || lessons.some((lesson) => lesson.contentStatus !== "reviewed")) {
      throw new Error("Publishing requires a complete, ready course with every lesson marked reviewed.");
    }
    let reviewEvidence: PublicationReviewEvidence;
    try {
      reviewEvidence = publicationReviewSchema.parse(readJson(join(PRIVATE_DIR, "publication-review.json")));
    } catch {
      throw new Error("Publishing requires a valid private curriculum/private/publication-review.json sign-off artifact.");
    }
    assertPublicationReviewEvidence(reviewEvidence, {
      courseId: course.id,
      version: keys.version,
      assessmentSha256: reviewBundleSha256({ courseId: course.id, version: keys.version, questions, keys: keys.keys, feedback: [...assessmentFeedback] }),
      questionCount: questions.length,
      hintSha256: reviewBundleSha256({ courseId: course.id, version: keys.version, hints: authoredHints.hints }),
      hintPackCount: authoredHints.hints.length,
    });
  }

  return {
    course,
    version: keys.version,
    publishAt,
    reviewFingerprints: {
      assessment: reviewBundleSha256({ courseId: course.id, version: keys.version, questions, keys: keys.keys, feedback: [...assessmentFeedback] }),
      hints: reviewBundleSha256({ courseId: course.id, version: keys.version, hints: authoredHints.hints }),
    },
    assessments: [...groupedQuestions].map(([key, group]) => ({
      key,
      ...(assessmentTitles.get(key) as { title: string; passPercent: number }),
      questions: group.map((question, position) => ({
        key: question.id,
        position,
        prompt: { prompt: question.prompt, choices: orderAssessmentChoices(question.id, question.choices) },
        answerKey: (privateKeys.get(question.id) as (typeof keys.keys)[number]).correctChoiceId,
        topicTags: [question.lessonId],
        feedback: assessmentFeedback.get(question.id),
      })),
    })),
    lessons: buildLessonSnapshots(lessons, (sourcePath) => readFileSync(join(process.cwd(), sourcePath), "utf8")),
    projects: course.modules.map((courseModule, index) => ({
      id: `ai-milestone-${String(index + 1).padStart(2, "0")}`,
      title: `Milestone ${String(index + 1).padStart(2, "0")}: ${courseModule.milestone}`,
    })),
    hintPacks: authoredHints.hints.map((entry) => ({
      taskKey: entry.lessonId,
      version: keys.version,
      approved: publish,
      hints: entry.levels.map(({ id, level, text, misconceptionTags }) => ({
        id,
        level,
        text,
        misconceptionTags: misconceptionTags.length > 0 ? misconceptionTags : [entry.lessonId],
      })),
    })),
  };
}

async function main() {
  loadEnvConfig(process.cwd());
  const { checkOnly, publishProduction, publishStaging } = parseArguments();
  if (checkOnly) {
    const plan = buildImportPlan(null);
    const questionCount = plan.assessments.reduce((sum, assessment) => sum + assessment.questions.length, 0);
    console.info(`Curriculum import check passed: ${plan.lessons.length} immutable lesson snapshots, ${plan.assessments.length} assessments, ${questionCount} answer keys, ${plan.projects.length} project milestones, ${plan.hintPacks.length} protected hint packs. No database connection was opened.`);
    console.info(`Private assessment review fingerprint: ${plan.reviewFingerprints.assessment}`);
    console.info(`Private hint review fingerprint: ${plan.reviewFingerprints.hints}`);
    return;
  }
  const configuredTarget = process.env.CURRICULUM_IMPORT_TARGET;
  if (publishProduction && configuredTarget !== "production") {
    throw new Error("--publish requires CURRICULUM_IMPORT_TARGET=production.");
  }
  if (publishStaging && configuredTarget !== "staging") throw new Error("--publish-staging requires CURRICULUM_IMPORT_TARGET=staging.");
  if (!publishProduction && !publishStaging && configuredTarget !== "staging") {
    throw new Error("Unpublished staging imports require CURRICULUM_IMPORT_TARGET=staging.");
  }

  const publicationTarget = publishProduction ? "production" : publishStaging ? "staging" : null;
  const plan = buildImportPlan(publicationTarget);
  const importTarget: ImportTarget = publicationTarget ?? "staging";
  const connectionString = requireDirectUrl(process.env);
  assertImportTargetIdentity({
    target: importTarget,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    databaseUrl: connectionString,
    stagingProjectRef: process.env.CURRICULUM_STAGING_PROJECT_REF,
    productionProjectRef: process.env.CURRICULUM_PRODUCTION_PROJECT_REF,
    testTargetEnv: process.env.ACADEMY_IMPORT_TEST_TARGET,
  });

  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  try {
    const existing = await client.courseVersion.findUnique({
      where: { courseId_version: { courseId: plan.course.id, version: plan.version } },
      select: { publishedAt: true },
    });
    if (existing) {
      throw new Error(existing.publishedAt
        ? "This course version is already published and immutable. Increment the source version before importing."
        : "This staging course version already exists. Increment the source version before importing again.");
    }

    let unmappedLegacyProgress = 0;
    let publishedCourseVersionCount = 0;
    let mapsLegacyProgress = false;
    await client.$transaction(async (transaction) => {
      publishedCourseVersionCount = await transaction.courseVersion.count({ where: { courseId: plan.course.id, publishedAt: { not: null } } });
      const courseVersion = await transaction.courseVersion.create({
        data: {
          courseId: plan.course.id,
          version: plan.version,
          title: plan.course.title,
          courseSnapshot: plan.course as unknown as Prisma.InputJsonValue,
          resourceSnapshot: resourceManifest as unknown as Prisma.InputJsonValue,
          publishedAt: plan.publishAt,
        },
      });

      await transaction.lessonSnapshot.createMany({
        data: plan.lessons.map((lesson) => ({
          ...lesson,
          courseVersionId: courseVersion.id,
          metadata: lesson.metadata as unknown as Prisma.InputJsonValue,
        })),
      });

      mapsLegacyProgress = shouldBackfillLegacyProgress(publishedCourseVersionCount, plan.publishAt);
      if (mapsLegacyProgress) {
        const legacyRows = await transaction.learningProgress.findMany({
          where: { contentType: { in: ["lesson", "section"] } },
          select: { userId: true, contentType: true, contentId: true, state: true, readAt: true, updatedAt: true },
        });
        const backfill = mapLegacyProgressToVersion(legacyRows, lessons, courseVersion.id);
        unmappedLegacyProgress = backfill.unmapped.length;
        if (backfill.mapped.length > 0) {
          await transaction.versionedLearningProgress.createMany({ data: backfill.mapped, skipDuplicates: true });
        }
      }

      for (const assessmentData of plan.assessments) {
        const assessment = await transaction.assessment.create({
          data: {
            key: assessmentData.key,
            courseVersionId: courseVersion.id,
            title: assessmentData.title,
            version: plan.version,
            passPercent: assessmentData.passPercent,
            publishedAt: plan.publishAt,
          },
        });
        await transaction.assessmentQuestion.createMany({
          data: assessmentData.questions.map((question) => ({
            ...question,
            assessmentId: assessment.id,
            answerKey: question.answerKey as Prisma.InputJsonValue,
            prompt: question.prompt as Prisma.InputJsonValue,
          })),
        });
      }

      await transaction.project.createMany({
        data: plan.projects.map((project) => ({
          ...project,
          courseVersionId: courseVersion.id,
          publishedAt: plan.publishAt,
        })),
      });

      await transaction.hintPack.createMany({
        data: plan.hintPacks.map((hintPack) => ({
          ...hintPack,
          hints: hintPack.hints as Prisma.InputJsonValue,
        })),
      });
    }, { isolationLevel: "Serializable", maxWait: 10_000, timeout: 60_000 });

    const publicationStatus = publicationTarget
      ? `published to ${publicationTarget}`
      : "unpublished staging";
    console.info(`Imported ${plan.assessments.length} assessments, 310 questions, ${plan.projects.length} project milestones, and ${plan.hintPacks.length} protected hint packs as ${publicationStatus} version ${plan.version}.`);
    console.info(`Stored ${plan.lessons.length} immutable lesson snapshots. ${mapsLegacyProgress ? `Mapped matching legacy lesson/section rows to the first published course version; retained ${unmappedLegacyProgress} unmapped rows.` : "Legacy progress mapping is only performed for the first published course version."}`);
  } finally {
    await client.$disconnect();
  }
}

main().catch((error: unknown) => {
  // Database adapter errors can contain connection details; never print them.
  if (process.argv.includes("--check") && error instanceof Error) {
    console.error(`Curriculum import check failed: ${error.message}`);
  } else {
    console.error("Curriculum import failed. Review the local manifest validation and staging database configuration.");
  }
  process.exitCode = 1;
});
