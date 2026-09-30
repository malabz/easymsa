import type { MSASequence, SequenceAlphabet } from "../../lib/types/msa";
import { calculateRangeStats } from "./analysis";
import type {
  ColumnRange,
  ConsensusMode,
  RangeStats
} from "./types";

export const MSA_RANGE_STATS_PROTOCOL_VERSION = 1 as const;

export type MsaRangeStatsErrorCode =
  | "RANGE_STATS_CANCELLED"
  | "RANGE_STATS_FAILED"
  | "RANGE_STATS_INVALID_RANGE"
  | "RANGE_STATS_PROTOCOL_MISMATCH";

export type MsaRangeStatsWorkerRequest =
  | {
      protocolVersion: typeof MSA_RANGE_STATS_PROTOCOL_VERSION;
      type: "calculate";
      requestId: number;
      sourceFingerprint: string;
      scopeRowKeys: string[];
      sequences: MSASequence[];
      range: ColumnRange;
      consensusMode: ConsensusMode;
      reference?: MSASequence | null;
      alphabet?: SequenceAlphabet;
    }
  | {
      protocolVersion: typeof MSA_RANGE_STATS_PROTOCOL_VERSION;
      type: "cancel";
      requestId: number;
    };

export type MsaRangeStatsWorkerResponse =
  | {
      protocolVersion: typeof MSA_RANGE_STATS_PROTOCOL_VERSION;
      type: "rangeStatsReady";
      requestId: number;
      result: RangeStats | null;
    }
  | {
      protocolVersion: typeof MSA_RANGE_STATS_PROTOCOL_VERSION;
      type: "rangeStatsCancelled";
      requestId: number;
    }
  | {
      protocolVersion: typeof MSA_RANGE_STATS_PROTOCOL_VERSION;
      type: "rangeStatsError";
      requestId: number;
      code: MsaRangeStatsErrorCode;
      message: string;
    };

export class MsaRangeStatsError extends Error {
  readonly code: MsaRangeStatsErrorCode;

  constructor(code: MsaRangeStatsErrorCode, message: string) {
    super(message);
    this.name = "MsaRangeStatsError";
    this.code = code;
  }
}

export function normalizeRangeStatsError(error: unknown) {
  if (error instanceof MsaRangeStatsError) {
    return { code: error.code, message: error.message };
  }
  return {
    code: "RANGE_STATS_FAILED" as const,
    message: error instanceof Error ? error.message : "Range statistics failed"
  };
}

export function calculateMsaRangeStatsTask(
  request: Extract<MsaRangeStatsWorkerRequest, { type: "calculate" }>
) {
  if (
    !Number.isSafeInteger(request.range.start) ||
    !Number.isSafeInteger(request.range.end) ||
    request.range.start < 1 ||
    request.range.end < request.range.start
  ) {
    throw new MsaRangeStatsError(
      "RANGE_STATS_INVALID_RANGE",
      "The selected alignment range is invalid."
    );
  }
  return calculateRangeStats({
    sequences: request.sequences,
    // Range workers intentionally avoid cloning the full ColumnStats object
    // array. calculateRangeStats derives only the selected columns when this
    // array is empty.
    columns: [],
    range: request.range,
    consensusMode: request.consensusMode,
    reference: request.reference,
    alphabet: request.alphabet
  });
}
