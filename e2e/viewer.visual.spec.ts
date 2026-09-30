import { expect, test } from "@playwright/test";
import {
  disableVisualNoise,
  loadNamedFixture,
  prepareViewerPage,
  setViewMode,
  settleBrowser
} from "./helpers/viewer-fixtures";

test.beforeEach(async ({ page }) => {
  await prepareViewerPage(page);
});

test("fixed Linux Chromium workspace baselines", async ({ page }, testInfo) => {
  await loadNamedFixture(page, "layout-visual");
  await disableVisualNoise(page);
  const shell = page.locator("[data-msa-workspace-shell='true']");
  const width = page.viewportSize()?.width ?? 0;

  await expect(shell).toHaveScreenshot("embedded.png");
  await page.getByRole("button", { name: "Expand workspace" }).click();
  await settleBrowser(page);
  await expect(shell).toHaveScreenshot("immersive.png");
  await page.getByRole("button", { name: "Exit workspace" }).click();

  if (width === 390 || width === 768) {
    await page.getByRole("button", { name: "Workspace settings" }).click();
    await expect(page.getByRole("dialog", { name: "Workspace settings" }))
      .toHaveScreenshot("settings-sheet.png");
    await page.keyboard.press("Escape");
  }

  if (width === 390 || width === 1280 || width === 1920) {
    await page.locator("[data-msa-sequence-cell='true']").first().click();
    if (width === 390) {
      await page.getByRole("button", { name: "Close analysis inspector" }).click();
    }
    await page.getByRole("button", { name: "Analysis inspector", exact: true }).click();
    if (width === 390) {
      await expect(page.getByRole("dialog", { name: "Analysis inspector", exact: true }))
        .toHaveScreenshot("inspector-sheet.png");
      await page.keyboard.press("Escape");
    } else {
      await expect(shell).toHaveScreenshot("inspector-dock.png");
      await page.getByRole("button", { name: "Close analysis inspector" }).click();
    }
  }

  if (width === 390 || width === 1280) {
    await setViewMode(page, "overview");
    await expect(page.locator("canvas[data-msa-canvas='true']")).toBeVisible();
    await expect(shell).toHaveScreenshot("canvas-overview.png");
  }

  expect(testInfo.project.name).toMatch(/^layout-/);
});
