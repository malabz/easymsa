import { expect, test } from "@playwright/test";

test("opens the home page and navigates to submission", async ({ page }) => {
  await page.goto("./#/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/easymsa/i);

  await page.getByRole("link", { name: /start analysis|开始分析/i }).click();
  await expect(page).toHaveURL(/#\/submit$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    /submit job|提交任务/i
  );
});

test("uses reference analysis, motif navigation, and hybrid MSA rendering", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("easymsa.locale", "en");
    window.localStorage.removeItem("easymsa.viewer.references.v1");
  });
  await page.goto("./#/viewer");
  const referenceSequence = `A-CG${"T".repeat(396)}`;
  const sampleSequence = `ATCG${"T".repeat(396)}`;
  await page.getByLabel("Paste FASTA").fill(
    `>reference\n${referenceSequence}\n>sample-2\n${sampleSequence}\n>sample-3\n${referenceSequence}`
  );
  await page.getByRole("button", { name: "View pasted FASTA" }).click();

  await expect(page.getByRole("application", { name: "Alignment overview navigator" })).toBeVisible();
  const referenceButton = page.getByRole("button", {
    name: "Set as reference reference"
  });
  await referenceButton.click();
  await expect(referenceButton).toHaveAttribute("aria-pressed", "true");

  await page.locator("[data-msa-advanced-toggle='true']").click();
  await page.getByLabel("Difference view").check();
  await expect(page.getByText("reference", { exact: true }).first()).toBeVisible();

  const dragStart = page.getByRole("button", { name: "sample-2 position 2 T" });
  const dragEnd = page.getByRole("button", { name: "sample-2 position 4 G" });
  const startBounds = await dragStart.boundingBox();
  const endBounds = await dragEnd.boundingBox();
  if (!startBounds || !endBounds) {
    throw new Error("MSA cells were not measurable");
  }
  await page.mouse.move(startBounds.x + startBounds.width / 2, startBounds.y + startBounds.height / 2);
  await page.mouse.down();
  await page.mouse.move(endBounds.x + endBounds.width / 2, endBounds.y + endBounds.height / 2, { steps: 4 });
  await page.mouse.up();
  await expect(page.locator("[data-msa-status='true']"))
    .toHaveAttribute("data-msa-selected-range", "2-4");

  await page.getByLabel("Search DNA/RNA motif").fill("AYC");
  await expect(page.locator("[data-msa-motif-status='true']"))
    .toHaveAttribute("data-msa-motif-total", "1");
  await page.getByRole("button", { name: "Next match" }).click();

  const navigator = page.getByRole("application", { name: "Alignment overview navigator" });
  const navigatorBounds = await navigator.boundingBox();
  if (!navigatorBounds) {
    throw new Error("Overview navigator was not measurable");
  }
  await page.mouse.click(
    navigatorBounds.x + navigatorBounds.width * 0.85,
    navigatorBounds.y + navigatorBounds.height / 2
  );
  await expect
    .poll(() =>
      page.locator("[data-msa-scroll-viewport='true']").evaluate((element) => element.scrollLeft)
    )
    .toBeGreaterThan(0);

  await page.getByRole("button", { name: "Zoom out" }).click();
  await page.getByRole("button", { name: "Zoom out" }).click();
  await expect(page.locator("canvas[data-msa-canvas='true']")).toBeVisible();
  await expect(page.locator("[data-msa-sequence-cell='true']")).toHaveCount(0);

  await page.getByRole("button", { name: "Zoom in" }).click();
  await expect(page.locator("canvas[data-msa-canvas='true']")).toHaveCount(0);
  await page.getByRole("button", { name: "Next match" }).click();
  const startCell = page.getByRole("button", { name: "sample-2 position 2 T" });
  await startCell.click();
  await startCell.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("[data-msa-status='true']"))
    .toHaveAttribute("data-msa-selected-position", "3");
});

test("uses documentation search, deep links, and product entry routes", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("easymsa.locale", "en");
  });
  await page.goto("./#/docs?section=msa-viewer");

  await expect(page.getByRole("heading", { level: 1, name: "Documentation" })).toBeVisible();
  await expect(page.locator("[data-docs-desktop-toc='true']")).toBeVisible();
  await expect(page).toHaveURL(/#\/docs\?section=msa-viewer$/);

  await page.getByRole("searchbox", { name: "Search documentation" }).fill("IUPAC motif");
  await page.getByRole("button", { name: /Navigation, zoom, and search/ }).click();
  await expect(page).toHaveURL(/section=msa-viewer/);
  await expect(page.locator("#docs-article-navigate-search")).toBeInViewport();

  await expect(page.getByRole("link", { name: /Submit a task/ })).toHaveAttribute("href", "#/submit");
  await expect(page.getByRole("link", { name: /Open local viewer/ })).toHaveAttribute("href", "#/viewer");
  await expect(page.getByRole("link", { name: /Restore a task/ })).toHaveAttribute("href", "#/lookup");
});

test("uses the collapsible documentation contents on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    window.localStorage.setItem("easymsa.locale", "en");
  });
  await page.goto("./#/docs");

  await expect(page.locator("[data-docs-desktop-toc='true']")).toBeHidden();
  const mobileContents = page.locator("details[data-docs-mobile-toc='true']");
  await expect(mobileContents).toBeVisible();
  await mobileContents.locator("summary").click();
  await mobileContents.getByRole("button", { name: /MSA Viewer/ }).click();
  await expect(page).toHaveURL(/#\/docs\?section=msa-viewer$/);
  await expect(mobileContents).not.toHaveAttribute("open", "");
});
