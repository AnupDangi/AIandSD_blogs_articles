import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const lessonPath = "/learn/ai-systems-are-products-not-model-calls";
const assessmentPath = "/assessments/ai-01-formative";

test("lesson predictions lead to a saved check with honest guest sign-in", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/assessments/ai-01-formative/attempts", (route) => route.fulfill({
    status: 401,
    contentType: "application/json",
    body: JSON.stringify({ error: "unauthorized" }),
  }));
  await page.goto(lessonPath);
  await page.getByRole("button", { name: "Practice", exact: true }).click();
  const checkLink = page.getByRole("link", { name: /Take the 5-question saved knowledge check/ });
  await expect(checkLink).toHaveAttribute("href", assessmentPath);
  await checkLink.click();
  await expect(page.getByRole("heading", { level: 1, name: "AI systems are products, not model calls knowledge check" })).toBeVisible();
  await expect(page.getByText("Sign in to start and save an assessment attempt.")).toBeVisible();
  await expect(page.getByRole("link", { name: /Sign in to continue/ })).toHaveAttribute("href", `/sign-in?next=${encodeURIComponent(assessmentPath)}`);
  await expect(page.locator(".assessment-question")).toHaveCount(0);
});

test("signed-in assessment UI saves chosen IDs before server grading and shows feedback", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => localStorage.setItem("academy-theme", "dark"));
  const questions = Array.from({ length: 5 }, (_, index) => ({
    key: `ai-01-q${index + 1}`,
    position: index,
    prompt: { prompt: `Fixture question ${index + 1}?`, choices: [{ id: "option-a", text: "First choice" }, { id: "option-b", text: "Second choice" }] },
  }));
  let submitted: unknown = null;
  const savedResponses: unknown[] = [];
  await page.route("**/api/assessments/ai-01-formative/attempts", async (route) => {
    const input = route.request().postDataJSON();
    expect(input.courseId).toBe("applied-ai");
    expect(input.idempotencyKey).toBeTruthy();
    await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ attemptId: "fixture-attempt", status: "in_progress", assessment: { id: "ai-01-formative", title: "Lesson practice", version: 1 }, questions }) });
  });
  await page.route("**/api/attempts/fixture-attempt/submit", async (route) => {
    submitted = route.request().postDataJSON();
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ attemptId: "fixture-attempt", scorePercent: 80, passed: true, submittedAt: "2026-10-10T00:00:00.000Z", remediationTopics: ["ai-01"], remediationFeedback: [{ topicId: "ai-01", text: "Revisit the boundary between a model call and the surrounding service." }] }) });
  });
  await page.route("**/api/attempts/fixture-attempt/responses", async (route) => {
    const input = route.request().postDataJSON();
    expect(input).toMatchObject({ questionKey: expect.stringMatching(/^ai-01-q[1-5]$/), choiceId: "option-a" });
    savedResponses.push(input);
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ saved: true }) });
  });

  await page.goto(assessmentPath);
  await expect(page.locator(".assessment-question")).toHaveCount(5);
  const questionScan = await new AxeBuilder({ page }).withTags(["wcag2a","wcag2aa","wcag21a","wcag21aa"]).analyze();
  expect(questionScan.violations.map((item) => ({ id: item.id, targets: item.nodes.map((node) => node.target) }))).toEqual([]);
  await expect(page.getByRole("button", { name: /Submit answers/ })).toBeDisabled();
  for (const question of await page.locator(".assessment-question").all()) await question.getByRole("radio").first().check();
  await page.getByRole("button", { name: /Submit answers/ }).click();
  await expect(page.getByText("80%", { exact: true })).toBeVisible();
  await expect(page.getByText("Revisit the boundary between a model call and the surrounding service.")).toBeVisible();
  const resultScan = await new AxeBuilder({ page }).withTags(["wcag2a","wcag2aa","wcag21a","wcag21aa"]).analyze();
  expect(resultScan.violations.map((item) => ({ id: item.id, targets: item.nodes.map((node) => node.target) }))).toEqual([]);
  expect(savedResponses).toHaveLength(5);
  expect(submitted).toEqual({ expectedResponses: Object.fromEntries(Array.from({ length: 5 }, (_, index) => [`ai-01-q${index + 1}`, "option-a"])) });
});

