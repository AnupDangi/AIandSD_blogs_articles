import { beforeEach, describe, expect, it, vi } from "vitest";

const testState = vi.hoisted(() => ({
  userId: null as string | null,
  getDatabase: vi.fn(),
}));

vi.mock("@/lib/server/http", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/server/http")>();
  return {
    ...actual,
    authenticateRequest: async () => testState.userId
      ? { user: { id: testState.userId }, response: null }
      : {
          user: null,
          response: Response.json({ error: "unauthorized" }, { status: 401 }),
        },
  };
});

vi.mock("@/lib/server/db", () => ({ getDatabase: testState.getDatabase }));

import { POST as postProgress } from "../src/app/api/progress/route";
import { POST as postSubmission } from "../src/app/api/projects/[id]/submissions/route";
import { GET as getLearningSummary } from "../src/app/api/me/learning/route";

type ProgressRow = {
  userId: string;
  contentType: "lesson" | "section" | "topic";
  contentId: string;
  state: "visited" | "completed";
  readAt: Date | null;
  updatedAt: Date;
};

type SubmissionRow = {
  id: string;
  userId: string;
  projectId: string;
  courseVersion: { courseId: string; version: number };
  idempotencyKey: string;
  repositoryUrl: string;
  commitSha?: string | null;
  checklist: Array<{ itemId: string; completed: boolean }>;
  reflection: string;
  submittedAt: Date;
};

