import { expect, test } from "@playwright/test";

test("inference lesson pairs the generated scheduling illustration with its toy-model caveat", async ({ page }) => {
  await page.goto("/learn/inference-kv-cache-and-batching");

  await expect(page.getByRole("heading", { level: 1, name: "Inference, KV cache, and batching", exact: true })).toBeVisible();
  const figure = page.locator("figure.lesson-illustration");
  const illustration = figure.getByRole("img", { name: /prompt-prefill blocks followed by concurrent token-generation lanes/i });
  await expect(illustration).toBeVisible();
  await expect(figure.locator("figcaption")).toContainText("not a server trace or benchmark");
  await expect(figure.locator("figcaption")).toContainText("inference-scheduler simulation");
  await expect.poll(() => illustration.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
});
