import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateRequest, badRequest, noStoreJson, readJson, rejectCrossOrigin, setupRequired } from "@/lib/server/http";
import { getDatabase } from "@/lib/server/db";
import { lessons } from "@/content/catalog";
import type { Lesson } from "@/content/types";
import courseManifest from "../../../../curriculum/applied-ai-course.json";
import {
  expireOldReservations,
  markTutorCallInFlight,
  reconcileTutorCall,
  reserveTutorCall,
  retainTutorCall,
  TUTOR_MAX_REQUEST_BYTES,
} from "@/lib/server/ai-budget";
import { getTutorApiKey, getTutorModel, getTutorProvider, sanitizeObservation, selectAuthoredHint } from "@/lib/server/ai-tutor";

const inputSchema = z.object({
  idempotencyKey: z.string().trim().min(8).max(120),
  lessonId: z.string().trim().min(1).max(80),
  sectionId: z.string().trim().min(1).max(100),
  courseVersion: z.number().int().positive().optional(),
  observation: z.string().max(1200).optional(),
}).strict();
/** Keep approved hint selection aligned with the repository's public course version. */
const TUTOR_CONTENT_VERSION = courseManifest.version;
const hintListSchema = z.array(z.object({
  id: z.string().min(1).max(80),
  level: z.number().int().min(1).max(3),
  text: z.string().min(1).max(1200),
  followUp: z.string().max(500).optional(),
  misconceptionTags: z.array(z.string().min(1).max(48)).max(4).default([]),
}).strict()).max(18);

