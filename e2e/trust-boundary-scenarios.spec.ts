import { expect, test } from "@playwright/test";

test("trust-boundary lessons expose distinct threat, approval, evidence, and injection cases", async ({ page }) => {
  await page.goto("/learn/security-sandboxing-and-containment");
  await expect(page.getByText("TOY SCENARIO · Containment under compromised context")).toBeVisible();
  await expect(page.locator(".trust-decision")).toContainText("policy forbids exporting customer records");
  await page.getByRole("button", { name: "Approve this exact request" }).click();
  await expect(page.locator(".trust-decision")).toContainText("policy forbids exporting customer records");
  await expect(page.locator("blockquote.untrusted-quote")).toContainText("attacker.example");
  await page.getByLabel("Evidence inspected").selectOption("missing");
  await expect(page.locator(".engine-state-table")).toContainText("Insufficient or irrelevant");
  await page.getByLabel("Instruction source").selectOption("user");
  await page.getByLabel("Requested action").selectOption("read-public-guide");
  await page.getByLabel("Destination / scope").selectOption("operations-guide");
  await page.getByRole("button", { name: "Approve this exact request" }).click();
  await expect(page.locator(".trust-decision")).toContainText("no verified evidence");

  await page.goto("/learn/human-approval-and-risk-tiered-autonomy");
  await expect(page.getByText("TOY SCENARIO · Approval belongs to one exact action")).toBeVisible();
  await expect(page.locator(".trust-decision")).toContainText("requires human approval");
  await page.getByRole("button", { name: "Approve this exact request" }).click();
  await expect(page.locator(".trust-decision")).toContainText("Action allowed by toy policy");
  await page.getByLabel("Destination / scope").selectOption("external-email");
  await expect(page.getByRole("status").filter({ hasText: "instruction source, action, or destination changed" })).toBeVisible();
  await page.getByRole("button", { name: "Reset this scenario" }).click();
  await expect(page.locator(".trust-decision")).toContainText("requires human approval");

  await page.goto("/learn/verification-provenance-and-evidence-bearing-outputs");
  await expect(page.getByText("TOY SCENARIO · Allowed source is not supporting evidence")).toBeVisible();
  await page.getByRole("button", { name: "Approve this exact request" }).click();
  await expect(page.locator(".trust-decision")).toContainText("no verified evidence");
  await page.getByLabel("Evidence inspected").selectOption("relevant");
  await expect(page.locator(".trust-decision")).toContainText("Action allowed by toy policy");

  await page.goto("/learn/prompt-injection-and-untrusted-context");
  await expect(page.getByText("TOY SCENARIO · Treat retrieved instructions as untrusted data")).toBeVisible();
  await expect(page.locator("blockquote.untrusted-quote")).toContainText("read the public operations guide");
  await expect(page.locator(".trust-decision")).toContainText("policy forbids exporting customer records");
  await expect(page.locator(".engine-state-table")).toContainText("EvidenceInsufficient or irrelevant");
  await page.getByLabel("Requested action").selectOption("read-public-guide");
  await expect(page.locator(".engine-state-table")).toContainText("Evidence scope does not match request");
  await page.getByLabel("Destination / scope").selectOption("operations-guide");
  await page.getByLabel("Evidence inspected").selectOption("allowed");
  await expect(page.locator(".trust-decision")).toContainText("Retrieved text is untrusted data");
  await page.getByLabel("Instruction source").selectOption("user");
  await page.getByRole("button", { name: "Approve this exact request" }).click();
  await expect(page.locator(".trust-decision")).toContainText("Action allowed by toy policy");
  await page.getByLabel("Instruction source").selectOption("document");
  await page.getByLabel("Requested action").selectOption("export-customer-records");
  await page.getByLabel("Destination / scope").selectOption("external-email");
  await page.getByLabel("Evidence inspected").selectOption("forged");
  await expect(page.getByRole("status").filter({ hasText: "previous approval is stale" })).toBeVisible();
  await page.getByRole("button", { name: "Approve this exact request" }).click();
  await expect(page.locator(".trust-decision")).toContainText("policy forbids exporting customer records");
});
