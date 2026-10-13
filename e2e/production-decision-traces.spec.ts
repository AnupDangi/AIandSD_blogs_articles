import { expect, test } from "@playwright/test";

const lessons = [
  { id: "ai-28", slug: "slos-and-resource-budgets" },
  { id: "ai-29", slug: "retries-fallbacks-and-graceful-degradation" },
  { id: "ai-30", slug: "canary-releases-and-regression-gates" },
  { id: "ai-36", slug: "model-and-provider-failure-modes" },
  { id: "ai-39", slug: "production-checklists-and-operational-readiness" },
  { id: "ai-40", slug: "complete-production-agent-architecture" },
] as const;

for (const lesson of lessons) {
  test(`${lesson.id} exposes a prediction, observed trace, and reset`, async ({ page }) => {
    await page.goto(`/learn/${lesson.slug}`);

    const policy = page.locator("#production-policy");
    const prediction = page.getByRole("radio").first();
    const advance = page.locator(".lesson-aside .demo-action-stack button.demo-primary");

    await expect(policy).toBeVisible();
    await policy.selectOption({ index: 1 });
    await prediction.check();
    await expect(advance).toBeEnabled();

    const initialCount = await page.locator(".tabletop-path [role='listitem']").count();
    await advance.click();
    await expect(page.locator(".tabletop-path [role='listitem']")).toHaveCount(initialCount + 1);

    for (let step = 0; step < 8 && await advance.isEnabled(); step += 1) {
      await advance.click();
    }
    await expect(page.locator(".tabletop-status")).toBeVisible();
    await expect(advance).toBeDisabled();

    await page.getByRole("button", { name: /Reset scenario/ }).click();
    await expect(page.locator(".tabletop-path [role='listitem']")).toHaveCount(0);
    await expect(page.locator(".tabletop-status")).toHaveCount(0);
    await expect(advance).toBeDisabled();
  });
}
