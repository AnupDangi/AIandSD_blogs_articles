import { expect, test } from "@playwright/test";

const cases = [
  { slug: "durable-long-running-agents", id: "ai-21", map: /Authored mechanism map: the crash window/, command: "python -m document_intelligence.durability --demo" },
  { slug: "agent-trajectory-evaluation", id: "ai-24", map: /Authored mechanism map.*outcome and path are separate/, command: "python -m document_intelligence.trajectory" },
  { slug: "background-jobs-and-resumable-execution", id: "ai-38", map: /Authored mechanism map: two workers, one revision/, command: "python -m document_intelligence.jobs --demo" },
];

for (const lesson of cases) {
  test(`${lesson.id} exposes its mechanism map and runnable task on a narrow screen`, async ({ page }) => {
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
    await expect(page.locator(".source-markdown pre").filter({ hasText: lesson.command })).toBeVisible();
  });
}
