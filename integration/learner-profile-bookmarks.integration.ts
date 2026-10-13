import { beforeEach, describe, expect, it, vi } from "vitest";
import { lessons } from "@/content/catalog";
import { asUser, resetDatabase } from "./support";

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

import { GET as getProfile, PATCH as patchProfile } from "@/app/api/me/profile/route";
import { DELETE as deleteBookmark, GET as listBookmarks, POST as createBookmark } from "@/app/api/me/bookmarks/route";
import { GET as getTutorHistory } from "@/app/api/me/tutor-history/route";

const alice = "profile-learner-alice";
const bob = "profile-learner-bob";
const lesson = lessons.find(({ id }) => id === "ai-01")!;
const firstSection = lesson.sections[0];
const write = (method: string, path: string, body: unknown) => new Request(`https://academy.test${path}`, {
  method, headers: { origin: "https://academy.test", "content-type": "application/json" }, body: JSON.stringify(body),
});
const read = (path: string) => new Request(`https://academy.test${path}`);

let fixture: Awaited<ReturnType<typeof resetDatabase>>;
beforeEach(async () => { fixture = await resetDatabase(); });

describe("learner profile with real PostgreSQL", () => {
  it("returns no profile before the learner saves one, then upserts and updates it", async () => {
    const absent = await asUser(alice, () => getProfile());
    expect(absent.status).toBe(200);
    expect(absent.headers.get("cache-control")).toContain("no-store");
    expect(await absent.json()).toEqual({ profile: null });

    const created = await asUser(alice, () => patchProfile(write("PATCH", "/api/me/profile", {
      displayName: "  Learner Alice  ", bio: " Studying reliable AI systems. ",
    })));
    expect(created.status).toBe(200);
    expect(await created.json()).toEqual({ profile: { displayName: "Learner Alice", bio: "Studying reliable AI systems.", updatedAt: expect.any(String) } });

    const updated = await asUser(alice, () => patchProfile(write("PATCH", "/api/me/profile", { bio: null })));
    expect(updated.status).toBe(200);
    expect(await updated.json()).toEqual({ profile: { displayName: "Learner Alice", bio: null, updatedAt: expect.any(String) } });

    const kept = await asUser(alice, () => patchProfile(write("PATCH", "/api/me/profile", {})));
    expect((await kept.json()).profile.displayName).toBe("Learner Alice");
    expect(await (await asUser(alice, () => getProfile())).json()).toEqual({
      profile: { displayName: "Learner Alice", bio: null, updatedAt: expect.any(String) },
    });
  });

  it("keeps each learner's profile isolated and rejects oversized or unauthenticated edits", async () => {
    await asUser(alice, () => patchProfile(write("PATCH", "/api/me/profile", { displayName: "Alice", bio: "Alice only." })));
    const otherView = await asUser(bob, () => getProfile());
    expect(await otherView.json()).toEqual({ profile: null });

    const bobSaved = await asUser(bob, () => patchProfile(write("PATCH", "/api/me/profile", { displayName: "Bob", bio: "Bob only." })));
    expect(bobSaved.status).toBe(200);
    const aliceView = await (await asUser(alice, () => getProfile())).json();
    expect(aliceView.profile).toEqual({ displayName: "Alice", bio: "Alice only.", updatedAt: expect.any(String) });
    const bobView = await (await asUser(bob, () => getProfile())).json();
    expect(bobView.profile).toEqual({ displayName: "Bob", bio: "Bob only.", updatedAt: expect.any(String) });

    expect((await asUser(alice, () => patchProfile(write("PATCH", "/api/me/profile", { displayName: "x".repeat(81) })))).status).toBe(400);
    expect((await asUser(alice, () => patchProfile(write("PATCH", "/api/me/profile", { bio: "x".repeat(401) })))).status).toBe(400);
    expect((await patchProfile(write("PATCH", "/api/me/profile", { displayName: "Anon" })))!.status).toBe(401);
  });
});

