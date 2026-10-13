import { expect, test } from "@playwright/test";

test("evaluation lessons expose their own inspectable evidence", async ({ page }) => {
  await page.goto("/learn/evaluation-datasets-and-failure-taxonomy");
  await expect(page.getByText("TOY EVALUATION · Frozen evaluation slices")).toBeVisible();
  await expect(page.locator(".eval-summary")).toContainText("2 / 4");

  await page.goto("/learn/llm-as-judge-calibration");
  await page.getByLabel("Decision threshold").press("End");
  await expect(page.locator(".metric-grid")).toContainText("False rejects3");

  await page.goto("/learn/agent-trajectory-evaluation");
  await page.getByLabel("Recorded run").selectOption("unsafe-correct");
  await expect(page.locator(".metric-grid")).toContainText("Final outcomePassAction pathFailBoth requiredReject");
  await expect(page.getByText(/Final text happens to match the policy/)).toBeVisible();

  await page.goto("/learn/observability-and-tracing");
  await page.getByLabel("Request trace").selectOption("missing-retrieval");
  await expect(page.getByLabel("Required trace spans")).toContainText("retrievalMissing");
  await expect(page.locator(".engine-demo").getByRole("status")).toContainText("correlation consistent; request not reconstructable");
  await page.getByLabel("Request trace").selectOption("orphaned");
  await expect(page.locator(".metric-grid")).toContainText("Span coverage100%Missing spans0CorrelationMismatch");
  await expect(page.locator(".engine-demo").getByRole("status")).toContainText("6 of 6 spans present; 0 missing; correlation mismatch; request not reconstructable");

  await page.goto("/learn/cost-engineering");
  await page.getByLabel("Route profile").selectOption("balanced");
  await expect(page.locator(".metric-grid")).toContainText("$0.039");

  await page.goto("/learn/continuous-improvement-and-repair-loops");
  await expect(page.locator(".metric-grid")).toContainText("Blocked");
  await page.getByRole("button", { name: "Ignore slice gates" }).click();
  await expect(page.locator(".metric-grid")).toContainText("Eligible");
});
