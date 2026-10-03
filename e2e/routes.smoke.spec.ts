import { expect, test } from "@playwright/test";
import { prepareViewerPage } from "./helpers/viewer-fixtures";

test.beforeEach(async ({ page }) => {
  await prepareViewerPage(page);
});

test("opens the product routes and deep-linked documentation", async ({ page }) => {
  await page.goto("./#/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/Nucleotide alignment and refinement/i);
  await page.getByRole("link", { name: /start analysis/i }).click();
  await expect(page).toHaveURL(/#\/submit$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/submit job/i);

  await page.goto("./#/docs?section=msa-viewer");
  await expect(page.getByRole("heading", { level: 1, name: "Documentation" })).toBeVisible();
  await expect(page).toHaveURL(/section=msa-viewer/);
  await expect(page.getByRole("link", { name: /Open local viewer/ }))
    .toHaveAttribute("href", "#/viewer");
});
