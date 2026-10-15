import { expect, test } from "@playwright/test";

const redesignedRoutes = ["/", "/sign-in", "/courses", "/courses/reliable-ai-applications", "/dashboard", "/settings", "/projects", "/topics", "/this-page-does-not-exist"];

for (const viewport of [{ width: 1440, height: 900 }, { width: 1280, height: 720 }]) {
  test(`landing hero fits a ${viewport.width}x${viewport.height} viewport with its primary actions visible`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect(page.locator("h1")).toHaveCount(1);
    const heading = page.getByRole("heading", { level: 1, name: "Make the ideas work in your hands." });
    const lines = await heading.evaluate((element) => Math.round(element.getBoundingClientRect().height / parseFloat(getComputedStyle(element).lineHeight)));
    expect(lines).toBeLessThanOrEqual(2);
    for (const name of ["Explore courses", "Preview a lesson"]) {
      const action = page.getByRole("link", { name, exact: true });
      const box = await action.boundingBox();
      expect(box, name).not.toBeNull();
      expect(box!.y + box!.height, `${name} is above the fold`).toBeLessThanOrEqual(viewport.height);
      expect(box!.height, `${name} stays on one line`).toBeLessThan(56);
    }
    await expect(page.getByRole("region", { name: "Tokens and sampling lab" })).toBeVisible();
  });
}

test("desktop navigation stays on one line at 1024px and collapses below it", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 800 });
  await page.goto("/courses");
  const navigation = page.getByRole("navigation", { name: "Main navigation" });
  await expect(navigation).toBeVisible();
  const header = await page.locator(".site-header").boundingBox();
  expect(header!.height).toBeLessThanOrEqual(80);
  const tops = await navigation.getByRole("link").evaluateAll((links) => links.map((link) => Math.round(link.getBoundingClientRect().top)));
  expect(new Set(tops).size).toBe(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.setViewportSize({ width: 1000, height: 800 });
  await expect(navigation).toBeHidden();
  await expect(page.getByLabel("Open navigation", { exact: true })).toBeVisible();
});

test("redesigned pages show no em or en dashes in titles or visible copy", async ({ page }) => {
  const found: { path: string; text: string[] }[] = [];
  for (const path of redesignedRoutes) {
    await page.goto(path);
    const matches = await page.evaluate(() => {
      const text = `${document.title}\n${document.body.innerText}\n${[...document.querySelectorAll("[alt], [aria-label]")].map((element) => `${element.getAttribute("alt") ?? ""} ${element.getAttribute("aria-label") ?? ""}`).join("\n")}`;
      return [...text.matchAll(/.{0,24}[–—].{0,24}/g)].map((match) => match[0]);
    });
    if (matches.length) found.push({ path, text: matches });
  }
  expect(found).toEqual([]);
});

test("sign-in keeps its form contract after the redesign", async ({ page }) => {
  await page.goto("/sign-in?next=%2Fprojects");
  await expect(page.locator("h1")).toHaveCount(1);
  const email = page.getByLabel("Email address");
  await expect(email).toHaveAttribute("id", "sign-in-email");
  await expect(email).toHaveAttribute("name", "email");
  await expect(email).toHaveAttribute("type", "email");
  const submit = page.getByRole("button", { name: "Email me a sign-in link" });
  await expect(submit).toBeDisabled();
  await email.fill("learner@example.com");
  await expect(submit).toBeEnabled();
  await expect(page.getByRole("button", { name: /Continue with Google/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Continue with GitHub/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "Continue as a guest" })).toHaveAttribute("href", "/courses");
});

test("the landing page uses one accent and one label per call to action", async ({ page }) => {
  await page.goto("/");
  const labels = await page.locator("main a.discovery-button").allInnerTexts();
  const normalized = labels.map((label) => label.trim());
  expect(new Set(normalized).size).toBe(normalized.length);
  const primaries = await page.locator("main .discovery-button-primary").evaluateAll((elements) => [...new Set(elements.map((element) => getComputedStyle(element).backgroundColor))]);
  expect(primaries).toHaveLength(1);
});