test("dashboard deep link restores server-saved responses without starting a new attempt", async ({ page }) => {
  const questions = Array.from({ length: 5 }, (_, index) => ({
    key: `ai-01-q${index + 1}`,
    position: index,
    prompt: { prompt: `Fixture question ${index + 1}?`, choices: [{ id: "option-a", text: "First choice" }, { id: "option-b", text: "Second choice" }] },
  }));
  let startCount = 0;
  await page.route("**/api/assessments/ai-01-formative/attempts", async (route) => {
    startCount += 1;
    await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({
      attemptId: "retry-attempt", status: "in_progress",
      assessment: { id: "ai-01-formative", title: "Lesson practice", version: 3 }, questions,
    }) });
  });
  let savedResponses: Record<string, string> = { "ai-01-q1": "option-b", "ai-01-q2": "option-a" };
  let staleConflict = true;
  await page.route("**/api/attempts/server-attempt", async (route) => {
    expect(route.request().method()).toBe("GET");
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
      attemptId: "server-attempt", status: "in_progress",
      assessment: { id: "ai-01-formative", title: "Lesson practice", version: 2 }, questions,
      responses: savedResponses,
    }) });
  });
  await page.route("**/api/attempts/server-attempt/responses", async (route) => {
    const input = route.request().postDataJSON();
    savedResponses = { ...savedResponses, [input.questionKey]: input.choiceId };
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ saved: true }) });
  });
  await page.route("**/api/attempts/server-attempt/submit", async (route) => {
    const input = route.request().postDataJSON();
    expect(input.expectedResponses).toBeTruthy();
    if (staleConflict) {
      staleConflict = false;
      savedResponses = { ...savedResponses, "ai-01-q1": "option-a" };
      await route.fulfill({ status: 409, contentType: "application/json", body: JSON.stringify({ error: "responses_changed" }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ attemptId: "server-attempt", scorePercent: 80, passed: true, submittedAt: "2026-10-10T00:00:00.000Z", remediationTopics: ["ai-01"], remediationFeedback: [] }) });
  });

  await page.goto(`${assessmentPath}?attemptId=server-attempt`);
  await expect(page.getByRole("radio", { name: "Second choice" }).first()).toBeChecked();
  await expect(page.getByRole("radio", { name: "First choice" }).nth(1)).toBeChecked();
  await expect(page.getByText("2 of 5 answered")).toBeVisible();
  expect(startCount).toBe(0);
  for (const question of (await page.locator(".assessment-question").all()).slice(2)) await question.getByRole("radio").first().check();
  await page.getByRole("button", { name: /Submit answers/ }).click();
  await expect(page.getByText("Answers changed in another tab. We reloaded the saved choices; review them before submitting again.")).toBeVisible();
  await expect(page.getByRole("radio", { name: "First choice" }).first()).toBeChecked();
  await page.getByRole("button", { name: /Submit answers/ }).click();
  await expect(page.getByText("80%", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Retry assessment/ }).click();
  await expect(page).toHaveURL(/\/assessments\/ai-01-formative$/);
  await expect(page.locator(".assessment-question")).toHaveCount(5);
  expect(startCount).toBe(1);
});

test("a tab reloads the submitted result after its draft save loses a race", async ({ page }) => {
  const questions = Array.from({ length: 5 }, (_, index) => ({
    key: `ai-01-q${index + 1}`,
    position: index,
    prompt: { prompt: `Fixture question ${index + 1}?`, choices: [{ id: "option-a", text: "First choice" }, { id: "option-b", text: "Second choice" }] },
  }));
  let patchCount = 0;
  let recoveryCount = 0;
  await page.route("**/api/assessments/ai-01-formative/attempts", async (route) => {
    await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({
      attemptId: "conflicted-attempt", status: "in_progress",
      assessment: { id: "ai-01-formative", title: "Lesson practice", version: 1 }, questions,
    }) });
  });
  await page.route("**/api/attempts/conflicted-attempt/responses", async (route) => {
    patchCount += 1;
    await route.fulfill({ status: 409, contentType: "application/json", body: JSON.stringify({ error: "attempt_already_submitted" }) });
  });
  await page.route("**/api/attempts/conflicted-attempt", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
      attemptId: "conflicted-attempt", status: "submitted",
      assessment: { id: "ai-01-formative", title: "Lesson practice", version: 1 }, questions,
      responses: Object.fromEntries(questions.map(({ key }) => [key, "option-a"])),
    }) });
  });
  await page.route("**/api/attempts/conflicted-attempt/submit", async (route) => {
    recoveryCount += 1;
    expect(route.request().postDataJSON().expectedResponses).toEqual(Object.fromEntries(questions.map(({ key }) => [key, "option-a"])));
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
      attemptId: "conflicted-attempt", scorePercent: 80, passed: true,
      submittedAt: "2026-10-10T00:00:00.000Z", remediationTopics: [], remediationFeedback: [],
    }) });
  });

  await page.goto(assessmentPath);
  await expect(page.locator(".assessment-question")).toHaveCount(5);
  await page.locator(".assessment-question").first().getByRole("radio").first().check();
  await page.getByRole("button", { name: "Retry saving" }).click();
  await expect(page.getByText("80%", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry saving" })).toHaveCount(0);
  expect(patchCount).toBe(1);
  expect(recoveryCount).toBe(1);
});

