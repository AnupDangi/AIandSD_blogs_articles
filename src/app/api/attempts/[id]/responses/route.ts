import { NextResponse } from "next/server";
import { z } from "zod";
import { parseQuestionSnapshots } from "@/lib/assessment-contract";
import { getDatabase } from "@/lib/server/db";
import { authenticateRequest, badRequest, noStoreJson, readJson, rejectCrossOrigin, setupRequired } from "@/lib/server/http";

const inputSchema = z.object({
  questionKey: z.string().trim().min(1).max(120),
  choiceId: z.string().trim().min(1).max(80),
}).strict();
type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;
  const auth = await authenticateRequest();
  if (!auth.user) return auth.response;
  const database = getDatabase();
  if (!database) return setupRequired();
  const parsed = inputSchema.safeParse(await readJson(request));
  if (!parsed.success) return badRequest();
  const { id } = await context.params;
  const attempt = await database.attempt.findFirst({
    where: { id, userId: auth.user.id },
    include: { assessment: { include: { questions: { orderBy: { position: "asc" }, select: { id: true, key: true, position: true, prompt: true } } } } },
  });
  if (!attempt) return NextResponse.json({ error: "attempt_not_found" }, { status: 404 });
  if (attempt.status !== "in_progress") return NextResponse.json({ error: "attempt_already_submitted" }, { status: 409 });
  const questions = parseQuestionSnapshots(attempt.assessment.questions.map(({ key, position, prompt }) => ({ key, position, prompt })));
  if (!questions) return NextResponse.json({ error: "assessment_content_invalid" }, { status: 503 });
  const question = attempt.assessment.questions.find(({ key }) => key === parsed.data.questionKey);
  const snapshot = questions.find(({ key }) => key === parsed.data.questionKey);
  if (!question || !snapshot || !snapshot.prompt.choices.some(({ id: choiceId }) => choiceId === parsed.data.choiceId)) {
    return badRequest("Choose a published option for one question in this attempt.");
  }

  try {
    const saved = await database.$transaction(async (transaction) => {
      // A row update locks this attempt against grading. The status check is
      // repeated after the lock so a late autosave cannot follow submission.
      const claimed = await transaction.attempt.updateMany({
        where: { id, userId: auth.user.id, status: "in_progress" },
        data: { status: "in_progress" },
      });
      if (claimed.count !== 1) return false;
      await transaction.attemptDraftResponse.upsert({
        where: { attemptId_questionId: { attemptId: id, questionId: question.id } },
        create: { attemptId: id, questionId: question.id, choiceId: parsed.data.choiceId },
        update: { choiceId: parsed.data.choiceId },
      });
      return true;
    });
    if (!saved) return NextResponse.json({ error: "attempt_already_submitted" }, { status: 409 });
  } catch {
    return NextResponse.json({ error: "attempt_conflict" }, { status: 409 });
  }
  return noStoreJson({ attemptId: id, questionKey: question.key, choiceId: parsed.data.choiceId });
}
