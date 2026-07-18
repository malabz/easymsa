import { describe, expect, it } from "vitest";
import { createInitialViewerState, viewerReducer } from "./useViewerState";

describe("viewerReducer", () => {
  it("manages tracks, ranges, and pinned rows without mutating sets", () => {
    const initial = createInitialViewerState("test");
    const withTrack = viewerReducer(initial, {
      type: "toggleTrack",
      track: "entropy"
    });
    const pinned = viewerReducer(withTrack, {
      type: "toggleSequenceSet",
      field: "pinnedSequenceIds",
      sequenceId: "seq1"
    });
    const selected = viewerReducer(pinned, {
      type: "select",
      selection: { sequenceId: "seq1", position: 4 },
      range: { start: 2, end: 4 }
    });

    expect(withTrack.activeTracks).toContain("entropy");
    expect(initial.pinnedSequenceIds.size).toBe(0);
    expect(pinned.pinnedSequenceIds.has("seq1")).toBe(true);
    expect(selected.selectedRange).toEqual({ start: 2, end: 4 });
  });
});
