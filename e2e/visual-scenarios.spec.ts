import { expect, test } from "@playwright/test";

test("retrieval lessons load their own query and toy evidence", async ({ page }) => {
  await page.goto("/learn/embeddings-and-semantic-space");
  await expect(page.getByText("TOY SCENARIO · Embedding neighborhood")).toBeVisible();
  await expect(page.getByText("Query:").locator("..")).toContainText("similar meaning semantic vector");
  const embeddingEvidence = await page.locator(".retrieval-result p").allTextContents();

  await page.goto("/learn/retrieval-evaluation");
  await expect(page.getByText("TOY SCENARIO · Retrieval evaluation by query label")).toBeVisible();
  await expect(page.getByText("Query:").locator("..")).toContainText("citation coverage labeled retrieval evaluation");
  const evaluationEvidence = await page.locator(".retrieval-result p").allTextContents();

  expect(embeddingEvidence).not.toEqual(evaluationEvidence);
});
