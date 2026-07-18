import { describe, expect, it } from "vitest";
import { calculateConservationColumns } from "./conservation";

describe("calculateConservationColumns", () => {
  it("calculates dominant bases, conservation, and gaps", () => {
    const columns = calculateConservationColumns(
      [
        { sequence: "AC-" },
        { sequence: "AT-" },
        { sequence: "ACG" }
      ],
      3
    );

    expect(columns[0]).toMatchObject({
      dominantBase: "A",
      conservation: 1,
      gapFraction: 0
    });
    expect(columns[1].dominantBase).toBe("C");
    expect(columns[1].conservation).toBeCloseTo(2 / 3);
    expect(columns[2].gapFraction).toBeCloseTo(2 / 3);
  });
});
