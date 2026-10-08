import { describe, expect, it } from "vitest";
import { calculateMsaAnalysis } from "./analysis";
import { conservationBar, conservationScaleRange, formatConservation } from "./conservationDisplay";
import { createInitialViewerState, viewerReducer } from "./useViewerState";
import { viewerStateFromSnapshot, viewerStateToSnapshot } from "./useWorkspacePersistence";

describe("conservation display", () => {
  it("separates 100, 95 and 90 percent without changing their values", () => {
    expect([1, .95, .9].map(value => conservationBar(value, "high", 22).height)).toEqual([22, 17, 11]);
    expect([1, .95, .9].map(value => conservationBar(value, "full", 22).height)).toEqual([22, 21, 20]);
    expect(formatConservation(18 / 19)).toBe("94.7%");
    expect(conservationScaleRange("high")).toEqual({ min: .8, max: 1, label: "80–100%" });
    expect(conservationScaleRange("full").min).toBe(0);
  });

  it("distinguishes values below the range from the boundary and missing metrics", () => {
    expect(conservationBar(.8, "high", 22)).toMatchObject({ height: 2, belowRange: false });
    for (const value of [0, .25, .75, .799]) {
      expect(conservationBar(value, "high", 22)).toMatchObject({ height: 3, belowRange: true });
      expect(conservationBar(value, "full", 22).belowRange).toBe(false);
    }
    for (const value of [null, undefined, NaN]) {
      expect(conservationBar(value, "high", 22)).toEqual({ height: 0, opacity: 0, belowRange: false });
    }
  });

  it("leaves canonical metrics, gap and ambiguity handling unchanged", () => {
    const rows = Array.from({ length: 20 }, (_, i) => ({ id: `row-${i}`, sequence: `A${i < 19 ? "A" : "C"}${i < 15 ? "A" : "C"}-N` }));
    const analysis = calculateMsaAnalysis(rows, 5, { alphabet: "dna" });
    const original = structuredClone(analysis);
    expect(analysis.columns.map(column => column.conservation)).toEqual([1, .95, .75, null, null]);
    for (const column of analysis.columns) {
      conservationBar(column.conservation, "high", 22);
      conservationBar(column.conservation, "full", 22);
    }
    expect(analysis).toEqual(original);
  });

  it("persists explicit scale, defaults older workspaces and resets to high range", () => {
    const rows = [{ id: "row", rowKey: "row", sequence: "AC" }];
    const base = createInitialViewerState({ rows, storage: null, sourceFingerprint: "conservation-scale" });
    expect(base.conservationScale).toBe("high");
    const snapshot = viewerStateToSnapshot({ ...base, conservationScale: "full" }, { fingerprint: "conservation-scale", sequenceCount: 1, alignmentLength: 2 });
    expect(viewerStateFromSnapshot(base, snapshot, ["row"]).conservationScale).toBe("full");
    delete snapshot.view.conservationScale;
    expect(viewerStateFromSnapshot(base, snapshot, ["row"]).conservationScale).toBe("high");
    expect(viewerReducer({ ...base, conservationScale: "full" }, { type: "resetView" }).conservationScale).toBe("high");
  });
});
