import { expect, test } from "@playwright/test";

test("agent workflow lessons expose their versioned steps, interruption, and replay controls", async ({ page }) => {
  await page.goto("/learn/react-planning-and-decomposition");
  await expect(page.getByText("TOY WORKFLOW · Plan, observe, and replan")).toBeVisible();
  await page.getByRole("button", { name: "Advance one step" }).click();
  await page.getByRole("button", { name: "Advance one step" }).click();
  await page.locator("#agent-budget").press("Home");
  await expect(page.getByText("Step budget exhausted · stopped")).toBeVisible();

  await page.goto("/learn/background-jobs-and-resumable-execution");
  await expect(page.getByText("TOY WORKFLOW · Optimistic concurrency on workflow state")).toBeVisible();
  await expect(page.getByRole("button", { name: "Attempt stale revision-4 write" })).toBeDisabled();
  await page.getByRole("button", { name: "Advance one step" }).click();
  await page.getByRole("button", { name: "Advance one step" }).click();
  await expect(page.getByRole("button", { name: "Attempt stale revision-4 write" })).toBeEnabled();
  await page.getByRole("button", { name: "Attempt stale revision-4 write" }).click();
  await expect(page.getByText(/expected revision 4, current revision 5/)).toBeVisible();
  await expect(page.getByText("revision 5", { exact: false }).first()).toBeVisible();
});
