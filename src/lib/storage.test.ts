import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import {
  browserStorage,
  clearOwnStorage,
  TASK_STORAGE_KEYS,
  VIEWER_STORAGE_KEYS,
} from "./storage";
import { createJobAccess, saveJobAccess } from "./api/tokens";
describe("selective EasyMSA storage", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());
  it("clears current and legacy task keys only", () => {
    [
      ...TASK_STORAGE_KEYS,
      ...VIEWER_STORAGE_KEYS,
      "easymsa.locale",
      "another.site",
    ].forEach((k) => localStorage.setItem(k, "keep"));
    expect(clearOwnStorage(TASK_STORAGE_KEYS)).toBe(true);
    TASK_STORAGE_KEYS.forEach((k) =>
      expect(localStorage.getItem(k)).toBeNull(),
    );
    [...VIEWER_STORAGE_KEYS, "easymsa.locale", "another.site"].forEach((k) =>
      expect(localStorage.getItem(k)).toBe("keep"),
    );
  });
  it("clears workspaces without deleting task access", () => {
    [...TASK_STORAGE_KEYS, ...VIEWER_STORAGE_KEYS].forEach((k) =>
      localStorage.setItem(k, "keep"),
    );
    clearOwnStorage(VIEWER_STORAGE_KEYS);
    VIEWER_STORAGE_KEYS.forEach((k) =>
      expect(localStorage.getItem(k)).toBeNull(),
    );
    TASK_STORAGE_KEYS.forEach((k) =>
      expect(localStorage.getItem(k)).toBe("keep"),
    );
  });
  it("denied storage does not throw after a successful job submission", () => {
    vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
      throw new DOMException("Denied", "SecurityError");
    });
    expect(browserStorage()).toBeNull();
    expect(clearOwnStorage(TASK_STORAGE_KEYS)).toBe(false);
    expect(() =>
      saveJobAccess(createJobAccess({ jobId: "test", token: "test-only" })),
    ).not.toThrow();
  });
  it("quota failures signal a visible warning without throwing", () => {
    const event = vi.fn();
    window.addEventListener("easymsa-storage-unavailable", event);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Full", "QuotaExceededError");
    });
    expect(() =>
      saveJobAccess(createJobAccess({ jobId: "test", token: "test-only" })),
    ).not.toThrow();
    expect(event).toHaveBeenCalledOnce();
    window.removeEventListener("easymsa-storage-unavailable", event);
  });
});
