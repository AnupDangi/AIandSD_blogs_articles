import { beforeEach, describe, expect, it, vi } from "vitest";
import { lessons } from "@/content/catalog";
import { asUser, resetDatabase } from "./support";

// Supabase's external identity boundary is substituted; every learner write and
// read below still uses the actual Prisma adapter and a disposable PostgreSQL DB.
vi.mock("@/lib/server/http", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/server/http")>();
  const { identities } = await import("./support");
  return {
    ...actual,
    authenticateRequest: async () => {
      const id = identities.getStore();
      return id
        ? { user: { id }, response: null }
        : { user: null, response: Response.json({ error: "unauthorized" }, { status: 401 }) };
    },
  };
});

import { POST as saveProgress } from "@/app/api/progress/route";
import { GET as getLearning } from "@/app/api/me/learning/route";
import { POST as startAttempt } from "@/app/api/assessments/[id]/attempts/route";
import { POST as submitAttempt } from "@/app/api/attempts/[id]/submit/route";
import { GET as getAttempt } from "@/app/api/attempts/[id]/route";
import { PATCH as saveDraftResponse } from "@/app/api/attempts/[id]/responses/route";
import { POST as submitProject } from "@/app/api/projects/[id]/submissions/route";

const alice = "acceptance-learner-alice";
const bob = "acceptance-learner-bob";
const assessmentKey = "acceptance-assessment";
const projectId = "ai-milestone-01";
const lesson = lessons.find(({ id }) => id === "ai-01")!;
const firstSection = lesson.sections[0];
const secondSection = lesson.sections[1];
const routeContext = (id: string) => ({ params: Promise.resolve({ id }) });
const request = (path: string, body: unknown) => new Request(`https://academy.test${path}`, {
  method: "POST",
  headers: { origin: "https://academy.test", "content-type": "application/json" },
  body: JSON.stringify(body),
});
const begin = (userId: string, idempotencyKey: string) => asUser(userId, () => startAttempt(
  request(`/api/assessments/${assessmentKey}/attempts`, { courseId: "applied-ai", idempotencyKey }),
  routeContext(assessmentKey),
));
const submitSaved = (userId: string, attemptId: string, expectedResponses: Record<string, string> = {}) => asUser(userId, () => submitAttempt(
  request(`/api/attempts/${attemptId}/submit`, { expectedResponses }), routeContext(attemptId),
));
const saveAnswer = (userId: string, attemptId: string, questionKey: string, choiceId: string) => asUser(userId, () => saveDraftResponse(
  new Request(`https://academy.test/api/attempts/${attemptId}/responses`, {
    method: "PATCH", headers: { origin: "https://academy.test", "content-type": "application/json" },
    body: JSON.stringify({ questionKey, choiceId }),
  }), routeContext(attemptId),
));
const grade = async (userId: string, attemptId: string, answer: string) => {
  const saved = await saveAnswer(userId, attemptId, "q1", answer);
  if (saved.status !== 200 && saved.status !== 409) return saved;
  return submitSaved(userId, attemptId, { q1: answer });
};
const projectInput = (idempotencyKey: string) => ({
  idempotencyKey,
  courseId: "applied-ai",
  courseVersion: 1,
  repositoryUrl: "https://github.com/learner/reliable-ai-app",
  commitSha: "a123456",
  checklist: [1, 2, 3].map((index) => ({ itemId: `${projectId}-item-${index}`, completed: true })),
  reflection: "I tested recovery using deterministic fixtures and recorded the failure evidence.",
});
const project = (userId: string, input: ReturnType<typeof projectInput>) => asUser(userId, () => submitProject(
  request(`/api/projects/${projectId}/submissions`, input), routeContext(projectId),
));

let fixture: Awaited<ReturnType<typeof resetDatabase>>;
beforeEach(async () => { fixture = await resetDatabase(); });

