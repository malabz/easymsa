import { describe, expect, it } from "vitest";
import { resolveRouteKey } from "./routePreload";

describe("route preloading map", () => {
  it("resolves primary navigation and sub-routes to their lazy loader keys", () => {
    expect(resolveRouteKey("/")).toBeNull();
    expect(resolveRouteKey("/submit")).toBe("submit");
    expect(resolveRouteKey("/realign")).toBe("realign");
    expect(resolveRouteKey("/viewer")).toBe("viewer");
    expect(resolveRouteKey("/lookup")).toBe("lookup");
    expect(resolveRouteKey("/benchmark")).toBe("benchmark");
    expect(resolveRouteKey("/benchmark/submit")).toBe("benchmarkSubmit");
    expect(resolveRouteKey("/benchmark/recent")).toBe("benchmarkMine");
    expect(resolveRouteKey("/benchmark/datasets/rna_255")).toBe("benchmarkDataset");
    expect(resolveRouteKey("/docs?section=metrics&article=column-metrics")).toBe("docs");
    expect(resolveRouteKey("/about")).toBe("about");
    expect(resolveRouteKey("/examples/alignment-small")).toBe("examples");
    expect(resolveRouteKey("/license")).toBe("license");
    expect(resolveRouteKey("/privacy")).toBe("privacy");
  });
});
