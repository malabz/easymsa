import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createJobAccess, deleteJobAccess, readJobAccessRecords, resolveJobAccess, saveJobAccess } from "./tokens";

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe("saved job access preservation", () => {
  it("keeps more than 50 credentials and updates only the matching ID and key", () => {
    for (let index = 0; index < 75; index++) saveJobAccess(createJobAccess({ jobId: `job-${index}`, token: `key-${index}` }));
    const before = readJobAccessRecords();
    expect(before).toHaveLength(75);
    const access = before.find(record => record.jobId === "job-0")!;
    expect(saveJobAccess({ ...access, lastOpenedAt: "2026-10-22T10:00:00Z" })).toBe(true);
    expect(readJobAccessRecords()).toHaveLength(75);
    expect(readJobAccessRecords().filter(record => record.jobId !== "job-0")).toEqual(before.filter(record => record.jobId !== "job-0"));
    saveJobAccess(createJobAccess({ jobId: "job-0", token: "another-key" }));
    expect(readJobAccessRecords()).toHaveLength(76);
    expect(deleteJobAccess("job-0", "key-0")).toBe(true);
    expect(readJobAccessRecords().find(record => record.jobId === "job-0")?.token).toBe("another-key");
  });

  it("preserves all legacy records when adding a new credential", () => {
    const legacy = Object.fromEntries(Array.from({ length: 62 }, (_, index) => [`legacy-${index}`, `key-${index}`]));
    localStorage.setItem("easymsa.jobTokens", JSON.stringify(legacy));
    saveJobAccess(createJobAccess({ jobId: "new-job", token: "new-key" }));
    expect(readJobAccessRecords()).toHaveLength(63);
    for (const [jobId, token] of Object.entries(legacy)) expect(readJobAccessRecords()).toEqual(expect.arrayContaining([expect.objectContaining({ jobId, token })]));
  });

  it("does not persist an unverified recovery URL or choose between multiple saved keys", () => {
    expect(resolveJobAccess("unknown-job", "unverified")?.token).toBe("unverified");
    expect(readJobAccessRecords()).toHaveLength(0);
    saveJobAccess(createJobAccess({ jobId: "same-name", token: "one" }));
    saveJobAccess(createJobAccess({ jobId: "same-name", token: "two" }));
    expect(resolveJobAccess("same-name", null)).toBeNull();
  });

  it("reports failed writes without losing previously saved credentials", () => {
    const saved = createJobAccess({ jobId: "saved-job", token: "saved-key" });
    saveJobAccess(saved);
    const before = localStorage.getItem("easymsa.jobAccess.v1");
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("Full", "QuotaExceededError"); });
    expect(saveJobAccess(createJobAccess({ jobId: "new-job", token: "new-key" }))).toBe(false);
    expect(deleteJobAccess(saved.jobId, saved.token)).toBe(false);
    expect(localStorage.getItem("easymsa.jobAccess.v1")).toBe(before);
  });
});