describe("persistent learner records with real PostgreSQL", () => {
  it("saves one answer and resumes it from a fresh owner request without exposing keys", async () => {
    const { attemptId } = await (await begin(alice, "resume-draft-key")).json();
    const saved = await saveAnswer(alice, attemptId, "q1", "b");
    expect(saved.status).toBe(200);
    const resumed = await asUser(alice, () => getAttempt(
      new Request(`https://academy.test/api/attempts/${attemptId}`), routeContext(attemptId),
    ));
    expect(resumed.status).toBe(200);
    expect(resumed.headers.get("cache-control")).toContain("no-store");
    expect(await resumed.json()).toMatchObject({
      attemptId, status: "in_progress", assessment: { id: assessmentKey, version: 1 },
      responses: { q1: "b" },
    });
    expect(JSON.stringify(await (await asUser(alice, () => getAttempt(
      new Request(`https://academy.test/api/attempts/${attemptId}`), routeContext(attemptId),
    ))).json())).not.toMatch(/answerKey|correct|feedback/);
  });

  it("grades only a complete saved draft and retains the immutable submitted result", async () => {
    const { attemptId } = await (await begin(alice, "persisted-grade-key")).json();
    const empty = await submitSaved(alice, attemptId);
    expect(empty.status).toBe(400);
    expect((await saveAnswer(alice, attemptId, "q1", "a")).status).toBe(200);
    const submitted = await submitSaved(alice, attemptId, { q1: "a" });
    expect(submitted.status).toBe(200);
    expect(await submitted.json()).toMatchObject({ passed: true, scorePercent: 100 });
    expect((await saveAnswer(alice, attemptId, "q1", "b")).status).toBe(409);
    const replay = await submitSaved(alice, attemptId);
    expect(await replay.json()).toMatchObject({ passed: true, scorePercent: 100 });
  });

  it("reloads instead of grading choices changed by another device", async () => {
    const { attemptId } = await (await begin(alice, "stale-tab-key")).json();
    expect((await saveAnswer(alice, attemptId, "q1", "a")).status).toBe(200);
    expect((await saveAnswer(alice, attemptId, "q1", "b")).status).toBe(200);
    const staleSubmit = await submitSaved(alice, attemptId, { q1: "a" });
    expect(staleSubmit.status).toBe(409);
    expect(await staleSubmit.json()).toEqual({ error: "responses_changed" });
    const reloaded = await (await asUser(alice, () => getAttempt(
      new Request(`https://academy.test/api/attempts/${attemptId}`), routeContext(attemptId),
    ))).json();
    expect(reloaded.responses).toEqual({ q1: "b" });
    expect(await (await submitSaved(alice, attemptId, { q1: "b" })).json()).toMatchObject({ passed: false, scorePercent: 0 });
  });

  it("keeps draft choices private and rejects invalid or cross-origin writes", async () => {
    const { attemptId } = await (await begin(alice, "private-draft-key")).json();
    const owner = await saveAnswer(alice, attemptId, "q1", "a");
    expect(owner.status).toBe(200);
    const otherRead = await asUser(bob, () => getAttempt(new Request(`https://academy.test/api/attempts/${attemptId}`), routeContext(attemptId)));
    expect(otherRead.status).toBe(404);
    expect((await saveAnswer(bob, attemptId, "q1", "b")).status).toBe(404);
    expect((await saveAnswer(alice, attemptId, "not-a-question", "a")).status).toBe(400);
    expect((await saveAnswer(alice, attemptId, "q1", "not-a-choice")).status).toBe(400);
    const crossOrigin = await asUser(alice, () => saveDraftResponse(new Request(`https://academy.test/api/attempts/${attemptId}/responses`, {
      method: "PATCH", headers: { origin: "https://other.test", "content-type": "application/json" },
      body: JSON.stringify({ questionKey: "q1", choiceId: "b" }),
    }), routeContext(attemptId)));
    expect(crossOrigin.status).toBe(403);
    const resumed = await (await asUser(alice, () => getAttempt(new Request(`https://academy.test/api/attempts/${attemptId}`), routeContext(attemptId)))).json();
    expect(resumed.responses).toEqual({ q1: "a" });
  });

  it("requires every saved question before submitting a multi-question assessment", async () => {
    await fixture.db.assessmentQuestion.create({ data: {
      assessmentId: fixture.assessment.id, key: "q2", position: 1,
      prompt: { prompt: "Which value measures elapsed work?", choices: [{ id: "x", text: "Latency" }, { id: "y", text: "Recall" }] },
      answerKey: "x", topicTags: ["latency"],
    } });
    const { attemptId } = await (await begin(alice, "two-question-key")).json();
    expect((await saveAnswer(alice, attemptId, "q1", "a")).status).toBe(200);
    expect((await submitSaved(alice, attemptId, { q1: "a" })).status).toBe(400);
    expect((await saveAnswer(alice, attemptId, "q2", "x")).status).toBe(200);
    expect(await (await submitSaved(alice, attemptId, { q1: "a", q2: "x" })).json()).toMatchObject({ passed: true, scorePercent: 100 });
  });
  it("keeps progress monotonic across competing writes and resumes a saved section after a new request", async () => {
    const writes = await Promise.all(Array.from({ length: 12 }, (_, index) => asUser(alice, () => saveProgress(
      request("/api/progress", { contentType: "section", contentId: firstSection.id, state: index % 2 ? "visited" : "completed" }),
    ))));
    expect(writes.map(({ status }) => status)).toEqual(Array(12).fill(200));
    const revisit = await asUser(alice, () => saveProgress(request("/api/progress", {
      contentType: "section", contentId: firstSection.id, state: "visited",
    })));
    expect((await revisit.json()).progress).toMatchObject({ state: "completed", contentId: firstSection.id });

    await new Promise((resolve) => setTimeout(resolve, 5));
    const next = await asUser(alice, () => saveProgress(request("/api/progress", {
      contentType: "section", contentId: secondSection.id, state: "visited",
    })));
    expect(next.status).toBe(200);
    const saved = await asUser(alice, getLearning);
    expect(saved.headers.get("cache-control")).toContain("no-store");
    const body = await saved.json();
    expect(body.resumeLocation).toEqual({ lessonId: lesson.id, lessonSlug: lesson.slug, sectionId: secondSection.id });
    expect(body.progress).toHaveLength(2);
    expect(body.progress.find((entry: { contentId: string }) => entry.contentId === firstSection.id)).toMatchObject({ state: "completed" });

    await new Promise((resolve) => setTimeout(resolve, 5));
    const revisited = await asUser(alice, () => saveProgress(request("/api/progress", {
      contentType: "section", contentId: firstSection.id, state: "visited",
    })));
    expect((await revisited.json()).progress).toMatchObject({ state: "completed", contentId: firstSection.id });
    const resumedAfterRevisit = await asUser(alice, getLearning);
    expect((await resumedAfterRevisit.json()).resumeLocation).toEqual({
      lessonId: lesson.id, lessonSlug: lesson.slug, sectionId: firstSection.id,
    });
  });

  it("keeps reading progress attached to the immutable lesson snapshot version", async () => {
    const v1 = await asUser(alice, () => saveProgress(request("/api/progress", {
      contentType: "section", contentId: firstSection.id, state: "visited",
      courseVersion: { courseId: "applied-ai", version: 1, lessonId: lesson.id },
    })));
    expect(v1.status).toBe(200);

    const newerMetadata = { ...lesson, title: "Revised lesson title" };
    const version2 = await fixture.db.courseVersion.create({ data: {
      courseId: "applied-ai", version: 2, title: "Revised course", publishedAt: new Date(),
      lessons: { create: {
        lessonId: lesson.id, slug: lesson.slug, title: newerMetadata.title, chapter: lesson.chapter,
        sourcePath: lesson.sourceDraft, contentMarkdown: "# Revised lesson\n\nNew version text.",
        contentSha256: "fixture-v2-hash", metadata: newerMetadata,
      } },
    } });
    expect(version2.version).toBe(2);

    const saved = await asUser(alice, getLearning);
    const body = await saved.json();
    expect(body.resumeLocation).toMatchObject({
      lessonId: lesson.id, lessonSlug: lesson.slug, sectionId: firstSection.id, version: 1,
      lesson: { title: lesson.title },
    });
    const snapshot = await fixture.db.lessonSnapshot.findFirstOrThrow({
      where: { courseVersionId: fixture.courseVersion.id, lessonId: lesson.id },
    });
    expect(snapshot.contentMarkdown).toBe("# Immutable v1 lesson\n\nOriginal version text.");
    expect(body.progress.filter((entry: { contentType: string }) => entry.contentType === "section")).toHaveLength(1);
  });

  it("isolates both learners' progress, enrollment, assessment remediation, and submissions", async () => {
    await asUser(alice, () => saveProgress(request("/api/progress", { contentType: "section", contentId: firstSection.id, state: "completed" })));
    await asUser(bob, () => saveProgress(request("/api/progress", { contentType: "section", contentId: firstSection.id, state: "visited" })));
    const aliceAttempt = await (await begin(alice, "shared-attempt-key")).json();
    const bobAttempt = await (await begin(bob, "shared-attempt-key")).json();
    expect(aliceAttempt.attemptId).not.toBe(bobAttempt.attemptId);
    expect((await grade(alice, aliceAttempt.attemptId, "b")).status).toBe(200);
    expect((await grade(bob, bobAttempt.attemptId, "a")).status).toBe(200);
    const aliceProject = await (await project(alice, projectInput("shared-submission-key"))).json();
    const bobProject = await (await project(bob, { ...projectInput("shared-submission-key"), repositoryUrl: "https://github.com/bob/private-work" })).json();
    expect(aliceProject.submission.id).not.toBe(bobProject.submission.id);

    const aliceRecords = await (await asUser(alice, getLearning)).json();
    const bobRecords = await (await asUser(bob, getLearning)).json();
    expect(aliceRecords.progress.map((entry: { contentId: string }) => entry.contentId)).toEqual([firstSection.id]);
    expect(bobRecords.progress.map((entry: { contentId: string }) => entry.contentId)).toEqual([firstSection.id]);
    expect(aliceRecords.progress[0].state).toBe("completed");
    expect(bobRecords.progress[0].state).toBe("visited");
    expect(aliceRecords.attempts.map((entry: { id: string }) => entry.id)).toEqual([aliceAttempt.attemptId]);
    expect(bobRecords.attempts.map((entry: { id: string }) => entry.id)).toEqual([bobAttempt.attemptId]);
    expect(aliceRecords.weakTopics.length).toBeGreaterThan(0);
    expect(bobRecords.weakTopics).toEqual([]);
    expect(aliceRecords.enrollments).toHaveLength(1);
    expect(bobRecords.enrollments).toHaveLength(1);
    expect(aliceRecords.submissions.map((entry: { id: string }) => entry.id)).toEqual([aliceProject.submission.id]);
    expect(bobRecords.submissions.map((entry: { id: string }) => entry.id)).toEqual([bobProject.submission.id]);
    expect(aliceRecords.submissions[0].status).toBe("submitted—self-reported");
    expect(JSON.stringify(aliceRecords)).not.toContain("answerKey");
    expect(JSON.stringify(bobRecords)).not.toContain("answerKey");
  });

  it("rejects a cross-user attempt without grading it for its owner", async () => {
    const { attemptId } = await (await begin(alice, "cross-user-attempt")).json();
    const forbidden = await grade(bob, attemptId, "a");
    expect(forbidden.status).toBe(404);
    expect(await forbidden.json()).toEqual({ error: "attempt_not_found" });
    const ownerRecords = await (await asUser(alice, getLearning)).json();
    expect(ownerRecords.attempts[0]).toMatchObject({ id: attemptId, status: "in_progress", scorePercent: null });
    expect((await grade(alice, attemptId, "a")).status).toBe(200);
  });

  it("atomically deduplicates concurrent attempt creation and permanently replays the first submitted result", async () => {
    const starts = await Promise.all(Array.from({ length: 8 }, () => begin(alice, "concurrent-attempt-key")));
    expect(starts.every(({ status }) => status === 200 || status === 201)).toBe(true);
    const bodies = await Promise.all(starts.map((response) => response.json()));
    expect(new Set(bodies.map(({ attemptId }) => attemptId)).size).toBe(1);
    expect(bodies[0].questions).toEqual([{ key: "q1", position: 0, prompt: {
      prompt: expect.any(String), choices: [{ id: "a", text: expect.any(String) }, { id: "b", text: expect.any(String) }],
    } }]);
    expect(JSON.stringify(bodies)).not.toContain("answerKey");
    const attemptId = bodies[0].attemptId;
    expect((await saveAnswer(alice, attemptId, "q1", "a")).status).toBe(200);
    const submissions = await Promise.all(Array.from({ length: 8 }, () => submitSaved(alice, attemptId, { q1: "a" })));
    expect(submissions.map(({ status }) => status)).toEqual(Array(8).fill(200));
    const results = await Promise.all(submissions.map((response) => response.json()));
    for (const result of results) expect(result).toEqual(results[0]);
    const opposite = results[0].passed ? "b" : "a";
    expect(await (await grade(alice, attemptId, opposite)).json()).toEqual(results[0]);
    const records = await (await asUser(alice, getLearning)).json();
    expect(records.attempts).toHaveLength(1);
    expect(records.attempts[0]).toMatchObject({ status: "submitted", scorePercent: results[0].scorePercent, passed: results[0].passed });
    expect(records.enrollments).toHaveLength(1);
    const reusedForCourse = await asUser(alice, () => startAttempt(
      request(`/api/assessments/${assessmentKey}/attempts`, { courseId: "system-design", idempotencyKey: "concurrent-attempt-key" }),
      routeContext(assessmentKey),
    ));
    expect(reusedForCourse.status).toBe(409);
    expect(await reusedForCourse.json()).toEqual({ error: "idempotency_key_conflict" });
    const reusedForAssessment = await asUser(alice, () => startAttempt(
      request("/api/assessments/another-assessment/attempts", { courseId: "applied-ai", idempotencyKey: "concurrent-attempt-key" }),
      routeContext("another-assessment"),
    ));
    expect(reusedForAssessment.status).toBe(409);
    expect(await reusedForAssessment.json()).toEqual({ error: "idempotency_key_conflict" });
  });

  it("pins historical questions and grading while newly started attempts use the newer published version", async () => {
    const historical = await (await begin(alice, "historical-attempt-key")).json();
    expect(historical.assessment.version).toBe(1);
    expect((await saveAnswer(alice, historical.attemptId, "q1", "a")).status).toBe(200);
    await fixture.db.assessment.create({ data: {
      key: assessmentKey, courseVersionId: fixture.courseVersion.id, title: "Acceptance assessment v2",
      version: 2, passPercent: 80, publishedAt: new Date(),
      questions: { create: {
        key: "q1", position: 0,
        prompt: { prompt: "Version two asks about a different boundary.", choices: [{ id: "a", text: "First boundary" }, { id: "b", text: "Second boundary" }] },
        answerKey: "b", topicTags: ["newer-topic"], feedback: "Revisit the newer boundary.",
      } },
    } });
    const historicalReplay = await (await begin(alice, "historical-attempt-key")).json();
    expect(historicalReplay).toEqual(historical);
    const resumedHistorical = await (await asUser(alice, () => getAttempt(
      new Request(`https://academy.test/api/attempts/${historical.attemptId}`), routeContext(historical.attemptId),
    ))).json();
    expect(resumedHistorical).toMatchObject({ assessment: { version: 1 }, responses: { q1: "a" } });
    expect(resumedHistorical.questions[0].prompt.prompt).toBe(historical.questions[0].prompt.prompt);
    const recent = await (await begin(alice, "new-version-attempt-key")).json();
    expect(recent.assessment.version).toBe(2);
    expect(recent.questions[0].prompt.prompt).toBe("Version two asks about a different boundary.");
    const oldResult = await (await submitSaved(alice, historical.attemptId, { q1: "a" })).json();
    const newResult = await (await grade(alice, recent.attemptId, "a")).json();
    expect(oldResult).toMatchObject({ passed: true, scorePercent: 100 });
    expect(newResult).toMatchObject({ passed: false, scorePercent: 0, remediationTopics: ["newer-topic"] });
    expect(await (await grade(alice, historical.attemptId, "b")).json()).toEqual(oldResult);
  });

  it("deduplicates concurrent project requests, preserves revisions, and rejects changed content under the same key", async () => {
    const input = projectInput("concurrent-project-key");
    const responses = await Promise.all(Array.from({ length: 8 }, (_, index) => project(alice, {
      ...input, checklist: index % 2 ? [...input.checklist].reverse() : input.checklist,
    })));
    expect(responses.every(({ status }) => status === 200 || status === 201)).toBe(true);
    const bodies = await Promise.all(responses.map((response) => response.json()));
    for (const body of bodies) expect(body).toEqual(bodies[0]);
    expect(bodies[0].submission.status).toBe("submitted—self-reported");
    const conflicting = await project(alice, { ...input, reflection: "A different reflection must be a separate revision." });
    expect(conflicting.status).toBe(409);
    expect(await conflicting.json()).toEqual({ error: "idempotency_key_conflict" });
    const revision = await project(alice, { ...input, idempotencyKey: "project-revision-two", commitSha: "b123456", reflection: "I revised the experiment after reproducing its failure." });
    expect(revision.status).toBe(201);
    const second = await revision.json();
    expect(second.submission.id).not.toBe(bodies[0].submission.id);
    const records = await (await asUser(alice, getLearning)).json();
    expect(records.submissions).toHaveLength(2);
    expect(new Set(records.submissions.map((entry: { commitSha: string }) => entry.commitSha))).toEqual(new Set(["a123456", "b123456"]));
    expect(await (await project(alice, input)).json()).toEqual(bodies[0]);
  });

  it("does not let forged scores, missing responses, unknown sections, or absent identity create learning evidence", async () => {
    expect((await saveProgress(request("/api/progress", { contentType: "section", contentId: firstSection.id, state: "completed" })))!.status).toBe(401);
    const { attemptId } = await (await begin(alice, "invalid-attempt-input")).json();
    for (const body of [{ responses: {} }, { responses: { q1: "not-a-choice" } }, { responses: { q1: "a" }, scorePercent: 100 }]) {
      const response = await asUser(alice, () => submitAttempt(request(`/api/attempts/${attemptId}/submit`, body), routeContext(attemptId)));
      expect(response.status).toBe(400);
    }
    const unknown = await asUser(alice, () => saveProgress(request("/api/progress", { contentType: "section", contentId: "unknown-section", state: "completed" })));
    expect(unknown.status).toBe(404);
    const records = await (await asUser(alice, getLearning)).json();
    expect(records.progress).toEqual([]);
    expect(records.attempts[0]).toMatchObject({ status: "in_progress", passed: null, scorePercent: null });
  });
});
