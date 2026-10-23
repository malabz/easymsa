import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../lib/i18n/LanguageProvider";
import { createJobAccess, readJobAccessRecords, saveJobAccess } from "../lib/api/tokens";
import { EasyMsaApiError } from "../lib/api/client";
import { forgetWork, type WorkEntry } from "../lib/workspace";
import type { JobDetail } from "../lib/types/job";
import { JobStatusPage } from "./JobStatusPage";

const mocks = vi.hoisted(() => ({ query: {} as any, copy: vi.fn() }));
vi.mock("../lib/query/useJobStatus", () => ({ useJobStatus: () => mocks.query }));
vi.mock("../lib/utils/clipboard", () => ({ copyText: mocks.copy }));
const kinds: WorkEntry["kind"][] = ["submit", "realign", "viewer", "job", "result", "example"];
const job: JobDetail = {
  jobId: "verified-job", jobName: "DNA alignment", status: "aligning", progress: 60,
  message: null, createdAt: "2026-10-20T02:00:00Z", updatedAt: null, startedAt: null, completedAt: null,
  expiresAt: null, downloadUrl: null, algorithm: { name: "minipoa" },
  emailStatus: null, emailError: null, emailSentAt: null, failure: null,
  preprocess: { status: "completed", mode: "audit", strictness: "normal", errorCode: null, errorMessage: null,
    summaryCounts: { raw_sequence_count: 20, clean_sequence_count: 20, removed_sequence_count: 0, collapsed_duplicate_count: 0 },
    qcCounts: {}, warningCounts: {}, removalCounts: {}, cleaningCounts: {}, dedupSummary: null, summaryUnavailable: false },
};
function show(path = "/job/verified-job?token=test-access-key") {
  return render(<LanguageProvider><MemoryRouter initialEntries={[path]}><Routes><Route path="/job/:jobId" element={<JobStatusPage />} /></Routes></MemoryRouter></LanguageProvider>);
}
beforeEach(() => {
  localStorage.clear(); localStorage.setItem("easymsa.locale", "en"); vi.clearAllMocks(); kinds.forEach(forgetWork);
  mocks.copy.mockResolvedValue(undefined);
  mocks.query = { data: job, isSuccess: true, isFetching: false, error: null, refetch: vi.fn() };
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("job progress recovery controls", () => {
  it("saves authenticated access with last-opened time and does not expose keys by default", () => {
    show();
    expect(readJobAccessRecords()).toEqual([expect.objectContaining({ jobId: job.jobId, token: "test-access-key", createdAt: job.createdAt, lastOpenedAt: expect.any(String) })]);
    expect(screen.getByRole("button", { name: "Save recovery information" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Copy results link" })).not.toBeInTheDocument();
    expect(screen.queryByText("test-access-key")).not.toBeInTheDocument();
  });

  it("opens the recovery panel, keeps keys masked, and copies a working recovery link", async () => {
    show(); const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Save recovery information" }));
    const tab = screen.getByRole("tab", { name: "Save and recover job" });
    expect(tab).toHaveFocus(); expect(tab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("button", { name: "Download recovery file" })).toBeVisible();
    expect(screen.queryByText("test-access-key")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Copy results link" }));
    expect(mocks.copy).toHaveBeenCalledWith(expect.stringContaining("#/job/verified-job?token=test-access-key"));
    await user.click(screen.getByText("Job ID and access key"));
    await user.click(screen.getByRole("button", { name: "Show key" }));
    expect(screen.getByText("test-access-key")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Hide key" }));
    expect(screen.queryByText("test-access-key")).not.toBeInTheDocument();
  });

  it("shows copy failure near the controls while leaving recovery-file download available", async () => {
    mocks.copy.mockRejectedValue(new Error("clipboard denied")); show(); const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Save recovery information" }));
    await user.click(screen.getByRole("button", { name: "Copy results link" }));
    await waitFor(() => expect(screen.getAllByRole("alert").length).toBeGreaterThan(0));
    expect(screen.getByRole("button", { name: "Download recovery file" })).toBeEnabled();
  });

  it("downloads a recovery file for the authenticated task without changing other records", async () => {
    saveJobAccess(createJobAccess({ jobId: "another-job", token: "another-key" }));
    let exported: Blob | undefined;
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: vi.fn((blob: Blob) => { exported = blob; return "blob:task-recovery"; }) });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    show(); const user = userEvent.setup();
    const before = readJobAccessRecords();
    await user.click(screen.getByRole("button", { name: "Save recovery information" }));
    await user.click(screen.getByRole("button", { name: "Download recovery file" }));
    expect(click).toHaveBeenCalledOnce();
    expect(exported?.type).toBe("application/json");
    const json = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsText(exported!);
    });
    expect(JSON.parse(json)).toMatchObject({ app: "easymsa", version: 1, jobId: job.jobId, token: "test-access-key", createdAt: job.createdAt });
    expect(readJobAccessRecords()).toEqual(before);
  });

  it("does not store unverified, rejected, or mismatched task credentials", () => {
    mocks.query = { data: undefined, isSuccess: false, error: new EasyMsaApiError({ code: "INVALID_TOKEN", message: "internal denied" }), refetch: vi.fn() };
    const first = show();
    expect(readJobAccessRecords()).toEqual([]);
    expect(screen.getByRole("alert")).not.toHaveTextContent("internal denied");
    first.unmount();
    mocks.query = { data: { ...job, jobId: "different-job" }, isSuccess: true, refetch: vi.fn(), error: null };
    show();
    expect(readJobAccessRecords()).toEqual([]);
  });

  it("requires an explicit saved key choice for duplicate job names", () => {
    saveJobAccess(createJobAccess({ jobId: job.jobId, token: "first-saved-key" }));
    saveJobAccess(createJobAccess({ jobId: job.jobId, token: "second-saved-key" }));
    mocks.query = { data: undefined, isSuccess: false, error: null, refetch: vi.fn() };
    show("/job/verified-job");
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(screen.getAllByRole("button").length).toBeGreaterThanOrEqual(2);
    expect(readJobAccessRecords()).toHaveLength(2);
  });
});
