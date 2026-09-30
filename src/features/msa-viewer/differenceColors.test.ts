import { describe, expect, it } from "vitest";
import type { DifferenceKind } from "./types";
import { differenceColorClass, differenceColorStyle } from "./differenceColors";

describe("difference visual encodings", () => {
  it("defines every nucleotide-v2 difference kind", () => {
    const kinds: DifferenceKind[] = [
      "match",
      "compatibleAmbiguity",
      "substitution",
      "insertion",
      "deletion",
      "empty",
      "unknown"
    ];

    for (const kind of kinds) {
      expect(differenceColorStyle(kind)).toEqual(
        expect.objectContaining({
          background: expect.any(String),
          text: expect.any(String),
          border: expect.any(String)
        })
      );
      expect(differenceColorClass(kind)).toEqual(expect.any(String));
    }
  });

  it("uses a non-color border cue for ambiguity and unknown cells", () => {
    expect(differenceColorClass("compatibleAmbiguity")).toContain("border-dashed");
    expect(differenceColorClass("unknown")).toContain("border-dotted");
  });
});
