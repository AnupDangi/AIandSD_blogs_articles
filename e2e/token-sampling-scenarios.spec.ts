import { expect, test } from "@playwright/test";

test("Chapter 2 samples the same token distribution used by its worked example", async ({ page }) => {
  await page.goto("/learn/tokens-decoding-and-generation");
  await expect(page.getByRole("region", { name: "Tokens and sampling lab" })).toBeVisible();
  await expect(page.getByText("TOY SCENARIO · Reliable-tools next-token example")).toBeVisible();
  await expect(page.getByRole("list", { name: "Toy tokenizer output" }).locator(".token > span")).toHaveText(["An", "engineer", "builds", "reliable", "tools"]);
  const probabilities = page.getByRole("table", { name: "Toy next-token probabilities" });
  await expect(probabilities.getByRole("row").filter({ hasText: "carefully" })).toContainText("2.4");
  await expect(probabilities.getByRole("row").filter({ hasText: "carefully" })).toContainText("0.554");
  await expect(probabilities.getByRole("row").filter({ hasText: "carefully" })).toContainText("0.646");
  await expect(probabilities.getByRole("row").filter({ hasText: "quickly" })).toContainText("0.304");
  await expect(probabilities.getByRole("row").filter({ hasText: "quickly" })).toContainText("0.354");
  await expect(probabilities.getByRole("row").filter({ hasText: "today" })).toContainText("filtered");
  await expect(probabilities.getByRole("row").filter({ hasText: "-0.2" })).toContainText("filtered");
  await expect(page.locator("label[for='toy-top-p']")).toContainText("0.80");

  await page.getByRole("button", { name: "Sample next token" }).click();
  await expect(page.locator(".sample-output strong")).not.toHaveText("Not sampled yet");
  await page.getByRole("button", { name: "Attention", exact: true }).click();
  await expect(page.getByRole("region", { name: "Attention lab" })).toBeVisible();
  await page.getByRole("button", { name: "Tokens & sampling", exact: true }).click();
  await expect(page.getByRole("region", { name: "Tokens and sampling lab" })).toBeVisible();
  await expect(page.locator(".sample-output strong")).not.toHaveText("Not sampled yet");
  await page.getByRole("button", { name: /Reset/ }).click();
  await expect(page.locator("label[for='toy-top-p']")).toContainText("0.80");
  await expect(page.locator(".sample-output strong")).toHaveText("Not sampled yet");

  await page.setViewportSize({ width: 320, height: 800 });
  await page.getByRole("button", { name: "Simulate" }).click();
  const modeButton = page.getByRole("button", { name: "Tokens & sampling", exact: true });
  await expect(modeButton).toBeVisible();
  expect(await modeButton.evaluate((button) => button.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
