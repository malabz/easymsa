import { describe, expect, it } from "vitest";
import { toFormData } from "./jobs";

describe("toFormData", () => {
  it("serializes user-selected algorithm parameters", () => {
    const formData = toFormData({
      jobName: "parameter-test",
      inputMethod: "paste",
      pastedSequence: ">a\nACGT\n>b\nACGA",
      language: "en",
      algorithm: "mafft",
      algorithmParams: {
        thread: 4,
        mode: "localpair",
        maxiterate: 500,
        reorder: true
      },
      preprocessMode: "audit"
    });

    expect(formData.get("algorithm")).toBe("mafft");
    expect(JSON.parse(String(formData.get("algorithm_params")))).toEqual({
      thread: 4,
      mode: "localpair",
      maxiterate: 500,
      reorder: true
    });
  });

  it("omits algorithm_params when all server defaults are used", () => {
    const formData = toFormData({
      jobName: "default-test",
      inputMethod: "paste",
      pastedSequence: ">a\nACGT\n>b\nACGA",
      language: "en",
      algorithm: "auto"
    });

    expect(formData.has("algorithm_params")).toBe(false);
  });
});
