import { describe, expect, it } from "vitest";
import { jobValue, jobMessage } from "./jobPresentation";
import { formatDateTime } from "./utils/format";
import { adaptServerAlignment } from "./api/results";

describe("task display and full sequence headers", () => {
  it("formats known statuses without exposing implementation values", () => {
    expect(jobValue("not_applicable", "en")).toBe("No preprocessing needed");
    expect(jobValue("audit", "zh")).toBe("检查模式");
    expect(jobMessage("Job completed.", "zh")).toBe("任务已完成。");
    expect(jobMessage("unrecognised backend detail", "en")).toBeNull();
  });
  it("uses the selected website locale for dates", () => {
    const date = "2026-10-19T04:00:00Z";
    expect(formatDateTime(date, "en")).toContain("Oct");
    expect(formatDateTime(date, "zh")).toContain("2026");
    expect(formatDateTime(date, "en")).not.toContain("年");
    expect(formatDateTime("invalid", "en")).toBe("—");
  });
  it("accepts old API payloads and uses complete headers in new results", async () => {
    const payload = { jobId: "fixture", truncated: false, sequenceCount: 2, alignmentLength: 2,
      sequences: [{ id: "a", header: "a descriptive title", sequence: "AC" }, { id: "b", sequence: "AG" }] };
    const result = await adaptServerAlignment(payload);
    expect(result.sequences.map(r => r.id)).toEqual(["a descriptive title", "b"]);
    expect(new Set(result.sequences.map(r => r.rowKey)).size).toBe(2);
  });
});
