import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { LanguageProvider } from "../../lib/i18n/LanguageProvider";
import type { JobDetail } from "../../lib/types/job";
import { JobWorkspace } from "./JobWorkspace";

const job: JobDetail = {
  jobId: "workspace-fixture", jobName: "DNA alignment", status: "aligning", progress: 60,
  message: null, createdAt: null, updatedAt: null, startedAt: null, completedAt: null,
  expiresAt: null, downloadUrl: null, algorithm: { name: "minipoa" },
  emailStatus: null, emailError: null, emailSentAt: null, failure: null,
  preprocess: { status: "completed", mode: "audit", strictness: "normal", errorCode: null, errorMessage: null,
    summaryCounts: { raw_sequence_count: 20, clean_sequence_count: 20, removed_sequence_count: 0, collapsed_duplicate_count: 0 },
    qcCounts: {}, warningCounts: {}, removalCounts: {}, cleaningCounts: {}, dedupSummary: null, summaryUnavailable: false },
};
function view(value = job) {
  return render(<LanguageProvider><MemoryRouter><JobWorkspace job={value} token="test-access"
    credentials={<p>Credential details</p>}
    recoveryActions={open => <button onClick={open}>Show credentials</button>} /></MemoryRouter></LanguageProvider>);
}
beforeEach(() => { localStorage.setItem("easymsa.locale", "en"); });
afterEach(() => { cleanup(); localStorage.removeItem("easymsa.locale"); });

describe("JobWorkspace", () => {
  it("shows progress, counts and stage timeline without exposing credentials", () => {
    view();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "60");
    expect(screen.getAllByText("20")).toHaveLength(2);
    expect(screen.queryByText("Credential details")).not.toBeInTheDocument();
    expect(document.querySelector('[aria-current="step"]')).toHaveTextContent("Aligning");
  });
  it("opens credentials from the sidebar and supports keyboard tab navigation", () => {
    view();
    fireEvent.click(screen.getByRole("button", { name: "Show credentials" }));
    expect(screen.getByText("Credential details")).toBeVisible();
    const credentials = screen.getByRole("tab", { name: "Job access" });
    expect(credentials).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(credentials, { key: "Home" });
    expect(screen.getByRole("tab", { name: "Run log" })).toHaveFocus();
    expect(screen.queryByText("Credential details")).not.toBeInTheDocument();
  });
  it("keeps result access for completed tasks and displays failure details", () => {
    const { unmount } = view({ ...job, status: "completed", progress: 100 });
    expect(screen.getByRole("link", { name: /View results/i })).toHaveAttribute("href", expect.stringContaining("/results/workspace-fixture"));
    unmount();
    view({ ...job, status: "failed", failure: { code: "FIXTURE_FAILURE", message: "Failed fixture", details: null } });
    expect(screen.getByRole("alert")).toHaveTextContent("Failed fixture");
    expect(screen.queryByRole("link", { name: /View results/i })).not.toBeInTheDocument();
  });
  it("does not turn unavailable preprocessing data into a clean QC result", () => {
    view({ ...job, preprocess: { ...job.preprocess, summaryCounts: null, summaryUnavailable: true } });
    fireEvent.click(screen.getByRole("tab", { name: "Preprocessing details" }));
    expect(screen.getByRole("tabpanel")).toHaveTextContent(/unavailable/i);
    expect(screen.queryByText(/No obvious QC warnings/i)).not.toBeInTheDocument();
  });
});
