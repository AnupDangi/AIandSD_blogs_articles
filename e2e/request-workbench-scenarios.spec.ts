import { expect, test } from "@playwright/test";

test("request workbench lessons expose their own observable lab and controls", async ({ page }) => {
  await page.goto("/learn/ai-systems-are-products-not-model-calls");
  await expect(page.getByText("TOY SCENARIO · Grounded support request")).toBeVisible();
  await page.getByLabel("Inject a request condition").selectOption("retrieve");
  await expect(page.locator("p[role='status']")).toContainText("stopped at retrieve");
  await expect(page.locator('dl[aria-label="Request pipeline trace"]')).toContainText("Not run after an earlier failure");

  await page.goto("/learn/structured-outputs-and-typed-interfaces");
  await page.getByLabel("Example response").selectOption("impossible");
  await expect(page.locator('dl[aria-label="Answer contract checks"]')).toContainText("Answer/status invariantFail");

  await page.goto("/learn/prompt-engineering-as-software-engineering");
  await expect(page.getByText("Overall fixture pass rate")).toBeVisible();
  await page.getByLabel("Prompt version").selectOption("B");
  await expect(page.getByRole("table", { name: "Prompt evaluation by slice" })).toContainText("Untrusted document text");
  await expect(page.locator(".metric-card").filter({ hasText: "Overall fixture pass rate" })).toContainText("60%");

  await page.goto("/learn/prompt-caching-and-reuse");
  await expect(page.locator('dl[aria-label="Prompt cache request"]')).toContainText("Cold/miss");
  await page.getByRole("button", { name: "Process next request" }).click();
  await expect(page.locator('dl[aria-label="Prompt cache request"]')).toContainText("Prefix hit");
  await page.getByRole("button", { name: "Reset request sequence" }).click();
  await expect(page.locator('dl[aria-label="Prompt cache request"]')).toContainText("Cold/miss");
});
