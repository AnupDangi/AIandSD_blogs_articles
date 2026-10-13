import { NextResponse } from "next/server";
import { parseQuestionSnapshots } from "@/lib/assessment-contract";
import { getDatabase } from "@/lib/server/db";
import { authenticateRequest, noStoreJson, setupRequired } from "@/lib/server/http";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const auth = await authenticateRequest();
  if (!auth.user) return auth.response;
  const database = getDatabase();
  if (!database) return setupRequired();
  const { id } = await context.params;
  const attempt = await database.attempt.findFirst({
    where: { id, userId: auth.user.id },
    include: {
      assessment: { include: { questions: { orderBy: { position: "asc" }, select: { key: true, position: true, prompt: true } } } },
      draftResponses: { select: { choiceId: true, question: { select: { key: true } } } },
      responses: { select: { response: true, question: { select: { key: true } } } },
    },
  });
  if (!attempt) return NextResponse.json({ error: "attempt_not_found" }, { status: 404 });
  const questions = parseQuestionSnapshots(attempt.assessment.questions);
  if (!questions) return NextResponse.json({ error: "assessment_content_invalid" }, { status: 503 });
  const saved = attempt.status === "submitted"
    ? attempt.responses.map(({ question, response }) => [question.key, response] as const)
    : attempt.draftResponses.map(({ question, choiceId }) => [question.key, choiceId] as const);
  return noStoreJson({
    attemptId: attempt.id,
    status: attempt.status,
    assessment: { id: attempt.assessment.key, title: attempt.assessment.title, version: attempt.assessmentVersion },
    questions,
    responses: Object.fromEntries(saved.filter((entry): entry is readonly [string, string] => typeof entry[1] === "string")),
  });
}
