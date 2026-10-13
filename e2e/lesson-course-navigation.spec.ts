import { expect, test } from "@playwright/test";

test("mobile course map opens and navigates to another lesson", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/learn/ai-systems-are-products-not-model-calls");

  const toggle = page.getByRole("button", { name: /Course map · 40 chapters|Close course map/ });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  const chapters = page.getByRole("navigation", { name: "Course chapters" });
  await expect(chapters).toBeVisible();
  await expect(chapters.getByRole("link", { name: /01 AI systems are products, not model calls/ })).toHaveAttribute("aria-current", "page");

  await chapters.getByRole("link", { name: /02 Tokens, decoding, and generation/ }).click();
  await expect(page).toHaveURL(/\/learn\/tokens-decoding-and-generation/);
  await expect(page.getByRole("heading", { level: 1, name: "Tokens, decoding, and generation" })).toBeVisible();
});

test("lesson reading reflows at 320px with WCAG text-spacing overrides", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/learn/ai-systems-are-products-not-model-calls");
  await page.addStyleTag({ content: `
    :root, :root * {
      line-height: 1.5 !important;
      letter-spacing: 0.12em !important;
      word-spacing: 0.16em !important;
    }
    p { margin-bottom: 2em !important; }
  ` });
  await expect(page.getByRole("heading", { level: 1, name: "AI systems are products, not model calls" })).toBeVisible();
  const metrics = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(metrics.document).toBeLessThanOrEqual(metrics.viewport);
  expect(metrics.body).toBeLessThanOrEqual(metrics.viewport);
});
