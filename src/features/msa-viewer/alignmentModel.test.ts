import { webcrypto } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  buildAlignmentDescriptor,
  canonicalAlignmentSource,
  canonicalAlignmentSourceKey,
  hashedAlignmentSourceKey,
  inferSequenceAlphabet,
  resolveAnalysisScopeSequences,
  sha256Hex,
  stableRowKey,
  withStableRowKeys
} from "./alignmentModel";

describe("MSA viewer alignment model", () => {
  it("canonicalizes scientific source content independently of formatting", () => {
    const formatted = [
      { id: "duplicate", sequence: " ac.\nGT " },
      { id: "duplicate", sequence: "uu\t--" }
    ];
    const normalized = [
      { id: "duplicate", sequence: "AC-GT" },
      { id: "duplicate", sequence: "UU--" }
    ];

    expect(canonicalAlignmentSource(formatted)).toBe(
      canonicalAlignmentSource(normalized)
    );
    expect(canonicalAlignmentSourceKey(formatted)).toBe(
      canonicalAlignmentSourceKey(normalized)
    );
    expect(canonicalAlignmentSource(formatted)).toContain(
      "easymsa-canonical-alignment-v1"
    );
  });

  it("provides a standards-based asynchronous SHA-256 provenance helper", async () => {
    const originalCrypto = globalThis.crypto;
    if (!globalThis.crypto?.subtle) {
      Object.defineProperty(globalThis, "crypto", {
        configurable: true,
        value: webcrypto
      });
    }
    try {
      expect(await sha256Hex("abc")).toBe(
        "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
      );
      expect(await hashedAlignmentSourceKey([{ id: "x", sequence: "a.c" }]))
        .toMatch(/^sha256:[0-9a-f]{64}$/);
    } finally {
      Object.defineProperty(globalThis, "crypto", {
        configurable: true,
        value: originalCrypto
      });
    }
  });

  it("gives duplicate display identifiers distinct stable row identities", () => {
    const sourceKey = "canonical-v1:example";
    const rows = withStableRowKeys(
      [
        { id: "duplicate", sequence: " ac. " },
        { id: "duplicate", sequence: "A-C" }
      ],
      sourceKey
    );

    expect(rows.map((row) => row.rowKey)).toEqual([
      stableRowKey(sourceKey, 0),
      stableRowKey(sourceKey, 1)
    ]);
    expect(rows.map((row) => row.sequence)).toEqual(["AC-", "A-C"]);
    expect(rows.map((row) => row.originalIndex)).toEqual([0, 1]);
    expect(buildAlignmentDescriptor(rows, {
      sourceKind: "pasted",
      sourceName: "duplicates"
    }).warnings).toContain("duplicate_headers");
  });

  it("detects the public DNA, RNA, mixed-nucleotide, protein, and unknown alphabets", () => {
    expect(inferSequenceAlphabet([{ sequence: "ACGTN" }]).alphabet).toBe("dna");
    expect(inferSequenceAlphabet([{ sequence: "ACGUN" }]).alphabet).toBe("rna");
    expect(inferSequenceAlphabet([{ sequence: "ACGTU" }])).toMatchObject({
      alphabet: "nucleotide",
      confidence: "ambiguous",
      hasT: true,
      hasU: true
    });
    expect(inferSequenceAlphabet([{ sequence: "MELKQF" }]).alphabet).toBe(
      "protein"
    );
    expect(inferSequenceAlphabet([{ sequence: "123?" }]).alphabet).toBe(
      "unknown"
    );
  });

  it("describes aligned, unequal raw, and scientifically neutral inputs", () => {
    const aligned = buildAlignmentDescriptor(
      [
        { id: "a", sequence: "ACGT" },
        { id: "b", sequence: "AC-T" }
      ],
      { sourceKind: "local-file", sourceName: "aligned.fa" }
    );
    const rawUnequal = buildAlignmentDescriptor(
      [
        { id: "a", sequence: "ACGT" },
        { id: "b", sequence: "ACG" }
      ],
      { sourceKind: "pasted", sourceName: "pasted sequences" }
    );
    const neutral = buildAlignmentDescriptor(
      [
        { id: "a", sequence: "MELK" },
        { id: "b", sequence: "M-LK" }
      ],
      { sourceKind: "job", sourceName: "protein result" }
    );

    expect(aligned).toMatchObject({
      alphabet: "dna",
      alignmentMode: "aligned",
      sequenceCount: 2,
      alignmentLength: 4,
      warnings: [],
      normalization: {
        rowOrderIncluded: true,
        headersIncluded: true,
        uppercaseSequences: true,
        dotAsGap: true,
        whitespaceRemoved: true
      }
    });
    expect(rawUnequal).toMatchObject({
      alignmentMode: "rawUnequal",
      alignmentLength: 4
    });
    expect(rawUnequal.warnings).toContain("unequal_sequence_lengths");
    expect(neutral).toMatchObject({
      alphabet: "protein",
      alignmentMode: "neutral"
    });
  });

  it("records normalization, mixed T/U, and declared-alphabet warnings", () => {
    const mixed = buildAlignmentDescriptor(
      [{ id: "mixed", sequence: "A.TU" }],
      {
        sourceKind: "local-file",
        sourceName: "mixed.fa",
        declaredAlphabet: "protein"
      }
    );

    expect(mixed.alphabet).toBe("protein");
    expect(mixed.alphabetConfidence).toBe("declared");
    expect(mixed.warnings).toEqual(
      expect.arrayContaining([
        "mixed_t_u_alphabet",
        "declared_alphabet_mismatch",
        "dot_gap_normalized"
      ])
    );
  });

  it("resolves all, visible, and selected analysis scopes by rowKey", () => {
    const sequences = [
      { id: "duplicate", rowKey: "source:1", sequence: "AAAA" },
      { id: "duplicate", rowKey: "source:2", sequence: "CCCC" },
      { id: "third", rowKey: "source:3", sequence: "GGGG" }
    ];

    expect(resolveAnalysisScopeSequences(sequences, "all")).toBe(sequences);
    expect(
      resolveAnalysisScopeSequences(sequences, "visible", {
        visibleRowKeys: ["source:1", "source:3"]
      }).map((sequence) => sequence.rowKey)
    ).toEqual(["source:1", "source:3"]);
    expect(
      resolveAnalysisScopeSequences(sequences, "selected", {
        selectedRowKeys: new Set(["source:2"])
      }).map((sequence) => sequence.rowKey)
    ).toEqual(["source:2"]);
  });
});