describe("learner bookmarks with real PostgreSQL", () => {
  it("creates, deduplicates, lists newest first, and removes bookmarks idempotently", async () => {
    const created = await asUser(alice, () => createBookmark(write("POST", "/api/me/bookmarks", {
      courseId: "applied-ai", lessonId: lesson.id, sectionId: firstSection.id,
    })));
    expect(created.status).toBe(200);
    expect(created.headers.get("cache-control")).toContain("no-store");
    const bookmark = await created.json();
    expect(bookmark.bookmark).toMatchObject({ courseId: "applied-ai", lessonId: lesson.id, sectionId: firstSection.id });

    const duplicate = await asUser(alice, () => createBookmark(write("POST", "/api/me/bookmarks", {
      courseId: "applied-ai", lessonId: lesson.id, sectionId: firstSection.id,
    })));
    expect(duplicate.status).toBe(200);
    expect((await duplicate.json()).bookmark.id).toBe(bookmark.bookmark.id);

    await new Promise((resolve) => setTimeout(resolve, 5));
    const lessonLevel = await asUser(alice, () => createBookmark(write("POST", "/api/me/bookmarks", {
      courseId: "applied-ai", lessonId: lesson.id,
    })));
    expect((await lessonLevel.json()).bookmark.sectionId).toBe("");

    const listed = await asUser(alice, () => listBookmarks());
    const body = await listed.json();
    expect(body.bookmarks.map((entry: { sectionId: string }) => entry.sectionId)).toEqual(["", firstSection.id]);

    const removed = await asUser(alice, () => deleteBookmark(write("DELETE", "/api/me/bookmarks", {
      lessonId: lesson.id, sectionId: firstSection.id,
    })));
    expect(removed.status).toBe(204);
    const missing = await asUser(alice, () => deleteBookmark(write("DELETE", "/api/me/bookmarks", {
      lessonId: lesson.id, sectionId: firstSection.id,
    })));
    expect(missing.status).toBe(404);
    expect(await missing.json()).toEqual({ error: "bookmark_not_found" });
    const remaining = await (await asUser(alice, () => listBookmarks())).json();
    expect(remaining.bookmarks.map((entry: { sectionId: string }) => entry.sectionId)).toEqual([""]);
  });

  it("isolates bookmarks between learners and rejects invalid writes", async () => {
    await asUser(alice, () => createBookmark(write("POST", "/api/me/bookmarks", {
      courseId: "applied-ai", lessonId: lesson.id, sectionId: firstSection.id,
    })));
    const bobList = await (await asUser(bob, () => listBookmarks())).json();
    expect(bobList.bookmarks).toEqual([]);

    const bobOwn = await asUser(bob, () => createBookmark(write("POST", "/api/me/bookmarks", {
      courseId: "applied-ai", lessonId: lesson.id, sectionId: firstSection.id,
    })));
    const bobBookmark = await bobOwn.json();
    expect(bobBookmark.bookmark.id).not.toBe((await (await asUser(alice, () => listBookmarks())).json()).bookmarks[0].id);
    expect((await (await asUser(bob, () => listBookmarks())).json()).bookmarks).toHaveLength(1);

    const aliceRemoved = await asUser(alice, () => deleteBookmark(write("DELETE", "/api/me/bookmarks", {
      lessonId: lesson.id, sectionId: firstSection.id,
    })));
    expect(aliceRemoved.status).toBe(204);
    const bobKept = await (await asUser(bob, () => listBookmarks())).json();
    expect(bobKept.bookmarks.map((entry: { id: string }) => entry.id)).toEqual([bobBookmark.bookmark.id]);

    expect((await asUser(alice, () => createBookmark(write("POST", "/api/me/bookmarks", { lessonId: lesson.id })))).status).toBe(400);
    expect((await asUser(alice, () => createBookmark(write("POST", "/api/me/bookmarks", { courseId: "applied-ai", lessonId: "" })))).status).toBe(400);
    expect((await asUser(alice, () => deleteBookmark(write("DELETE", "/api/me/bookmarks", { sectionId: firstSection.id })))).status).toBe(400);
    expect((await createBookmark(write("POST", "/api/me/bookmarks", { courseId: "applied-ai", lessonId: lesson.id })))!.status).toBe(401);
    expect((await listBookmarks())!.status).toBe(401);
  });
});

