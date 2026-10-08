import { expect, test } from "@playwright/test";
import {
  expectNoHorizontalOverflow,
  loadNamedFixture,
  locatorBox,
  prepareViewerPage,
  settleBrowser,
  tabIntoGrid
} from "./helpers/viewer-fixtures";

test.beforeEach(async ({ page }) => {
  await prepareViewerPage(page);
});

test("embedded and immersive geometry preserves every workspace region", async ({ page }) => {
  await loadNamedFixture(page, "layout-visual");
  const shell = page.locator("[data-msa-workspace-shell='true']");
  const command = page.locator("[data-msa-toolbar='true']");
  const navigator = page.locator(".msa-global-overview");
  const matrix = page.locator("[data-msa-workspace-matrix='true']");
  const status = page.locator("[data-msa-workspace-status='true']");
  const shellBox = await locatorBox(shell);
  const commandBox = await locatorBox(command);
  const navigatorBox = (page.viewportSize()?.width ?? 0)>=1024 ? await locatorBox(navigator) : null;
  const matrixBox = await locatorBox(matrix);
  const statusBox = await locatorBox(status);
  const viewportHeight = await page.evaluate(() => window.visualViewport?.height ?? window.innerHeight);
  if ((page.viewportSize()?.width ?? 0) >= 1024) {
    expect(matrixBox.height / viewportHeight).toBeGreaterThanOrEqual(.55);
  }
  expect(commandBox.y + commandBox.height).toBeLessThanOrEqual(matrixBox.y + 1);
  if(navigatorBox) {expect(navigatorBox.x).toBeGreaterThanOrEqual(matrixBox.x+matrixBox.width-1);expect(navigatorBox.y).toBe(matrixBox.y);}
  expect(matrixBox.y + matrixBox.height).toBeLessThanOrEqual(statusBox.y + 1);
  expect(matrixBox.height).toBeGreaterThan(43);
  expect(statusBox.y + statusBox.height).toBeLessThanOrEqual(shellBox.y + shellBox.height + 1);
  await expectNoHorizontalOverflow(page);

  const siteHeader = page.locator("body header").first();
  if (await siteHeader.isVisible()) {
    const siteHeaderBox = await locatorBox(siteHeader);
    expect(siteHeaderBox.y + siteHeaderBox.height).toBeLessThanOrEqual(shellBox.y + 1);
  }

  const expand = page.getByRole("button", { name: "Full screen" });
  await expand.evaluate((element) => element.focus({ preventScroll: true }));
  await page.evaluate(() => window.scrollTo({ top: 96, behavior: "instant" }));
  const scrollBefore = await page.evaluate(() => window.scrollY);
  await expand.evaluate((element) => element.click());
  await expect(shell).toHaveAttribute("data-msa-workspace-mode", "immersive");
  await settleBrowser(page);
  const immersiveBox = await locatorBox(shell);
  const visualViewport = await page.evaluate(() => ({
    height: window.visualViewport?.height ?? window.innerHeight,
    width: window.visualViewport?.width ?? window.innerWidth
  }));
  expect(Math.abs(immersiveBox.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(immersiveBox.y)).toBeLessThanOrEqual(1);
  expect(Math.abs(immersiveBox.width - visualViewport.width)).toBeLessThanOrEqual(2);
  expect(Math.abs(immersiveBox.height - visualViewport.height)).toBeLessThanOrEqual(2);
  expect(await page.locator("[inert]").count()).toBeGreaterThan(0);
  if (visualViewport.width >= 1024) expect((await locatorBox(matrix)).height / visualViewport.height).toBeGreaterThanOrEqual(.75);
  await page.keyboard.press("Escape");
  await expect(shell).toHaveAttribute("data-msa-workspace-mode", "embedded");
  await expect(expand).toBeFocused();
  await settleBrowser(page);
  const scrollAfter = await page.evaluate(() => window.scrollY);
  expect(
    Math.abs(scrollAfter - scrollBefore),
    `expected restored scroll ${scrollBefore}, received ${scrollAfter}`
  ).toBeLessThanOrEqual(1);
  await expectNoHorizontalOverflow(page);
});

test("responsive settings and Inspector use the intended sheet or side dock", async ({ page }) => {
  await loadNamedFixture(page, "layout-visual");
  const viewport = page.viewportSize();
  if (!viewport) throw new Error("Viewport is unavailable.");
  const compact = viewport.width <= 768;

  await page.getByRole("button", { name: "Workspace settings" }).click();
  if (compact) {
    const settings = page.getByRole("dialog", { name: "View" });
    await expect(settings).toHaveAttribute("data-overlay-variant", "bottom-sheet");
    await page.keyboard.press("Escape");
  } else {
    await expect(page.locator("[data-msa-settings-dock='true']")).toBeVisible();
    await expect(page.getByRole("dialog", { name: "View" })).toHaveCount(0);
    await page.getByRole("button", { name: "Close panel" }).click();
  }

  await tabIntoGrid(page);
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("[data-msa-workspace-dock]")).toHaveCount(0);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", {name:"Analysis inspector",exact:true}).click();
  if (compact) {
    const inspector = page.getByRole("dialog", { name: "Analyze" });
    await expect(inspector).toHaveAttribute("data-overlay-variant", "bottom-sheet");
    await page.keyboard.press("Escape");
  } else {
    const dock = page.locator("[data-msa-workspace-dock='true']");
    await expect(dock).toBeVisible();
    await expect(dock).toHaveAttribute("aria-label", "Analysis inspector");
    const separator = dock.getByRole("separator");
    await expect(separator).toBeVisible();
    const widthBefore = (await locatorBox(dock)).width;
    await separator.focus();
    await page.keyboard.press("ArrowLeft");
    expect((await locatorBox(dock)).width).toBeGreaterThan(widthBefore);
  }

  if (compact) {
    const sizes = await page.locator("[data-msa-toolbar='true'] button, [data-msa-toolbar='true'] input, [data-msa-toolbar='true'] select")
      .evaluateAll((controls) => controls
        .filter((control) => {
          const bounds = control.getBoundingClientRect();
          const style = getComputedStyle(control);
          return bounds.width > 0 && bounds.height > 0 && style.display !== "none" && style.visibility !== "hidden";
        })
        .map((control) => {
          const bounds = control.getBoundingClientRect();
          return { height: bounds.height, width: bounds.width };
        }));
    for (const size of sizes) {
      expect(size.height).toBeGreaterThanOrEqual(43.5);
      expect(size.width).toBeGreaterThanOrEqual(43.5);
    }
  }
  await expectNoHorizontalOverflow(page);
});
