import { expect, test } from "@playwright/test";

test("catalog entry opens the course map and starts at chapter one", async ({ page }) => {
  await page.goto("/courses");
  await page.getByRole("link", { name: "Explore Reliable AI Applications" }).click();

  await expect(page).toHaveURL(/\/courses\/reliable-ai-applications$/);
  await expect(page.locator("main")).toHaveCount(1);
  await expect(page.getByRole("heading", { name: /Eight modules\. One growing system\./ })).toBeVisible();
  await expect(page.getByText("Sign in to save reading, assessments, and project submissions across devices.")).toBeVisible();

  await page.getByRole("link", { name: /Open chapter 01 draft/ }).first().click();
  await expect(page).toHaveURL(/\/learn\/ai-systems-are-products-not-model-calls$/);
});