const progressRows = new Map<string, ProgressRow>();
const submissions = new Map<string, SubmissionRow>();
const learningFixtures: Record<string, Record<string, unknown[]>> = {
  "user-a": {
    enrollment: [{ id: "enrollment-a", courseVersion: { courseId: "applied-ai", version: 1, title: "AI A" } }],
    progress: [{ contentType: "lesson", contentId: "ai-01", state: "completed" }],
    attempt: [
      { id: "attempt-a", assessmentVersion: 1, status: "submitted", scorePercent: 90, passed: true, startedAt: new Date("2026-01-01T00:00:00Z"), submittedAt: new Date("2026-01-01T00:05:00Z"), assessment: { id: "assessment-a", key: "module-a", title: "Assessment A" }, responses: [{ question: { topicTags: ["ai-01"] } }] },
      { id: "attempt-a-active", assessmentVersion: 1, status: "in_progress", scorePercent: null, passed: null, startedAt: new Date("2026-01-03T00:00:00Z"), submittedAt: null, assessment: { id: "assessment-a", key: "module-a", title: "Assessment A" }, responses: [] },
    ],
    submission: [{ id: "submission-a", projectId: "project-a", courseVersionId: "version-a", courseVersion: { courseId: "applied-ai", version: 1 }, repositoryUrl: "https://github.com/a/project", submittedAt: new Date("2026-01-02T00:00:00Z") }],
    submittedVersion: [{ courseId: "applied-ai", version: 1 }],
  },
  "user-b": {
    enrollment: [{ id: "enrollment-b", courseVersion: { courseId: "system-design", version: 2, title: "System Design B" } }],
    progress: [{ contentType: "lesson", contentId: "sd-01", state: "visited" }],
    attempt: [{ id: "attempt-b", assessmentVersion: 2, status: "submitted", scorePercent: 40, passed: false, startedAt: new Date("2026-02-01T00:00:00Z"), submittedAt: new Date("2026-02-01T00:05:00Z"), assessment: { id: "assessment-b", key: "module-b", title: "Assessment B" }, responses: [{ question: { topicTags: ["sd-01"] } }] }],
    submission: [{ id: "submission-b", projectId: "project-b", courseVersionId: "version-b", courseVersion: { courseId: "system-design", version: 2 }, repositoryUrl: "https://github.com/b/project", submittedAt: new Date("2026-02-02T00:00:00Z") }],
    submittedVersion: [{ courseId: "system-design", version: 2 }],
  },
};
const submissionView = (row: SubmissionRow) => ({
  id: row.id,
  projectId: row.projectId,
  courseVersion: row.courseVersion,
  repositoryUrl: row.repositoryUrl,
  commitSha: row.commitSha,
  checklist: row.checklist,
  reflection: row.reflection,
  submittedAt: row.submittedAt,
});
const progressDatabase = {
  learningProgress: {
    findMany: vi.fn(async ({ where }: { where: { userId: string } }) => learningFixtures[where.userId]?.progress ?? []),
    upsert: vi.fn(async ({ where, create, update }: {
      where: { userId_contentType_contentId: { userId: string; contentType: ProgressRow["contentType"]; contentId: string } };
      create: ProgressRow;
      update: Partial<ProgressRow>;
    }) => {
      const key = [where.userId_contentType_contentId.userId, where.userId_contentType_contentId.contentType, where.userId_contentType_contentId.contentId].join(":");
      const existing = progressRows.get(key);
      const row = { ...(existing ?? create), ...update, updatedAt: new Date() };
      progressRows.set(key, row);
      return row;
    }),
    updateMany: vi.fn(async () => ({ count: 0 })),
    findUnique: vi.fn(async ({ where }: { where: { userId_contentType_contentId: { userId: string; contentType: ProgressRow["contentType"]; contentId: string } } }) => {
      const key = [where.userId_contentType_contentId.userId, where.userId_contentType_contentId.contentType, where.userId_contentType_contentId.contentId].join(":");
      return progressRows.get(key) ?? null;
    }),
    findUniqueOrThrow: vi.fn(async ({ where }: { where: { userId_contentType_contentId: { userId: string; contentType: ProgressRow["contentType"]; contentId: string } } }) => {
      const key = [where.userId_contentType_contentId.userId, where.userId_contentType_contentId.contentType, where.userId_contentType_contentId.contentId].join(":");
      const row = progressRows.get(key);
      if (!row) throw new Error("missing progress row");
      return row;
    }),
    create: vi.fn(async ({ data }: { data: ProgressRow }) => {
      const key = [data.userId, data.contentType, data.contentId].join(":");
      progressRows.set(key, data);
      return data;
    }),
  },
  versionedLearningProgress: {
    findMany: vi.fn(async ({ where }: { where: { userId: string; courseVersion?: { publishedAt: { not: null } } } }) => learningFixtures[where.userId]?.versionedProgress ?? []),
    upsert: vi.fn(async ({ create, update }: { create: Record<string, unknown>; update: Record<string, unknown> }) => ({ ...create, ...update, updatedAt: new Date() })),
  },
  lessonSnapshot: {
    findFirst: vi.fn(async () => ({ courseVersionId: "course-v1", lessonId: "ai-01", metadata: { sections: [{ id: "ai-01-intro" }] } })),
  },
  project: {
    findFirst: vi.fn(async ({ where }: { where: { id: string; courseVersion: { courseId: string; version: number } } }) => ({
      id: where.id,
      courseVersionId: `version:${where.courseVersion.courseId}:${where.courseVersion.version}`,
    })),
  },
  enrollment: {
    findMany: vi.fn(async ({ where }: { where: { userId: string; courseVersion?: { publishedAt: { not: null } } } }) => learningFixtures[where.userId]?.enrollment ?? []),
  },
  attempt: {
    findMany: vi.fn(async ({ where }: { where: { userId: string; status?: string } }) => (learningFixtures[where.userId]?.attempt ?? []).filter((attempt) => !where.status || (attempt as { status?: string }).status === where.status)),
  },
  courseVersion: {
    findMany: vi.fn(async ({ where }: { where: { submissions: { some: { userId: string } } } }) => learningFixtures[where.submissions.some.userId]?.submittedVersion ?? []),
  },
  projectSubmission: {
    findMany: vi.fn(async ({ where }: { where: { userId: string } }) => learningFixtures[where.userId]?.submission ?? []),
    findUnique: vi.fn(async ({ where }: { where: { userId_idempotencyKey: { userId: string; idempotencyKey: string } } }) => {
      const key = `${where.userId_idempotencyKey.userId}:${where.userId_idempotencyKey.idempotencyKey}`;
      const row = submissions.get(key);
      return row ? submissionView(row) : null;
    }),
    create: vi.fn(async ({ data }: { data: Omit<SubmissionRow, "id" | "submittedAt" | "courseVersion"> & { courseVersionId: string } }) => {
      const [, courseId, version] = data.courseVersionId.split(":");
      const row: SubmissionRow = {
        ...data,
        id: `submission-${submissions.size + 1}`,
        courseVersion: { courseId, version: Number(version) },
        submittedAt: new Date(),
      };
      submissions.set(`${data.userId}:${data.idempotencyKey}`, row);
      return submissionView(row);
    }),
  },
};

