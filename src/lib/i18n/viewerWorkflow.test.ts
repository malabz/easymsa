import { describe, expect, it } from "vitest";
import { dictionary } from "./dictionary";

describe("viewer language consistency", () => {
  it("has no Chinese text in the English viewer controls", () => {
    expect(JSON.stringify(dictionary.en.results.viewer)).not.toMatch(/[\u3400-\u9fff]/);
    expect(JSON.stringify(dictionary.en.viewerWorkflow)).not.toMatch(/[\u3400-\u9fff]/);
  });
});
