import { expect, test } from "@playwright/test";

test("Chapter 27 compares the authored sequential and parallel latency paths", async ({ page }) => {
  await page.goto("/learn/latency-engineering");
  await expect(page.getByText("TOY SCENARIO · Latency waterfall: sequential versus parallel tools")).toBeVisible();
  await expect(page.getByRole("region", { name: "Sequential baseline, total 5.4 s" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Parallel candidate, total 3.4 s" })).toBeVisible();
  await expect(page.getByText("Estimated time saved").locator("..")).toContainText("2.0 s");

  await page.getByLabel("Tool B depends on Tool A").check();
  await expect(page.getByRole("region", { name: "Dependent candidate, total 5.4 s" })).toBeVisible();
  await expect(page.getByText("Estimated time saved").locator("..")).toContainText("0.0 s");
  await expect(page.locator(".waterfall-decision")).toContainText("Tool B needs Tool A’s result");
  await expect(page.getByText("not measured TTFT or end-to-end p95")).toBeVisible();

  await page.setViewportSize({ width: 320, height: 800 });
  await page.getByRole("button", { name: "Simulate" }).click();
  await expect(page.getByRole("region", { name: "Dependent candidate, total 5.4 s" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
