import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const emptyLearning = { resumeLocation: null, progress: [], attempts: [], submissions: [], weakTopics: [] };
const firstLessonSlug = "ai-systems-are-products-not-model-calls";

async function fulfillLearning(route: import("@playwright/test").Route, body: unknown = emptyLearning, status = 200) {
  await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
}

test("loading saved records does not briefly show a guest learning preview", async ({ page }) => {
  let finish!: () => void;
  const ready = new Promise<void>((resolve) => { finish = resolve; });
  await page.route("**/api/me/learning", async (route) => { await ready; await fulfillLearning(route); });
  await page.goto("/dashboard");
  await expect(page.getByRole("status").filter({ hasText: "Loading your saved learning records" })).toBeVisible();
  await expect(page.getByText("Guest preview", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Explore your learning workspace." })).toHaveCount(0);
  finish();
  await expect(page.getByRole("heading", { name: "Your next chapter starts here." })).toBeVisible();
});

test("guest workspace explains saved learning and links to sign-in", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/me/learning", (route) => fulfillLearning(route, { error: "unauthorized" }, 401));
  await page.goto("/dashboard");
  await expect(page.getByText("Guest preview", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in to save your learning", exact: true })).toHaveAttribute("href", "/sign-in?next=%2Fdashboard");
  await expect(page.getByRole("link", { name: "Explore the first lesson", exact: true })).toHaveAttribute("href", `/learn/${firstLessonSlug}`);
  await expect(page.locator(".lh-record-summary")).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("new signed-in learner gets a real first lesson and distinct empty records", async ({ page }) => {
  await page.route("**/api/me/learning", (route) => fulfillLearning(route));
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Your next chapter starts here." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Start first lesson" })).toHaveAttribute("href", `/learn/${firstLessonSlug}`);
  await expect(page.getByText("Sections marked read", { exact: true })).toBeVisible();
  await expect(page.getByText("Assessment versions passed", { exact: true })).toBeVisible();
  await expect(page.getByText("Project links submitted", { exact: true })).toBeVisible();
  await expect(page.locator(".lh-record-number")).toHaveText(["0", "0", "0"]);
  await expect(page.locator(".lh-course-outline li")).toHaveCount(8);
  await expect(page.getByText("Guest preview", { exact: true })).toHaveCount(0);
});

test("returning learner resumes the saved section and keeps versions and self-reported work visible", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.route("**/api/me/learning", (route) => fulfillLearning(route, {
    resumeLocation: { lessonId: "ai-01", lessonSlug: firstLessonSlug, sectionId: "ai-01-model" },
    progress: [
      { contentType: "section", contentId: "ai-01-model", state: "completed", updatedAt: "2026-10-10T01:00:00Z" },
      { contentType: "lesson", contentId: "ai-01", state: "completed", updatedAt: "2026-10-10T01:00:00Z" },
    ],
    attempts: [
      { id: "attempt-active", assessmentVersion: 3, status: "in_progress", scorePercent: null, passed: null, startedAt: "2026-10-10T04:00:00Z", submittedAt: null, assessment: { id: "assessment-1", key: "ai-01-formative", title: "Foundations knowledge check" } },
      { id: "attempt-1", assessmentVersion: 2, status: "submitted", scorePercent: 80, passed: true, startedAt: "2026-10-10T00:00:00Z", submittedAt: "2026-10-10T01:00:00Z", assessment: { id: "assessment-1", key: "ai-01-formative", title: "Foundations knowledge check" } },
      { id: "attempt-2", assessmentVersion: 2, status: "submitted", scorePercent: 100, passed: true, startedAt: "2026-10-10T02:00:00Z", submittedAt: "2026-10-10T03:00:00Z", assessment: { id: "assessment-1", key: "ai-01-formative", title: "Foundations knowledge check" } },
    ],
    submissions: [{ id: "submission-1", projectId: "ai-milestone-1", repositoryUrl: "https://github.com/learner/document-intelligence", commitSha: "ab1234567890", submittedAt: "2026-10-10T01:00:00Z", status: "submitted—self-reported", courseVersion: { courseId: "applied-ai", version: 3 } }],
    weakTopics: [{ topicId: "ai-01", misses: 2 }],
  }));
  await page.goto("/dashboard");
  await expect(page.getByRole("link", { name: "Resume learning" })).toHaveAttribute("href", `/learn/${firstLessonSlug}#section-ai-01-model`);
  await expect(page.getByRole("link", { name: "Resume assessment" })).toHaveAttribute("href", "/assessments/ai-01-formative?attemptId=attempt-active");
  await expect(page.locator(".lh-record-number")).toHaveText(["1", "1", "1"]);
  await expect(page.getByText("2 submitted attempts", { exact: true })).toBeVisible();
  await expect(page.getByText(/Self-reported submissions\. Repository contents and tests have not been verified/)).toBeVisible();
  await expect(page.getByText(/Course version 3/)).toBeVisible();
  await expect(page.locator(".lh-history-item").filter({ hasText: "Foundations knowledge check" }).first()).toContainText("Version 2");
  await expect(page.getByRole("link", { name: /Open repository/ })).toHaveAttribute("href", "https://github.com/learner/document-intelligence");
  await expect(page.locator(".lh-review-queue a")).toHaveAttribute("href", `/learn/${firstLessonSlug}`);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const accessibility = await new AxeBuilder({ page }).include(".learning-home").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(accessibility.violations).toEqual([]);
});

test("failed learning load has a working retry rather than a false guest state", async ({ page }) => {
  let requestCount = 0;
  await page.route("**/api/me/learning", async (route) => {
    requestCount += 1;
    await fulfillLearning(route, requestCount === 1 ? { error: "unavailable" } : emptyLearning, requestCount === 1 ? 500 : 200);
  });
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "We couldn’t load your learning records" })).toBeVisible();
  await expect(page.getByText("Guest preview", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your next chapter starts here." })).toBeVisible();
  expect(requestCount).toBe(2);
});


test("signed-in storage setup state does not claim guest access or invent records", async ({ page }) => {
  await page.route("**/api/me/learning", (route) => fulfillLearning(route, { error: "setup_required" }, 503));
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Saved learning is not connected yet" })).toBeVisible();
  await expect(page.getByText("Your account is signed in", { exact: false })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open the course map", exact: true })).toHaveAttribute("href", "/courses/reliable-ai-applications");
  await expect(page.getByRole("button", { name: "Try again", exact: true })).toBeVisible();
  await expect(page.getByText("Guest preview", { exact: true })).toHaveCount(0);
  await expect(page.locator(".lh-record-summary")).toHaveCount(0);
});

test("the saved-record workspace repaints and remains accessible when switching to dark", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/api/me/learning", (route) => fulfillLearning(route));
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Your next chapter starts here." })).toBeVisible();
  await page.getByRole("combobox", { name: "Color theme" }).selectOption("dark");
  await expect(page.locator(".academy-shell")).toHaveCSS("background-color", "rgb(15, 23, 26)");
  const scan = await new AxeBuilder({ page }).withTags(["wcag2a","wcag2aa","wcag21a","wcag21aa"]).analyze();
  expect(scan.violations.map((item) => ({ id: item.id, targets: item.nodes.map((node) => node.target) }))).toEqual([]);
  await page.getByRole("combobox", { name: "Color theme" }).selectOption("light");
  await expect(page.locator(".academy-shell")).toHaveCSS("background-color", "rgb(245, 247, 246)");
});
