import { describe, expect, it } from "vitest";
import {
  DEFAULT_ALGORITHM_PARAMETER_DRAFT,
  validateAlgorithmParameters
} from "./algorithmParameters";

describe("validateAlgorithmParameters", () => {
  it("omits parameters when server defaults are selected", () => {
    expect(
      validateAlgorithmParameters(
        "auto",
        DEFAULT_ALGORITHM_PARAMETER_DRAFT,
        8
      )
    ).toEqual({ valid: true, params: undefined });
  });

  it("builds MiniPOA and MAFFT parameters", () => {
    expect(
      validateAlgorithmParameters(
        "minipoa",
        { ...DEFAULT_ALGORITHM_PARAMETER_DRAFT, thread: "4" },
        8
      )
    ).toEqual({ valid: true, params: { thread: 4 } });

    expect(
      validateAlgorithmParameters(
        "mafft",
        {
          thread: "6",
          mafftMode: "localpair",
          mafftMaxiterate: "1000",
          mafftReorder: true
        },
        8
      )
    ).toEqual({
      valid: true,
      params: {
        thread: 6,
        mode: "localpair",
        maxiterate: 1000,
        reorder: true
      }
    });
  });

  it("rejects invalid integers and configured thread limits", () => {
    expect(
      validateAlgorithmParameters(
        "auto",
        { ...DEFAULT_ALGORITHM_PARAMETER_DRAFT, thread: "1.5" },
        8
      )
    ).toEqual({ valid: false, field: "thread", error: "threadInteger" });
    expect(
      validateAlgorithmParameters(
        "auto",
        { ...DEFAULT_ALGORITHM_PARAMETER_DRAFT, thread: "9" },
        8
      )
    ).toEqual({ valid: false, field: "thread", error: "threadRange" });
    expect(
      validateAlgorithmParameters(
        "mafft",
        {
          ...DEFAULT_ALGORITHM_PARAMETER_DRAFT,
          mafftMaxiterate: "1001"
        },
        8
      )
    ).toEqual({
      valid: false,
      field: "mafftMaxiterate",
      error: "maxiterateRange"
    });
  });
});
