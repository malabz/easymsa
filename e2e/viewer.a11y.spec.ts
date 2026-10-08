import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import {
  expectNoHorizontalOverflow,
  loadNamedFixture,
  loadViewerFasta,
  prepareViewerPage,
  proteinFixture,
  rawUnequalFixture,
  setViewMode, openExport, openQc
} from "./helpers/viewer-fixtures";

async function expectAxeClean(page: Page, state: string) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  await test.info().attach(`axe-${state}.json`, {
    body: JSON.stringify(results, null, 2),
    contentType: "application/json"
  });
  expect(results.violations, results.violations.map((violation) =>
    `${violation.id}: ${violation.help} (${violation.nodes.length})`
  ).join("\n")).toEqual([]);
}

test.beforeEach(async ({ page }) => {
  await prepareViewerPage(page);
});

test("axe covers input, detail, settings, Inspector and QC", async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto("./#/viewer");
  await expectAxeClean(page, "viewer-input");

  await loadNamedFixture(page, "layout-visual");
  await expectAxeClean(page, "dna-detail");

  await page.getByRole("button", { name: "Workspace settings" }).click();
  await expectAxeClean(page, "settings");
  await page.getByRole("button", { name: "Close panel" }).click();

  await page.locator("[data-msa-sequence-cell='true']").first().click();
  await page.getByRole("button", { name: "Analysis inspector", exact: true }).click();
  await expectAxeClean(page, "inspector");
  await page.getByRole("button", { name: "Close panel" }).click();

  await openQc(page);
  await expectAxeClean(page, "qc");
  await page.getByRole("button", { name: "Close panel" }).click();
});

test("axe covers normal and over-limit export states", async ({ page }) => {
  test.setTimeout(120_000);
  await loadNamedFixture(page, "layout-visual");
  await openExport(page);
  await expectAxeClean(page, "export-normal");
  await page.getByRole("button", { name: "PNG", exact: true }).click();
  await page.getByRole("button", { name: "Original full alignment", exact: true }).click();
  await page.getByRole("button", { name: "Keep one line", exact: true }).click();
  await page.getByLabel("PNG scale", { exact: true }).fill("4");
  await expect(page.getByRole("alert")).toContainText(/limit|above|exceed/i);
  await expectAxeClean(page, "export-over-limit");
  await page.getByRole("dialog").locator("footer").getByRole("button", { name: "Cancel", exact: true }).click();
});

test("axe covers immersive and Canvas browsing", async ({ page }) => {
  test.setTimeout(120_000);
  await loadNamedFixture(page, "layout-visual");
  await page.getByRole("button", { name: "Full screen" }).click();
  await expectAxeClean(page, "immersive");
  await page.getByRole("button", { name: "Exit full screen" }).click();

  await setViewMode(page, "overview");
  await expect(page.locator("canvas[data-msa-canvas='true']")).toBeVisible();
  await expectAxeClean(page, "canvas-overview");
});

test("axe and semantics cover protein neutral and raw-unequal modes", async ({ page }) => {
  await loadViewerFasta(page, proteinFixture());
  await expect(page.locator("[data-msa-status='true']"))
    .toHaveAttribute("data-msa-analysis-status", "disabled");
  await expect(page.getByText(/Neutral read-only browsing mode/).first()).toBeVisible();
  await expect(page.getByText(/^(GC content|Ti\/Tv|Conservation)$/)).toHaveCount(0);
  await expectAxeClean(page, "protein-neutral");

  await page.getByRole("button", { name: "Change file" }).click();
  await loadViewerFasta(page, rawUnequalFixture());
  await expect(page.locator("[data-msa-status='true']"))
    .toHaveAttribute("data-msa-analysis-status", "disabled");
  await expect(page.getByText(/FASTA rows have unequal lengths/i).first()).toBeVisible();
  await expectAxeClean(page, "raw-unequal");
});

test("forced colors, reduced motion, 200% text zoom, and 320/360 reflow remain operable", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light", forcedColors: "active", reducedMotion: "reduce" });
  await page.setViewportSize({ width: 360, height: 800 });
  await loadNamedFixture(page, "layout-visual");
  await expectNoHorizontalOverflow(page);
  await expectAxeClean(page, "forced-colors-360");

  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  await expectNoHorizontalOverflow(page);
  await expect(page.locator("[data-msa-workspace-matrix='true']")).toBeVisible();

  await page.setViewportSize({ width: 320, height: 800 });
  await expectNoHorizontalOverflow(page);
  await expect(page.getByRole("button", { name: "Workspace settings" })).toBeVisible();
  await expectAxeClean(page, "text-zoom-320");
});
