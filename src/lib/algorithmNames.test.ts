import { describe, expect, it } from "vitest";
import { displayAlgorithmLabel } from "./algorithmNames";
import { dictionary } from "./i18n/dictionary";

const labels: Record<string, string> = {
  auto: "Auto",
  minipoa: "MiniPOA",
  mafft: "MAFFT",
  mafft_fast: "MAFFT (fast)",
  halign3: "HAlign-5",
  fmalign2_mafft: "FMAlign2 + MAFFT",
  fmalign2_halign3: "FMAlign2 + HAlign"
};
const template = "Auto · actual method: {value}";

describe("displayAlgorithmLabel", () => {
  it("shows resolved tool for auto jobs", () => {
    expect(displayAlgorithmLabel("auto", "halign3", labels, template)).toBe(
      "Auto · actual method: HAlign-5"
    );
  });

  it("shows plain auto label when resolution is still pending", () => {
    expect(displayAlgorithmLabel("auto", null, labels, template)).toBe("Auto");
    expect(displayAlgorithmLabel("auto", undefined, labels, template)).toBe("Auto");
  });

  it("shows explicit algorithm names", () => {
    expect(displayAlgorithmLabel("mafft", undefined, labels, template)).toBe("MAFFT");
    expect(displayAlgorithmLabel("minipoa", "minipoa", labels, template)).toBe("MiniPOA");
  });

  it("shows auto-resolved minipoa with the template", () => {
    expect(displayAlgorithmLabel("auto", "minipoa", labels, template)).toBe(
      "Auto · actual method: MiniPOA"
    );
  });

  it("falls back to the raw name when no label exists", () => {
    expect(displayAlgorithmLabel("auto", "mystery_tool", labels, template)).toBe(
      "Auto · actual method: mystery_tool"
    );
  });

  it("retains the resolved execution method if it differs from the request", () => {
    expect(displayAlgorithmLabel("fmalign2_mafft", "mafft_fast", labels, template)).toBe("MAFFT (fast)");
  });

  it.each([
    ["zh", "Auto · 实际执行：MiniPOA"],
    ["en", "Auto · actual method: MiniPOA"]
  ] as const)("uses neutral execution wording in %s without inferring how the method was chosen", (locale, expected) => {
    const common = dictionary[locale].common;
    expect(displayAlgorithmLabel("auto", "minipoa", common.algorithmNames, common.algorithmAutoResolved)).toBe(expected);
  });
});
