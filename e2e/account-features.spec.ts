import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const firstLessonSlug = "ai-systems-are-products-not-model-calls";
const now = "2026-10-10T09:00:00Z";

async function fulfillJson(route: import("@playwright/test").Route, body: unknown, status = 200) {
  await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
}

type ProfileRoute = (route: import("@playwright/test").Route) => Promise<void>;

function profileRoute(body: unknown, status = 200, patchBody?: unknown): ProfileRoute {
  return async (route) => {
    if (route.request().method() === "PATCH") await fulfillJson(route, patchBody, status);
    else await fulfillJson(route, body, status);
  };
}

function mockProfile(page: import("@playwright/test").Page, body: unknown, status = 200, patchBody?: unknown) {
  return page.route("**/api/me/profile", profileRoute(body, status, patchBody));
}

function mockBookmarks(page: import("@playwright/test").Page, body: unknown, status = 200, handlers?: { calls: string[] }) {
  return page.route("**/api/me/bookmarks", async (route) => {
    const method = route.request().method();
    handlers?.calls.push(`${method} ${route.request().postData() ?? ""}`);
    if (method === "POST") return void (await fulfillJson(route, { bookmark: { id: "bookmark-new", courseId: "reliable-ai-applications", lessonId: "ai-01", sectionId: "", createdAt: now } }));
    if (method === "DELETE") return void (await route.fulfill({ status: 204 }));
    await fulfillJson(route, body, status);
  });
}

function mockTutorHistory(page: import("@playwright/test").Page, body: unknown, status = 200) {
  return page.route("**/api/me/tutor-history", (route) => fulfillJson(route, body, status));
}

test("the profile editor loads saved values, saves, and confirms with a saved status", async ({ page }) => {
  let savedBody: string | null = null;
  await page.route("**/api/me/profile", async (route) => {
    if (route.request().method() === "PATCH") {
      savedBody = route.request().postData() ?? null;
      await fulfillJson(route, { profile: { displayName: "Ada Rewritten", bio: "Updated for reliability.", updatedAt: now } });
      return;
    }
    await fulfillJson(route, { profile: { displayName: "Ada Learner", bio: "Care about reliable AI.", updatedAt: "2026-10-09T09:00:00Z" } });
  });
  await page.goto("/settings");
  const name = page.getByLabel("Display name");
  const bio = page.getByLabel("About you");
  await expect(name).toHaveValue("Ada Learner");
  await expect(bio).toHaveValue("Care about reliable AI.");
  await expect(page.getByText("11/80")).toBeVisible();
  await name.fill("Ada Rewritten");
  await bio.fill("Updated for reliability.");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Profile saved." })).toBeVisible();
  expect(savedBody).toContain('"displayName":"Ada Rewritten"');
  expect(savedBody).toContain('"bio":"Updated for reliability."');
  const accessibility = await new AxeBuilder({ page }).include(".settings-page").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(accessibility.violations).toEqual([]);
});

test("the bookmark toggle posts the lesson, reflects aria-pressed, and removes again", async ({ page }) => {
  const calls: string[] = [];
  await mockBookmarks(page, { bookmarks: [] }, 200, { calls });
  await page.goto(`/learn/${firstLessonSlug}`);
  const toggle = page.getByRole("button", { name: "Bookmark this lesson" });
  await expect(toggle).toBeEnabled();
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  expect(calls.some((call) => call.startsWith("POST") && call.includes('"lessonId":"ai-01"'))).toBe(true);
  expect(calls.some((call) => call.startsWith("DELETE") && call.includes('"lessonId":"ai-01"'))).toBe(true);
});

test("the bookmark button is keyboard reachable and toggles from the keyboard", async ({ page }) => {
  await mockBookmarks(page, { bookmarks: [] });
  await page.goto(`/learn/${firstLessonSlug}`);
  const toggle = page.getByRole("button", { name: "Bookmark this lesson" });
  await expect(toggle).toBeEnabled();
  await toggle.press("Space");
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await expect(toggle).toBeFocused();
});

test("the dashboard shows a saved bookmark and a hint-history entry", async ({ page }) => {
  await page.route("**/api/me/learning", (route) => fulfillJson(route, { resumeLocation: null, progress: [], attempts: [], submissions: [], weakTopics: [] }));
  await mockBookmarks(page, { bookmarks: [{ id: "bookmark-1", courseId: "reliable-ai-applications", lessonId: "ai-01", sectionId: "ai-01-model", createdAt: now }] });
  await mockTutorHistory(page, { history: [{ id: "hint-1", createdAt: now, hintId: "ai-01-model-hint-2", hintPackId: "ai-01-model", taskKey: "diagnose-a-systematic-error", lesson: { id: "ai-01", slug: firstLessonSlug, title: "AI systems are products, not model calls" }, section: { id: "ai-01-model", title: "The model is not the product" } }] });
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Saved bookmarks" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open section" })).toHaveAttribute("href", `/learn/${firstLessonSlug}#section-ai-01-model`);
  await expect(page.getByRole("heading", { name: "Saved hint requests" })).toBeVisible();
  await expect(page.getByText("1 hint request saved", { exact: false })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const accessibility = await new AxeBuilder({ page }).include(".learning-home").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(accessibility.violations).toEqual([]);
});

test("empty bookmark, hint-history, and profile states explain what to do next", async ({ page }) => {
  await page.route("**/api/me/learning", (route) => fulfillJson(route, { resumeLocation: null, progress: [], attempts: [], submissions: [], weakTopics: [] }));
  await mockBookmarks(page, { bookmarks: [] });
  await mockTutorHistory(page, { history: [] });
  await page.goto("/dashboard");
  await expect(page.getByText("No saved bookmarks yet.")).toBeVisible();
  await expect(page.getByText("No saved hint requests yet.")).toBeVisible();
  await mockProfile(page, { profile: null });
  await page.goto("/settings");
  await expect(page.getByText("This profile is empty.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Save profile" })).toBeEnabled();
  await expect(page.getByLabel("Display name")).toBeEditable();
});
