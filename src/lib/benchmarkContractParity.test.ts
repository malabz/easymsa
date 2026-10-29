import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { compatibleBatches, parseSnapshot } from "../features/benchmark/model";

// Byte-identical to the evaluator's tests/fixtures/public-snapshots.json.
// This is deliberately outside public/ and only imported by tests.
const corpus = JSON.parse(readFileSync("contracts/benchmark-public-conformance.json", "utf8")) as {
  fixture_only: true;
  cases: Array<{ id: string; valid: boolean; snapshot: unknown }>;
};

describe("public Benchmark cross-language conformance", () => {
  it("keeps the shared corpus explicitly test-only and case IDs unique", () => {
    expect(corpus.fixture_only).toBe(true);
    expect(new Set(corpus.cases.map(c => c.id)).size).toBe(corpus.cases.length);
  });

  it.each(corpus.cases)("$id", entry => {
    if (entry.valid) expect(() => parseSnapshot(entry.snapshot)).not.toThrow();
    else expect(() => parseSnapshot(entry.snapshot)).toThrow();
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])("rejects nonfinite metrics: %s", value => {
    const snapshot = parseSnapshot(structuredClone(corpus.cases.find(c => c.id === "valid-complete")!.snapshot));
    snapshot.batches[0].results[0].metrics.wall_seconds.mean = value;
    expect(() => parseSnapshot(snapshot)).toThrow();
  });

  it("selects the newest batch by actual time across timezone offsets", () => {
    const snapshot = parseSnapshot(structuredClone(corpus.cases.find(c => c.id === "valid-complete")!.snapshot));
    const older = snapshot.batches[0];
    older.id = "older";
    older.created_at = "2026-10-27T12:00:00+08:00";
    const newer = structuredClone(older);
    newer.id = "newer";
    newer.created_at = "2026-10-27T08:00:00Z";
    snapshot.batches = [older, newer];
    expect(compatibleBatches(snapshot).map(b => b.id)).toEqual(["newer", "older"]);
  });
});
