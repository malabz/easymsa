import { describe, expect, it } from "vitest";
import { createMsaAnalysisCacheKey } from "./useMsaAnalysis";

const BASE = {
  sourceFingerprint: "sha256:alignment",
  alignmentLength: 4,
  alphabet: "dna" as const,
  scope: "visible" as const,
  scopeRowKeys: ["row:1", "row:2"],
  referenceRowKey: "row:1",
  overviewBinCount: 512
};

describe("MSA analysis cache identity", () => {
  it("is independent of array identity when fingerprint and row order agree", () => {
    expect(createMsaAnalysisCacheKey(BASE)).toBe(createMsaAnalysisCacheKey({
      ...BASE,
      scopeRowKeys: [...BASE.scopeRowKeys]
    }));
  });

  it("changes for scope row order, source fingerprint, or reference", () => {
    const key = createMsaAnalysisCacheKey(BASE);
    expect(createMsaAnalysisCacheKey({
      ...BASE,
      scopeRowKeys: ["row:2", "row:1"]
    })).not.toBe(key);
    expect(createMsaAnalysisCacheKey({
      ...BASE,
      sourceFingerprint: "sha256:other"
    })).not.toBe(key);
    expect(createMsaAnalysisCacheKey({
      ...BASE,
      referenceRowKey: null
    })).not.toBe(key);
  });
});
