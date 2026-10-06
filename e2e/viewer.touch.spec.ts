import { expect, test, type CDPSession } from "@playwright/test";
import {
  loadNamedFixture,
  locatorBox,
  openSettings,
  prepareViewerPage,
  setViewMode,
  settleBrowser
} from "./helpers/viewer-fixtures";

type TouchPoint = { id: number; x: number; y: number };

async function dispatchTouch(
  cdp: CDPSession,
  type: "touchStart" | "touchMove" | "touchEnd",
  points: TouchPoint[]
) {
  await cdp.send("Input.dispatchTouchEvent", {
    type,
    touchPoints: points.map((point) => ({
      id: point.id,
      x: point.x,
      y: point.y,
      radiusX: 4,
      radiusY: 4,
      force: 1
    }))
  });
}

async function dragTouch(
  cdp: CDPSession,
  from: TouchPoint,
  to: TouchPoint,
  steps = 5
) {
  await dispatchTouch(cdp, "touchStart", [from]);
  for (let step = 1; step <= steps; step += 1) {
    await dispatchTouch(cdp, "touchMove", [{
      id: from.id,
      x: from.x + ((to.x - from.x) * step) / steps,
      y: from.y + ((to.y - from.y) * step) / steps
    }]);
  }
  await dispatchTouch(cdp, "touchEnd", []);
}

test.beforeEach(async ({ page }) => {
  await prepareViewerPage(page);
});

test("CDP trusted touch validates pan, explicit range drag, and Viewer-owned pinch zoom", async ({ page, browserName }, testInfo) => {
  test.skip(browserName !== "chromium" || testInfo.project.name !== "mobile-chrome",
    "Chromium CDP touch is intentionally not presented as WebKit gesture coverage.");

  await loadNamedFixture(page, "overview-touch");
  await page.getByRole("button", { name: "Full screen", exact: true }).click();
  await settleBrowser(page);
  await setViewMode(page, "overview");
  const cdp = await page.context().newCDPSession(page);
  const canvas = page.locator("canvas[data-msa-canvas='true']");
  const grid = page.locator("[data-msa-scroll-viewport='true']");
  const status = page.locator("[data-msa-status='true']");
  const box = await locatorBox(canvas);
  const y = box.y + Math.min(box.height - 10, Math.max(10, box.height * 0.35));

  expect(await status.getAttribute("data-msa-selected-position")).toBe("");
  await dragTouch(
    cdp,
    { id: 1, x: box.x + box.width * 0.78, y },
    { id: 1, x: box.x + box.width * 0.22, y }
  );
  await settleBrowser(page);
  await expect.poll(() => grid.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
  await expect(status).toHaveAttribute("data-msa-selected-position", "");
  await expect(status).toHaveAttribute("data-msa-range-mode", "pan");

  await grid.evaluate((element) => {
    element.scrollLeft = 0;
  });
  await openSettings(page);
  await page.getByRole("checkbox", { name: /Touch range-selection mode/ }).check();
  await page.getByRole("button", { name: "Close panel" }).click();
  await expect(page.getByRole("dialog", { name: "View" })).toBeHidden();
  await settleBrowser(page);
  await expect(status).toHaveAttribute("data-msa-range-mode", "range");

  const pitch = Number(await canvas.getAttribute("data-msa-cell-pitch"));
  const startOffset = 12 + pitch * 2 + pitch / 2;
  const endOffset = 12 + pitch * 7 + pitch / 2;
  const scrollBeforeRange = await grid.evaluate((element) => element.scrollLeft);
  await dragTouch(
    cdp,
    { id: 2, x: box.x + startOffset, y },
    { id: 2, x: box.x + endOffset, y }
  );
  await settleBrowser(page);
  await expect(status).toHaveAttribute("data-msa-selected-range", "3-8");
  expect(await grid.evaluate((element) => element.scrollLeft)).toBe(scrollBeforeRange);

  await openSettings(page);
  await page.getByRole("checkbox", { name: /Touch range-selection mode/ }).uncheck();
  await page.getByRole("button", { name: "Close panel" }).click();
  const zoomBefore = Number(await status.getAttribute("data-msa-zoom"));
  const viewportScaleBefore = await page.evaluate(() => window.visualViewport?.scale ?? 1);
  const centerX = box.x + box.width * 0.5;
  const pinchY = box.y + box.height * 0.55;
  await dispatchTouch(cdp, "touchStart", [
    { id: 3, x: centerX - 35, y: pinchY },
    { id: 4, x: centerX + 35, y: pinchY }
  ]);
  await dispatchTouch(cdp, "touchMove", [
    { id: 3, x: centerX - 70, y: pinchY },
    { id: 4, x: centerX + 70, y: pinchY }
  ]);
  await dispatchTouch(cdp, "touchEnd", []);
  await expect.poll(async () => Number(await status.getAttribute("data-msa-zoom")))
    .not.toBe(zoomBefore);
  expect(await page.evaluate(() => window.visualViewport?.scale ?? 1))
    .toBe(viewportScaleBefore);
});
