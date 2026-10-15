import { expect, test } from "@playwright/test";

const lessonPath = "/learn/chunking-and-contextual-retrieval";

test("reduced-motion readers can move between learning views with the keyboard", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(lessonPath);

  const documentMotion = await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior);
  expect(documentMotion).toBe("auto");

  const simulate = page.getByRole("button", { name: "Simulate", exact: true });
  await simulate.focus();
  await page.keyboard.press("Enter");
  await expect(simulate).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".visual-pane")).toBeVisible();

  const learn = page.getByRole("button", { name: "Learn", exact: true });
  await learn.focus();
  await page.keyboard.press("Enter");
  await expect(learn).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("article.lesson-reading")).toBeVisible();

  const transitionSeconds = await page.locator(".mobile-tabs button").first().evaluate((element) =>
    Number.parseFloat(getComputedStyle(element).transitionDuration),
  );
  expect(transitionSeconds).toBeLessThanOrEqual(0.00001);
});

test("reader controls work by keyboard and lesson text reflows at a test-only 200% scale", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto(lessonPath);

  const sizeOutput = page.getByRole("group", { name: "Text size" }).getByRole("status");
  const increase = page.getByRole("button", { name: "Increase text size" });
  await increase.focus();
  for (let index = 0; index < 4; index += 1) await page.keyboard.press("Enter");
  await expect(sizeOutput).toHaveText("22px");
  await expect(increase).toBeDisabled();

  const readerParagraph = page.locator("article.lesson-reading .source-markdown p").first();
  await expect.poll(() => readerParagraph.evaluate((element) => getComputedStyle(element).fontSize)).toBe("22px");

  await expect(page.getByRole("group", { name: "Reading font" })).toHaveCount(0);
  // IBM Plex Sans is self-hosted through next/font/local and exposed as --font-ibm-plex-sans;
  // the lesson reader must resolve to that face, not the interface font.
  const fonts = await page.locator("article.lesson-reading").evaluate((element) => ({
    reading: getComputedStyle(element).fontFamily,
    plex: getComputedStyle(document.documentElement).getPropertyValue("--font-ibm-plex-sans"),
    ui: getComputedStyle(document.documentElement).getPropertyValue("--font-geist"),
  }));
  const firstFamily = (stack: string) => stack.split(",")[0].trim().replace(/['"]/g, "");
  expect(firstFamily(fonts.plex)).not.toBe("");
  expect(firstFamily(fonts.reading)).toBe(firstFamily(fonts.plex));
  expect(firstFamily(fonts.reading)).not.toBe(firstFamily(fonts.ui));
  expect(await page.evaluate(async (family) => { await document.fonts.ready; return document.fonts.check(`18px "${family}"`); }, firstFamily(fonts.plex))).toBe(true);

  // Simulate a 200% text-size preference in the test stylesheet. This checks
  // reflow; it does not emulate operating-system text scaling or browser zoom.
  await page.addStyleTag({
    content: ".lesson-reading > p:not(.reading-lead), .lesson-reading .source-markdown { font-size: calc(var(--lesson-reader-size) + var(--lesson-reader-size)) !important; }",
  });
  await expect.poll(() => readerParagraph.evaluate((element) => getComputedStyle(element).fontSize)).toBe("44px");

  const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(pageWidth).toBeLessThanOrEqual(320);
  const paragraphBounds = await readerParagraph.boundingBox();
  expect(paragraphBounds).not.toBeNull();
  expect(paragraphBounds!.x + paragraphBounds!.width).toBeLessThanOrEqual(320);
});
