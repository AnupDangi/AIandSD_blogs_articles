import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const publicPages = [
  "/",
  "/courses",
  "/courses/reliable-ai-applications",
  "/topics",
  "/projects",
  "/resources",
  "/search",
  "/learn/chunking-and-contextual-retrieval",
  "/assessments/final-assessment",
  "/dashboard",
  "/settings",
  "/sign-in",
];

test("public academy pages have no automated WCAG A/AA violations", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const contrastIssues = new Map<string, { path: string; target: string[]; count: number; details: unknown }>();
  const otherViolations: { path: string; id: string; impact: string | null | undefined; help: string; targets: string[][] }[] = [];

  for (const path of publicPages) {
    const response = await page.goto(path);
    expect(response?.status(), `${path} should render successfully`).toBe(200);
    const scan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    for (const violation of scan.violations) {
      if (violation.id !== "color-contrast") {
        otherViolations.push({ path, id: violation.id, impact: violation.impact, help: violation.help, targets: violation.nodes.map((node) => node.target.map(String)) });
        continue;
      }

      for (const node of violation.nodes) {
        const check = [...node.any, ...node.all, ...node.none].find((item) => item.id === "color-contrast");
        const details = check?.data as Record<string, unknown> | undefined;
        const key = JSON.stringify([details?.fgColor, details?.bgColor]);
        const existing = contrastIssues.get(key);
        if (existing) existing.count += 1;
        else contrastIssues.set(key, { path, target: node.target.map(String), count: 1, details: { fgColor: details?.fgColor, bgColor: details?.bgColor, contrastRatio: details?.contrastRatio, expectedContrastRatio: details?.expectedContrastRatio } });
      }
    }
  }

  const summary = [...contrastIssues.values()];
  const compact = summary.map(({ path, target, count, details }) => ({ path, target, count, ...details as Record<string, unknown> }));
  expect({ contrast: compact, other: otherViolations }, JSON.stringify({ contrast: compact, other: otherViolations })).toEqual({ contrast: [], other: [] });
});

test("keyboard users can move the skip link focus to main content", async ({ page }) => {
  await page.goto("/learn/chunking-and-contextual-retrieval");
  await page.keyboard.press("Tab");

  const skipLink = page.getByRole("link", { name: "Skip to content" });
  await expect(skipLink).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#main-content$/);
  await expect(page.locator("#main-content")).toBeFocused();
});
