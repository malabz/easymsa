import { expect, test } from "@playwright/test";
import {
  loadNamedFixture,
  locatorBox,
  prepareViewerPage,
  settleBrowser
} from "./helpers/viewer-fixtures";

test.beforeEach(async ({ page }) => {
  await prepareViewerPage(page);
});

test("trusted taps select DOM and Canvas cells, operate the minimap, and open a trapped bottom sheet", async ({ page }, testInfo) => {
  await loadNamedFixture(page, "detail-touch");
  await page.getByRole("button", { name: "Full screen", exact: true }).click();
  await settleBrowser(page);
  const status = page.locator("[data-msa-status='true']");
  await page.locator("[data-msa-scroll-viewport='true']").evaluate((element) => {
    element.scrollTop = 160;
  });
  await settleBrowser(page);
  const sequenceCells = page.locator("[data-msa-sequence-cell='true']");
  const hittableCellIndex = await sequenceCells.evaluateAll((cells) => {
    const matrix = document.querySelector<HTMLElement>("[data-msa-workspace-matrix='true']");
    const matrixBox = matrix?.getBoundingClientRect();
    if (!matrixBox) return -1;
    return cells.findIndex((cell) => {
      const box = cell.getBoundingClientRect();
      const x = box.x + box.width / 2;
      const y = box.y + box.height / 2;
      if (
        box.width <= 0 || box.height <= 0 ||
        x <= matrixBox.left || x >= matrixBox.right ||
        y <= matrixBox.top || y >= matrixBox.bottom
      ) return false;
      const hit = document.elementFromPoint(x, y);
      return Boolean(hit && (hit === cell || cell.contains(hit)));
    });
  });
  expect(hittableCellIndex).toBeGreaterThanOrEqual(0);
  const firstCell = sequenceCells.nth(hittableCellIndex);
  const expectedPosition = await firstCell.getAttribute("data-msa-position");
  const firstCellBox = await locatorBox(firstCell);
  await firstCell.tap({
    position: { x: firstCellBox.width / 2, y: firstCellBox.height / 2 }
  });
  await expect(status).toHaveAttribute("data-msa-selected-position", expectedPosition ?? "1");

  await expect(page.getByRole("dialog")).toHaveCount(0);
  const settingsButton = page.getByRole("button", { name: "Workspace settings" });
  await settingsButton.tap();
  const sheet = page.getByRole("dialog", { name: "View" });
  await expect(sheet).toBeVisible();
  await expect(sheet).toHaveAttribute("data-overlay-variant", "bottom-sheet");
  await expect(sheet.locator("[data-msa-settings-dock='true']")).toBeVisible();
  expect(await sheet.evaluate((surface) => surface.contains(document.activeElement))).toBe(true);
  for (let index = 0; index < 10; index += 1) await page.keyboard.press("Tab");
  expect(await sheet.evaluate((surface) => surface.contains(document.activeElement))).toBe(true);
  await page.keyboard.press("Shift+Tab");
  expect(await sheet.evaluate((surface) => surface.contains(document.activeElement))).toBe(true);

  const controlSizes = await sheet.locator("button, select, input:not([type='checkbox']):not([type='radio'])")
    .evaluateAll((controls) => controls
      .filter((control) => {
        const style = getComputedStyle(control);
        const bounds = control.getBoundingClientRect();
        return style.display !== "none" && style.visibility !== "hidden" && bounds.width > 0 && bounds.height > 0;
      })
      .map((control) => {
        const bounds = control.getBoundingClientRect();
        return { width: bounds.width, height: bounds.height };
      }));
  expect(controlSizes.length).toBeGreaterThan(0);
  for (const size of controlSizes) {
    expect(size.height).toBeGreaterThanOrEqual(43.5);
    expect(size.width).toBeGreaterThanOrEqual(43.5);
  }

  await page.getByLabel("Matrix display mode").selectOption("overview");
  await page.getByRole("button", { name: "Close panel" }).tap();
  await expect(settingsButton).toBeFocused();
  const canvas = page.locator("canvas[data-msa-canvas='true']");
  await expect(canvas).toBeVisible();
  const canvasBox = await locatorBox(canvas);
  await canvas.tap({
    position: {
      x: Math.max(2, Math.min(canvasBox.width - 2, canvasBox.width * 0.2)),
      y: Math.max(2, Math.min(canvasBox.height - 2, canvasBox.height * 0.2))
    }
  });
  await expect(status).not.toHaveAttribute("data-msa-selected-position", "");

  await expect(page.getByRole("dialog")).toHaveCount(0);
  const navigator = page.getByRole("slider", { name: /Alignment overview navigator/ });
  const navigatorBox = await locatorBox(navigator);
  await navigator.tap({
    position: {
      x: navigatorBox.width * 0.85,
      y: navigatorBox.height / 2
    }
  });
  await expect.poll(() => page.locator("[data-msa-scroll-viewport='true']")
    .evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);

  if (testInfo.project.name === "mobile-safari") {
    expect(await page.evaluate(() => ({
      height: window.innerHeight,
      width: window.innerWidth
    }))).toEqual({ width: 390, height: 664 });
  }
  await settleBrowser(page);
});
