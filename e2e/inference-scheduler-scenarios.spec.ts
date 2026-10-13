import { expect, test } from "@playwright/test";

test("Chapter 4 connects its stated KV dimensions to a live sequence-memory estimate", async ({ page }) => {
  await page.goto("/learn/inference-kv-cache-and-batching");
  await expect(page.getByText("TOY SCENARIO · KV cache under concurrent decode")).toBeVisible();
  const kvMetric = page.locator(".engine-metric").filter({ hasText: "KV cache estimate" });
  await expect(kvMetric).toContainText("1.00 GiB");
  await expect(page.getByText(/128 KiB per token across both K and V/)).toBeVisible();

  await page.getByRole("slider", { name: "Active sequences" }).press("ArrowRight");
  await expect(kvMetric).toContainText("2.00 GiB");
  await page.getByRole("slider", { name: "Concurrent requests" }).press("ArrowRight");
  await expect(page.locator(".engine-metric").filter({ hasText: "Toy queue delay" })).toContainText("54 ms");
  await expect(page.locator(".engine-metric").filter({ hasText: "Relative throughput index" })).toContainText("35 units");

  await page.setViewportSize({ width: 320, height: 800 });
  await page.getByRole("button", { name: "Simulate" }).click();
  await expect(kvMetric).toContainText("2.00 GiB");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
