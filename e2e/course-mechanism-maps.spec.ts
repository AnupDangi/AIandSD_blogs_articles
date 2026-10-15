import { expect, test } from "@playwright/test";

const cases = [
  { slug: "durable-long-running-agents", id: "ai-21", map: /Authored mechanism map: the crash window/, task: /In your own TypeScript project, pick one step that has a side effect/ },
  { slug: "agent-trajectory-evaluation", id: "ai-24", map: /Authored mechanism map.*outcome and path are separate/, task: /In your own TypeScript project, add a deterministic trajectory evaluator/ },
  { slug: "background-jobs-and-resumable-execution", id: "ai-38", map: /Authored mechanism map: two workers, one revision/, task: /In your own TypeScript project, implement a small job store that saves revision, state, and artifact references together/ },
];

for (const lesson of cases) {
  test(`${lesson.id} exposes its mechanism map and TypeScript project task on a narrow screen`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 740 });
    const path = `/learn/${lesson.slug}`;
    await page.goto(path);
    await expect(page.getByRole("heading", { name: lesson.map })).toBeVisible();
    const table = page.getByRole("region", { name: "Scrollable source table" }).first();
    await expect(table).toHaveAttribute("tabindex", "0");
    await table.focus();
    await page.keyboard.press("ArrowRight");
    await expect.poll(() => table.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);

    await page.goto(`${path}#section-${lesson.id}-lab`);
    await expect(page.getByRole("heading", { name: "Run the experiment", exact: true })).toBeVisible();
    await expect(page.locator(".source-markdown").filter({ hasText: lesson.task }).first()).toBeVisible();
    // The old Python starter commands are gone from every lab.
    await expect(page.locator(".source-markdown pre").filter({ hasText: /python|unittest|document_intelligence/i })).toHaveCount(0);
  });
}
