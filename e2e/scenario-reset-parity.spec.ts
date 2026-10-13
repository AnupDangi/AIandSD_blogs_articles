import { expect, test, type Page } from "@playwright/test";

const scenarios = [
  {
    lesson: "ai-01 request-workbench pipeline",
    slug: "ai-systems-are-products-not-model-calls",
    change: (page: Page) => page.getByLabel("Inject a request condition").selectOption("retrieve"),
    changedState: (page: Page) => expect(page.locator('dl[aria-label="Request pipeline trace"]')).toContainText("failed: No eligible evidence returned"),
    resetAction: (page: Page) => page.getByRole("button", { name: "↺ Reset scenario" }).click(),
    defaultState: (page: Page) => expect(page.locator('dl[aria-label="Request pipeline trace"]')).toContainText("passed: Tenant scope verified"),
  },
  {
    lesson: "ai-22 evaluation-console slice-threshold",
    slug: "evaluation-datasets-and-failure-taxonomy",
    change: (page: Page) => page.getByLabel("Decision threshold").press("End"),
    changedState: (page: Page) => expect(page.locator(".eval-summary")).toContainText("0 / 4"),
    resetAction: (page: Page) => page.getByRole("button", { name: "↺ Reset controls" }).click(),
    defaultState: (page: Page) => expect(page.locator(".eval-summary")).toContainText("2 / 4"),
  },
  {
    lesson: "ai-31 trust-boundary-sandbox",
    slug: "security-sandboxing-and-containment",
    change: (page: Page) => page.getByLabel("Instruction source").selectOption("user"),
    changedState: (page: Page) => expect(page.locator('dl[aria-label="Trust decision inputs"]')).toContainText("SourceUser request"),
    resetAction: (page: Page) => page.getByRole("button", { name: "Reset this scenario" }).click(),
    defaultState: (page: Page) => expect(page.locator('dl[aria-label="Trust decision inputs"]')).toContainText("SourceRetrieved document"),
  },
] as const;

for (const scenario of scenarios) {
  test(`${scenario.lesson} returns to its authored default after reset`, async ({ page }) => {
    await page.goto(`/learn/${scenario.slug}`);
    await scenario.defaultState(page);
    await scenario.change(page);
    await scenario.changedState(page);
    await scenario.resetAction(page);
    await scenario.defaultState(page);
  });
}

test("ai-31 trust-boundary-sandbox reset is keyboard-reachable and restores the authored default", async ({ page }) => {
  await page.goto("/learn/security-sandboxing-and-containment");
  await expect(page.locator("blockquote.untrusted-quote")).toContainText("attacker.example");
  await page.getByLabel("Instruction source").selectOption("user");
  await expect(page.locator("blockquote.untrusted-quote")).toContainText("Review whether the restricted export");

  await page.getByLabel("Instruction source").focus();
  let reached = false;
  for (let tab = 0; tab < 12 && !reached; tab += 1) {
    reached = await page.evaluate(() => document.activeElement instanceof HTMLButtonElement && (document.activeElement?.textContent ?? "").includes("Reset this scenario"));
    if (!reached) await page.keyboard.press("Tab");
  }
  expect(reached, "Reset control must be reachable by Tab traversal").toBe(true);

  await page.keyboard.press("Space");
  await expect(page.locator("blockquote.untrusted-quote")).toContainText("attacker.example");
  await expect(page.locator('dl[aria-label="Trust decision inputs"]')).toContainText("SourceRetrieved document");
});
