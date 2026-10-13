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
