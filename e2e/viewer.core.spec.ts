import { expect, test } from "@playwright/test";
import {
  loadNamedFixture,
  loadViewerFasta,
  openSettings,
  prepareViewerPage,
  referenceFixture,
  runRowAction,
  settleBrowser,
  tabIntoGrid
} from "./helpers/viewer-fixtures";

test.beforeEach(async ({ page }) => {
  await prepareViewerPage(page);
});

test("reference, scope, QC annotation, restoration, motif, minimap, and bundle export agree", async ({ page }) => {
  const fasta = referenceFixture();
  await loadViewerFasta(page, fasta);

  await expect(page.getByRole("slider", { name: /Alignment overview navigator/ })).toBeVisible();
  await runRowAction(page, "reference", "Set as reference reference", "Set as reference");
  await expect(page.getByText("Reference: reference", { exact: true })).toBeVisible();

  await openSettings(page);
  await page.getByLabel("Difference view").check();
  await page.getByRole("button", { name: "Close settings" }).click();

  const dragStart = page.getByRole("gridcell", { name: /sample-2; Position 2; T/ });
  const dragEnd = page.getByRole("gridcell", { name: /sample-2; Position 4; G/ });
  await dragStart.click();
  await dragEnd.click({ modifiers: ["Shift"] });
  await expect(page.locator("[data-msa-status='true']"))
    .toHaveAttribute("data-msa-selected-range", "2-4");

  await page.getByLabel("Search DNA/RNA motif").fill("AYC");
  await expect(page.locator("[data-msa-motif-status='true']"))
    .toHaveAttribute("data-msa-motif-total", "1");
  await page.getByRole("button", { name: "Next match" }).click();

  const navigator = page.getByRole("slider", { name: /Alignment overview navigator/ });
  const navigatorBounds = await navigator.boundingBox();
  if (!navigatorBounds) throw new Error("Overview navigator was not measurable.");
  await page.mouse.click(
    navigatorBounds.x + navigatorBounds.width * 0.85,
    navigatorBounds.y + navigatorBounds.height / 2
  );
  await expect.poll(() => page.locator("[data-msa-scroll-viewport='true']")
    .evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);

  await runRowAction(page, "sample-2", "Select sequence sample-2", "Select sequence");
  await page.getByLabel("Analysis scope").selectOption("selected");
  await expect(page.locator("[data-msa-status='true']"))
    .toHaveAttribute("data-msa-analysis-status", "ready");
  await expect(page.getByText(/Analysis: Explicitly selected rows \(1 rows\)/)).toBeVisible();

  await page.getByRole("button", { name: "QC", exact: true }).click();
  await page.getByLabel("New annotation: Category").selectOption("review");
  await page.getByLabel("New annotation: Note").fill("review interval");
  await page.getByRole("button", { name: "Add" }).click();
  await expect(page.locator("textarea").first()).toHaveValue("review interval");
  await page.getByRole("button", { name: "Close QC" }).click();

  // Annotation creation may be saved before closing QC. Wait for the latest
  // debounced snapshot so restoring an open panel cannot make the next click close it.
  await page.waitForFunction(() => {
    const store = JSON.parse(window.localStorage.getItem("easymsa.viewer.workspaces.v1") ?? "null") as {
      entries?: Record<string, {
        snapshot: { view: { qcPanelOpen: boolean }; annotations: Array<{ text: string }> };
      }>;
    } | null;
    return Object.values(store?.entries ?? {}).some(({ snapshot }) =>
      snapshot.view.qcPanelOpen === false &&
      snapshot.annotations.some((annotation) => annotation.text === "review interval")
    );
  });
  await page.reload();
  await page.getByLabel("Paste FASTA").fill(fasta);
  await page.getByRole("button", { name: "View pasted FASTA" }).click();
  await expect(page.locator("[data-msa-status='true']"))
    .toHaveAttribute("data-msa-analysis-status", "ready");
  await expect(page.getByText(/Reference: reference/)).toBeVisible();
  await expect(page.getByText(/Analysis: Explicitly selected rows \(1 rows\)/)).toBeVisible();
  await page.getByRole("button", { name: "QC", exact: true }).click();
  await expect(page.locator("textarea").first()).toHaveValue("review interval");
  await page.getByRole("button", { name: "Close QC" }).click();

  await page.getByRole("button", { name: "Export / QC bundle" }).click();
  await page.getByRole("button", { name: "FASTA" }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.zip$/);
});

test("the matrix is one real Tab stop with complete keyboard and overlay focus behavior", async ({ page }) => {
  await loadNamedFixture(page, "detail-touch");
  const grid = page.locator("[data-msa-scroll-viewport='true']");
  await expect(page.locator("[data-msa-scroll-viewport='true'][tabindex='0']")).toHaveCount(1);
  await expect(page.locator("[data-msa-cell='true'][tabindex='0']")).toHaveCount(0);

  await tabIntoGrid(page);
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("[data-msa-status='true']"))
    .toHaveAttribute("data-msa-selected-position", "2");
  await page.keyboard.press("Space");
  await expect(page.getByLabel("Analysis scope").locator("option[value='selected']"))
    .toBeEnabled();
  await page.keyboard.press("p");
  await expect(page.getByRole("button", { name: /Unpin sequence/ }).first()).toBeVisible();
  await page.keyboard.press("h");
  await expect(page.getByLabel("Current viewer and analysis state")).toContainText(/Hidden/i);
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("r");
  await expect(page.getByLabel("Current viewer and analysis state")).toContainText(/Reference/i);
  await page.keyboard.press("End");
  await expect(page.locator("[data-msa-status='true']"))
    .toHaveAttribute("data-msa-selected-position", "512");
  await page.keyboard.press("Shift+ArrowLeft");
  await expect(page.locator("[data-msa-status='true']"))
    .toHaveAttribute("data-msa-selected-range", "511-512");
  await page.keyboard.press("Home");
  await expect(page.locator("[data-msa-status='true']"))
    .toHaveAttribute("data-msa-selected-position", "1");
  await page.keyboard.press("PageDown");
  await page.keyboard.press("PageUp");

  const activeDescendant = await grid.getAttribute("aria-activedescendant");
  expect(activeDescendant).toBeTruthy();
  await expect(page.locator(`#${activeDescendant}`)).toHaveCount(1);

  const settingsButton = page.getByRole("button", { name: "Workspace settings" });
  await settingsButton.click();
  await expect(page.locator("[data-msa-settings-dock='true']")).toBeVisible();
  await page.getByRole("button", { name: "Close settings" }).click();

  const exportButton = page.getByRole("button", { name: "Export / QC bundle" });
  await exportButton.click();
  const exportDialog = page.getByRole("dialog", { name: "Export MSA and QC bundle" });
  await expect(exportDialog).toBeVisible();
  for (let index = 0; index < 20; index += 1) await page.keyboard.press("Tab");
  expect(await exportDialog.evaluate((surface) => surface.contains(document.activeElement))).toBe(true);
  await page.keyboard.press("Escape");
  await expect(exportButton).toBeFocused();
  await settleBrowser(page);
});
