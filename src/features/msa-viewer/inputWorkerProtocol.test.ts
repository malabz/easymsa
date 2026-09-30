import { webcrypto } from "node:crypto";
import { Buffer } from "node:buffer";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  declaredAlphabetForFileName,
  MSA_INPUT_PROTOCOL_VERSION,
  processMsaInputRequest
} from "./inputWorkerProtocol";
import {
  MAX_FASTA_CHARACTERS,
  MAX_LOCAL_FASTA_BYTES
} from "../../lib/utils/fasta";

const originalCrypto = globalThis.crypto;

beforeAll(() => {
  if (!globalThis.crypto?.subtle) {
    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      value: webcrypto
    });
  }
});

afterAll(() => {
  Object.defineProperty(globalThis, "crypto", {
    configurable: true,
    value: originalCrypto
  });
});

function textRequest(text: string, sourceName = "input.fasta") {
  return {
    protocolVersion: MSA_INPUT_PROTOCOL_VERSION,
    type: "parse" as const,
    requestId: 1,
    sourceKind: "pasted" as const,
    sourceName,
    payload: { kind: "text" as const, text }
  };
}

describe("alignment input worker protocol v1", () => {
  it("honors scientific filename declarations before content inference", () => {
    expect(declaredAlphabetForFileName("ONLY-ACGT.FAA")).toBe("protein");
    expect(declaredAlphabetForFileName("sample.fna")).toBe("dna");
    expect(declaredAlphabetForFileName("sample.fasta")).toBeUndefined();
  });

  it("builds normalized rows, duplicate-safe row keys, and both local hashes", async () => {
    const raw = Buffer.from(">same\nac.t\n>same\nAC-T\n", "utf8");
    const rawBytes = raw.buffer.slice(
      raw.byteOffset,
      raw.byteOffset + raw.byteLength
    ) as ArrayBuffer;
    const result = await processMsaInputRequest({
      protocolVersion: MSA_INPUT_PROTOCOL_VERSION,
      type: "parse",
      requestId: 2,
      sourceKind: "local-file",
      sourceName: "sample.fna",
      declaredAlphabet: "dna",
      payload: { kind: "bytes", bytes: rawBytes }
    });

    expect(result.sequences.map((row) => row.sequence)).toEqual(["AC-T", "AC-T"]);
    expect(result.sequences[0].rowKey).not.toBe(result.sequences[1].rowKey);
    expect(result.sequences.map((row) => row.originalIndex)).toEqual([0, 1]);
    expect(result.descriptor).toMatchObject({
      alphabet: "dna",
      alphabetConfidence: "declared",
      alignmentMode: "aligned",
      sequenceCount: 2,
      alignmentLength: 4
    });
    expect(result.descriptor?.rawSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(result.descriptor?.alignmentSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(result.descriptor?.warnings).toContain("dot_gap_normalized");
  });

  it("keeps an A/C/G/T-only .faa in protein neutral mode", async () => {
    const result = await processMsaInputRequest({
      ...textRequest(">p1\nACGT\n>p2\nACGT", "looks-like-dna.faa"),
      sourceKind: "local-file",
      declaredAlphabet: declaredAlphabetForFileName("looks-like-dna.faa")
    });

    expect(result.descriptor?.alphabet).toBe("protein");
    expect(result.descriptor?.alignmentMode).toBe("neutral");
  });

  it("uses content inference for pasted input and does not claim a raw-file hash", async () => {
    const result = await processMsaInputRequest(textRequest(">r1\nACGU\n>r2\nACGU"));
    expect(result.descriptor?.alphabet).toBe("rna");
    expect(result.descriptor?.rawSha256).toBeUndefined();
    expect(result.descriptor?.alignmentSha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it("keeps the paste guard at 200,000 characters while allowing local files up to 1 MiB", async () => {
    const overPasteLimit = `>row\n${"A".repeat(MAX_FASTA_CHARACTERS)}`;
    await expect(processMsaInputRequest(textRequest(overPasteLimit))).rejects.toEqual(
      expect.objectContaining({ code: "INPUT_TOO_LARGE" })
    );

    const localText = `>row\n${"A".repeat(MAX_FASTA_CHARACTERS)}`;
    const localBytes = Buffer.from(localText, "utf8");
    const result = await processMsaInputRequest({
      protocolVersion: MSA_INPUT_PROTOCOL_VERSION,
      type: "parse",
      requestId: 3,
      sourceKind: "local-file",
      sourceName: "large-but-previewable.fna",
      declaredAlphabet: "dna",
      payload: {
        kind: "bytes",
        bytes: localBytes.buffer.slice(
          localBytes.byteOffset,
          localBytes.byteOffset + localBytes.byteLength
        ) as ArrayBuffer
      }
    });
    expect(result.alignmentLength).toBe(MAX_FASTA_CHARACTERS);
  });

  it("rejects local files above the 1 MiB browser preview boundary before decoding", async () => {
    await expect(processMsaInputRequest({
      protocolVersion: MSA_INPUT_PROTOCOL_VERSION,
      type: "parse",
      requestId: 4,
      sourceKind: "local-file",
      sourceName: "too-large.fna",
      declaredAlphabet: "dna",
      payload: { kind: "bytes", bytes: new ArrayBuffer(MAX_LOCAL_FASTA_BYTES + 1) }
    })).rejects.toEqual(expect.objectContaining({ code: "INPUT_TOO_LARGE" }));
  });

  it("downgrades a declared nucleotide file containing illegal symbols", async () => {
    const result = await processMsaInputRequest({
      ...textRequest(">x\nACEG", "invalid.fna"),
      sourceKind: "local-file",
      declaredAlphabet: "dna"
    });
    expect(result.descriptor?.alignmentMode).toBe("neutral");
    expect(result.descriptor?.warnings).toContain("invalid_alignment_symbol");
  });

  it.each([
    ["", "INPUT_EMPTY"],
    ["not fasta", "INPUT_INVALID_FASTA"]
  ])("returns stable codes for invalid input", async (input, code) => {
    await expect(processMsaInputRequest(textRequest(input))).rejects.toEqual(
      expect.objectContaining({ code })
    );
  });

  it("rejects incompatible protocol versions", async () => {
    await expect(processMsaInputRequest({
      ...textRequest(">x\nACGT"),
      protocolVersion: 99 as typeof MSA_INPUT_PROTOCOL_VERSION
    })).rejects.toEqual(expect.objectContaining({ code: "PROTOCOL_VERSION_MISMATCH" }));
  });
});
