import type {
  AlignmentDescriptor,
  AlignmentSourceKind,
  MSAResult,
  MSASequence,
  SequenceAlphabet
} from "../../lib/types/msa";
import {
  MAX_FASTA_CHARACTERS,
  MAX_LOCAL_FASTA_BYTES,
  parseFasta
} from "../../lib/utils/fasta";
import {
  buildAlignmentDescriptor,
  canonicalAlignmentSource,
  canonicalAlignmentSourceKey,
  sha256Hex,
  withStableRowKeys
} from "./alignmentModel";

export const MSA_INPUT_PROTOCOL_VERSION = 1 as const;

export type MsaInputErrorCode =
  | "INPUT_CANCELLED"
  | "INPUT_DECODE_FAILED"
  | "INPUT_EMPTY"
  | "INPUT_INVALID_FASTA"
  | "INPUT_TOO_LARGE"
  | "INPUT_WORKER_FAILED"
  | "PROTOCOL_VERSION_MISMATCH";

export type AlignmentInputPayload =
  | { kind: "text"; text: string }
  | { kind: "bytes"; bytes: ArrayBuffer };

export type MsaInputWorkerRequest = {
  protocolVersion: typeof MSA_INPUT_PROTOCOL_VERSION;
  type: "parse";
  requestId: number;
  sourceKind: Extract<AlignmentSourceKind, "local-file" | "pasted">;
  sourceName: string;
  declaredAlphabet?: SequenceAlphabet;
  payload: AlignmentInputPayload;
};

export type MsaInputWorkerResponse =
  | {
      protocolVersion: typeof MSA_INPUT_PROTOCOL_VERSION;
      type: "inputReady";
      requestId: number;
      result: MSAResult;
    }
  | {
      protocolVersion: typeof MSA_INPUT_PROTOCOL_VERSION;
      type: "inputError";
      requestId: number;
      code: MsaInputErrorCode;
    };

export class MsaInputError extends Error {
  readonly code: MsaInputErrorCode;

  constructor(code: MsaInputErrorCode) {
    super(code);
    this.name = "MsaInputError";
    this.code = code;
  }
}

export function declaredAlphabetForFileName(name: string): SequenceAlphabet | undefined {
  const extension = name.trim().toLowerCase().match(/\.([^.]+)$/)?.[1];
  if (extension === "faa") {
    return "protein";
  }
  if (extension === "fna") {
    return "dna";
  }
  return undefined;
}

function decodePayload(payload: AlignmentInputPayload) {
  if (payload.kind === "text") {
    return { text: payload.text, rawBytes: undefined };
  }
  try {
    return {
      text: new TextDecoder("utf-8", { fatal: true }).decode(payload.bytes),
      rawBytes: payload.bytes
    };
  } catch {
    throw new MsaInputError("INPUT_DECODE_FAILED");
  }
}

async function optionalSha256(value: string | Uint8Array | undefined) {
  if (value === undefined) {
    return undefined;
  }
  try {
    return await sha256Hex(value);
  } catch {
    // Older embedded webviews may lack Web Crypto. The synchronous source key
    // remains stable, but provenance fields stay unset instead of claiming a
    // cryptographic digest that was not produced.
    return undefined;
  }
}

async function optionalRawSha256(value: ArrayBuffer | undefined) {
  if (value === undefined) {
    return undefined;
  }
  try {
    const subtle = globalThis.crypto?.subtle;
    if (!subtle) {
      return undefined;
    }
    const digest = await subtle.digest("SHA-256", value);
    return Array.from(new Uint8Array(digest), (byte) =>
      byte.toString(16).padStart(2, "0")
    ).join("");
  } catch {
    return undefined;
  }
}

function classifyParseFailure(input: string, maxCharacters: number) {
  if (!input.trim()) {
    return "INPUT_EMPTY" as const;
  }
  if (input.length > maxCharacters) {
    return "INPUT_TOO_LARGE" as const;
  }
  return "INPUT_INVALID_FASTA" as const;
}

export async function processMsaInputRequest(
  request: MsaInputWorkerRequest
): Promise<MSAResult> {
  if (request.protocolVersion !== MSA_INPUT_PROTOCOL_VERSION) {
    throw new MsaInputError("PROTOCOL_VERSION_MISMATCH");
  }

  const maxCharacters = request.sourceKind === "local-file"
    ? MAX_LOCAL_FASTA_BYTES
    : MAX_FASTA_CHARACTERS;
  if (
    request.payload.kind === "bytes" &&
    request.payload.bytes.byteLength > MAX_LOCAL_FASTA_BYTES
  ) {
    throw new MsaInputError("INPUT_TOO_LARGE");
  }

  const { text, rawBytes } = decodePayload(request.payload);
  const parsed = parseFasta(text, 1, maxCharacters);
  if (!parsed.valid) {
    throw new MsaInputError(classifyParseFailure(text, maxCharacters));
  }

  const sequences: MSASequence[] = parsed.records.map((record) => ({
    id: record.id,
    sequence: record.sequence
  }));
  const canonicalSource = canonicalAlignmentSource(sequences);
  const [alignmentSha256, rawSha256] = await Promise.all([
    optionalSha256(canonicalSource),
    request.sourceKind === "local-file" ? optionalRawSha256(rawBytes) : undefined
  ]);
  const sourceKey = alignmentSha256
    ? `sha256:${alignmentSha256}`
    : canonicalAlignmentSourceKey(sequences);
  const descriptor: AlignmentDescriptor = buildAlignmentDescriptor(sequences, {
    sourceKind: request.sourceKind,
    sourceName: request.sourceName,
    sourceKey,
    declaredAlphabet: request.declaredAlphabet,
    rawSha256,
    alignmentSha256
  });
  const rows = withStableRowKeys(sequences, sourceKey);

  return {
    jobId: request.sourceName,
    truncated: false,
    sequences: rows,
    alignmentLength: descriptor.alignmentLength,
    sequenceCount: rows.length,
    descriptor
  };
}

export function msaInputErrorCode(error: unknown): MsaInputErrorCode {
  return error instanceof MsaInputError ? error.code : "INPUT_WORKER_FAILED";
}
