import { describe, expect, it } from "vitest";
import { overviewViewport } from "./MsaOverviewNavigator";

describe("overviewViewport", () => {
  it("maps the scrolled matrix viewport into overview coordinates", () => {
    expect(
      overviewViewport({
        clientWidth: 200,
        scrollLeft: 400,
        scrollWidth: 1000,
        width: 500
      })
    ).toEqual({ x: 200, width: 100 });
  });
});
