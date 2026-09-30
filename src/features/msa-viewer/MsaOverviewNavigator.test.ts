import { describe, expect, it } from "vitest";
import { overviewViewport } from "./MsaOverviewNavigator";

describe("overviewViewport", () => {
  it("maps the scrolled matrix viewport into overview coordinates", () => {
    expect(
      overviewViewport({
        alignmentLength: 1_000,
        startPosition: 401,
        endPosition: 600,
        width: 500
      })
    ).toEqual({ x: 200, width: 100 });
  });

  it("keeps a filtered viewport anchored to original alignment coordinates", () => {
    expect(
      overviewViewport({
        alignmentLength: 10_000,
        startPosition: 2,
        endPosition: 9_000,
        width: 1_000
      })
    ).toEqual({ x: 0.1, width: 899.9 });
  });
});
