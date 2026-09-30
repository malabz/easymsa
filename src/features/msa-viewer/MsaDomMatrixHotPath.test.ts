import { describe, expect, it } from "vitest";
import { sortedPositionIndex } from "./MsaDomMatrix";

describe("MSA DOM matrix hot-path lookups", () => {
  it("finds exact filtered alignment positions with binary search", () => {
    const positions = [2, 5, 9, 12, 20];
    expect(sortedPositionIndex(positions, 2)).toBe(0);
    expect(sortedPositionIndex(positions, 9)).toBe(2);
    expect(sortedPositionIndex(positions, 20)).toBe(4);
    expect(sortedPositionIndex(positions, 8)).toBe(-1);
    expect(sortedPositionIndex([], 1)).toBe(-1);
  });
});
