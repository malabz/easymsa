import { describe, expect, it } from "vitest";
import { adaptServerSummary } from "./results";

describe("result summary adapter", () => {
  it("preserves preprocessing, alignment, and output artifact data", () => {
    expect(
      adaptServerSummary({
        jobId: "job-1",
        summary: {
          preprocess: {
            mode: "filter",
            strictness: "normal",
            rawSequenceCount: 12,
            cleanSequenceCount: 9,
            removedSequenceCount: 3
          },
          alignment: {
            sequenceCount: 9,
            alignmentLength: 120,
            gapPercentage: 4.25
          },
          outputFiles: ["preprocess/result.json", "output/alignment.fasta"]
        }
      })
    ).toEqual({
      jobId: "job-1",
      metrics: {
        sequenceCount: 9,
        alignmentLength: 120,
        averageIdentity: null,
        gapPercentage: 4.25
      },
      preprocess: {
        mode: "filter",
        strictness: "normal",
        rawSequenceCount: 12,
        cleanSequenceCount: 9,
        removedSequenceCount: 3
      },
      outputFiles: ["preprocess/result.json", "output/alignment.fasta"]
    });
  });

  it("uses null for unavailable counts and filters malformed file entries", () => {
    const result = adaptServerSummary({
      jobId: "job-2",
      summary: {
        alignment: { sequenceCount: null },
        outputFiles: ["output/summary.json", 42, null]
      }
    });

    expect(result.metrics).toEqual({
      sequenceCount: null,
      alignmentLength: null,
      averageIdentity: null,
      gapPercentage: null
    });
    expect(result.preprocess.rawSequenceCount).toBeNull();
    expect(result.outputFiles).toEqual(["output/summary.json"]);
  });
});
