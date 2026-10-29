import { unzipSync } from "fflate";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

import { openExport } from "./helpers/viewer-fixtures";

function exampleText(id: string, filename: string) {
  return readFileSync(`public/examples/v1/${id}/${filename}`, "utf8").replace(/\r\n/g, "\n");
}

test.beforeEach(async ({ page }) => {
  // UI regression uses a deterministic service state and never submits to production.
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const health: Record<string, unknown> = {
      "/api/health": { status: "ok", service: "easymsa-server" },
      "/api/health/queue": { queueName: "easymsa", queueLength: 0, realignmentQueueLength: 0 },
      "/api/health/resources": { resolvedMaxThreadPerJob: 3 },
      "/api/health/tools": {
        easymsaPrep: { configured: true, available: true },
        algorithms: { auto: true, minipoa: true, mafft: true, halign: true, fmalign2_mafft: true },
        realignment: { enabled: true, available: true, version: "fixture", maxSequences: 2000, maxColumns: 30000, maxCells: 1000000 },
      },
    };
    if (path in health && route.request().method() === "GET") {
      await route.fulfill({ json: health[path] });
    } else await route.abort();
  });
  await page.addInitScript(() => {
    if (!localStorage.getItem("easymsa.locale")) localStorage.setItem("easymsa.locale", "en");
  });
});
test("examples remain interactive offline and do not create private credentials", async ({
  page,
}) => {
  await page.route("**/*", (r) =>
    new URL(r.request().url()).pathname.startsWith("/api/")
      ? r.abort()
      : r.continue(),
  );
  await page.goto("#/examples/realignment-small");
  await expect(
    page.getByRole("heading", { level: 1, name: "Synthetic DNA · ReAlign-N refinement" }),
  ).toBeVisible();
  const inputDownloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "FASTA.gz", exact: true }).click();
  const inputDownload = await inputDownloadPromise;
  expect(inputDownload.suggestedFilename()).toBe("input.fasta.gz");
  expect(
    gunzipSync(readFileSync((await inputDownload.path())!))
      .toString()
      .match(/^>/gm),
  ).toHaveLength(20);
  expect(gunzipSync(readFileSync((await inputDownload.path())!)).toString().replace(/\r\n/g, "\n"))
    .toBe(exampleText("realignment-small", "input.fasta"));
  await page.getByRole("tab", { name: "Alignment", exact: true }).click();
  await expect(page.locator('[data-msa-status="true"]')).toHaveAttribute(
    "data-msa-analysis-status",
    "ready",
  );
  for (const stage of ["initial", "refined", "final"]) {
    await page
      .getByLabel("Result version", { exact: true })
      .selectOption(stage);
    await expect(page.getByLabel("Result version", { exact: true })).toHaveValue(stage);
    await expect(page.locator('[data-msa-status="true"]')).toHaveAttribute(
      "data-msa-analysis-status",
      "ready",
    );
  }
  await page.getByRole("button", { name: "Back to results", exact: true }).click();

  await page.getByRole("tab", { name: "Downloads", exact: true }).click();
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download realignment-small-final-alignment.fasta.gz", exact: true })
    .click();
  const downloaded = await download;
  expect(downloaded.suggestedFilename()).toBe("realignment-small-final-alignment.fasta.gz");
  const downloadPath = await downloaded.path();
  expect(
    gunzipSync(readFileSync(downloadPath!)).toString().match(/^>/gm),
  ).toHaveLength(20);
  expect(gunzipSync(readFileSync(downloadPath!)).toString().replace(/\r\n/g, "\n"))
    .toBe(exampleText("realignment-small", "final.fasta"));
  expect(
    await page.evaluate(() => localStorage.getItem("easymsa.jobAccess.v1")),
  ).toBeNull();
  expect(await page.locator('a[href*="token="]').count()).toBe(0);
  await page.reload();
  await expect(
    page.getByRole("heading", { level: 1, name: "Synthetic DNA · ReAlign-N refinement" }),
  ).toBeVisible();
});
test("home, docs, license, invalid examples and responsive navigation", async ({
  page,
}) => {
  await page.goto("#/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Multiple nucleotide sequence alignment",
  );
  await expect(
    page.getByRole("link", { name: "Download example input", exact: true }),
  ).toBeVisible();
  await page.getByRole("navigation", { name: "Site information" }).getByRole("link", { name: "Licenses", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Free for all uses" }),
  ).toBeVisible();
  await expect(page.locator("pre")).toContainText(
    "Copyright (c) 2026 EasyMSA contributors",
  );
  await page.goto("#/docs");

  await expect(page.getByRole("heading", { name: "Start an alignment in three steps", exact: true })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Alignment example", exact: true }),
  ).toBeVisible();
  await page.goto("#/examples/no-such-example");
  await expect(
    page.getByText("Example not found.", { exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("#/examples");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(
    page
      .getByRole("navigation", { name: "Primary navigation" })
      .getByRole("link", { name: "Realign", exact: true }),
  ).toBeVisible();
});
test("privacy clears only EasyMSA keys, handles cancellation and denied storage", async ({
  page,
}) => {
  await page.goto("#/privacy");
  await page.evaluate(() => {
    localStorage.setItem("easymsa.jobAccess.v1", "[]");
    localStorage.setItem("easymsa.jobTokens", "{}");
    localStorage.setItem("unrelated", "keep");
    localStorage.setItem("easymsa.viewer.workspaces.v1", "{}");
  });
  await page
    .getByRole("button", { name: "Clear local job records", exact: true })
    .click();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  expect(
    await page.evaluate(() => localStorage.getItem("easymsa.jobTokens")),
  ).toBe("{}");
  expect(await page.evaluate(() => localStorage.getItem("easymsa.jobAccess.v1"))).toBe("[]");
  await page
    .getByRole("button", { name: "Clear local job records", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirm clear", exact: true })
    .click();
  expect(
    await page.evaluate(() => localStorage.getItem("easymsa.jobTokens")),
  ).toBeNull();
  expect(await page.evaluate(() => localStorage.getItem("easymsa.jobAccess.v1"))).toBeNull();
  expect(await page.evaluate(() => localStorage.getItem("unrelated"))).toBe(
    "keep",
  );
  expect(
    await page.evaluate(() =>
      localStorage.getItem("easymsa.viewer.workspaces.v1"),
    ),
  ).toBe("{}");
  await page
    .getByRole("button", { name: "Clear saved views", exact: true })
    .click();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  expect(await page.evaluate(() => localStorage.getItem("easymsa.viewer.workspaces.v1"))).toBe("{}");
  await page
    .getByRole("button", { name: "Clear saved views", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirm clear", exact: true })
    .click();
  expect(
    await page.evaluate(() =>
      localStorage.getItem("easymsa.viewer.workspaces.v1"),
    ),
  ).toBeNull();
  expect(await page.evaluate(() => localStorage.getItem("unrelated"))).toBe("keep");
  expect(await page.evaluate(() => localStorage.getItem("easymsa.locale"))).toBe("en");
  await page.addInitScript(() =>
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new DOMException("Denied", "SecurityError");
      },
    }),
  );
  await page.reload();
  await expect(
    page.getByText(
      "Browser storage is unavailable. Save your recovery link or download your access credentials before closing this page.",
      { exact: true },
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear saved views", exact: true }).click();
  await page.getByRole("button", { name: "Confirm clear", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Browser storage is unavailable; clearing could not be confirmed." })).toBeVisible();
});
test("example input loading preserves email and does not submit; normal defaults remain", async ({
  page,
}) => {
  let submissions = 0;
  page.on("request", (r) => {
    if (r.method() === "POST" && r.url().includes("/jobs")) submissions++;
  });
  await page.goto("#/submit");
  await page
    .locator("summary")
    .filter({ hasText: /^Advanced settings/ })
    .click();
  await expect(page.getByRole("combobox", { name: "Alignment method", exact: true })).toHaveValue("auto");
  await expect(page.getByLabel("Preprocess mode", { exact: true })).toHaveValue("audit");
  await expect(page.getByRole("checkbox", { name: "Refine alignment quality", exact: true })).not.toBeChecked();
  await expect(page.getByRole("spinbutton", { name: /Thread/ })).toHaveValue("");
  const originalInput = ">original_a full title\nACGT\n>original_b full title\nACGA\n";
  await page.getByLabel("FASTA sequences", { exact: true }).fill(originalInput);
  await page.getByLabel("Job name", { exact: true }).focus();
  await expect(page.getByLabel("Job name", { exact: true })).toHaveValue(/^Alignment-\d{8}-\d{6}$/);
  await page.getByLabel("Job name", { exact: true }).fill("Original analysis");
  await page.locator("#email").fill("example@example.com");
  await page.getByRole("combobox", { name: "Alignment method", exact: true }).selectOption("mafft");
  await page.getByLabel("Preprocess mode", { exact: true }).selectOption("filter");
  await page.getByRole("spinbutton", { name: /Thread/ }).fill("2");
  await page.getByRole("checkbox", { name: "Refine alignment quality", exact: true }).check();
  await page
    .getByRole("button", { name: "Load example & settings", exact: true })
    .click();
  await expect(page.getByText("Replaces the input and job name, selects MiniPOA, retains sequences after checks, restores default algorithm parameters, and turns refinement off. Your email stays unchanged.", { exact: true })).toBeVisible();
  await expect(page.getByLabel("FASTA sequences", { exact: true })).toHaveValue(originalInput);
  await expect(page.getByLabel("Job name", { exact: true })).toHaveValue("Original analysis");
  await expect(page.getByRole("combobox", { name: "Alignment method", exact: true })).toHaveValue("mafft");
  await expect(page.getByLabel("Preprocess mode", { exact: true })).toHaveValue("filter");
  await expect(page.getByRole("spinbutton", { name: /Thread/ })).toHaveValue("2");
  await expect(page.getByRole("checkbox", { name: "Refine alignment quality", exact: true })).toBeChecked();
  expect(submissions).toBe(0);
  await page.getByRole("button", { name: "Confirm load", exact: true }).click();
  await expect(page.getByRole("tab", { name: "Paste FASTA", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByLabel("FASTA sequences", { exact: true })).toHaveValue(exampleText("alignment-small", "input.fasta"));
  await expect(page.getByLabel("Job name", { exact: true })).toHaveValue("Synthetic DNA example");
  await expect(page.locator("#email")).toHaveValue("example@example.com");
  await expect(page.getByRole("combobox", { name: "Alignment method", exact: true })).toHaveValue("minipoa");
  await expect(page.getByLabel("Preprocess mode", { exact: true })).toHaveValue("audit");
  await expect(page.getByRole("spinbutton", { name: /Thread/ })).toHaveValue("");
  await expect(page.getByRole("checkbox", { name: "Refine alignment quality", exact: true })).not.toBeChecked();
  expect(submissions).toBe(0);
});
test("new public pages pass accessibility rules", async ({ page }) => {
  for (const path of ["/examples", "/license", "/privacy", "/about"]) {
    await page.goto("#" + path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(async () => {
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(results.violations).toEqual([]);
    }).toPass({ timeout: 20000 });
  }
});
test("public viewer search, keyboard selection, export and stage isolation", async ({
  page,
}) => {
  await page.goto("#/examples/realignment-small");
  await page.getByRole("tab", { name: "Alignment", exact: true }).click();
  await expect(page.locator('[data-msa-status="true"]')).toHaveAttribute(
    "data-msa-analysis-status",
    "ready",
  );
  await expect(page.getByLabel("Result version", { exact: true })).toHaveValue("final");
  await page.getByRole("searchbox", { name: "Search sequence name", exact: true }).fill("seq_000001");
  // Name lookup only locates by default; explicitly enable the persistent display filter.
  await page.getByRole("checkbox", { name: "Show only matching sequences", exact: true }).check();
  await expect(page.locator('[data-msa-sequence-cell]:not([data-msa-row-key="easymsa:consensus"])[data-msa-position="1"]')).toHaveCount(1);
  const grid = page.locator('[data-msa-scroll-viewport="true"]');
  await grid.focus();
  await page.keyboard.press("Home");
  await page.keyboard.press("Shift+ArrowRight");
  await expect(page.locator('[data-msa-status="true"]')).toHaveAttribute(
    "data-msa-selected-range",
    "1-2",
  );
  await page.getByLabel("Search and navigation type").selectOption("motif");

  await page.getByLabel("Search DNA/RNA motif").fill("ACGT");

  await page.getByLabel("Search and navigation type").selectOption("name");
  await expect
    .poll(() =>
      page.evaluate(
        () => localStorage.getItem("easymsa.viewer.workspaces.v1") ?? "",
      ),
    )
    .toContain("seq_000001");
  // Sequence downloads and image/analysis bundles now have separate entry points.
  await page.locator(".msa-export-menu > summary").click();
  await page.getByRole("button", { name: "Download sequences", exact: true }).click();
  const sequenceDialog = page.getByRole("dialog", { name: "Download alignment sequences", exact: true });
  await expect(sequenceDialog).toContainText("Result version: Final result");
  await sequenceDialog.getByRole("combobox", { name: "Sequences", exact: true }).selectOption("all");
  await sequenceDialog.getByRole("combobox", { name: "Columns", exact: true }).selectOption("all");
  const sequenceDownloadPromise = page.waitForEvent("download");
  await sequenceDialog.getByRole("button", { name: "Download", exact: true }).click();
  const sequenceDownload = await sequenceDownloadPromise;
  expect(sequenceDownload.suggestedFilename()).toBe("Synthetic-DNA-·-ReAlign-N-refinement-final-all-alignment.fasta");
  expect(readFileSync((await sequenceDownload.path())!, "utf8").replace(/\r\n/g, "\n"))
    .toBe(exampleText("realignment-small", "final.fasta"));
  await sequenceDialog.getByRole("button", { name: "Close", exact: true }).click();
  await expect(sequenceDialog).toHaveCount(0);
  await openExport(page);
  await expect(
    page.getByRole("dialog", { name: "Export alignment" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "SVG", exact: true }).click();
  await page.getByRole("button", { name: "Continuous selected interval", exact: true }).click();
  const promise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const exportDownload = await promise;
  expect(exportDownload.suggestedFilename()).toMatch(/\.zip$/);
  const bundle = unzipSync(readFileSync((await exportDownload.path())!));
  const manifest = JSON.parse(new TextDecoder().decode(bundle["manifest.json"]));
  expect(manifest.source.kind).toBe("example");
  expect(manifest.source.jobId).toBeNull();
  expect(manifest.source.sequenceCount).toBe(20);
  expect(manifest.scope.selectedInterval).toEqual({ start: 1, end: 2 });
  expect(manifest.scope.alignmentPositions).toEqual([1, 2]);
  expect(manifest.scope.exportedRowCount).toBe(1);
  expect(manifest.output.format).toBe("svg");
  expect(new TextDecoder().decode(bundle[manifest.output.filename])).toContain("<svg");
  expect(JSON.stringify(manifest)).not.toContain("token=");
  await expect(page.getByRole("dialog", { name: "Export alignment" })).toHaveCount(0);
  await page
    .getByLabel("Result version", { exact: true })
    .selectOption("refined");
  await expect(page.locator('[data-msa-status="true"]')).toHaveAttribute(
    "data-msa-analysis-status",
    "ready",
  );
  await expect(page.getByRole("searchbox", { name: "Search sequence name", exact: true })).toHaveValue("");
  await expect(page.locator('[data-msa-status="true"]')).toHaveAttribute("data-msa-selected-range", "");
  await page.getByLabel("Search and navigation type").selectOption("motif");
  await expect(page.getByLabel("Search DNA/RNA motif", { exact: true })).toHaveValue("");
  await page
    .getByLabel("Result version", { exact: true })
    .selectOption("final");
  await expect(page.locator('[data-msa-status="true"]')).toHaveAttribute("data-msa-analysis-status", "ready");
  await page.getByLabel("Search and navigation type").selectOption("motif");
  await expect(page.getByLabel("Search DNA/RNA motif", { exact: true })).toHaveValue("ACGT");
  await page.getByLabel("Search and navigation type").selectOption("name");
  await expect(page.getByRole("searchbox", { name: "Search sequence name", exact: true })).toHaveValue(
    "seq_000001",
  );
  await expect(page.locator('[data-msa-status="true"]')).toHaveAttribute("data-msa-selected-range", "1-2");
  await expect(page.locator('[data-msa-sequence-cell]:not([data-msa-row-key="easymsa:consensus"])[data-msa-position="1"]')).toHaveCount(1);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("corrupt example assets are rejected without fabricated fallback", async ({
  page,
}) => {
  await page.route("**/examples/v1/alignment-small/final.alignment.json*", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: "{}" }),
  );
  await page.goto("#/examples/alignment-small?tab=alignment");
  await expect(
    page.getByText(
      "Example files are missing or failed integrity verification. Please reload.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(page.locator('[data-msa-status="true"]')).toHaveCount(0);
});
test("Chinese content and offline submission availability", async ({
  page,
}) => {
  let submissions = 0;
  page.on("request", request => {
    if (request.method() === "POST" && request.url().includes("/jobs")) submissions++;
  });
  await page.goto("#/privacy");
  await page
    .getByRole("button", { name: "Switch language" })
    .filter({ visible: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "隐私与本地存储", exact: true }),
  ).toBeVisible();
  await page.goto("#/license");
  await expect(
    page.getByRole("heading", { name: "所有用途免费开放", exact: true }),
  ).toBeVisible();
  await page.goto("#/examples");
  await expect(
    page.getByRole("heading", { name: "示例", exact: true }),
  ).toBeVisible();
  await page.route("**/*", (r) =>
    new URL(r.request().url()).pathname.startsWith("/api/")
      ? r.abort()
      : r.continue(),
  );
  await page.reload();
  await page.goto("#/submit?example=alignment-small");
  await expect(page.getByLabel("FASTA 序列", { exact: true })).toHaveValue("");
  await page.getByRole("button", { name: "确认载入", exact: true }).click();
  await expect(page.getByRole("tab", { name: "粘贴 FASTA", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByLabel("FASTA 序列", { exact: true })).toHaveValue(exampleText("alignment-small", "input.fasta"));
  await expect(page.getByLabel("任务名称", { exact: true })).toHaveValue("Synthetic DNA example");
  await expect(page.getByText("无法连接分析服务", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: /^(提交任务|Submit Job)$/, exact: true }),
  ).toBeDisabled();
  expect(submissions).toBe(0);
});


test("concise bilingual copy preserves guidance and mobile layout", async ({ page }, testInfo) => {
  for (const locale of ["en", "zh"]) {
    await page.goto("#/");
    if (locale === "zh") {
      await page.getByRole("button", { name: "Switch language" }).filter({ visible: true }).click();
    }
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      locale === "zh" ? "核酸多序列比对" : "Multiple nucleotide sequence alignment",
    );
    await page.setViewportSize({ width: 390, height: 844 });
    for (const route of ["/", "/about", "/examples", "/examples/realignment-small", "/docs", "/realign"]) {
      await page.goto("#" + route);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.locator("main")).not.toContainText(/不保证|不证明|不代表生物学|独立科研验证|not guaranteed|without guaranteeing|does not demonstrate|independent scientific validation/i);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await page.goto("#/examples/realignment-small");
    await expect(page.getByText(locale === "zh" ? "当前显示：重比对结果。" : "Showing: Refined alignment.", { exact: true })).toBeVisible();
    if (testInfo.project.name === "routes-chromium") {
      await expect(page.getByRole("status").filter({ hasText: /Calculating alignment quality statistics|正在.*统计/ })).toHaveCount(0);
      await page.screenshot({ path: testInfo.outputPath(`examples-${locale}-mobile.png`), fullPage: true });
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.goto("#/");
      await expect(page.getByRole("link", { name: locale === "zh" ? "下载示例输入" : "Download example input", exact: true })).toBeVisible();
      await page.screenshot({ path: testInfo.outputPath(`home-${locale}.png`), fullPage: true });
    }
  }
});
