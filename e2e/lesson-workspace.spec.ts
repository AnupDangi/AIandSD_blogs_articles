import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

const resourceManifest: { type: string; lessonIds: string[]; url: string }[] = JSON.parse(readFileSync(new URL("../curriculum/resources.json", import.meta.url), "utf8"));

const lessonPath = "/learn/chunking-and-contextual-retrieval";
const allowedThumbnailUrls = new Set(resourceManifest
  .filter((resource) => resource.type === "video" && resource.lessonIds.includes("ai-10"))
  .map((resource) => `https://i.ytimg.com/vi/${new URL(resource.url).searchParams.get("v")}/hqdefault.jpg`));

test("Chapter 10 presents its conceptual figure, text alternative, and study sources", async ({ page }) => {
  const pageErrors: string[] = [];
  const unexpectedRequests: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("request", (request) => {
    if (new URL(request.url()).origin !== "http://127.0.0.1:4179" && !allowedThumbnailUrls.has(request.url())) unexpectedRequests.push(request.url());
  });

  await page.goto(lessonPath);

  await expect(page.getByRole("heading", { level: 1, name: "Chunking and contextual retrieval", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(page.getByRole("link", { name: "LearnLikeADev home" })).toBeVisible();

  const figure = page.locator("figure.lesson-illustration");
  const illustration = figure.getByRole("img", { name: /source document is split into two passages/i });
  await expect(illustration).toBeVisible();
  await expect(figure.locator("figcaption")).toContainText("Conceptual illustration");
  await expect(figure.locator("figcaption")).toContainText("not a ranking trace or measured result");
  const intrinsicWidth = await illustration.evaluate((image: HTMLImageElement) => image.naturalWidth);
  expect(intrinsicWidth).toBeGreaterThan(0);
  await expect(page.getByRole("link", { name: /Contextual Retrieval in AI Systems/ })).toBeVisible();
  expect(pageErrors).toEqual([]);
  expect(unexpectedRequests).toEqual([]);
});

test("mobile readers can switch to the simulation without horizontal page overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(lessonPath);

  await expect(page.getByRole("heading", { level: 1, name: "Chunking and contextual retrieval", exact: true })).toBeVisible();
  const image = page.locator("figure.lesson-illustration img");
  await expect(image).toBeVisible();

  const documentWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(documentWidth).toBeLessThanOrEqual(390);

  const simulate = page.getByRole("button", { name: "Simulate", exact: true });
  await simulate.click();
  await expect(simulate).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".visual-pane")).toBeVisible();
});
