import { beforeEach, describe, expect, it, vi } from "vitest";

type MockFunction = ReturnType<typeof vi.fn>;
type DatabaseMock = {
  attempt: { findUnique: MockFunction; findFirst: MockFunction; create: MockFunction; updateMany: MockFunction; update: MockFunction };
  assessment: { findFirst: MockFunction };
  enrollment: { upsert: MockFunction };
  attemptResponse: { createMany: MockFunction };
  attemptDraftResponse: { findMany: MockFunction; upsert: MockFunction; deleteMany: MockFunction };
  tutorRequest: { findUnique: MockFunction; create: MockFunction; updateMany: MockFunction };
  hintPack: { findFirst: MockFunction };
  lessonSnapshot: { findFirst: MockFunction };
  hintSession: { findUnique: MockFunction; create: MockFunction; updateMany: MockFunction };
  $transaction: MockFunction;
};

const state = vi.hoisted(() => ({
  userId: "user-a",
  authenticated: true,
  database: null as DatabaseMock | null,
  authCalls: 0,
}));

vi.mock("@/lib/server/http", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/server/http")>();
  return {
    ...actual,
    authenticateRequest: vi.fn(async () => {
      state.authCalls += 1;
      return state.authenticated
        ? { user: { id: state.userId }, response: null }
        : { user: null, response: Response.json({ error: "unauthorized" }, { status: 401 }) };
    }),
  };
});

vi.mock("@/lib/server/db", () => ({ getDatabase: vi.fn(() => state.database) }));
vi.mock("@/generated/prisma/client", () => ({ Prisma: { JsonNull: null } }));
vi.mock("@/lib/server/ai-budget", () => ({
  expireOldReservations: vi.fn(async () => undefined),
  markTutorCallInFlight: vi.fn(async () => false),
  reconcileTutorCall: vi.fn(async () => undefined),
  reserveTutorCall: vi.fn(async () => null),
  retainTutorCall: vi.fn(async () => undefined),
  TUTOR_MAX_REQUEST_BYTES: 16_000,
}));
vi.mock("@/lib/server/ai-tutor", () => ({
  getTutorApiKey: vi.fn(() => null),
  getTutorModel: vi.fn(() => null),
  getTutorProvider: vi.fn(() => null),
  sanitizeObservation: vi.fn((value: string | undefined) => value ?? ""),
  selectAuthoredHint: vi.fn(),
}));

import { POST as startAttempt } from "../src/app/api/assessments/[id]/attempts/route";
import { POST as submitAttempt } from "../src/app/api/attempts/[id]/submit/route";
import { POST as requestTutorHint } from "../src/app/api/tutor/route";
import { reserveTutorCall } from "../src/lib/server/ai-budget";
import { getTutorApiKey, getTutorModel } from "../src/lib/server/ai-tutor";
import courseManifest from "../curriculum/applied-ai-course.json";
import { lessons } from "../src/content/catalog";

const sameOrigin = { origin: "https://academy.test" };
const question = {
  id: "question-1",
  key: "q1",
  position: 1,
  prompt: {
    prompt: "Which retrieval measure captures relevant results?",
    choices: [
      { id: "option-a", text: "Recall" },
      { id: "option-b", text: "Latency" },
    ],
  },
  // The answer is present only on the private grading read used for submission.
  answerKey: "option-a",
  topicTags: ["retrieval"],
  feedback: "Measure retrieval quality against labeled relevant items rather than latency alone.",
  choices: ["recall", "latency"],
};

