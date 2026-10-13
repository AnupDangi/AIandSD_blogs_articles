import { expect, test } from "@playwright/test";

test("opening the app at a different address explains how to sign in", async ({ page }) => {
  // The suite is configured for http://127.0.0.1:4179; localhost is a different origin.
  await page.goto("http://localhost:4179/sign-in");
  const notice = page.getByRole("alert").filter({ hasText: "Sign-in only works at" });
  await expect(notice).toBeVisible();
  await expect(notice.getByRole("link", { name: "http://127.0.0.1:4179" })).toHaveAttribute("href", /^http:\/\/127\.0\.0\.1:4179\/sign-in\?next=/);

  await page.getByRole("button", { name: /Continue with Google/ }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Open this app at http://127.0.0.1:4179" })).toBeVisible();
});

test("the canonical address shows no origin warning", async ({ page }) => {
  await page.goto("/sign-in");
  await expect(page.getByRole("button", { name: /Continue with Google/ })).toBeVisible();
  await expect(page.getByText("Sign-in only works at")).toHaveCount(0);
});

for (const [query, expected] of [
  ["error=access_denied&error_description=User+denied", /cancelled or the provider did not allow/],
  ["error=access_denied&error_code=otp_expired", /expired or was already used/],
  ["", /could not be completed/],
] as const) {
  test(`callback ${query || "without a code"} lands on a specific sign-in message`, async ({ page }) => {
    await page.goto(`/auth/callback?${query}`);
    await expect(page).toHaveURL(/\/sign-in\?error=/);
    await expect(page.getByRole("alert").filter({ hasText: expected })).toBeVisible();
  });
}

test("an email link opened in a browser that never asked for it explains the same-browser rule", async ({ page }) => {
  // A fresh browser has no PKCE verifier cookie, exactly like a link opened on another device.
  await page.goto("/auth/callback?code=not-a-real-code");
  await expect(page).toHaveURL(/\/sign-in\?error=wrong_browser/);
  await expect(page.getByRole("alert").filter({ hasText: "same browser" })).toBeVisible();
});
