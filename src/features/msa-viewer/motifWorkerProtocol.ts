import type { MSASequence } from "../../lib/types/msa";
import {
  searchIupacMotifMatches,
  validateIupacMotif
} from "./analysis";
import { rowKeyForSequence } from "./alignmentModel";
import type {
  MotifMatch,
  MotifMatchMode,
  MotifStrandMode
} from "./types";

export const MOTIF_WORKER_PROTOCOL_VERSION = 2 as const;
export const DEFAULT_MAX_STORED_MOTIF_MATCHES = 20_000;

export type MotifWorkerErrorCode =
  | "MOTIF_CANCELLED"
  | "MOTIF_INVALID"
  | "MOTIF_SEARCH_FAILED"
  | "PROTOCOL_VERSION_MISMATCH";

export type MotifRowTotal = {
  rowKey: string;
  totalCount: number;
};

export type MotifSearchPayloadV2 = {
  sourceFingerprint: string;
  query: string;
  matchMode: MotifMatchMode;
  strandMode: MotifStrandMode;
  matches: MotifMatch[];
  totalCount: number;
  rowTotals: MotifRowTotal[];
  truncated: boolean;
};

export type MotifWorkerRequest =
  | {
      protocolVersion: typeof MOTIF_WORKER_PROTOCOL_VERSION;
      type: "search";
      requestId: number;
      sourceFingerprint: string;
      sequences: MSASequence[];
      query: string;
      matchMode: MotifMatchMode;
      strandMode: MotifStrandMode;
      maxMatches: number;
    }
  | {
      protocolVersion: typeof MOTIF_WORKER_PROTOCOL_VERSION;
      type: "cancel";
      requestId: number;
    };

export type MotifWorkerResponse =
  | {
      protocolVersion: typeof MOTIF_WORKER_PROTOCOL_VERSION;
      type: "motifReady";
      requestId: number;
      result: MotifSearchPayloadV2;
    }
  | {
      protocolVersion: typeof MOTIF_WORKER_PROTOCOL_VERSION;
      type: "motifCancelled";
      requestId: number;
    }
  | {
      protocolVersion: typeof MOTIF_WORKER_PROTOCOL_VERSION;
      type: "motifError";
      requestId: number;
      code: MotifWorkerErrorCode;
      message: string;
      invalidCharacters?: string[];
    };

export class MotifWorkerError extends Error {
  readonly code: MotifWorkerErrorCode;
  readonly invalidCharacters?: string[];

  constructor(
    code: MotifWorkerErrorCode,
    message: string,
    invalidCharacters?: string[]
  ) {
    super(message);
    this.name = "MotifWorkerError";
    this.code = code;
    this.invalidCharacters = invalidCharacters;
  }
}

export function motifWorkerError(error: unknown) {
  if (error instanceof MotifWorkerError) {
    return {
      code: error.code,
      message: error.message,
      invalidCharacters: error.invalidCharacters
    };
  }
  return {
    code: "MOTIF_SEARCH_FAILED" as const,
    message: error instanceof Error ? error.message : "Motif search failed",
    invalidCharacters: undefined
  };
}

export function calculateMotifSearchPayload({
  sourceFingerprint,
  sequences,
  query: rawQuery,
  matchMode,
  strandMode,
  maxMatches
}: Extract<MotifWorkerRequest, { type: "search" }>): MotifSearchPayloadV2 {
  const validation = validateIupacMotif(rawQuery);
  if (!validation.valid) {
    throw new MotifWorkerError(
      "MOTIF_INVALID",
      validation.error ?? "Invalid IUPAC motif.",
      validation.invalidCharacters
    );
  }
  const query = validation.query;
  const resolvedLimit = Number.isFinite(maxMatches)
    ? Math.max(0, Math.trunc(maxMatches))
    : DEFAULT_MAX_STORED_MOTIF_MATCHES;
  const matches: MotifMatch[] = [];
  const rowTotals: MotifRowTotal[] = [];
  let totalCount = 0;

  sequences.forEach((sequence, index) => {
    const rowKey = rowKeyForSequence(sequence, index);
    const row = { ...sequence, rowKey };
    const remaining = Math.max(0, resolvedLimit - matches.length);
    const result = searchIupacMotifMatches([row], query, {
      maxMatches: remaining,
      matchMode,
      strandMode
    });
    matches.push(...result.matches);
    totalCount += result.totalCount;
    rowTotals.push({ rowKey, totalCount: result.totalCount });
  });

  return {
    sourceFingerprint,
    query,
    matchMode,
    strandMode,
    matches,
    totalCount,
    rowTotals,
    truncated: totalCount > matches.length
  };
}