function jsonRequest(url: string, body: unknown, headers: Record<string, string> = sameOrigin) {
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

type DatabaseOverrides = Omit<Partial<DatabaseMock>, "attempt" | "attemptDraftResponse" | "attemptResponse"> & {
  attempt?: Partial<DatabaseMock["attempt"]>;
  attemptDraftResponse?: Partial<DatabaseMock["attemptDraftResponse"]>;
  attemptResponse?: Partial<DatabaseMock["attemptResponse"]>;
};

function makeDatabase(overrides: DatabaseOverrides = {}): DatabaseMock {
  const database: DatabaseMock = {
    attempt: {
      findUnique: vi.fn(async () => null),
      findFirst: vi.fn(async () => null),
      create: vi.fn(async () => ({ id: "attempt-new", status: "in_progress", assessmentVersion: 1 })),
      updateMany: vi.fn(async () => ({ count: 1 })),
      update: vi.fn(async () => undefined),
    },
    assessment: {
      findFirst: vi.fn(async () => ({
        id: "assessment-db-id",
        key: "module-1",
        title: "Module 1",
        version: 1,
        courseVersionId: "course-version-1",
        courseVersion: { courseId: "applied-ai" },
        questions: [{ id: question.id, key: question.key, position: question.position, prompt: question.prompt }],
        passPercent: 80,
      })),
    },
    enrollment: { upsert: vi.fn(async () => undefined) },
    attemptResponse: { createMany: vi.fn(async () => undefined) },
    attemptDraftResponse: {
      findMany: vi.fn(async () => [{ questionId: question.id, choiceId: "option-a" }]),
      upsert: vi.fn(async () => undefined),
      deleteMany: vi.fn(async () => undefined),
    },
    tutorRequest: {
      findUnique: vi.fn(async () => null),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: `request-${String(data.userId)}` })),
      updateMany: vi.fn(async () => ({ count: 1 })),
    },
    hintPack: {
      findFirst: vi.fn(async () => ({
        id: "pack-ai-01-v1",
        version: 1,
        approved: true,
        hints: [{ id: "ai-01-hint-1", level: 1, text: "Compare the metric with the set of relevant results.", misconceptionTags: [] }],
      })),
    },
    lessonSnapshot: { findFirst: vi.fn(async () => null) },
    hintSession: {
      findUnique: vi.fn(async () => null),
      create: vi.fn(async () => undefined),
      updateMany: vi.fn(async () => ({ count: 1 })),
    },
    $transaction: vi.fn(async (callback: (transaction: DatabaseMock) => unknown) => callback(database)),
  };
  const { attempt, attemptDraftResponse, attemptResponse, ...rest } = overrides;
  Object.assign(database, rest);
  database.attempt = { ...database.attempt, ...attempt };
  database.attemptDraftResponse = { ...database.attemptDraftResponse, ...attemptDraftResponse };
  database.attemptResponse = { ...database.attemptResponse, ...attemptResponse };
  return database;
}

