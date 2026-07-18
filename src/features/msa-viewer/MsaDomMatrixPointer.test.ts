import { describe, expect, it } from "vitest";
import { domPointerColumnPosition } from "./MsaDomMatrix";

describe("domPointerColumnPosition", () => {
  const positions = [1, 2, 4, 7];

  it("maps captured pointer movement to filtered alignment columns", () => {
    expect(
      domPointerColumnPosition({
        clientX: 151,
        containerLeft: 100,
        pitch: 22,
        visiblePositions: positions
      })
    ).toBe(4);
  });

  it("clamps pointer movement beyond the rendered sequence row", () => {
    expect(
      domPointerColumnPosition({
        clientX: 10,
        containerLeft: 100,
        pitch: 22,
        visiblePositions: positions
      })
    ).toBe(1);
    expect(
      domPointerColumnPosition({
        clientX: 1_000,
        containerLeft: 100,
        pitch: 22,
        visiblePositions: positions
      })
    ).toBe(7);
  });
});
