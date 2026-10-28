import { expect, test, type Page } from "@playwright/test";
import type { JobDetail, JobStatus } from "../src/lib/types/job";
import { prepareViewerPage } from "./helpers/viewer-fixtures";

const jobId = "regression-job";
const tokenA = "regression-key-a";
const tokenB = "regression-key-b";
const jobPath = (token: string) => `/job/${jobId}?token=${token}`;
const resultPath = (token: string) => `/results/${jobId}?token=${token}`;
const createdAt = "2026-10-28T08:00:00Z";

function job(status: JobStatus, token: string): JobDetail {
  return {
    jobId, jobName: `Regression task ${token === tokenA ? "A" : "B"}`, status,
    progress: status === "completed" ? 100 : 60,
    message: null, createdAt, updatedAt: createdAt, startedAt: createdAt,
    completedAt: status === "completed" ? createdAt : null,
    expiresAt: null, downloadUrl: null, algorithm: { name: "minipoa" },
    emailStatus: null, emailError: null, emailSentAt: null, failure: null,
    preprocess: {
      status: "completed", mode: "audit", strictness: "normal", errorCode: null, errorMessage: null,
      summaryCounts: { raw_sequence_count: 20, clean_sequence_count: 20, removed_sequence_count: 0 },
      qcCounts: {}, warningCounts: {}, removalCounts: {}, cleaningCounts: {}, dedupSummary: null,
      summaryUnavailable: false,
    },
  };
}

async function mockTasks(page: Page, initialA: JobStatus = "aligning", initialB: JobStatus = "aligning") {
  const state = { statusA: initialA, statusB: initialB, failStatus: false, failedRequests: 0 };
  await page.route("**/api/**", async route => {
    const url = new URL(route.request().url());
    const token = url.searchParams.get("token");
    const status = token === tokenB ? state.statusB : state.statusA;
    if (url.pathname === `/api/jobs/${jobId}` && [tokenA, tokenB].includes(token ?? "")) {
      if (state.failStatus) {
        state.failedRequests++;
        await route.fulfill({ status: 503, json: { error: { code: "HTTP_ERROR", message: "Temporary outage", details: null } } });
      } else await route.fulfill({ json: job(status, token!) });
    } else if (url.pathname === `/api/jobs/${jobId}/results/summary`) {
      await route.fulfill({ json: { jobId, algorithm: { name: "minipoa" }, summary: {
        preprocess: { mode: "audit", strictness: "normal", rawSequenceCount: 20, cleanSequenceCount: 20, removedSequenceCount: 0 },
        alignment: { sequenceCount: 20, alignmentLength: 512, averageIdentity: null, gapPercentage: 0 },
        outputFiles: [],
      } } });
    } else await route.abort();
  });
  return state;
}

async function navigateWithinApp(page: Page, path: string) {
  // Preserve React state and the query cache, as in a same-document history change.
  await page.evaluate(path => { window.location.hash = path; }, path);
}

test.beforeEach(async ({ page }) => {
  await prepareViewerPage(page);
});

for (const kind of ["job", "results"] as const) {
  test(`${kind} keeps its return link after an authenticated background refetch fails`, async ({ page }) => {
    const state = await mockTasks(page, kind === "results" ? "completed" : "aligning");
    const path = kind === "job" ? jobPath(tokenA) : resultPath(tokenA);
    await page.goto(`./#${path}`);
    const taskTitle = page.getByRole("heading", { name: "Regression task A", level: kind === "job" ? 2 : 1, exact: true });
    await expect(taskTitle).toBeVisible();
    await navigateWithinApp(page, "/about");
    const returnLink = page.locator("nav.work-return").getByRole("link", {
      name: kind === "job" ? "Back to job status" : "Back to results", exact: true,
    });
    await expect(returnLink).toBeVisible();
    await expect(returnLink).toHaveAttribute("href", `#${path}`);
    const refresh = page.waitForResponse(response => new URL(response.url()).pathname === `/api/jobs/${jobId}` && response.status() === 200);
    await returnLink.click();
    await (await refresh).finished();
    await expect(taskTitle).toBeVisible();

    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));

    state.failStatus = true;
    // Completed jobs do not poll. Trigger their normal focus-refresh handler.
    await page.evaluate(() => window.dispatchEvent(new Event("visibilitychange")));
    await expect(page.getByRole("alert").filter({ hasText: "The request could not be completed. Please try again." }).first())
      .toBeVisible({ timeout: 20_000 });
    expect(state.failedRequests).toBeGreaterThanOrEqual(4);
    await navigateWithinApp(page, "/about");
    await expect(returnLink).toBeVisible();
    await expect(returnLink).toHaveAttribute("href", `#${path}`);
  });
}

for (const otherStatus of ["aligning", "completed"] as const) {
  test(`switching task keys cancels the old countdown when the other task is ${otherStatus}`, async ({ page }) => {
    const state = await mockTasks(page, "aligning", otherStatus);
    // Prime B's cache so the token switch also covers immediately available data.
    await page.goto(`./#${jobPath(tokenB)}`);
    await expect(page.getByRole("heading", { name: "Regression task B", exact: true })).toBeVisible();
    await navigateWithinApp(page, jobPath(tokenA));
    await expect(page.getByRole("heading", { name: "Regression task A", exact: true })).toBeVisible();
    await expect(page.locator('.job-status-card[data-state="aligning"]')).toBeVisible();
    state.statusA = "completed";
    const countdown = page.getByRole("status").filter({ hasText: /Opening results in \d+ s/ });
    await expect(countdown).toBeVisible();
    await navigateWithinApp(page, jobPath(tokenB));
    await expect(page.getByRole("heading", { name: "Regression task B", exact: true })).toBeVisible();
    await expect(page.locator(`.job-status-card[data-state="${otherStatus}"]`)).toBeVisible();
    await expect(countdown).toHaveCount(0);
    // Observe beyond the original three-second countdown, not just the first render.
    await page.waitForTimeout(4_000);
    expect(new URL(page.url()).hash).toBe(`#${jobPath(tokenB)}`);
    await expect(countdown).toHaveCount(0);
  });
}

test("saved-task column labels retain readable text contrast and size", async ({ page }) => {
  await mockTasks(page);
  await page.addInitScript(({ jobId, token, createdAt }) => {
    localStorage.setItem("easymsa.jobAccess.v1", JSON.stringify([
      { app: "easymsa", version: 1, jobId, token, statusUrl: `/api/jobs/${jobId}?token=${token}`, createdAt },
    ]));
  }, { jobId, token: tokenA, createdAt });
  await page.goto("./#/lookup");
  const labels = page.locator(".lookup-column-labels");
  await expect(labels).toBeVisible();
  await expect(labels).toContainText("Last opened / created");
  const appearance = await labels.evaluate(element => {
    const style = getComputedStyle(element);
    const background = getComputedStyle(element.closest(".lookup-saved")!).backgroundColor;
    const luminance = (color: string) => {
      const [r, g, b] = color.match(/[\d.]+/g)!.slice(0, 3).map(Number).map(channel => {
        const value = channel / 255;
        return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const light = Math.max(luminance(style.color), luminance(background));
    const dark = Math.min(luminance(style.color), luminance(background));
    return { fontSize: parseFloat(style.fontSize), contrast: (light + 0.05) / (dark + 0.05) };
  });
  expect(appearance.fontSize).toBeGreaterThanOrEqual(12);
  expect(appearance.contrast).toBeGreaterThanOrEqual(4.5);
});
