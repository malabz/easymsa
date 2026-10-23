import { describe, expect, it } from "vitest";
import { continuationEntry, workspaceReturn } from "./workReturn";

describe("work navigation context", () => {
  it("returns a result to the same job rather than a recent unrelated job", () => {
    expect(workspaceReturn("/results/current", "?token=test-key&tab=downloads&stage=initial", [
      { kind: "job", path: "/job/other?token=other-test-key" },
    ])).toEqual({ path: "/job/current?token=test-key", label: "job" });
  });
  it("does not substitute another token for a same-named job", () => {
    expect(workspaceReturn("/results/current", "?token=test-key", [
      { kind: "job", path: "/job/current?token=other-test-key" },
    ])).toEqual({ path: "/job/current?token=test-key", label: "job" });
  });
  it("uses stable parents for examples and progress pages", () => {
    expect(workspaceReturn("/examples/alignment-small", "?stage=initial", [])).toEqual({ path: "/examples", label: "examplesBack" });
    expect(workspaceReturn("/job/current", "", [])).toEqual({ path: "/lookup", label: "jobs" });
  });
  it("offers only the newest different work entry", () => {
    expect(continuationEntry("/submit", [
      { kind: "submit", path: "/submit" }, { kind: "example", path: "/examples/alignment-small?stage=initial" }, { kind: "viewer", path: "/viewer" },
    ])?.kind).toBe("example");
  });
});
