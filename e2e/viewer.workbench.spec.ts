import { expect, test } from "@playwright/test";
import { loadNamedFixture, openExport, prepareViewerPage, settleBrowser, viewerFixture } from "./helpers/viewer-fixtures";

test.beforeEach(async ({ page }) => { await prepareViewerPage(page); });

test("result Alignment opens immersive directly; history and immediate return preserve selection", async ({ page }) => {
  await page.goto("./#/examples/alignment-small");
  await page.getByRole("tab", { name:"Alignment", exact:true }).click();
  const shell = page.locator("[data-msa-workspace-shell]");
  const status = page.locator("[data-msa-status]");
  await expect(shell).toHaveAttribute("data-msa-workspace-mode","immersive");
  await expect(page.getByRole("button",{name:"Back to results"})).toBeVisible();
  await expect(page.getByLabel("Result version")).toHaveCount(0);
  await expect(page.locator("[data-msa-workspace-dock]")).toHaveCount(0);
  await page.locator("[data-msa-sequence-cell]").nth(4).click();
  const position = await status.getAttribute("data-msa-selected-position");
  await expect(page.locator("[data-msa-workspace-dock]")).toHaveCount(0);
  await page.getByRole("button",{name:"Zoom in",exact:true}).click();
  await page.getByRole("button",{name:"Back to results"}).click();
  await expect(page.getByRole("tab",{name:"Overview",exact:true})).toHaveAttribute("aria-selected","true");
  await page.goForward();
  await expect(shell).toHaveAttribute("data-msa-workspace-mode","immersive");
  await expect(status).toHaveAttribute("data-msa-selected-position",position!);
  await expect(status).toHaveAttribute("data-msa-zoom","1.10");
  await page.goBack();
  await expect(shell).toHaveCount(0);
  await page.getByRole("tab",{name:"Alignment",exact:true}).click();
  await page.getByRole("button",{name:"Workspace settings"}).click();
  await expect(page.locator("[data-msa-settings-dock]")).toBeVisible();
  await page.reload();
  await expect(shell).toHaveAttribute("data-msa-workspace-mode","immersive");
  await expect(page.locator("[data-msa-workspace-dock]")).toHaveCount(0);
  await expect(status).toHaveAttribute("data-msa-selected-position",position!);
});

test("desktop matrix occupies at least 75 percent without shrinking cells", async ({ page }) => {
  await page.goto("./#/examples/alignment-small?tab=alignment");
  for (const [width,height] of [[1280,720],[1280,800],[1440,900]]) {
    await page.setViewportSize({width,height});
    await expect(page.locator("[data-msa-workspace-matrix]")).toBeVisible();
    await settleBrowser(page);
    const matrix = await page.locator("[data-msa-workspace-matrix]").boundingBox();
    expect(matrix!.height/height).toBeGreaterThanOrEqual(.75);
    const cell = await page.locator("[data-msa-sequence-cell]").first().boundingBox();
    expect(cell!.width).toBe(20); expect(cell!.height).toBe(24);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
});

test("file upload stays embedded, full screen preserves the mounted matrix, position and zoom", async ({ page }) => {
  await page.goto("./#/viewer");
  await page.getByLabel("Upload FASTA", {exact:true}).setInputFiles({name:"viewer-validation.fasta",mimeType:"text/plain",buffer:Buffer.from(viewerFixture("layout-visual"))});
  const shell=page.locator("[data-msa-workspace-shell]");
  await expect(shell).toHaveAttribute("data-msa-workspace-mode","embedded");
  await expect(page.getByRole("button",{name:"Full screen",exact:true})).toBeVisible();
  const matrix=page.locator("[data-msa-scroll-viewport]");
  await matrix.focus(); await page.keyboard.press("ArrowRight");
  await page.getByRole("button",{name:"Zoom in",exact:true}).click();
  const handle = await matrix.elementHandle();
  await page.getByRole("button",{name:"Full screen",exact:true}).click();
  await expect(shell).toHaveAttribute("data-msa-workspace-mode","immersive");
  expect(await handle!.evaluate(el => el === document.querySelector("[data-msa-scroll-viewport]"))).toBe(true);
  await page.getByRole("button",{name:"Exit full screen",exact:true}).click();
  await expect(page.locator("[data-msa-status]")).toHaveAttribute("data-msa-selected-position","2");
  await expect(page.locator("[data-msa-status]")).toHaveAttribute("data-msa-zoom","1.10");
  await expect(page.locator(".msa-source-name")).toContainText("viewer-validation.fasta");
});

test("Escape closes export, popovers and panels before leaving immersive mode", async ({ page }) => {
  await loadNamedFixture(page,"layout-visual");
  await page.getByRole("button",{name:"Full screen",exact:true}).click();
  const shell=page.locator("[data-msa-workspace-shell]");
  await openExport(page);
  await expect(page.getByRole("dialog",{name:"Export MSA and QC bundle"})).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(shell).toHaveAttribute("data-msa-workspace-mode","immersive");
  await page.locator(".msa-export-menu > summary").click();
  await page.keyboard.press("Escape");
  await expect(page.locator(".msa-export-menu")).not.toHaveAttribute("open","");
  await expect(shell).toHaveAttribute("data-msa-workspace-mode","immersive");
  await page.getByRole("button",{name:"Workspace settings"}).click();
  await page.keyboard.press("Escape");
  await expect(page.locator("[data-msa-settings-dock]")).toHaveCount(0);
  await expect(shell).toHaveAttribute("data-msa-workspace-mode","immersive");
  await page.keyboard.press("Escape");
  await expect(shell).toHaveAttribute("data-msa-workspace-mode","embedded");
});

test("stages keep independent viewing state and Back to results preserves the chosen stage", async ({page}) => {
  await page.goto("./#/examples/realignment-small?tab=alignment&stage=initial");
  const status=page.locator("[data-msa-status]");
  await expect(status).toBeVisible();
  await page.getByRole("button",{name:"Zoom in",exact:true}).click();
  await page.getByLabel("Result version").selectOption("refined");
  await expect(status).toHaveAttribute("data-msa-zoom","1.00");
  await page.getByLabel("Result version").selectOption("initial");
  await expect(status).toHaveAttribute("data-msa-zoom","1.10");
  await page.getByRole("button",{name:"Back to results"}).click();
  await expect(page).toHaveURL(/stage=initial/);
  await expect(page.getByRole("tab",{name:"Overview",exact:true})).toHaveAttribute("aria-selected","true");
});
