import { describe, expect, it } from "vitest";
import { jobError } from "./jobErrors";
describe("reliability errors", () => {
  it("explains integrity failure and interruption in both languages", () => {
    for (const code of ["ALIGNMENT_OUTPUT_INVALID", "WORKER_INTERRUPTED", "WORKER_LOST", "ALGORITHM_NOT_SUPPORTED"]) {
      expect(jobError("zh", code, "fallback")).not.toBe("fallback");
      expect(jobError("en", code, "fallback")).not.toBe("fallback");
    }
  });
  it("keeps existing server messages for other failures", () => {
    expect(jobError("en", "UNKNOWN", "original")).toBe("original");
  });
});
