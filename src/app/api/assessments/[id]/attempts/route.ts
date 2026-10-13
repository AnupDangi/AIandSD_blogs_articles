import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateRequest, badRequest, noStoreJson, readJson, rejectCrossOrigin, setupRequired } from "@/lib/server/http";
import { getDatabase } from "@/lib/server/db";
import { parseQuestionSnapshots } from "@/lib/assessment-contract";

const inputSchema = z.object({
  courseId: z.string().trim().min(1).max(120),
  courseVersion: z.number().int().positive().optional(),
  idempotencyKey: z.string().trim().min(8).max(120).optional(),
}).strict();

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;
  const auth = await authenticateRequest();
  if (!auth.user) return auth.response;
  const database = getDatabase();
  if (!database) return setupRequired();
  const { id: assessmentKey } = await context.params;
  const parsed = inputSchema.safeParse(await readJson(request) ?? {});
  if (!parsed.success) return badRequest();

  const idempotencyKey = parsed.data.idempotencyKey;
  if (idempotencyKey) {
    const existing = await database.attempt.findUnique({
      where: { userId_idempotencyKey: { userId: auth.user.id, idempotencyKey } },
      include: { assessment: { include: { courseVersion: { select: { courseId: true, version: true } }, questions: { orderBy: { position: "asc" }, select: { key: true, position: true, prompt: true } } } } },
    });
    if (existing) {
      if (existing.assessment.key !== assessmentKey || existing.assessment.courseVersion.courseId !== parsed.data.courseId || (parsed.data.courseVersion !== undefined && existing.assessment.courseVersion.version !== parsed.data.courseVersion)) {
        return NextResponse.json({ error: "idempotency_key_conflict" }, { status: 409 });
      }
      const savedQuestions = parseQuestionSnapshots(existing.assessment.questions);
      if (!savedQuestions) return NextResponse.json({ error: "assessment_content_invalid" }, { status: 503 });
      return noStoreJson({
        attemptId: existing.id,
        status: existing.status,
        assessment: { id: assessmentKey, title: existing.assessment.title, version: existing.assessmentVersion },
        questions: savedQuestions,
      });
    }
  }

  const assessment = await database.assessment.findFirst({
    where: {
      key: assessmentKey,
      publishedAt: { not: null },
      ...(parsed.data.courseVersion !== undefined ? { courseVersion: { courseId: parsed.data.courseId, version: parsed.data.courseVersion, publishedAt: { not: null } } } : {}),
      ...(parsed.data.courseVersion === undefined ? { courseVersion: { courseId: parsed.data.courseId, publishedAt: { not: null } } } : {}),
    },
    orderBy: { version: "desc" },
    include: { questions: { orderBy: { position: "asc" }, select: { id: true, key: true, position: true, prompt: true } } },
  });
  if (!assessment) return NextResponse.json({ error: "assessment_not_found" }, { status: 404 });
  const questions = parseQuestionSnapshots(assessment.questions.map(({ key, position, prompt }) => ({ key, position, prompt })));
  if (!questions) return NextResponse.json({ error: "assessment_content_invalid" }, { status: 503 });

  let attempt: { id: string; status: string; assessmentVersion: number };
  try {
    attempt = await database.$transaction(async (transaction) => {
      const created = await transaction.attempt.create({
        data: {
          userId: auth.user.id,
          assessmentId: assessment.id,
          assessmentVersion: assessment.version,
          idempotencyKey,
        },
        select: { id: true, status: true, assessmentVersion: true },
      });
      await transaction.enrollment.upsert({
        where: { userId_courseVersionId: { userId: auth.user.id, courseVersionId: assessment.courseVersionId } },
        create: { userId: auth.user.id, courseVersionId: assessment.courseVersionId },
        update: {},
      });
      return created;
    });
  } catch {
    if (!idempotencyKey) return NextResponse.json({ error: "attempt_conflict" }, { status: 409 });
    const raced = await database.attempt.findUnique({
      where: { userId_idempotencyKey: { userId: auth.user.id, idempotencyKey } },
      include: { assessment: { include: { courseVersion: { select: { courseId: true, version: true } }, questions: { orderBy: { position: "asc" }, select: { key: true, position: true, prompt: true } } } } },
    });
    if (!raced || raced.assessment.key !== assessmentKey || raced.assessment.courseVersion.courseId !== parsed.data.courseId || (parsed.data.courseVersion !== undefined && raced.assessment.courseVersion.version !== parsed.data.courseVersion)) return NextResponse.json({ error: "attempt_conflict" }, { status: 409 });
    const savedQuestions = parseQuestionSnapshots(raced.assessment.questions);
    if (!savedQuestions) return NextResponse.json({ error: "assessment_content_invalid" }, { status: 503 });
    return noStoreJson({
      attemptId: raced.id,
      status: raced.status,
      assessment: { id: assessmentKey, title: raced.assessment.title, version: raced.assessmentVersion },
      questions: savedQuestions,
    });
  }

  return noStoreJson({
    attemptId: attempt.id,
    status: attempt.status,
    assessment: { id: assessmentKey, title: assessment.title, version: attempt.assessmentVersion },
    questions,
  }, { status: 201 });
}
