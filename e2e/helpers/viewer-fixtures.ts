import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { expect, type Locator, type Page } from "@playwright/test";

export type ViewerFixtureName = "detail-touch" | "overview-touch" | "layout-visual";

type FixtureDefinition = {
  columns: number;
  rows: number;
  salt: number;
};

const FIXTURES: Record<ViewerFixtureName, FixtureDefinition> = {
  "detail-touch": { columns: 512, rows: 40, salt: 5 },
  "overview-touch": { columns: 1024, rows: 128, salt: 17 },
  "layout-visual": { columns: 512, rows: 32, salt: 29 }
};

function deterministicSequence(row: number, columns: number, salt: number) {
  const bases = "ACGT";
  return Array.from({ length: columns }, (_unused, position) => {
    if (position < 6) {
      return bases[Math.floor(row / (4 ** position)) % 4];
    }
    const mixed = position * 7 + row * 13 + salt +
      (row + 1) * ((position % 17) + 1) + Math.floor(position / 23);
    return bases[mixed % bases.length];
  }).join("");
}

export function viewerFixture(name: ViewerFixtureName) {
  const definition = FIXTURES[name];
  return Array.from({ length: definition.rows }, (_unused, row) =>
    `>${name}-row-${String(row + 1).padStart(3, "0")}\n${deterministicSequence(
      row,
      definition.columns,
      definition.salt
    )}`
  ).join("\n");
}

export function referenceFixture() {
  const suffix = "T".repeat(508);
  return [
    `>reference\nA-CG${suffix}`,
    `>sample-2\nATCG${suffix}`,
    `>sample-3\nA-CG${suffix}`,
    `>sample-4\nAGCG${suffix}`
  ].join("\n");
}

export function proteinFixture() {
  return [
    ">protein-one\nMELKQWVFPI",
    ">protein-two\nMELRQWVFPI",
    ">protein-three\nMELKQWIFPI"
  ].join("\n");
}

export function rawUnequalFixture() {
  return [
    ">raw-one\nACGTACGT",
    ">raw-two\nACGTA",
    ">raw-three\nACGTAC"
  ].join("\n");
}

export function fixtureSha256(fasta: string) {
  return createHash("sha256").update(fasta).digest("hex");
}

export async function prepareViewerPage(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem("easymsa.locale", "en");
    if (window.sessionStorage.getItem("easymsa.e2e.initialized") !== "true") {
      for (const key of Object.keys(window.localStorage)) {
        if (key.startsWith("easymsa.viewer")) window.localStorage.removeItem(key);
      }
      window.sessionStorage.setItem("easymsa.e2e.initialized", "true");
    }
  });
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
}

export async function settleBrowser(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((resolve) => requestAnimationFrame(() =>
      requestAnimationFrame(() => resolve())
    ));
  });
}

