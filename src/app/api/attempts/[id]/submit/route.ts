import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateRequest, badRequest, noStoreJson, readJson, rejectCrossOrigin, setupRequired } from "@/lib/server/http";
import { getDatabase } from "@/lib/server/db";
import { collectRemediationFeedback, collectRemediationTopics } from "@/lib/assessment-contract";

const inputSchema = z.object({ expectedResponses: z.record(z.string(), z.string()) }).strict();
type RouteContext = { params: Promise<{ id: string }> };

async function submittedResult(database: NonNullable<ReturnType<typeof getDatabase>>, attemptId: string, userId: string) {
  const attempt = await database.attempt.findFirst({
    where: { id: attemptId, userId, status: "submitted" },
    include: { responses: { include: { question: { select: { topicTags: true, feedback: true } } } } },
  });
  if (!attempt) return null;
  return {
    attemptId: attempt.id,
    scorePercent: attempt.scorePercent,
    passed: attempt.passed,
    submittedAt: attempt.submittedAt,
    remediationTopics: collectRemediationTopics(attempt.responses.map((response) => ({ correct: response.correct, topicTags: response.question.topicTags }))),
    remediationFeedback: collectRemediationFeedback(attempt.responses.map((response) => ({ correct: response.correct, topicTags: response.question.topicTags, feedback: response.question.feedback }))),
  };
}

function readChoiceIds(prompt: unknown): string[] | null {
  if (!prompt || typeof prompt !== "object" || Array.isArray(prompt)) return null;
  const choices = (prompt as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length < 2 || choices.length > 8) return null;
  const ids = choices.map((choice) => {
    if (!choice || typeof choice !== "object" || Array.isArray(choice)) return null;
    const id = (choice as { id?: unknown }).id;
    return typeof id === "string" && id.length > 0 ? id : null;
  });
  if (ids.some((id) => id === null)) return null;
  const validIds = ids as string[];
  return new Set(validIds).size === validIds.length ? validIds : null;
}

export async function POST(request: Request, context: RouteContext) {
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;
  const auth = await authenticateRequest();
  if (!auth.user) return auth.response;
  const database = getDatabase();
  if (!database) return setupRequired();
  const parsed = inputSchema.safeParse(await readJson(request));
  if (!parsed.success) return badRequest();
  const { id: attemptId } = await context.params;

  const attempt = await database.attempt.findFirst({
    where: { id: attemptId, userId: auth.user.id },
    include: { assessment: { include: { questions: { orderBy: { position: "asc" } } } } },
  });
  if (!attempt) return NextResponse.json({ error: "attempt_not_found" }, { status: 404 });
  if (attempt.status === "submitted") {
    const result = await submittedResult(database, attempt.id, auth.user.id);
    return result ? noStoreJson(result) : NextResponse.json({ error: "attempt_conflict" }, { status: 409 });
  }

  const questions = attempt.assessment.questions;
  const questionChoices = questions.map((question) => ({ question, choiceIds: readChoiceIds(question.prompt) }));
  if (questions.length === 0 || questionChoices.some(({ question, choiceIds }) =>
    !choiceIds || typeof question.answerKey !== "string" || !choiceIds.includes(question.answerKey))) {
    return NextResponse.json({ error: "assessment_content_invalid" }, { status: 503 });
  }

  try {
    await database.$transaction(async (transaction) => {
      // Claim and lock the attempt before reading its drafts. Autosaves use
      // the same row lock, so grading observes one complete response set.
      const claimed = await transaction.attempt.updateMany({
        where: { id: attempt.id, userId: auth.user.id, status: "in_progress" },
        data: { status: "submitted" },
      });
      if (claimed.count !== 1) throw new Error("attempt_already_submitted");

      const drafts = await transaction.attemptDraftResponse.findMany({ where: { attemptId: attempt.id } });
      const supplied = new Map(drafts.map(({ questionId, choiceId }) => [questionId, choiceId]));
      if (drafts.length !== questions.length || questionChoices.some(({ question, choiceIds }) =>
        !supplied.has(question.id) || !choiceIds?.includes(supplied.get(question.id)!))) {
        throw new Error("incomplete_responses");
      }
      const currentResponses = Object.fromEntries(questionChoices.map(({ question }) => [question.key, supplied.get(question.id)!]));
      const expectedResponses = parsed.data.expectedResponses;
      if (Object.keys(currentResponses).length !== Object.keys(expectedResponses).length ||
        Object.entries(currentResponses).some(([key, choiceId]) => expectedResponses[key] !== choiceId)) {
        throw new Error("responses_changed");
      }
      const graded = questions.map((question) => ({
        question,
        response: supplied.get(question.id)!,
        correct: supplied.get(question.id) === question.answerKey,
      }));
      const scorePercent = Math.round((graded.filter((item) => item.correct).length / graded.length) * 100);
      const passed = scorePercent >= attempt.assessment.passPercent;

      await transaction.attemptResponse.createMany({
        data: graded.map(({ question, response, correct }) => ({
          attemptId: attempt.id,
          questionId: question.id,
          response,
          correct,
        })),
      });
      await transaction.attemptDraftResponse.deleteMany({ where: { attemptId: attempt.id } });
      await transaction.attempt.update({
        where: { id: attempt.id },
        data: { scorePercent, passed, submittedAt: new Date() },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "incomplete_responses") {
      return badRequest("Save a valid response for every question before submitting.");
    }
    if (error instanceof Error && error.message === "responses_changed") {
      return NextResponse.json({ error: "responses_changed" }, { status: 409 });
    }
    const existing = await submittedResult(database, attempt.id, auth.user.id);
    if (existing) return noStoreJson(existing);
    return NextResponse.json({ error: "attempt_conflict" }, { status: 409 });
  }

  const result = await submittedResult(database, attempt.id, auth.user.id);
  return result ? noStoreJson(result) : NextResponse.json({ error: "attempt_conflict" }, { status: 409 });
}