describe("learner tutor history with real PostgreSQL", () => {
  const tutorRow = (userId: string, idempotencyKey: string, overrides: Record<string, unknown> = {}) => ({
    userId, idempotencyKey, taskKey: firstSection.id, requestFingerprint: "fixture-fingerprint",
    hintPackId: fixture.hintPack.id, status: "completed",
    response: { hint: { id: `hint-${idempotencyKey}`, level: 1, selectionMethod: "authored-fallback" }, packVersion: 1 },
    ...overrides,
  });

  it("lists only the learner's own tutor requests with resolved titles and whitelisted fields", async () => {
    await fixture.db.tutorRequest.create({ data: tutorRow(alice, "history-older", { createdAt: new Date(Date.now() - 60_000) }) });
    await new Promise((resolve) => setTimeout(resolve, 5));
    await fixture.db.tutorRequest.create({ data: tutorRow(alice, "history-newer", {
      taskKey: "unknown-task-key", createdAt: new Date(),
    }) });
    await fixture.db.tutorRequest.create({ data: tutorRow(bob, "history-other-owner") });
    await fixture.db.tutorRequest.create({ data: tutorRow(alice, "history-pending", {
      status: "pending", response: {}, createdAt: new Date(Date.now() - 120_000),
    }) });

    const history = await asUser(alice, () => getTutorHistory(read("/api/me/tutor-history")));
    expect(history.status).toBe(200);
    expect(history.headers.get("cache-control")).toContain("no-store");
    const body = await history.json();
    expect(body.history).toHaveLength(2);
    expect(body.history[0].taskKey).toBe("unknown-task-key");
    expect(body.history[0].lesson).toBeNull();
    expect(body.history[0].section).toBeNull();
    expect(body.history[1]).toEqual({
      id: expect.any(String), createdAt: expect.any(String),
      hintId: "hint-history-older", hintPackId: fixture.hintPack.id, taskKey: firstSection.id,
      lesson: { id: lesson.id, slug: lesson.slug, title: lesson.title },
      section: { id: firstSection.id, title: firstSection.title },
    });
    expect(JSON.stringify(body)).not.toMatch(/level|selectionMethod|packVersion/);

    const bobHistory = await (await asUser(bob, () => getTutorHistory(read("/api/me/tutor-history")))).json();
    expect(bobHistory.history.map((entry: { hintId: string }) => entry.hintId)).toEqual(["hint-history-other-owner"]);
  });

  it("applies the requested history limit and rejects an out-of-range or unauthenticated request", async () => {
    await Promise.all([1, 2, 3, 4].map(async (index) => {
      await fixture.db.tutorRequest.create({ data: tutorRow(alice, `history-limit-${index}`, { createdAt: new Date(Date.now() - index * 1_000) }) });
    }));
    const limited = await (await asUser(alice, () => getTutorHistory(read("/api/me/tutor-history?limit=2")))).json();
    expect(limited.history).toHaveLength(2);
    expect(limited.history[0].hintId).toBe("hint-history-limit-1");
    expect(limited.history[1].hintId).toBe("hint-history-limit-2");

    for (const limit of ["0", "51", "2.5", "abc"]) {
      expect((await asUser(alice, () => getTutorHistory(read(`/api/me/tutor-history?limit=${limit}`)))).status).toBe(400);
    }
    expect((await getTutorHistory(read("/api/me/tutor-history")))!.status).toBe(401);
  });
});
