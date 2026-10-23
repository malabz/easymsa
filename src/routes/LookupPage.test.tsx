import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, renderHook, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { strFromU8, unzipSync } from "fflate";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../lib/i18n/LanguageProvider";
import { createJobAccess, readJobAccessRecords, saveJobAccess, type JobAccess } from "../lib/api/tokens";
import { forgetWork, useRememberWork, useWorkEntries, type WorkEntry } from "../lib/workspace";
import { LookupPage } from "./LookupPage";

const mocks = vi.hoisted(() => ({ navigate: vi.fn() }));
vi.mock("react-router-dom", async () => ({ ...await vi.importActual("react-router-dom"), useNavigate: () => mocks.navigate }));
const kinds: WorkEntry["kind"][] = ["submit", "realign", "viewer", "job", "result", "example"];
function makeRecords(count: number) {
  return Array.from({ length: count }, (_, index) => createJobAccess({
    jobId: `job-${String(index + 1).padStart(3, "0")}`, token: `key-${index + 1}`,
    createdAt: new Date(Date.UTC(2026, 9, 1, 0, index)).toISOString(),
  }));
}
function seed(records: JobAccess[]) { localStorage.setItem("easymsa.jobAccess.v1", JSON.stringify(records)); }
function show() { return render(<MemoryRouter><LanguageProvider><LookupPage /></LanguageProvider></MemoryRouter>); }
function Remember({ kind }: { kind: WorkEntry["kind"] }) { useRememberWork(kind); return null; }
function remember(kind: WorkEntry["kind"], path: string) {
  const view = render(<MemoryRouter initialEntries={[path]}><Remember kind={kind} /></MemoryRouter>); view.unmount();
}
function blobBytes(blob: Blob): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = reject;
    reader.readAsArrayBuffer(blob);
  });
}
beforeEach(() => { localStorage.clear(); localStorage.setItem("easymsa.locale", "en"); vi.clearAllMocks(); kinds.forEach(forgetWork); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("saved task recovery", () => {
  it("paginates all saved tasks, filters the whole collection, and resets the page", async () => {
    seed(makeRecords(61)); show(); const user = userEvent.setup();
    expect(within(screen.getByRole("list")).getAllByRole("listitem")).toHaveLength(50);
    expect(screen.getByText("job-061")).toBeVisible();
    expect(screen.queryByText("job-001")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(within(screen.getByRole("list")).getAllByRole("listitem")).toHaveLength(11);
    expect(screen.getByText("job-001")).toBeVisible();
    await user.type(screen.getByRole("searchbox", { name: "Find saved jobs" }), "JOB-060");
    expect(screen.getByRole("listitem")).toHaveTextContent("job-060");
    expect(screen.queryByRole("navigation", { name: "Job list pages" })).not.toBeInTheDocument();
    await user.clear(screen.getByRole("searchbox", { name: "Find saved jobs" }));
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
    expect(screen.getByText("job-061")).toBeVisible();
    expect(readJobAccessRecords()).toHaveLength(61);
  });

  it("orders by recent access and updates after records change in this tab or another tab", () => {
    const records = makeRecords(2); records[0].lastOpenedAt = "2026-10-22T10:00:00Z"; seed(records); show();
    expect(screen.getAllByRole("listitem")[0]).toHaveTextContent("job-001");
    const added = createJobAccess({ jobId: "new-task", token: "new-key", createdAt: "2026-10-22T11:00:00Z" });
    act(() => { saveJobAccess(added); });
    expect(screen.getAllByRole("listitem")[0]).toHaveTextContent("new-task");
    seed([records[1]]);
    act(() => { window.dispatchEvent(new StorageEvent("storage", { key: "easymsa.jobAccess.v1" })); });
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.queryByText("new-task")).not.toBeInTheDocument();
  });

  it("undo restores the exact credential and work entry while preserving other work", async () => {
    const records = makeRecords(2); seed(records);
    remember("submit", "/submit"); remember("viewer", "/viewer");
    remember("result", "/results/job-001?token=key-1&stage=refined");
    const work = renderHook(useWorkEntries); const before = work.result.current;
    show(); const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Remove record: job-001" }));
    expect(readJobAccessRecords()).toEqual([records[1]]);
    expect(work.result.current).toEqual(before.filter(entry => entry.kind !== "result"));
    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(readJobAccessRecords()).toEqual(expect.arrayContaining(records));
    expect(work.result.current).toEqual(expect.arrayContaining(before));
    expect(screen.queryByText("Local record removed.")).not.toBeInTheDocument();
  });

  it("keeps credentials and work entries when removal cannot be saved", async () => {
    seed(makeRecords(1)); remember("result", "/results/job-001?token=key-1");
    const work = renderHook(useWorkEntries); const before = work.result.current;
    show();
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("Denied", "SecurityError"); });
    await userEvent.setup().click(screen.getByRole("button", { name: "Remove record: job-001" }));
    expect(readJobAccessRecords()).toHaveLength(1);
    expect(work.result.current).toEqual(before);
    expect(screen.queryByRole("button", { name: "Undo" })).not.toBeInTheDocument();
  });

  it("keeps undo available and does not restore work if credential restoration fails", async () => {
    seed(makeRecords(1)); remember("result", "/results/job-001?token=key-1");
    const work = renderHook(useWorkEntries); show(); const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Remove record: job-001" }));
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("Full", "QuotaExceededError"); });
    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(readJobAccessRecords()).toEqual([]);
    expect(work.result.current).toEqual([]);
    expect(screen.getByRole("button", { name: "Undo" })).toBeVisible();
  });

  it("exports every saved record including filtered and paginated entries", async () => {
    const records = makeRecords(61); seed(records); show(); const user = userEvent.setup();
    let exported: Blob | undefined;
    const createURL = vi.fn((blob: Blob) => { exported = blob; return "blob:recovery-export"; });
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: createURL });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    await user.type(screen.getByRole("searchbox", { name: "Find saved jobs" }), "job-001");
    await user.click(screen.getByRole("button", { name: "Export recovery files" }));
    expect(click).toHaveBeenCalledOnce(); expect(exported?.type).toBe("application/zip");
    const files = unzipSync(await blobBytes(exported!));
    expect(Object.keys(files)).toHaveLength(61);
    const actual = Object.values(files).map(bytes => JSON.parse(strFromU8(bytes)) as JobAccess);
    expect(actual).toEqual(expect.arrayContaining(records));
    expect(readJobAccessRecords()).toEqual(records);
  });

  it("manual recovery does not save an unverified key and invalid input gets focus", async () => {
    show(); const user = userEvent.setup();
    const form = screen.getByRole("form", { name: "Manual restore" });
    fireEvent.submit(form);
    expect(screen.getByLabelText("Job ID")).toHaveFocus();
    await user.type(screen.getByLabelText("Job ID"), "unverified-job");
    const key = form.querySelector<HTMLInputElement>('input[type="password"]')!;
    await user.type(key, "unverified-key");
    fireEvent.submit(form);
    expect(mocks.navigate).toHaveBeenCalledWith("/job/unverified-job?token=unverified-key");
    expect(readJobAccessRecords()).toEqual([]);
  });
});
