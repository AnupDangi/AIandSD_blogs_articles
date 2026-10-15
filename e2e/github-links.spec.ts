import { expect, test } from "@playwright/test";
import { GITHUB_ISSUES_URL, GITHUB_LABEL, GITHUB_URL } from "../src/lib/site";

async function expectExternal(link: import("@playwright/test").Locator, href: string) {
  await expect(link).toHaveAttribute("href", href);
  await expect(link).toHaveAttribute("target", "_blank");
  await expect(link).toHaveAttribute("rel", /noopener/);
  await expect(link).toHaveAttribute("rel", /noreferrer/);
}

test("the header links to the GitHub repository with a visible label on wide screens", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/courses");
  const header = page.getByRole("banner");
  const link = header.getByRole("link", { name: /Learn from GitHub/ });
  await expect(link).toBeVisible();
  await expect(link.locator(".header-github-text")).toHaveText(GITHUB_LABEL);
  await expectExternal(link, GITHUB_URL);
  const box = await header.boundingBox();
  expect(box!.height).toBeLessThanOrEqual(80);
  // One line: the link, the theme control and sign-in share a row with the navigation.
  const tops = await Promise.all([link, header.getByRole("link", { name: "Sign in" }), header.getByRole("link", { name: "Courses" })].map(async (item) => Math.round((await item.boundingBox())!.y)));
  expect(Math.max(...tops) - Math.min(...tops)).toBeLessThan(24);
});

test("between 1024 and 1179px the header link keeps its name but drops its visible text", async ({ page }) => {
  for (const width of [1024, 1100, 1179]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/courses");
    const link = page.getByRole("banner").getByRole("link", { name: /Learn from GitHub/ });
    await expect(link).toBeVisible();
    const text = await link.locator(".header-github-text").boundingBox();
    expect(text!.width, `${width}px`).toBeLessThanOrEqual(1);
    const nav = page.getByRole("navigation", { name: "Main navigation" });
    const heights = await nav.getByRole("link").evaluateAll((items) => items.map((item) => Math.round(item.getBoundingClientRect().top)));
    expect(new Set(heights).size, `${width}px nav stays on one line`).toBe(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}px no overflow`).toBe(true);
  }
});

test("on phones the link is inside the menu and the header stays uncluttered", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/courses");
  await expect(page.getByRole("banner").locator(".header-github")).toBeHidden();
  await page.getByRole("banner").locator("summary").click();
  const link = page.getByRole("navigation", { name: "Mobile navigation" }).getByRole("link", { name: /Learn from GitHub/ });
  await expect(link).toBeVisible();
  await expectExternal(link, GITHUB_URL);
});

for (const theme of ["light", "dark"] as const) {
  test(`footer groups its links and lists the GitHub links (${theme})`, async ({ page }) => {
    await page.addInitScript((value) => localStorage.setItem("academy-theme", value), theme);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/courses");
    const footer = page.getByRole("contentinfo");
    await expect(footer.getByRole("link", { name: /Learn from GitHub/ })).toBeVisible();
    await expectExternal(footer.getByRole("link", { name: /Learn from GitHub/ }), GITHUB_URL);
    const nav = footer.getByRole("navigation", { name: "Footer navigation" });
    // Every link the footer had before is still there.
    for (const [name, href] of [["Courses", "/courses"], ["Topics", "/topics"], ["Projects", "/projects"], ["Study resources", "/resources"], ["Account", "/settings"]] as const) {
      await expect(nav.getByRole("link", { name })).toHaveAttribute("href", href);
    }
    await expectExternal(nav.getByRole("link", { name: /Source code/ }), GITHUB_URL);
    await expectExternal(nav.getByRole("link", { name: /Report an issue/ }), GITHUB_ISSUES_URL);
    await expect(nav.getByText("Explore", { exact: true })).toBeVisible();
    await expect(nav.getByText("Open source", { exact: true })).toBeVisible();
  });
}

test("footer reflows on a narrow phone without horizontal scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto("/courses");
  const footer = page.getByRole("contentinfo");
  await footer.scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const box = await footer.getByRole("link", { name: /Learn from GitHub/ }).boundingBox();
  expect(box!.x + box!.width).toBeLessThanOrEqual(320);
});
