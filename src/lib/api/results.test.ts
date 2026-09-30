import { describe, expect, it } from "vitest";
import {
  adaptServerAlignment,
  adaptServerSummary,
  ServerAlignmentPayloadError
} from "./results";

describe("result summary adapter", () => {
  it("preserves preprocessing, alignment, and output artifact data", () => {
    expect(
      adaptServerSummary({
        jobId: "job-1",
        algorithm: {
          name: "auto",
          resolvedName: "mafft_fast"
        },
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
      algorithm: {
        name: "auto",
        resolvedName: "mafft_fast"
      },
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
    expect(result.algorithm).toEqual({ name: null, resolvedName: null });
    expect(result.outputFiles).toEqual(["output/summary.json"]);
  });
});

describe("alignment preview adapter", () => {
  it("assigns stable row keys without using duplicate headers as identity", async () => {
    const result = await adaptServerAlignment({
      jobId: "job-duplicates",
      truncated: false,
      sequenceCount: 2,
      alignmentLength: 4,
      sequences: [
        { id: "same", sequence: "acg." },
        { id: "same", sequence: "ACGT" }
      ]
    });

    expect(result.consensus).toBeUndefined();
    expect(result.sequences.map((row) => row.id)).toEqual(["same", "same"]);
    expect(result.sequences.map((row) => row.sequence)).toEqual(["ACG-", "ACGT"]);
    expect(result.sequences[0].rowKey).not.toBe(result.sequences[1].rowKey);
    expect(result.sequences.map((row) => row.originalIndex)).toEqual([0, 1]);
    expect(result.descriptor).toMatchObject({
      sourceKind: "job",
      sourceName: "job-duplicates",
      alignmentMode: "aligned",
      sequenceCount: 2,
      alignmentLength: 4,
      declaredDimensions: { sequenceCount: 2, alignmentLength: 4 },
      observedDimensions: { sequenceCount: 2, alignmentLength: 4 }
    });
  });

  it("uses observed dimensions and records a stable mismatch warning", async () => {
    const result = await adaptServerAlignment({
      jobId: "job-mismatch",
      truncated: false,
      sequenceCount: 99,
      alignmentLength: 999,
      sequences: [
        { id: "one", sequence: "ACGT" },
        { id: "two", sequence: "A-GT" }
      ]
    });

    expect(result.sequenceCount).toBe(2);
    expect(result.alignmentLength).toBe(4);
    expect(result.descriptor?.warnings).toContain("SERVER_DIMENSION_MISMATCH");
    expect(result.descriptor?.declaredDimensions).toEqual({
      sequenceCount: 99,
      alignmentLength: 999
    });
    expect(result.descriptor?.observedDimensions).toEqual({
      sequenceCount: 2,
      alignmentLength: 4
    });
  });

  it("rejects malformed payloads at the API boundary", async () => {
    await expect(adaptServerAlignment({
      jobId: "job-invalid",
      truncated: false,
      sequenceCount: -1,
      alignmentLength: 4,
      sequences: [{ id: "one", sequence: "ACGT" }]
    })).rejects.toBeInstanceOf(ServerAlignmentPayloadError);

    await expect(adaptServerAlignment({
      jobId: "job-invalid-control",
      truncated: false,
      sequenceCount: 1,
      alignmentLength: 4,
      sequences: [{ id: "one", sequence: "AC\u0000GT" }]
    })).rejects.toBeInstanceOf(ServerAlignmentPayloadError);
  });
});
