import { describe, expect, it } from "vitest";
import type { ResultSummary } from "../../lib/types/result";
import {
  createLocalViewerContext,
  createServerViewerContext,
  serializableViewerContext
} from "./viewerContext";

const summary: ResultSummary = {
  jobId: "job-123",
  algorithm: { name: "auto", resolvedName: "mafft_fast" },
  metrics: {
    sequenceCount: 2,
    alignmentLength: 4,
    averageIdentity: null,
    gapPercentage: null
  },
  preprocess: {
    mode: "standard",
    strictness: "balanced",
    rawSequenceCount: 2,
    cleanSequenceCount: 2,
    removedSequenceCount: 0
  },
  outputFiles: []
};

describe("viewer context", () => {
  it("preserves browser-visible algorithm provenance", () => {
    const context = createServerViewerContext(summary, [
      {
        name: "all_results.zip",
        description: "archive",
        size: "remote",
        href: "https://example.test/download?token=secret"
      }
    ]);

    expect(context.algorithm).toEqual({
      requested: "auto",
      resolved: "mafft_fast"
    });
    expect(context.preprocess).toEqual({
      mode: "standard",
      strictness: "balanced"
    });
  });

  it("keeps authenticated URLs outside serializable provenance", () => {
    const context = createServerViewerContext(summary, [
      {
        name: "all_results.zip",
        description: "archive",
        size: "remote",
        href: "https://example.test/download?token=secret"
      }
    ]);

    const serialized = JSON.stringify(serializableViewerContext(context));
    expect(serialized).not.toContain("token");
    expect(serialized).not.toContain("secret");
    expect(serialized).not.toContain("example.test");
  });

  it("does not expose an absolute local path as a source label", () => {
    expect(
      createLocalViewerContext("local-file", "C:\\Users\\Ada\\sample.fasta").source.name
    ).toBe("sample.fasta");
  });
});
