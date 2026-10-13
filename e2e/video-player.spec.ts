import { expect, test, type Page } from "@playwright/test";

const PLAYER_HOST = "www.youtube-nocookie.com";

/** Stands in for the YouTube embed at its real origin and records every command the page posts to it. */
async function stubPlayer(page: Page) {
  await page.route("https://i.ytimg.com/**", (route) => route.fulfill({ status: 200, contentType: "image/gif", body: Buffer.from("R0lGODlhAQABAAAAACw=", "base64") }));
  await page.route(`https://${PLAYER_HOST}/**`, (route) => route.fulfill({
    status: 200,
    contentType: "text/html",
    body: "<!doctype html><title>stub</title><script>window.received=[];addEventListener('message',e=>received.push({origin:e.origin,data:e.data}));</script>",
  }));
}

function row(page: Page, title: string) {
  return page.locator(".resource-row").filter({ has: page.getByRole("heading", { name: new RegExp(`^${title}`) }) });
}

async function received(page: Page) {
  const frame = page.frames().find((candidate) => candidate.url().startsWith(`https://${PLAYER_HOST}/embed/`));
  expect(frame, "player iframe").toBeTruthy();
  return frame!.evaluate(() => (window as unknown as { received: { origin: string; data: string }[] }).received.map((entry) => ({ origin: entry.origin, ...JSON.parse(entry.data) })));
}

test("resource videos stay inert until played, then embed at the URL's start time", async ({ page }) => {
  const youtubeRequests: string[] = [];
  page.on("request", (request) => { if (new URL(request.url()).hostname.includes("youtube")) youtubeRequests.push(request.url()); });
  await stubPlayer(page);
  await page.goto("/resources?format=video");

  await expect(page.locator("iframe")).toHaveCount(0);
  expect(youtubeRequests).toEqual([]);

  const card = row(page, "LLM Foundations");
  await card.getByRole("button", { name: /Play LLM Foundations from 12:11/ }).click();

  const iframe = card.locator("iframe");
  await expect(iframe).toHaveCount(1);
  await expect(iframe).toHaveAttribute("title", "LLM Foundations (YouTube video)");
  const src = new URL((await iframe.getAttribute("src"))!);
  expect(src.hostname).toBe(PLAYER_HOST);
  expect(src.pathname).toBe("/embed/MyFrMFab6bo");
  expect(src.searchParams.get("start")).toBe("731");
  expect(src.searchParams.get("autoplay")).toBe("1");
  expect(src.searchParams.get("origin")).toBe("http://127.0.0.1:4179");
  await expect(card.getByRole("status")).toHaveText("Playing LLM Foundations from 12:11.");
  // Only the one video the learner chose is embedded.
  await expect(page.locator("iframe")).toHaveCount(1);
});

test("chapter buttons seek the running player instead of reloading it", async ({ page }) => {
  await stubPlayer(page);
  await page.goto("/resources?format=video");
  const card = row(page, "LLM Foundations");
  await card.getByRole("button", { name: /Play LLM Foundations/ }).click();
  await expect(card.locator("iframe")).toHaveCount(1);
  const frameHandle = await card.locator("iframe").elementHandle();
  await (await frameHandle!.contentFrame())!.waitForLoadState("load");

  await card.getByRole("button", { name: /16:51 Masked Multi-Head Attention/ }).click();
  await expect(card.getByRole("status")).toHaveText("Playing LLM Foundations from 16:51 Masked Multi-Head Attention.");

  await expect.poll(async () => (await received(page)).length).toBe(2);
  const messages = await received(page);
  expect(messages.map((message) => message.func)).toEqual(["seekTo", "playVideo"]);
  expect(messages[0].args).toEqual([1011, true]);
  expect(messages.every((message) => message.origin === "http://127.0.0.1:4179")).toBe(true);
  // Seeking must not change the embed URL, which would restart the video.
  expect(new URL((await card.locator("iframe").getAttribute("src"))!).searchParams.get("start")).toBe("731");
});

test("a chapter button can start playback at that chapter", async ({ page }) => {
  await stubPlayer(page);
  await page.goto("/resources?format=video");
  const card = row(page, "LLMOps");
  await card.getByRole("button", { name: /35:05 Evaluation metrics/ }).click();
  const src = new URL((await card.locator("iframe").getAttribute("src"))!);
  expect(src.searchParams.get("start")).toBe(String(35 * 60 + 5));
});

test("videos without a start time or chapters play from the beginning with no chapter list", async ({ page }) => {
  await stubPlayer(page);
  await page.goto("/resources?format=video");
  const card = row(page, "How To Build AI Evals");
  await expect(card.getByRole("list", { name: /Jump to a chapter/ })).toHaveCount(0);
  await card.getByRole("button", { name: /^Play / }).click();
  expect(new URL((await card.locator("iframe").getAttribute("src"))!).searchParams.get("start")).toBe("0");
});

test("lesson references embed the video in place and the player is keyboard operable", async ({ page }) => {
  await stubPlayer(page);
  await page.goto("/learn/transformer-attention-for-engineers");
  const references = page.locator(".lesson-references");
  const play = references.getByRole("button", { name: /Play LLM Foundations from 12:11/ });
  await play.focus();
  await page.keyboard.press("Enter");
  const iframe = references.locator("iframe");
  await expect(iframe).toHaveCount(1);
  const article = references.locator("article").filter({ has: page.locator("iframe") });
  const [articleBox, frameBox] = [await article.boundingBox(), await iframe.boundingBox()];
  expect(frameBox!.width).toBeGreaterThan(articleBox!.width * 0.9);
  await references.getByRole("button", { name: /16:51 Masked Multi-Head Attention/ }).focus();
  await page.keyboard.press("Space");
  await expect(references.getByRole("status")).toContainText("16:51");
});

test("embedded players fit narrow screens without horizontal scrolling", async ({ page }) => {
  await stubPlayer(page);
  for (const path of ["/resources?format=video", "/learn/transformer-attention-for-engineers"]) {
    for (const width of [320, 390, 1280]) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(path);
      await page.getByRole("button", { name: /^Play LLM Foundations/ }).first().click();
      await expect(page.locator("iframe")).toHaveCount(1);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `${path} at ${width}px`).toBeLessThanOrEqual(0);
      const box = await page.locator("iframe").boundingBox();
      expect(box!.width / box!.height).toBeGreaterThan(1.6);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1);
    }
  }
});