test("retrying a transient answer-save failure keeps the learner's latest choice", async ({ page }) => {
  const questions = Array.from({ length: 5 }, (_, index) => ({
    key: `ai-01-q${index + 1}`,
    position: index,
    prompt: { prompt: `Fixture question ${index + 1}?`, choices: [{ id: "option-a", text: "First choice" }, { id: "option-b", text: "Second choice" }] },
  }));
  const saved: Array<{ questionKey: string; choiceId: string }> = [];
  let failLatestChoiceOnce = true;
  await page.route("**/api/assessments/ai-01-formative/attempts", async (route) => {
    await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({
      attemptId: "transient-save-attempt", status: "in_progress",
      assessment: { id: "ai-01-formative", title: "Lesson practice", version: 1 }, questions,
    }) });
  });
  await page.route("**/api/attempts/transient-save-attempt/responses", async (route) => {
    const input = route.request().postDataJSON() as { questionKey: string; choiceId: string };
    saved.push(input);
    if (input.choiceId === "option-b" && failLatestChoiceOnce) {
      failLatestChoiceOnce = false;
      await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "temporarily_unavailable" }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ saved: true }) });
  });

  await page.goto(assessmentPath);
  const firstQuestion = page.locator(".assessment-question").first();
  await firstQuestion.getByRole("radio", { name: "First choice" }).check();
  await expect(page.getByText("Answers saved to your account.")).toBeVisible();
  await firstQuestion.getByRole("radio", { name: "Second choice" }).check();
  await page.getByRole("button", { name: "Retry saving" }).click();
  await expect(page.getByText("Answers saved to your account.")).toBeVisible();
  await expect(firstQuestion.getByRole("radio", { name: "Second choice" })).toBeChecked();
  expect(saved.map(({ choiceId }) => choiceId)).toEqual(["option-a", "option-b", "option-b"]);
});

test("late saves from a submitted attempt cannot alter a newly started attempt", async ({ page }) => {
  const questions = Array.from({ length: 5 }, (_, index) => ({
    key: `ai-01-q${index + 1}`,
    position: index,
    prompt: { prompt: `Fixture question ${index + 1}?`, choices: [{ id: "option-a", text: "First choice" }, { id: "option-b", text: "Second choice" }] },
  }));
  let startCount = 0;
  let patchCount = 0;
  let releaseFirstPatch = () => {};
  let releasePendingPatch = () => {};
  let notifySecondPatch = () => {};
  const firstPatchPending = new Promise<void>((resolve) => { releaseFirstPatch = resolve; });
  const secondPatchStarted = new Promise<void>((resolve) => { notifySecondPatch = resolve; });
  const pendingPatch = new Promise<void>((resolve) => { releasePendingPatch = resolve; });
  await page.route("**/api/assessments/ai-01-formative/attempts", async (route) => {
    startCount += 1;
    const attemptId = startCount === 1 ? "race-old-attempt" : "race-new-attempt";
    await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({
      attemptId, status: "in_progress",
      assessment: { id: "ai-01-formative", title: "Lesson practice", version: startCount }, questions,
    }) });
  });
  await page.route("**/api/attempts/race-old-attempt/responses", async (route) => {
    patchCount += 1;
    if (patchCount === 1) {
      await firstPatchPending;
      await route.fulfill({ status: 409, contentType: "application/json", body: JSON.stringify({ error: "attempt_already_submitted" }) });
      return;
    }
    notifySecondPatch();
    await pendingPatch;
    await route.fulfill({ status: 409, contentType: "application/json", body: JSON.stringify({ error: "attempt_already_submitted" }) });
  });
  await page.route("**/api/attempts/race-old-attempt", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
      attemptId: "race-old-attempt", status: "submitted",
      assessment: { id: "ai-01-formative", title: "Lesson practice", version: 1 }, questions,
      responses: { "ai-01-q1": "option-a", "ai-01-q2": "option-a" },
    }) });
  });
  await page.route("**/api/attempts/race-old-attempt/submit", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
      attemptId: "race-old-attempt", scorePercent: 80, passed: true,
      submittedAt: "2026-10-10T00:00:00.000Z", remediationTopics: [], remediationFeedback: [],
    }) });
  });

  await page.goto(assessmentPath);
  await expect(page.locator(".assessment-question")).toHaveCount(5);
  await page.locator(".assessment-question").nth(0).getByRole("radio").first().check();
  await page.locator(".assessment-question").nth(1).getByRole("radio").first().check();
  releaseFirstPatch();
  await secondPatchStarted;
  await expect(page.getByRole("button", { name: "Retry saving" })).toBeVisible();
  await page.getByRole("button", { name: "Retry saving" }).click();
  await expect(page.getByText("80%", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Retry assessment/ }).click();
  await expect(page.locator(".assessment-question")).toHaveCount(5);
  expect(startCount).toBe(2);
  releasePendingPatch();
  await expect(page.getByRole("button", { name: "Retry saving" })).toHaveCount(0);
  await expect(page.getByText("0 of 5 answered")).toBeVisible();
});