describe("assessment and tutor route ownership", () => {
  beforeEach(() => {
    state.userId = "user-a";
    state.authenticated = true;
    state.authCalls = 0;
    state.database = makeDatabase();
    vi.mocked(getTutorApiKey).mockReturnValue(null);
    vi.mocked(getTutorModel).mockReturnValue(null);
    vi.mocked(reserveTutorCall).mockResolvedValue({ kind: "daily_limit" });
  });

  it("does not touch Prisma when assessment attempt creation is unauthenticated", async () => {
    state.authenticated = false;
    const response = await startAttempt(
      jsonRequest("https://academy.test/api/assessments/module-1/attempts", { courseId: "applied-ai" }),
      { params: Promise.resolve({ id: "module-1" }) },
    );

    expect(response.status).toBe(401);
    expect(state.authCalls).toBe(1);
    expect(state.database!.assessment.findFirst).not.toHaveBeenCalled();
    expect(state.database!.$transaction).not.toHaveBeenCalled();
  });

  it("starts a knowledge attempt from the explicitly requested published course version", async () => {
    const db = makeDatabase();
    state.database = db;

    const response = await startAttempt(
      jsonRequest("https://academy.test/api/assessments/module-1/attempts", {
        courseId: "applied-ai", courseVersion: 3, idempotencyKey: "versioned-attempt-0001",
      }),
      { params: Promise.resolve({ id: "module-1" }) },
    );

    expect(response.status).toBe(201);
    expect(db.assessment.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ courseVersion: { courseId: "applied-ai", version: 3, publishedAt: { not: null } } }),
    }));
  });

  it("selects hints and validates section identity from the requested lesson snapshot", async () => {
    const archivedLesson = lessons.find((lesson) => lesson.id === "ai-01")!;
    const archivedSection = archivedLesson.sections[0]!;
    const db = makeDatabase({
      lessonSnapshot: { findFirst: vi.fn(async () => ({ metadata: archivedLesson })) },
      hintPack: { findFirst: vi.fn(async ({ where }: { where: { version: number } }) => ({
        id: "pack-ai-01-v3", version: where.version, approved: true,
        hints: [{ id: archivedSection.hints[0], level: 1, text: "Compare one input at a time.", misconceptionTags: [] }],
      })) },
    });
    state.database = db;

    const response = await requestTutorHint(jsonRequest("https://academy.test/api/tutor", {
      idempotencyKey: "versioned-hint-request-001", lessonId: archivedLesson.id,
      sectionId: archivedSection.id, courseVersion: 3,
    }));

    expect(response.status).toBe(200);
    expect(db.lessonSnapshot.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { lessonId: archivedLesson.id, courseVersion: { courseId: "applied-ai", version: 3, publishedAt: { not: null } } },
    }));
    expect(db.hintPack.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { taskKey: archivedLesson.id, version: 3, approved: true } }));
    expect((await response.json()).packVersion).toBe(3);
  });

  it("rejects cross-origin submission before authentication or database access", async () => {
    const response = await submitAttempt(
      jsonRequest("https://academy.test/api/attempts/attempt-a/submit", { expectedResponses: {} }, {
        origin: "https://attacker.test",
      }),
      { params: Promise.resolve({ id: "attempt-a" }) },
    );

    expect(response.status).toBe(403);
    expect(state.authCalls).toBe(0);
    expect(state.database!.attempt.findFirst).not.toHaveBeenCalled();
    expect(state.database!.attempt.updateMany).not.toHaveBeenCalled();
  });

  it("rejects cross-origin attempt creation and tutor requests before authentication", async () => {
    const startResponse = await startAttempt(
      jsonRequest("https://academy.test/api/assessments/module-1/attempts", { courseId: "applied-ai" }, {
        origin: "https://attacker.test",
      }),
      { params: Promise.resolve({ id: "module-1" }) },
    );
    const tutorResponse = await requestTutorHint(jsonRequest("https://academy.test/api/tutor", {
      idempotencyKey: "hint-retry-cross-origin", lessonId: "ai-01", sectionId: "ai-01-model",
    }, { origin: "https://attacker.test" }));

    expect(startResponse.status).toBe(403);
    expect(tutorResponse.status).toBe(403);
    expect(state.authCalls).toBe(0);
    expect(state.database!.assessment.findFirst).not.toHaveBeenCalled();
    expect(state.database!.tutorRequest.findUnique).not.toHaveBeenCalled();
    expect(state.database!.$transaction).not.toHaveBeenCalled();
  });

  it("scopes idempotent attempt lookup to the authenticated user and never returns grading keys", async () => {
    state.userId = "user-b";
    const priorAttempt = {
      id: "attempt-owned-by-a",
      status: "in_progress",
      assessmentVersion: 1,
      assessment: {
        key: "module-1",
        title: "Module 1",
        courseVersion: { courseId: "applied-ai" },
        questions: [{ key: question.key, position: 1, prompt: question.prompt }],
      },
    };
    const db = makeDatabase({
      attempt: {
        findUnique: vi.fn(async ({ where }: { where: { userId_idempotencyKey: { userId: string } } }) =>
          where.userId_idempotencyKey.userId === "user-a" ? priorAttempt : null),
        findFirst: vi.fn(async () => null),
        create: vi.fn(async ({ data }: { data: { userId: string } }) => ({ id: `attempt-${data.userId}`, status: "in_progress", assessmentVersion: 1 })),
        updateMany: vi.fn(async () => ({ count: 1 })),
      },
    });
    state.database = db;

    const response = await startAttempt(
      jsonRequest("https://academy.test/api/assessments/module-1/attempts", {
        courseId: "applied-ai", idempotencyKey: "retry-key-0001",
      }),
      { params: Promise.resolve({ id: "module-1" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(db.attempt.findUnique).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId_idempotencyKey: { userId: "user-b", idempotencyKey: "retry-key-0001" } },
    }));
    expect(db.attempt.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ userId: "user-b" }) }));
    expect(body.attemptId).toBe("attempt-user-b");
    expect(body.attemptId).not.toBe(priorAttempt.id);
    expect(JSON.stringify(body)).not.toContain("answerKey");
    expect(JSON.stringify(body)).not.toContain("secret-answer-key-value");
  });

  it("cannot submit another user's attempt or write its responses", async () => {
    state.userId = "user-b";
    const db = makeDatabase({
      attempt: {
        findUnique: vi.fn(async () => null),
        findFirst: vi.fn(async ({ where }: { where: { id: string; userId: string } }) =>
          where.id === "attempt-owned-by-a" && where.userId === "user-a" ? { id: "attempt-owned-by-a" } : null),
        create: vi.fn(),
        updateMany: vi.fn(async () => ({ count: 1 })),
      },
    });
    state.database = db;

    const response = await submitAttempt(
      jsonRequest("https://academy.test/api/attempts/attempt-owned-by-a/submit", { expectedResponses: { q1: "option-a" } }),
      { params: Promise.resolve({ id: "attempt-owned-by-a" }) },
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "attempt_not_found" });
    expect(db.attempt.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "attempt-owned-by-a", userId: "user-b" },
    }));
    expect(db.attempt.updateMany).not.toHaveBeenCalled();
    expect(db.attemptResponse.createMany).not.toHaveBeenCalled();
  });

  it("rejects client-supplied answers so only saved drafts can be graded", async () => {
    const db = makeDatabase({
      attempt: {
        findUnique: vi.fn(async () => null),
        findFirst: vi.fn(async () => ({
          id: "attempt-owned-by-user-a",
          userId: "user-a",
          status: "in_progress",
          assessment: { passPercent: 80, questions: [question] },
        responses: [],
      })),
      create: vi.fn(),
      updateMany: vi.fn(async () => ({ count: 1 })),
    },
    attemptDraftResponse: { findMany: vi.fn(async () => []) },
  });
    state.database = db;

    const response = await submitAttempt(
      jsonRequest("https://academy.test/api/attempts/attempt-owned-by-user-a/submit", { expectedResponses: { q1: "option-a" } }),
      { params: Promise.resolve({ id: "attempt-owned-by-user-a" }) },
    );

    expect(response.status).toBe(400);
    expect(db.attemptDraftResponse.findMany).toHaveBeenCalled();
    expect(db.attemptResponse.createMany).not.toHaveBeenCalled();
  });

  it("grades and stores a valid published choice ID", async () => {
    let submitted = false;
    const db = makeDatabase({
      attempt: {
        findUnique: vi.fn(async () => null),
        findFirst: vi.fn(async () => ({
          id: "attempt-owned-by-user-a",
          userId: "user-a",
          status: submitted ? "submitted" : "in_progress",
          scorePercent: submitted ? 100 : null,
          passed: submitted ? true : null,
          submittedAt: submitted ? new Date("2026-10-09T00:00:00.000Z") : null,
          assessment: { passPercent: 80, questions: [question] },
          responses: submitted ? [{ correct: true, question: { topicTags: ["retrieval"] } }] : [],
        })),
        create: vi.fn(),
        updateMany: vi.fn(async () => {
          submitted = true;
          return { count: 1 };
        }),
      },
      attemptResponse: { createMany: vi.fn(async () => undefined) },
    });
    state.database = db;

    const response = await submitAttempt(
      jsonRequest("https://academy.test/api/attempts/attempt-owned-by-user-a/submit", { expectedResponses: { q1: "option-a" } }),
      { params: Promise.resolve({ id: "attempt-owned-by-user-a" }) },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ scorePercent: 100, passed: true, remediationTopics: [] });
    expect(db.attemptResponse.createMany).toHaveBeenCalledWith({
      data: [{ attemptId: "attempt-owned-by-user-a", questionId: "question-1", response: "option-a", correct: true }],
    });
  });

  it("refuses to grade when another tab changed the saved choice", async () => {
    const db = makeDatabase({
      attempt: {
        findFirst: vi.fn(async () => ({
          id: "attempt-stale-tab", userId: "user-a", status: "in_progress",
          assessment: { passPercent: 80, questions: [question] }, responses: [],
        })),
        updateMany: vi.fn(async () => ({ count: 1 })),
      },
      attemptDraftResponse: { findMany: vi.fn(async () => [{ questionId: question.id, choiceId: "option-b" }]) },
    });
    state.database = db;

    const response = await submitAttempt(
      jsonRequest("https://academy.test/api/attempts/attempt-stale-tab/submit", { expectedResponses: { q1: "option-a" } }),
      { params: Promise.resolve({ id: "attempt-stale-tab" }) },
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "responses_changed" });
    expect(db.attemptResponse.createMany).not.toHaveBeenCalled();
  });

  it("returns only authored conceptual feedback for missed topics", async () => {
    let submitted = false;
    const note = "Use retrieval labels to separate ranking quality from response speed and inspect the affected slice.";
    const db = makeDatabase({
      attempt: {
        findUnique: vi.fn(async () => null),
        findFirst: vi.fn(async () => ({
          id: "attempt-feedback",
          userId: "user-a",
          status: submitted ? "submitted" : "in_progress",
          scorePercent: submitted ? 0 : null,
          passed: false,
          submittedAt: submitted ? new Date("2026-10-09T00:00:00.000Z") : null,
          assessment: { passPercent: 80, questions: [question] },
          responses: submitted ? [{ correct: false, question: { topicTags: ["applied-ai-retrieval"], feedback: note } }] : [],
        })),
        create: vi.fn(),
        updateMany: vi.fn(async () => { submitted = true; return { count: 1 }; }),
      },
      attemptDraftResponse: { findMany: vi.fn(async () => [{ questionId: question.id, choiceId: "option-b" }]) },
    });
    state.database = db;

    const response = await submitAttempt(
      jsonRequest("https://academy.test/api/attempts/attempt-feedback/submit", { expectedResponses: { q1: "option-b" } }),
      { params: Promise.resolve({ id: "attempt-feedback" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      remediationTopics: ["applied-ai-retrieval"],
      remediationFeedback: [{ topicId: "applied-ai-retrieval", text: note }],
    });
    expect(JSON.stringify(body)).not.toContain("questionId");
    expect(JSON.stringify(body)).not.toContain("answerKey");
    expect(JSON.stringify(body)).not.toContain("option-a");
    expect(db.attempt.findFirst).toHaveBeenLastCalledWith(expect.objectContaining({
      include: {
        responses: {
          include: {
            question: { select: { topicTags: true, feedback: true } },
          },
        },
      },
    }));
  });

  it("stores hint sessions and idempotent requests in the authenticated user's scope", async () => {
    const db = makeDatabase();
    state.database = db;

    const response = await requestTutorHint(jsonRequest("https://academy.test/api/tutor", {
      idempotencyKey: "hint-retry-0001", lessonId: "ai-01", sectionId: "ai-01-model", observation: "I am unsure about recall.",
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ hint: { id: "ai-01-hint-1", level: 1 }, selectionMethod: "authored-fallback" });
    expect(db.hintPack.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { taskKey: "ai-01", version: courseManifest.version, approved: true },
    }));
    expect(db.tutorRequest.findUnique).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId_idempotencyKey: { userId: "user-a", idempotencyKey: "hint-retry-0001" } },
    }));
    expect(db.hintSession.findUnique).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId_taskKey_hintPackId: { userId: "user-a", taskKey: "ai-01-model", hintPackId: "pack-ai-01-v1" } },
    }));
    expect(db.hintSession.create).toHaveBeenCalledWith(expect.objectContaining({
      data: { userId: "user-a", taskKey: "ai-01-model", hintPackId: "pack-ai-01-v1", lastLevel: 1 },
    }));
    expect(db.tutorRequest.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ userId: "user-a", idempotencyKey: "hint-retry-0001", taskKey: "ai-01-model" }),
    }));
  });

  it("replays the same tutor request once and conflicts when its sanitized observation changes", async () => {
    type StoredRequest = {
      id: string;
      userId: string;
      idempotencyKey: string;
      taskKey: string;
      requestFingerprint: string;
      response: unknown;
      status: string;
      createdAt: Date;
    };
    const requests = new Map<string, StoredRequest>();
    const db = makeDatabase();
    db.tutorRequest.findUnique = vi.fn(async ({ where }: { where: { id?: string; userId_idempotencyKey?: { userId: string; idempotencyKey: string } } }) => {
      if (where.id) return [...requests.values()].find((row) => row.id === where.id) ?? null;
      const key = where.userId_idempotencyKey;
      return key ? requests.get(`${key.userId}:${key.idempotencyKey}`) ?? null : null;
    });
    db.tutorRequest.create = vi.fn(async ({ data }: { data: Omit<StoredRequest, "id" | "status" | "createdAt"> }) => {
      const row = { ...data, id: "tutor-request-1", status: "pending", createdAt: new Date() };
      requests.set(`${data.userId}:${data.idempotencyKey}`, row);
      return { id: row.id };
    });
    db.tutorRequest.updateMany = vi.fn(async ({ where, data }: { where: { id: string; status: string }; data: { response: unknown; status: string } }) => {
      const row = [...requests.values()].find((item) => item.id === where.id && item.status === where.status);
      if (!row) return { count: 0 };
      row.response = data.response;
      row.status = data.status;
      return { count: 1 };
    });
    db.hintPack.findFirst = vi.fn(async () => ({
      id: "pack-ai-01-v1",
      version: courseManifest.version,
      approved: true,
      hints: [
        { id: "ai-01-hint-1", level: 1, text: "First approved hint.", misconceptionTags: [] },
        { id: "ai-01-hint-1-alternate", level: 1, text: "Alternate approved hint.", misconceptionTags: [] },
      ],
    }));
    state.database = db;
    vi.mocked(getTutorApiKey).mockReturnValue("test-provider-key");
    vi.mocked(getTutorModel).mockReturnValue("test-model");
    vi.mocked(reserveTutorCall).mockResolvedValue({ kind: "reserved", id: "reservation-1", remainingToday: 9 });

    const body = {
      idempotencyKey: "hint-observation-001",
      lessonId: "ai-01",
      sectionId: "ai-01-model",
      observation: "The retrieval result is missing a citation.",
    };
    const first = await requestTutorHint(jsonRequest("https://academy.test/api/tutor", body));
    const firstBody = await first.json();
    const replay = await requestTutorHint(jsonRequest("https://academy.test/api/tutor", body));
    const changed = await requestTutorHint(jsonRequest("https://academy.test/api/tutor", {
      ...body, observation: "The retrieval result cites the wrong source.",
    }));

    expect(first.status).toBe(200);
    expect(replay.status).toBe(200);
    expect(await replay.json()).toEqual(firstBody);
    expect(changed.status).toBe(409);
    expect(await changed.json()).toEqual({ error: "idempotency_key_conflict" });
    expect(requests.get("user-a:hint-observation-001")?.requestFingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(db.tutorRequest.create).toHaveBeenCalledTimes(1);
    expect(db.hintSession.create).toHaveBeenCalledTimes(1);
    expect(reserveTutorCall).toHaveBeenCalledTimes(1);
  });

  it("keeps the fingerprint check when a concurrent transaction fails into the replay path", async () => {
    const db = makeDatabase();
    db.$transaction = vi.fn(async () => { throw new Error("serialization conflict"); });
    db.tutorRequest.findUnique = vi.fn(async () => ({
      taskKey: "ai-01-model",
      requestFingerprint: "",
      response: { hint: { id: "old-hint" } },
      status: "completed",
      createdAt: new Date(),
    }));
    state.database = db;

    const response = await requestTutorHint(jsonRequest("https://academy.test/api/tutor", {
      idempotencyKey: "legacy-hint-001", lessonId: "ai-01", sectionId: "ai-01-model",
      observation: "new observation",
    }));

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "idempotency_key_conflict" });
    expect(db.hintSession.create).not.toHaveBeenCalled();
    expect(reserveTutorCall).not.toHaveBeenCalled();
  });

  it("limits hint candidates to IDs explicitly linked to the requested section", async () => {
    const db = makeDatabase({
      hintPack: {
        findFirst: vi.fn(async () => ({
          id: "pack-ai-01-v1",
          version: 1,
          approved: true,
          hints: [
            { id: "000-unscoped-hint", level: 1, text: "Not linked to this section.", misconceptionTags: [] },
            { id: "ai-01-hint-1", level: 1, text: "Linked to this section.", misconceptionTags: [] },
          ],
        })),
      },
    });
    state.database = db;

    const response = await requestTutorHint(jsonRequest("https://academy.test/api/tutor", {
      idempotencyKey: "hint-section-scope-01", lessonId: "ai-01", sectionId: "ai-01-model",
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ hint: { id: "ai-01-hint-1" } });
  });

  it("rejects unknown and cross-lesson sections before reading any approved hint pack", async () => {
    const db = state.database!;

    const unknownTask = await requestTutorHint(jsonRequest("https://academy.test/api/tutor", {
      idempotencyKey: "unknown-task-001", lessonId: "ai-01", sectionId: "arbitrary-private-task",
    }));
    const crossTask = await requestTutorHint(jsonRequest("https://academy.test/api/tutor", {
      idempotencyKey: "cross-task-0001", lessonId: "ai-02", sectionId: "ai-01-model",
    }));

    expect(unknownTask.status).toBe(404);
    expect(crossTask.status).toBe(404);
    expect(db.hintPack.findFirst).not.toHaveBeenCalled();
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("does not replay another user's tutor request that reused the same idempotency key", async () => {
    state.userId = "user-b";
    const db = makeDatabase({
      tutorRequest: {
        findUnique: vi.fn(async ({ where }: { where: { userId_idempotencyKey: { userId: string } } }) =>
          where.userId_idempotencyKey.userId === "user-a"
            ? { id: "request-user-a", taskKey: "ai-01", response: { hint: { id: "private-to-a", text: "A's hint" } }, status: "completed", createdAt: new Date() }
            : null),
        create: vi.fn(async ({ data }: { data: { userId: string } }) => ({ id: `request-${data.userId}` })),
        updateMany: vi.fn(async () => ({ count: 1 })),
      },
    });
    state.database = db;

    const response = await requestTutorHint(jsonRequest("https://academy.test/api/tutor", {
      idempotencyKey: "shared-retry-001", lessonId: "ai-01", sectionId: "ai-01-model",
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.hint.id).toBe("ai-01-hint-1");
    expect(JSON.stringify(body)).not.toContain("private-to-a");
    expect(db.tutorRequest.findUnique).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId_idempotencyKey: { userId: "user-b", idempotencyKey: "shared-retry-001" } },
    }));
    expect(db.tutorRequest.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ userId: "user-b", idempotencyKey: "shared-retry-001" }),
    }));
  });

  it("does not touch Prisma when tutor access is unauthenticated", async () => {
    state.authenticated = false;
    const response = await requestTutorHint(jsonRequest("https://academy.test/api/tutor", {
      idempotencyKey: "hint-retry-0002", lessonId: "ai-01", sectionId: "ai-01-model",
    }));

    expect(response.status).toBe(401);
    expect(state.authCalls).toBe(1);
    expect(state.database!.tutorRequest.findUnique).not.toHaveBeenCalled();
    expect(state.database!.hintPack.findFirst).not.toHaveBeenCalled();
    expect(state.database!.$transaction).not.toHaveBeenCalled();
  });
});
