import { describe, expect, it } from "vitest";
import { displayAlgorithmLabel } from "./algorithmNames";

const labels: Record<string, string> = {
  auto: "Auto",
  minipoa: "minipoa",
  mafft: "MAFFT",
  mafft_fast: "MAFFT fast",
  halign3: "HAlign3",
  fmalign2_mafft: "FMAlign2",
  fmalign2_halign3: "FMAlign2 + HAlign4"
};
const template = "Auto (actual: {value})";

describe("displayAlgorithmLabel", () => {
  it("shows resolved tool for auto jobs", () => {
    expect(displayAlgorithmLabel("auto", "halign3", labels, template)).toBe(
      "Auto (actual: HAlign3)"
    );
  });

  it("shows plain auto label when resolution is still pending", () => {
    expect(displayAlgorithmLabel("auto", null, labels, template)).toBe("Auto");
    expect(displayAlgorithmLabel("auto", undefined, labels, template)).toBe("Auto");
  });

  it("shows explicit algorithm names", () => {
    expect(displayAlgorithmLabel("mafft", undefined, labels, template)).toBe("MAFFT");
    expect(displayAlgorithmLabel("minipoa", "minipoa", labels, template)).toBe("minipoa");
  });

  it("shows auto-resolved minipoa with the template", () => {
    expect(displayAlgorithmLabel("auto", "minipoa", labels, template)).toBe(
      "Auto (actual: minipoa)"
    );
  });

  it("falls back to the raw name when no label exists", () => {
    expect(displayAlgorithmLabel("auto", "mystery_tool", labels, template)).toBe(
      "Auto (actual: mystery_tool)"
    );
  });
});
