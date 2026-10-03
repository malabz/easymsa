import { unzipSync } from "fflate";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
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
    page.getByRole("heading", { name: "Synthetic DNA · ReAlign-N refinement" }),
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
  await page.getByRole("tab", { name: "Alignment", exact: true }).click();
  await expect(page.locator('[data-msa-status="true"]')).toHaveAttribute(
    "data-msa-analysis-status",
    "ready",
  );
  for (const stage of ["initial", "refined", "final"]) {
    await page
      .getByLabel("Result version", { exact: true })
      .selectOption(stage);
    await expect(page.locator('[data-msa-status="true"]')).toHaveAttribute(
      "data-msa-analysis-status",
      "ready",
    );
  }
  await page.getByRole("tab", { name: "Downloads", exact: true }).click();
  const download = page.waitForEvent("download");
  await page
    .getByRole("link", { name: "Download", exact: true })
    .nth(1)
    .click();
  const downloaded = await download;
  expect(downloaded.suggestedFilename()).toBe("alignment.fasta.gz");
  const downloadPath = await downloaded.path();
  expect(
    gunzipSync(readFileSync(downloadPath!)).toString().match(/^>/gm),
  ).toHaveLength(20);
  expect(
    await page.evaluate(() => localStorage.getItem("easymsa.jobAccess.v1")),
  ).toBeNull();
  expect(await page.locator('a[href*="token="]').count()).toBe(0);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Synthetic DNA · ReAlign-N refinement" }),
  ).toBeVisible();
});
test("home, docs, license, invalid examples and responsive navigation", async ({
  page,
}) => {
  await page.goto("#/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Nucleotide alignment",
  );
  await expect(
    page.getByRole("link", { name: "Download example input", exact: true }),
  ).toBeVisible();
  await page.goto("#/license");
  await expect(
    page.getByRole("heading", { name: "Free for all uses" }),
  ).toBeVisible();
  await expect(page.locator("pre")).toContainText(
    "Copyright (c) 2026 EasyMSA contributors",
  );
  await page.goto("#/docs");
  await expect(
    page.getByRole("link", { name: "Alignment input and interactive result" }),
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
      .getByRole("link", { name: "Examples", exact: true }),
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
  await page
    .getByRole("button", { name: "Clear local job records", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirm clear", exact: true })
    .click();
  expect(
    await page.evaluate(() => localStorage.getItem("easymsa.jobTokens")),
  ).toBeNull();
  expect(await page.evaluate(() => localStorage.getItem("unrelated"))).toBe(
    "keep",
  );
  expect(
    await page.evaluate(() =>
      localStorage.getItem("easymsa.viewer.workspaces.v1"),
    ),
  ).toBe("{}");
  await page
    .getByRole("button", { name: "Clear viewer workspaces", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirm clear", exact: true })
    .click();
  expect(
    await page.evaluate(() =>
      localStorage.getItem("easymsa.viewer.workspaces.v1"),
    ),
  ).toBeNull();
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
  await expect(page.getByRole("radio", { name: /Auto/ })).toBeChecked();
  await page.locator("#email").fill("example@example.com");
  await page
    .getByRole("button", { name: "Load example file", exact: true })
    .click();
  await expect(
    page.getByText("alignment-small.fasta", { exact: true }),
  ).toBeVisible();
  await expect(page.locator("#email")).toHaveValue("example@example.com");
  await expect(page.getByRole("radio", { name: /MiniPOA/i })).toBeChecked();
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
  await page.getByPlaceholder("Type a sequence name").fill("seq_000001");
  const grid = page.locator('[data-msa-scroll-viewport="true"]');
  await grid.focus();
  await page.keyboard.press("Home");
  await page.keyboard.press("Shift+ArrowRight");
  await expect(page.locator('[data-msa-status="true"]')).toHaveAttribute(
    "data-msa-selected-range",
    "1-2",
  );
  await page.getByLabel("Search DNA/RNA motif").fill("ACGT");
  await expect
    .poll(() =>
      page.evaluate(
        () => localStorage.getItem("easymsa.viewer.workspaces.v1") ?? "",
      ),
    )
    .toContain("seq_000001");
  await page
    .getByRole("button", { name: "Export / QC bundle", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Export MSA and QC bundle" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "FASTA", exact: true }).click();
  const promise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const exportDownload = await promise;
  expect(exportDownload.suggestedFilename()).toMatch(/\.zip$/);
  const bundle = unzipSync(readFileSync((await exportDownload.path())!));
  const manifest = JSON.parse(new TextDecoder().decode(bundle["manifest.json"]));
  expect(manifest.source.kind).toBe("example");
  expect(manifest.source.jobId).toBeNull();
  expect(JSON.stringify(manifest)).not.toContain("token=");
  await page.keyboard.press("Escape");
  await page
    .getByLabel("Result version", { exact: true })
    .selectOption("refined");
  await expect(page.locator('[data-msa-status="true"]')).toHaveAttribute(
    "data-msa-analysis-status",
    "ready",
  );
  await expect(page.getByPlaceholder("Type a sequence name")).toHaveValue("");
  await page
    .getByLabel("Result version", { exact: true })
    .selectOption("final");
  await expect(page.getByPlaceholder("Type a sequence name")).toHaveValue(
    "seq_000001",
  );
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
  await page.route("**/examples/v1/alignment-small/final.alignment.json", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: "{}" }),
  );
  await page.goto("#/examples/alignment-small");
  await expect(
    page.getByText(
      "Example files are missing or failed integrity verification. Please reload.",
      { exact: true },
    ),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Alignment", exact: true }).click();
  await expect(page.locator('[data-msa-status="true"]')).toHaveCount(0);
});
test("Chinese content and offline submission availability", async ({
  page,
}) => {
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
    page.getByRole("heading", { name: "交互式示例", exact: true }),
  ).toBeVisible();
  await page.route("**/*", (r) =>
    new URL(r.request().url()).pathname.startsWith("/api/")
      ? r.abort()
      : r.continue(),
  );
  await page.reload();
  await page.goto("#/submit?example=alignment-small");
  await expect(
    page.getByText("alignment-small.fasta", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /^(提交任务|Submit Job)$/, exact: true }),
  ).toBeDisabled();
});


test("concise bilingual copy preserves guidance and mobile layout", async ({ page }, testInfo) => {
  for (const locale of ["en", "zh"]) {
    await page.goto("#/");
    if (locale === "zh") {
      await page.getByRole("button", { name: "Switch language" }).filter({ visible: true }).click();
    }
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      locale === "zh" ? "核酸多序列比对与重比对" : "Nucleotide alignment and refinement",
    );
    await page.setViewportSize({ width: 390, height: 844 });
    for (const route of ["/", "/about", "/examples", "/examples/realignment-small", "/docs", "/realign"]) {
      await page.goto("#" + route);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.locator("main")).not.toContainText(/不保证|不证明|不代表生物学|独立科研验证|not guaranteed|without guaranteeing|does not demonstrate|independent scientific validation/i);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await page.goto("#/examples/realignment-small");
    await expect(page.getByText(locale === "zh" ? "切换结果版本，比较初始比对与重比对结果。" : "Switch result versions to compare the initial and refined alignments.", { exact: true })).toBeVisible();
    if (testInfo.project.name === "chromium") {
      await expect(page.getByRole("status").filter({ hasText: /Calculating alignment quality statistics|正在.*统计/ })).toHaveCount(0);
      await page.screenshot({ path: testInfo.outputPath(`examples-${locale}-mobile.png`), fullPage: true });
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.goto("#/");
      await expect(page.getByRole("link", { name: locale === "zh" ? "下载示例输入" : "Download example input", exact: true })).toBeVisible();
      await page.screenshot({ path: testInfo.outputPath(`home-${locale}.png`), fullPage: true });
    }
  }
});
