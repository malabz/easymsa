import { describe, expect, it } from "vitest";
import { deriveServiceHealth } from "./health";

describe("deriveServiceHealth", () => {
  it("marks a healthy toolchain ready and preserves queue information", () => {
    const health = deriveServiceHealth(
      { status: "ok", service: "easymsa" },
      {
        easymsaPrep: { available: true },
        algorithms: { auto: true, minipoa: true, mafft: false }
      },
      { queueName: "msa", queueLength: 3 }
    );

    expect(health.status).toBe("ready");
    expect(health.acceptingJobs).toBe(true);
    expect(health.queueLength).toBe(3);
    expect(health.algorithms.mafft).toBe(false);
  });

  it("marks missing preprocessing support as degraded", () => {
    const health = deriveServiceHealth(
      { status: "ok" },
      { easymsaPrep: { available: false }, algorithms: { auto: true } },
      {}
    );

    expect(health.status).toBe("degraded");
    expect(health.acceptingJobs).toBe(false);
  });
});
