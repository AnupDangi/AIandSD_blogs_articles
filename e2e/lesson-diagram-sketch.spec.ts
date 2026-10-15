import { expect, test, type Page } from "@playwright/test";

function collectRenderErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" && /hydration|#418/i.test(message.text())) errors.push(message.text());
  });
  return errors;
}

test("Chapter 40 diagram sketch switches architecture and keeps a text equivalent", async ({ page }) => {
  const renderErrors = collectRenderErrors(page);
  await page.goto("/learn/complete-production-agent-architecture");

  const sketch = page.getByRole("region", { name: "Where does the workflow state live?" });
  await expect(sketch).toBeVisible();
  await expect(sketch.getByText("No model call")).toBeVisible();
  await expect(sketch.getByRole("list", { name: "Diagram text equivalent" }).getByRole("listitem")).toHaveCount(5);

  await sketch.getByRole("radio", { name: "Keep state only in an in-memory agent loop" }).check();
  await expect(sketch.getByText("A process crash loses the current step and evidence reference.")).toBeVisible();
  await sketch.getByRole("button", { name: /04 Worker crash/ }).click();
  await expect(sketch.getByRole("button", { name: /04 Worker crash/ })).toHaveAttribute("aria-pressed", "true");
  await expect(sketch.getByRole("img", { name: /in-memory agent loop request path/i })).toBeVisible();
  expect(renderErrors).toEqual([]);
});

test("Chapter 40 diagram sketch fits the mobile Simulate view", async ({ page }) => {
  const renderErrors = collectRenderErrors(page);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/learn/complete-production-agent-architecture");
  await page.getByRole("button", { name: "Simulate" }).click();

  const sketch = page.getByRole("region", { name: "Where does the workflow state live?" });
  await expect(sketch).toBeVisible();
  await expect(sketch.getByRole("radio", { name: "Persist bounded state and idempotent step results" })).toBeChecked();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  expect(renderErrors).toEqual([]);
});

const additionalSketches = [
  { slug: "production-rag-architecture", title: "Where does an unusable source enter retrieval?", option: "Authorize before retrieval", summary: /Allowed source IDs come from the trusted request identity/ },
  { slug: "retries-fallbacks-and-graceful-degradation", title: "What should happen when the reranker slows down?", option: "Skip the optional reranker and label the result", summary: /Valid only if the no-reranker path meets the minimum quality gate/ },
  { slug: "prompt-injection-and-untrusted-context", title: "Where does the authorization boundary live?", option: "Enforce an application allowlist at each boundary", summary: /citation IDs cannot exceed the supplied set/ },
] as const;

for (const item of additionalSketches) {
  test(`${item.slug} has an authored diagram sketch with a text equivalent`, async ({ page }) => {
    const renderErrors = collectRenderErrors(page);
    await page.goto(`/learn/${item.slug}`);
    const sketch = page.getByRole("region", { name: item.title });
    await expect(sketch).toBeVisible();
    await expect(sketch.getByRole("radio")).toHaveCount(3);
    await expect(sketch.getByRole("list", { name: "Diagram text equivalent" }).getByRole("listitem")).toHaveCount(5);
    await sketch.getByRole("radio", { name: item.option }).check();
    await expect(sketch.getByText(item.summary)).toBeVisible();
    await sketch.getByRole("button", { name: /03 / }).click();
    await expect(sketch.getByRole("button", { name: /03 / })).toHaveAttribute("aria-pressed", "true");
    expect(renderErrors).toEqual([]);
  });
}

test("lessons without a sketch render no diagram region", async ({ page }) => {
  await page.goto("/learn/transformer-attention-for-engineers");
  await expect(page.locator(".lesson-diagram-sketch")).toHaveCount(0);
});
