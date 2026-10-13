import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

const resourceManifest = JSON.parse(readFileSync(new URL("../curriculum/resources.json", import.meta.url), "utf8")) as { type: string; url: string }[];

const routes = ["/", "/courses", "/courses/reliable-ai-applications", "/courses/system-design", "/topics", "/resources?format=video", "/search?q=retrieval", "/projects", "/dashboard", "/settings", "/sign-in", "/assessments/final-assessment", "/learn/transformer-attention-for-engineers"];

test("dark academy pages preserve accessible content and controls", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => localStorage.setItem("academy-theme", "dark"));
  const failures: unknown[] = [];
  for (const path of routes) {
    await page.goto(path);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    const result = await new AxeBuilder({ page }).withTags(["wcag2a","wcag2aa","wcag21a","wcag21aa"]).analyze();
    for (const violation of result.violations) {
      failures.push({ path, id: violation.id, nodes: violation.nodes.map((node) => ({ target: node.target, data: [...node.any,...node.all,...node.none].map((check) => check.data) })) });
    }
  }
  expect(failures, JSON.stringify(failures)).toEqual([]);
});

test("every page reflows at 320px with visible navigation and persisted theme", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const path of routes) {
    await page.goto(path);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), path).toBe(true);
    await expect(page.getByRole("link", { name: "LearnLikeADev home" })).toBeVisible();
    await expect(page.locator(".header-action")).toBeVisible();
  }
  await page.getByRole("combobox", { name: "Color theme" }).selectOption("dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme","dark");
  await page.getByRole("combobox", { name: "Color theme" }).selectOption("light");
  await expect(page.locator("html")).toHaveAttribute("data-theme","light");
});

test("course modules open by keyboard and resource filters have usable empty states", async ({ page }) => {
  await page.goto("/courses/reliable-ai-applications");
  const courseModule = page.locator("#retrieval");
  await courseModule.locator("summary").focus();
  await page.keyboard.press("Enter");
  await expect(courseModule).toHaveAttribute("open","");
  await expect(courseModule.getByRole("link", { name: /08.*Embeddings/ })).toBeVisible();
  await page.goto("/resources");
  await page.getByLabel("Format", { exact: true }).selectOption("video");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page).toHaveURL(/format=video/);
  await expect(page.locator(".resource-row")).toHaveCount(resourceManifest.filter((item) => item.type === "video").length);
  await expect(page.locator(".resource-row").first()).toBeVisible();
  await page.getByLabel("Search sources").fill("zzzz-no-match");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.getByRole("heading", { name: "No sources match these filters." })).toBeVisible();
  await page.getByRole("link", { name: "Show all sources" }).click();
  await expect(page.locator(".resource-row")).toHaveCount(resourceManifest.length);
});

test("landing explains the learning loop and does not present fabricated learner records", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Make the ideas work in your hands." })).toBeVisible();
  await expect(page.getByRole("list", { name: "How learning works" }).getByRole("listitem")).toHaveCount(4);
  await expect(page.locator(".lh-record-summary")).toHaveCount(0);
  await page.getByRole("link", { name: "Preview a lesson", exact: true }).click();
  await expect(page).toHaveURL(/transformer-attention-for-engineers/);
});

test("theme preference synchronizes both the control and page colors across tabs", async ({ page, context }) => {
  await page.goto("/courses");
  const second = await context.newPage();
  await second.goto("/topics");
  await page.getByRole("combobox", { name: "Color theme" }).selectOption("dark");
  await expect(second.locator("html")).toHaveAttribute("data-theme","dark");
  await expect(second.getByRole("combobox", { name: "Color theme" })).toHaveValue("dark");
  await expect(second.locator(".academy-shell")).toHaveCSS("background-color","rgb(20, 34, 31)");
  await second.getByRole("combobox", { name: "Color theme" }).selectOption("light");
  await expect(page.locator("html")).toHaveAttribute("data-theme","light");
  await expect(page.getByRole("combobox", { name: "Color theme" })).toHaveValue("light");
});

test("tablet navigation opens as a usable popup", async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 1000 });
  await page.goto("/courses");
  await page.getByLabel("Open navigation", { exact: true }).click();
  const navigation = page.getByRole("navigation", { name: "Mobile navigation" });
  await expect(navigation).toBeVisible();
  await expect(navigation).toHaveCSS("position","absolute");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await navigation.getByRole("link", { name: "Resources", exact: true }).click();
  await expect(page).toHaveURL(/\/resources$/);
});

test("all eight visual engines remain accessible in both themes on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/topics");
  const failures: unknown[] = [];
  for (const theme of ["light","dark"]) {
    await page.getByRole("combobox", { name: "Color theme" }).selectOption(theme);
    for (const name of ["Request workbench","Tokens & attention","Inference scheduler","Retrieval microscope","Agent state machine","Evaluation console","Trust-boundary sandbox","Production tabletop"]) {
      await page.getByRole("navigation", { name: "Choose a visual lab" }).getByRole("button", { name: new RegExp(name) }).click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), theme+" "+name).toBe(true);
      const scan = await new AxeBuilder({ page }).include(".engine-gallery").withTags(["wcag2a","wcag2aa","wcag21a","wcag21aa"]).analyze();
      for (const v of scan.violations) failures.push({ theme, name, id: v.id, targets: v.nodes.map((n) => n.target) });
    }
  }
  expect(failures, JSON.stringify(failures)).toEqual([]);
});

test("topic modules and video previews expose real lesson and source links", async ({ page }) => {
  await page.goto("/topics");
  await expect(page.locator(".topic-card")).toHaveCount(43);
  await page.getByRole("combobox", { name: "Filter topics by module" }).selectOption("retrieval");
  await expect(page.locator(".topic-card")).toHaveCount(7);
  await expect(page.locator(".topic-card").first().getByRole("link", { name: /Open lesson/ })).toHaveAttribute("href", /\/learn\//);
  await page.goto("/resources?format=video");
  await expect(page.locator(".video-thumbnail")).toHaveCount(resourceManifest.filter((item) => item.type === "video" && /(?:youtube\.com|youtu\.be)/.test(item.url)).length);
  await expect(page.locator(".video-thumbnail").first()).toHaveAttribute("aria-label", /Play .* \(loads YouTube\)/);
  for (const width of [320, 390, 1280]) {
    await page.setViewportSize({ width, height: 800 });
    const thumbnail = await page.locator(".resource-row:has(.video-thumbnail) .video-thumbnail").first().boundingBox();
    const row = await page.locator(".resource-row:has(.video-thumbnail)").first().boundingBox();
    expect(thumbnail).not.toBeNull();
    expect(row).not.toBeNull();
    expect(thumbnail!.width).toBeGreaterThan(width < 768 ? row!.width * 0.7 : 160);
    expect(thumbnail!.width / thumbnail!.height).toBeGreaterThan(1.4);
    expect(thumbnail!.x).toBeGreaterThanOrEqual(row!.x - 1);
    expect(thumbnail!.x + thumbnail!.width).toBeLessThanOrEqual(row!.x + row!.width + 1);
  }
});