export async function disableVisualNoise(page: Page) {
  const fonts = [
    ["Inter", "DejaVuSans.ttf", 400],
    ["Inter", "DejaVuSans-Bold.ttf", 700],
    ["JetBrains Mono", "DejaVuSansMono.ttf", 400],
    ["JetBrains Mono", "DejaVuSansMono-Bold.ttf", 700]
  ] as const;
  await page.addStyleTag({
    content: fonts.map(([family, file, weight]) => {
      const data = readFileSync(new URL(`../fonts/${file}`, import.meta.url)).toString("base64");
      return `@font-face { font-family: "${family}"; src: url(data:font/ttf;base64,${data}); font-weight: ${weight}; font-display: block; }`;
    }).join("\n")
  });
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-delay: 0s !important;
        animation-duration: 0s !important;
        caret-color: transparent !important;
        scroll-behavior: auto !important;
        transition-delay: 0s !important;
        transition-duration: 0s !important;
      }
    `
  });
  await page.evaluate(async () => {
    await Promise.all([
      document.fonts.load('400 14px "Inter"'),
      document.fonts.load('700 14px "Inter"'),
      document.fonts.load('400 14px "JetBrains Mono"'),
      document.fonts.load('700 14px "JetBrains Mono"')
    ]);
  });
  await settleBrowser(page);
  const navigator = page.getByRole("slider", { name: /Alignment overview navigator/ });
  await expect.poll(() => navigator.evaluate((element) => {
    const canvas = element as HTMLCanvasElement;
    const pixel = canvas.getContext("2d")?.getImageData(
      Math.floor(canvas.width * 0.75), Math.floor(canvas.height / 3), 1, 1
    ).data;
    return Boolean(pixel && pixel[1] > pixel[0] + 10);
  })).toBe(true);
  await settleBrowser(page);
}

export async function loadViewerFasta(page: Page, fasta: string) {
  await page.goto("./#/viewer");
  await page.getByLabel("Paste FASTA").fill(fasta);
  await page.getByRole("button", { name: "View pasted FASTA" }).click();
  const status = page.locator("[data-msa-status='true']");
  await expect(status).toBeVisible();
  await expect(status).toHaveAttribute("data-msa-analysis-status", /ready|disabled/);
  await settleBrowser(page);
  return status;
}

export async function loadNamedFixture(page: Page, name: ViewerFixtureName) {
  return loadViewerFasta(page, viewerFixture(name));
}

export async function openSettings(page: Page) {
  await page.getByRole("button", { name: "Workspace settings" }).click();
  const dialog = page.getByRole("dialog", { name: "View", exact: true });
  const dock = page.locator("[data-msa-settings-dock='true']");
  await expect(dock).toBeVisible();
  return dialog.isVisible().then((visible) => visible ? dialog : dock);
}

export async function closeSettings(page: Page) {
  await page.getByRole("button", { name: "Close panel" }).click();
  await expect(page.getByRole("dialog", { name: "View", exact: true })).toHaveCount(0);
  await expect(page.locator("[data-msa-settings-dock='true']")).toHaveCount(0);
  await settleBrowser(page);
}

export async function setViewMode(page: Page, mode: "detail" | "overview") {
  await openSettings(page);
  await page.getByLabel("Matrix display mode").selectOption(mode);
  await closeSettings(page);
  await expect(page.locator("[data-msa-status='true']"))
    .toHaveAttribute("data-msa-view-mode", mode);
}

export async function runRowAction(
  page: Page,
  rowName: string,
  directAccessibleName: string,
  menuActionName: string
) {
  const direct = page.getByRole("button", { name: directAccessibleName });
  if (await direct.isVisible().catch(() => false)) {
    await direct.click();
    return;
  }
  await page.getByLabel(`${rowName} row actions`).click();
  await page.getByRole("menuitemcheckbox", { name: menuActionName, exact: true }).click();
}

export async function tabIntoGrid(page: Page) {
  await page.locator("body").click({ position: { x: 2, y: 2 } });
  const grid = page.locator("[data-msa-scroll-viewport='true']");
  for (let attempt = 0; attempt < 80; attempt += 1) {
    await page.keyboard.press("Tab");
    if (await grid.evaluate((element) => document.activeElement === element)) {
      return grid;
    }
  }
  throw new Error("Matrix was not reachable through the real Tab order.");
}

export async function expectNoHorizontalOverflow(page: Page, tolerance = 1) {
  const overflow = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth
  }));
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + tolerance);
}

export async function locatorBox(locator: Locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error("Expected locator to have measurable geometry.");
  return box;
}
export async function openMotif(page: Page) {
  await page.getByLabel("Search and navigation type").selectOption("motif");
  await page.getByLabel("Motif options and results").click();
}
export async function openExport(page: Page) {
  await page.locator(".msa-export-menu > summary").click();
  await page.getByRole("button", { name: "Export / QC bundle" }).click();
}
export async function openQc(page: Page) {
  await page.getByRole("button", { name: "Analysis inspector", exact: true }).click();
  await page.getByRole("tab", { name: "Quality checks", exact: true }).click();
}
export async function chooseScope(page: Page, scope: string) {
  await openSettings(page);
  await page.getByText("Analysis scope and workspace", { exact:true }).click();
  await page.getByLabel("Analysis scope",{exact:true}).selectOption(scope);
  await closeSettings(page);
}