export async function POST(request: Request) {
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;
  const auth = await authenticateRequest();
  if (!auth.user) return auth.response;
  const database = getDatabase();
  if (!database) return setupRequired();
  const parsed = inputSchema.safeParse(await readJson(request));
  if (!parsed.success) return badRequest();

  // Resolve the learner-supplied section against repository-owned published course content
  // before any private hint-pack query. The pair also prevents mixing a valid section with
  // a different lesson's key.
  let lesson = lessons.find((candidate) => candidate.id === parsed.data.lessonId);
  let contentVersion = TUTOR_CONTENT_VERSION;
  if (parsed.data.courseVersion !== undefined) {
    const snapshot = await database.lessonSnapshot.findFirst({
      where: { lessonId: parsed.data.lessonId, courseVersion: { courseId: "applied-ai", version: parsed.data.courseVersion, publishedAt: { not: null } } },
      select: { metadata: true },
    }).catch(() => null);
    lesson = snapshot?.metadata as unknown as Lesson | undefined;
    contentVersion = parsed.data.courseVersion;
  }
  const section = lesson?.sections.find((candidate) => candidate.id === parsed.data.sectionId);
  if (!lesson || !section) return NextResponse.json({ error: "hint_unavailable" }, { status: 404 });
  const taskKey = section.id;

  const now = new Date();
  const apiKey = getTutorApiKey();
  const model = getTutorModel();
  const provider = getTutorProvider();
  const observation = sanitizeObservation(parsed.data.observation);
  const requestFingerprint = createHash("sha256")
    .update(JSON.stringify({ lessonId: lesson.id, sectionId: section.id, contentVersion, observation }))
    .digest("hex");

  try {
    await expireOldReservations(database, now);
    const selected = await database.$transaction(async (transaction) => {
      const existingRequest = await transaction.tutorRequest.findUnique({
        where: { userId_idempotencyKey: { userId: auth.user.id, idempotencyKey: parsed.data.idempotencyKey } },
        select: { id: true, taskKey: true, requestFingerprint: true, response: true, status: true, createdAt: true },
      });
      if (existingRequest) {
        if (existingRequest.taskKey !== taskKey || existingRequest.requestFingerprint !== requestFingerprint) {
          return { kind: "idempotency_conflict" as const };
        }
        if (existingRequest.status === "completed") return { kind: "replay" as const, response: existingRequest.response };
        if (now.getTime() - existingRequest.createdAt.getTime() > 30_000) {
          const completed = await transaction.tutorRequest.updateMany({
            where: { id: existingRequest.id, status: "pending" },
            data: { status: "completed" },
          });
          if (completed.count === 1) return { kind: "replay" as const, response: existingRequest.response };
        }
        return { kind: "pending" as const };
      }

      const pack = await transaction.hintPack.findFirst({
        where: { taskKey: lesson.id, version: contentVersion, approved: true },
        select: { id: true, hints: true, version: true },
      });
      if (!pack) return { kind: "not_found" as const };

      const hints = hintListSchema.safeParse(pack.hints);
      if (!hints.success) return { kind: "unavailable" as const };
      if (new Set(hints.data.map((hint) => hint.id)).size !== hints.data.length) return { kind: "unavailable" as const };
      const sectionHintIds = new Set(section.hints);
      const sessionKey = { userId: auth.user.id, taskKey, hintPackId: pack.id };
      const session = await transaction.hintSession.findUnique({ where: { userId_taskKey_hintPackId: sessionKey } });
      const nextLevel = (session?.lastLevel ?? 0) + 1;
      const eligible = hints.data
        .filter((item) => item.level === nextLevel && sectionHintIds.has(item.id))
        .sort((a, b) => a.id.localeCompare(b.id))
        .slice(0, 6);
      if (eligible.length === 0) return { kind: "complete" as const };
      const fallback = [...eligible].sort((a, b) => a.id.localeCompare(b.id))[0];

      let reservation: { kind: "reserved"; id: string; remainingToday: number } | { kind: "daily_limit" | "monthly_limit" } | null = null;
      if (apiKey && model && eligible.length > 1) {
        reservation = await reserveTutorCall(transaction, { userId: auth.user.id, model, now });
      }

      if (session) {
        const advanced = await transaction.hintSession.updateMany({
          where: { ...sessionKey, lastLevel: session.lastLevel },
          data: { lastLevel: nextLevel },
        });
        if (advanced.count !== 1) throw new Error("hint_session_conflict");
      } else {
        await transaction.hintSession.create({ data: { ...sessionKey, lastLevel: nextLevel } });
      }

      const fallbackResponse = {
        hint: { id: fallback.id, level: fallback.level, text: fallback.text, ...(fallback.followUp ? { followUp: fallback.followUp } : {}) },
        packVersion: pack.version,
        selectionMethod: "authored-fallback" as const,
        ...(reservation?.kind === "reserved" ? { remainingAiRequestsToday: reservation.remainingToday } : {}),
      };
      const requestRecord = await transaction.tutorRequest.create({
        data: {
          userId: auth.user.id,
          idempotencyKey: parsed.data.idempotencyKey,
          taskKey,
          requestFingerprint,
          hintPackId: pack.id,
          response: fallbackResponse,
        },
        select: { id: true },
      });

      return {
        kind: "hint" as const,
        requestId: requestRecord.id,
        fallbackResponse,
        fallback,
        eligible,
        level: nextLevel,
        version: pack.version,
        reservation: reservation?.kind === "reserved" ? reservation : null,
      };
    }, { isolationLevel: "Serializable" });

    if (selected.kind === "not_found") return NextResponse.json({ error: "hint_unavailable" }, { status: 404 });
    if (selected.kind === "unavailable") return NextResponse.json({ error: "hint_pack_unavailable" }, { status: 503 });
    if (selected.kind === "idempotency_conflict") return NextResponse.json({ error: "idempotency_key_conflict" }, { status: 409 });
    if (selected.kind === "replay") return noStoreJson(selected.response);
    if (selected.kind === "pending") return noStoreJson({ pending: true, message: "The same hint request is still processing. Retry shortly to receive its saved result." }, { status: 202, headers: { "Retry-After": "1" } });
    if (selected.kind === "complete") return noStoreJson({ message: "No further hints are available for this task." });
    let hint = selected.fallback;
    let selectionMethod: "model" | "authored-fallback" = "authored-fallback";

    if (selected.reservation && apiKey && model && await markTutorCallInFlight(database, selected.reservation.id)) {
      const modelResult = await selectAuthoredHint({
        apiKey,
        provider: provider ?? "openai",
        model,
        taskKey,
        level: selected.level,
        sectionContext: {
          lessonTitle: lesson.title,
          sectionTitle: section.title,
          sectionSummary: section.summary,
          activity: section.activity,
        },
        observation,
        candidates: selected.eligible.map(({ id, level, misconceptionTags }) => ({ id, level, misconceptionTags })),
        maxRequestBytes: TUTOR_MAX_REQUEST_BYTES,
      });
      if (modelResult.usage) {
        try {
          await reconcileTutorCall(database, selected.reservation.id, modelResult.usage, new Date());
        } catch {
          await retainTutorCall(database, selected.reservation.id, new Date(), modelResult.usage).catch(() => undefined);
        }
      } else {
        await retainTutorCall(database, selected.reservation.id, new Date()).catch(() => undefined);
      }

      const approvedChoice = selected.eligible.find((candidate) => candidate.id === modelResult.selectedId);
      if (approvedChoice) {
        hint = approvedChoice;
        selectionMethod = "model";
      }
    }

    const responsePayload = {
      hint: { id: hint.id, level: hint.level, text: hint.text, ...(hint.followUp ? { followUp: hint.followUp } : {}) },
      packVersion: selected.version,
      selectionMethod,
      ...(selected.reservation ? { remainingAiRequestsToday: selected.reservation.remainingToday } : {}),
    };
    const completed = await database.tutorRequest.updateMany({
      where: { id: selected.requestId, status: "pending" },
      data: { response: responsePayload, status: "completed" },
    });
    if (completed.count === 1) return noStoreJson(responsePayload);
    const saved = await database.tutorRequest.findUnique({ where: { id: selected.requestId }, select: { response: true, status: true } });
    if (saved?.status === "completed") return noStoreJson(saved.response);
    return noStoreJson({ pending: true, message: "The same hint request is still processing. Retry shortly to receive its saved result." }, { status: 202, headers: { "Retry-After": "1" } });
  } catch {
    const existingRequest = await database.tutorRequest.findUnique({
      where: { userId_idempotencyKey: { userId: auth.user.id, idempotencyKey: parsed.data.idempotencyKey } },
      select: { taskKey: true, requestFingerprint: true, response: true, status: true, createdAt: true },
    }).catch(() => null);
    if (existingRequest && (existingRequest.taskKey !== taskKey || existingRequest.requestFingerprint !== requestFingerprint)) {
      return NextResponse.json({ error: "idempotency_key_conflict" }, { status: 409 });
    }
    if (existingRequest?.status === "completed") return noStoreJson(existingRequest.response);
    if (existingRequest && new Date().getTime() - existingRequest.createdAt.getTime() > 30_000) {
      await database.tutorRequest.updateMany({
        where: { userId: auth.user.id, idempotencyKey: parsed.data.idempotencyKey, status: "pending" },
        data: { status: "completed" },
      }).catch(() => undefined);
      const saved = await database.tutorRequest.findUnique({
        where: { userId_idempotencyKey: { userId: auth.user.id, idempotencyKey: parsed.data.idempotencyKey } },
        select: { response: true, status: true },
      }).catch(() => null);
      if (saved?.status === "completed") return noStoreJson(saved.response);
    }
    if (existingRequest) return noStoreJson({ pending: true, message: "The same hint request is still processing. Retry shortly to receive its saved result." }, { status: 202, headers: { "Retry-After": "1" } });
    return NextResponse.json({ error: "hint_unavailable" }, { status: 503 });
  }
}
