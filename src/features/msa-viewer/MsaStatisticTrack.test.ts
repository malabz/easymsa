import { describe, expect, it } from "vitest";
import { trackValue } from "./MsaStatisticTrack";

const column = {
  position: 1,
  conservation: 0.8,
  gapFraction: 0.2,
  coverage: 0.8,
  entropy: 0.4,
  variation: 0.2,
  dominantBase: "A",
  consensusBase: "A",
  ambiguityConsensus: "A"
};

describe("trackValue", () => {
  it("reads each scientific track from the shared column model", () => {
    expect(trackValue(column, "conservation")).toBe(0.8);
    expect(trackValue(column, "gap")).toBe(0.2);
    expect(trackValue(column, "coverage")).toBe(0.8);
    expect(trackValue(column, "entropy")).toBe(0.4);
  });
});
