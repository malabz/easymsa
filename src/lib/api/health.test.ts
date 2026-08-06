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
      { queueName: "msa", queueLength: 3 },
      { resolvedMaxThreadPerJob: 8 }
    );

    expect(health.status).toBe("ready");
    expect(health.acceptingJobs).toBe(true);
    expect(health.queueLength).toBe(3);
    expect(health.algorithms.mafft).toBe(false);
    expect(health.maxThreadPerJob).toBe(8);
  });

  it("passes through availability for all exposed methods", () => {
    const health = deriveServiceHealth(
      { status: "ok" },
      {
        easymsaPrep: { available: true },
        algorithms: {
          auto: true,
          minipoa: true,
          mafft: true,
          halign3: false,
          fmalign2_mafft: true,
          fmalign2_halign3: false
        }
      },
      {}
    );

    expect(health.algorithms.halign3).toBe(false);
    expect(health.algorithms.fmalign2_mafft).toBe(true);
    expect(health.algorithms.fmalign2_halign3).toBe(false);
  });

  it("marks missing preprocessing support as degraded", () => {
    const health = deriveServiceHealth(
      { status: "ok" },
      { easymsaPrep: { available: false }, algorithms: { auto: true } },
      {}
    );

    expect(health.status).toBe("degraded");
    expect(health.acceptingJobs).toBe(false);
    expect(health.maxThreadPerJob).toBeNull();
  });
});