function sameOriginRequest(path: string, body: unknown, origin = "https://academy.example") {
  return new Request(`https://academy.example${path}`, {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const projectId = "ai-milestone-01";
const firstMilestoneChecklist = [
  { itemId: `${projectId}-item-1`, completed: true },
  { itemId: `${projectId}-item-2`, completed: false },
  { itemId: `${projectId}-item-3`, completed: true },
];

const submissionPayload = {
  idempotencyKey: "milestone-1-attempt-001",
  courseId: "applied-ai",
  courseVersion: 1,
  repositoryUrl: "https://github.com/learner/reliable-ai-app",
  checklist: firstMilestoneChecklist,
  reflection: "I added a typed model call and checked its output against the fixture.",
};

beforeEach(() => {
  testState.userId = null;
  progressRows.clear();
  submissions.clear();
  vi.clearAllMocks();
  testState.getDatabase.mockReturnValue(progressDatabase);
});

describe("learner ownership route contracts", () => {
  it("does not access the database for an unauthenticated progress write", async () => {
    const response = await postProgress(sameOriginRequest("/api/progress", {
      contentType: "lesson",
      contentId: "ai-01",
      state: "completed",
    }));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "unauthorized" });
    expect(testState.getDatabase).not.toHaveBeenCalled();
    expect(progressDatabase.learningProgress.upsert).not.toHaveBeenCalled();
  });

  it("stores progress under the authenticated identity even when the body forges another owner", async () => {
    testState.userId = "user-a";
    const response = await postProgress(sameOriginRequest("/api/progress", {
      userId: "user-b",
      contentType: "lesson",
      contentId: "ai-01",
      state: "completed",
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ progress: { contentType: "lesson", contentId: "ai-01", state: "completed" } });
    expect([...progressRows.values()]).toEqual([
      expect.objectContaining({ userId: "user-a", contentType: "lesson", contentId: "ai-01", state: "completed" }),
    ]);
    expect(progressRows.has("user-b:lesson:ai-01")).toBe(false);
  });

  it("saves a section under the published immutable course version", async () => {
    testState.userId = "user-a";
    const response = await postProgress(sameOriginRequest("/api/progress", {
      contentType: "section", contentId: "ai-01-intro", state: "completed",
      courseVersion: { courseId: "applied-ai", version: 1, lessonId: "ai-01" },
    }));

    expect(response.status).toBe(200);
    expect(progressDatabase.versionedLearningProgress.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId_courseVersionId_contentType_contentId: { userId: "user-a", courseVersionId: "course-v1", contentType: "section", contentId: "ai-01-intro" } },
      create: expect.objectContaining({ userId: "user-a", courseVersionId: "course-v1", lessonId: "ai-01" }),
    }));
    expect(progressDatabase.learningProgress.upsert).not.toHaveBeenCalled();
  });

  it("does not save a section absent from the requested immutable lesson snapshot", async () => {
    testState.userId = "user-a";
    progressDatabase.lessonSnapshot.findFirst.mockResolvedValueOnce({ courseVersionId: "course-v1", lessonId: "ai-01", metadata: { sections: [{ id: "ai-01-intro" }] } });
    const response = await postProgress(sameOriginRequest("/api/progress", {
      contentType: "section", contentId: "forged-section", state: "completed",
      courseVersion: { courseId: "applied-ai", version: 1, lessonId: "ai-01" },
    }));

    expect(response.status).toBe(404);
    expect(progressDatabase.versionedLearningProgress.upsert).not.toHaveBeenCalled();
  });

  it("rejects cross-origin progress writes before touching learner storage", async () => {
    testState.userId = "user-a";
    const response = await postProgress(sameOriginRequest("/api/progress", {
      contentType: "lesson",
      contentId: "ai-01",
      state: "completed",
    }, "https://attacker.example"));

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ error: "cross_origin_request" });
    expect(testState.getDatabase).not.toHaveBeenCalled();
    expect(progressDatabase.learningProgress.upsert).not.toHaveBeenCalled();
  });

  it("scopes idempotent project submissions to each authenticated user", async () => {
    testState.userId = "user-a";
    const firstResponse = await postSubmission(
      sameOriginRequest(`/api/projects/${projectId}/submissions`, submissionPayload),
      { params: Promise.resolve({ id: projectId }) },
    );
    const first = await firstResponse.json();

    expect(firstResponse.status).toBe(201);
    expect(first.submission).toMatchObject({ id: "submission-1", projectId, status: "submitted—self-reported" });

    testState.userId = "user-b";
    const secondResponse = await postSubmission(
      sameOriginRequest(`/api/projects/${projectId}/submissions`, submissionPayload),
      { params: Promise.resolve({ id: projectId }) },
    );
    const second = await secondResponse.json();

    expect(secondResponse.status).toBe(201);
    expect(second.submission.id).not.toBe(first.submission.id);
    expect([...submissions.values()].map((submission) => submission.userId).sort()).toEqual(["user-a", "user-b"]);

    testState.userId = "user-a";
    const replayResponse = await postSubmission(
      sameOriginRequest(`/api/projects/${projectId}/submissions`, submissionPayload),
      { params: Promise.resolve({ id: projectId }) },
    );
    const replay = await replayResponse.json();

    expect(replayResponse.status).toBe(200);
    expect(replay.submission.id).toBe(first.submission.id);
    expect(replay.submission).not.toHaveProperty("userId");
  });

  it("replays an equivalent normalized submission regardless of checklist order", async () => {
    testState.userId = "user-a";
    const original = {
      ...submissionPayload,
      repositoryUrl: "https://github.com/learner/reliable-ai-app/",
      commitSha: "ABCDEF1234567",
      checklist: [firstMilestoneChecklist[2], firstMilestoneChecklist[0], firstMilestoneChecklist[1]],
    };
    const created = await postSubmission(
      sameOriginRequest(`/api/projects/${projectId}/submissions`, original),
      { params: Promise.resolve({ id: projectId }) },
    );
    expect(created.status).toBe(201);

    const replay = await postSubmission(
      sameOriginRequest(`/api/projects/${projectId}/submissions`, {
        ...original,
        repositoryUrl: "https://github.com/learner/reliable-ai-app",
        commitSha: "abcdef1234567",
        checklist: [...original.checklist].reverse(),
      }),
      { params: Promise.resolve({ id: projectId }) },
    );

    expect(replay.status).toBe(200);
    expect((await replay.json()).submission.id).toBe("submission-1");
    expect(submissions.size).toBe(1);
  });

  it.each([
    ["empty", []],
    ["unknown milestone item", [{ itemId: "invented-proof", completed: true }]],
    ["missing milestone item", firstMilestoneChecklist.slice(1)],
  ])("rejects a %s project checklist", async (_label, checklist) => {
    testState.userId = "user-a";
    const response = await postSubmission(
      sameOriginRequest(`/api/projects/${projectId}/submissions`, { ...submissionPayload, checklist }),
      { params: Promise.resolve({ id: projectId }) },
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: "invalid_request" });
    expect(progressDatabase.projectSubmission.create).not.toHaveBeenCalled();
    expect(submissions.size).toBe(0);
  });

  it.each([
    ["repository URL", { repositoryUrl: "https://github.com/learner/another-repository" }],
    ["commit SHA", { commitSha: "abcdef1234567" }],
    ["reflection", { reflection: "I changed the implementation and verified a different behavior." }],
    ["checklist completion", { checklist: firstMilestoneChecklist.map((item, index) => index === 0 ? { ...item, completed: false } : item) }],
  ])("rejects a reused key when the %s differs", async (_label, change) => {
    testState.userId = "user-a";
    const created = await postSubmission(
      sameOriginRequest(`/api/projects/${projectId}/submissions`, submissionPayload),
      { params: Promise.resolve({ id: projectId }) },
    );
    expect(created.status).toBe(201);

    const conflicting = await postSubmission(
      sameOriginRequest(`/api/projects/${projectId}/submissions`, { ...submissionPayload, ...change }),
      { params: Promise.resolve({ id: projectId }) },
    );

    expect(conflicting.status).toBe(409);
    expect(await conflicting.json()).toEqual({ error: "idempotency_key_conflict" });
    expect(submissions.size).toBe(1);
  });

  it("denies forged-owner submission data and unauthenticated submission access", async () => {
    testState.userId = "user-a";
    const forgedResponse = await postSubmission(
      sameOriginRequest(`/api/projects/${projectId}/submissions`, { ...submissionPayload, userId: "user-b" }),
      { params: Promise.resolve({ id: projectId }) },
    );

    expect(forgedResponse.status).toBe(400);
    expect(await forgedResponse.json()).toMatchObject({ error: "invalid_request" });
    expect(submissions.size).toBe(0);

    testState.userId = null;
    testState.getDatabase.mockClear();
    const unauthenticatedResponse = await postSubmission(
      sameOriginRequest(`/api/projects/${projectId}/submissions`, submissionPayload),
      { params: Promise.resolve({ id: projectId }) },
    );

    expect(unauthenticatedResponse.status).toBe(401);
    expect(await unauthenticatedResponse.json()).toEqual({ error: "unauthorized" });
    expect(testState.getDatabase).not.toHaveBeenCalled();
    expect(submissions.size).toBe(0);
  });

  it("returns only the authenticated learner's activity across the learning summary", async () => {
    testState.userId = "user-a";
    const firstResponse = await getLearningSummary();
    const first = await firstResponse.json();

    expect(firstResponse.status).toBe(200);
    expect(first.enrollments.map((item: { id: string }) => item.id)).toEqual(["enrollment-a"]);
    expect(first.progress.map((item: { contentId: string }) => item.contentId)).toEqual(["ai-01"]);
    expect(first.attempts.map((item: { id: string }) => item.id)).toEqual(["attempt-a-active", "attempt-a"]);
    expect(first.submissions.map((item: { id: string }) => item.id)).toEqual(["submission-a"]);
    expect(first.submittedProjectVersions).toEqual([{ courseId: "applied-ai", version: 1 }]);
    expect(first.weakTopics).toEqual([{ topicId: "ai-01", misses: 1 }]);

    testState.userId = "user-b";
    const secondResponse = await getLearningSummary();
    const second = await secondResponse.json();

    expect(secondResponse.status).toBe(200);
    expect(second.enrollments.map((item: { id: string }) => item.id)).toEqual(["enrollment-b"]);
    expect(second.progress.map((item: { contentId: string }) => item.contentId)).toEqual(["sd-01"]);
    expect(second.attempts.map((item: { id: string }) => item.id)).toEqual(["attempt-b"]);
    expect(second.submissions.map((item: { id: string }) => item.id)).toEqual(["submission-b"]);
    expect(second.submittedProjectVersions).toEqual([{ courseId: "system-design", version: 2 }]);
    expect(second.weakTopics).toEqual([{ topicId: "sd-01", misses: 1 }]);

    for (const model of [
      progressDatabase.enrollment.findMany,
      progressDatabase.learningProgress.findMany,
      progressDatabase.versionedLearningProgress.findMany,
      progressDatabase.attempt.findMany,
      progressDatabase.projectSubmission.findMany,
    ]) {
      if (model === progressDatabase.attempt.findMany) {
        expect(model.mock.calls.map(([query]) => query.where.userId)).toEqual(["user-a", "user-a", "user-b", "user-b"]);
      } else {
        expect(model.mock.calls.map(([query]) => query.where.userId)).toEqual(["user-a", "user-b"]);
      }
    }
    expect(progressDatabase.courseVersion.findMany.mock.calls.map(([query]) => query.where.submissions.some.userId)).toEqual(["user-a", "user-b"]);
    expect(progressDatabase.enrollment.findMany.mock.calls[0][0].where.courseVersion).toEqual({ publishedAt: { not: null } });
    expect(progressDatabase.versionedLearningProgress.findMany.mock.calls[0][0].where.courseVersion).toEqual({ publishedAt: { not: null } });
  });

  it("resumes the newest valid saved section without using another learner's activity", async () => {
    progressDatabase.learningProgress.findMany.mockResolvedValueOnce([
      { contentType: "section", contentId: "ai-01-model", state: "visited", updatedAt: new Date("2026-01-01T00:00:00Z") },
      { contentType: "section", contentId: "ai-01-tradeoffs", state: "completed", updatedAt: new Date("2026-01-02T00:00:00Z") },
      { contentType: "section", contentId: "removed-section", state: "visited", updatedAt: new Date("2026-01-03T00:00:00Z") },
      { contentType: "lesson", contentId: "ai-01", state: "completed", updatedAt: new Date("2026-01-04T00:00:00Z") },
    ]);
    testState.userId = "user-a";
    const first = await (await getLearningSummary()).json();
    expect(first.resumeLocation).toEqual({ lessonId: "ai-01", lessonSlug: expect.any(String), sectionId: "ai-01-tradeoffs" });

    testState.userId = "user-b";
    const second = await (await getLearningSummary()).json();
    expect(second.resumeLocation).toBeNull();
    expect(progressDatabase.learningProgress.findMany.mock.calls.map(([query]) => query.where.userId)).toEqual(["user-a", "user-b"]);
    expect(progressDatabase.versionedLearningProgress.findMany.mock.calls.map(([query]) => query.where.userId)).toEqual(["user-a", "user-b"]);
  });

  it("does not access the database for an unauthenticated learning summary", async () => {
    const response = await getLearningSummary();

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "unauthorized" });
    expect(testState.getDatabase).not.toHaveBeenCalled();
    expect(progressDatabase.enrollment.findMany).not.toHaveBeenCalled();
    expect(progressDatabase.learningProgress.findMany).not.toHaveBeenCalled();
    expect(progressDatabase.attempt.findMany).not.toHaveBeenCalled();
    expect(progressDatabase.projectSubmission.findMany).not.toHaveBeenCalled();
    expect(progressDatabase.courseVersion.findMany).not.toHaveBeenCalled();
  });
});
