import { expect, test } from "@playwright/test";

test("Chapter 3 starts at its authored causal-mask example", async ({ page }) => {
  await page.goto("/learn/transformer-attention-for-engineers");
  await expect(page.getByText("TOY SCENARIO · Causal attention at ‘placed’")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Where does “placed” look?" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Select token 3: placed" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("listitem", { name: /position 3, attention weight 0\.00, masked future position/ })).toBeVisible();

  await page.getByRole("button", { name: "Causal mask" }).click();
  await expect(page.getByRole("button", { name: "Causal mask" })).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByRole("listitem", { name: /position 3, attention weight (?!0\.00)/ })).toBeVisible();
});
